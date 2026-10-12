/**
 * The cache behind the sources a redraw cannot afford to wait for.
 *
 * A redraw is allowed 300 ms. The pull request lookup alone takes 540 ms
 * on a warm network and its whole timeout when `gh` is unauthenticated, so
 * it cannot be on that path. Instead the redraw reads the last value from
 * a file here, and, when that value is halfway to expiring, starts a
 * detached process that does the lookup and writes it back.
 *
 * That process is not a daemon: it performs one lookup and exits. If it
 * never runs, the statusline still renders, only without those segments.
 *
 * Each source has a file of its own, `<key>.<name>.json`, and every write
 * goes to a temporary file in the same directory that is then renamed over
 * it, which is atomic on all three platforms. A reader therefore sees
 * either the whole previous value or the whole new one. One file per source
 * rather than one per repository is what makes concurrent writers safe: a
 * write never carries other sources' entries along, so the PR refresh, the
 * CI refresh and a redraw writing the same repository at once cannot erase
 * each other's values.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  openSync,
  writeSync,
  closeSync,
  statSync,
} from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { MAX_AGE_MS, REFRESH_BUDGET_MS } from "./freshness.js";

// 2 since entries moved to one file per source. The shared `<key>.json`
// files schema 1 wrote are never read again; the changeTracker sweep removes
// them with the rest of the stale cache.
const SCHEMA = 2;
const CLI_PATH = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

function cacheDir() {
  return path.join(os.homedir(), ".claude", "statusline", "cache");
}

/**
 * A filename-safe key for a directory. A hash rather than the path itself:
 * a path is not a legal filename anywhere, and two checkouts of the same
 * repository are legitimately different caches.
 */
export function repoKey(dir) {
  return createHash("sha256").update(String(dir || "no-directory")).digest("hex").slice(0, 16);
}

/**
 * The file holding one source's entry. Names are the fixed source names in
 * freshness.js and keys are hex, so the result is a legal filename everywhere.
 */
export function cacheFileFor(key, name) {
  return path.join(cacheDir(), `${key}.${name}.json`);
}

function lockFileFor(key, name) {
  return path.join(cacheDir(), `${key}.${name}.lock`);
}

/**
 * Writes `text` to `file` through a temporary file and a rename.
 *
 * A per-process suffix keeps two writers from sharing one temporary file
 * and handing a reader the interleaving of both.
 */
function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(tmp, text);
    renameSync(tmp, file);
    return true;
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to clean up
    }
    return false;
  }
}

/** The stored entry for `name`, or null when there is nothing usable. */
export function readEntry(key, name) {
  try {
    const parsed = JSON.parse(readFileSync(cacheFileFor(key, name), "utf8"));
    // A file from another schema is a miss, never a migration: guessing at
    // the shape of an older cache is how a stale value gets misread as a
    // current one.
    if (parsed?.schema !== SCHEMA || typeof parsed.at !== "number") return null;
    return { value: parsed.value, at: parsed.at };
  } catch {
    return null;
  }
}

/**
 * Stores `value` for `name`. Other sources live in other files, so there is
 * nothing to read first and nothing another writer can lose.
 */
export function writeEntry(key, name, value, { now = Date.now() } = {}) {
  return writeAtomic(cacheFileFor(key, name), JSON.stringify({ schema: SCHEMA, value, at: now }));
}

/**
 * Whether a refresh is due.
 *
 * Half the maximum age rather than the whole of it: refreshing only once a
 * value has expired would make the segment flicker between present and
 * absent on every cycle (FR-006).
 */
export function shouldRefresh(name, entry, now = Date.now()) {
  if (!entry) return true;
  const maxAge = MAX_AGE_MS[name] ?? 60_000;
  return now - entry.at > maxAge / 2;
}

/**
 * How long a lock lasts. It has to outlive the refresh it guards, or a slow
 * lookup gets a second process started on top of it. It also has to expire,
 * or a refresh killed before it finished would block the key forever.
 */
function lockMsFor(name) {
  return Math.max(MAX_AGE_MS[name] ?? 60_000, REFRESH_BUDGET_MS[name] ?? 0);
}

/**
 * When the lock in `file` stops counting. The file holds that moment; one
 * caught between its creation and its first write is empty, and one left by
 * a process that died there stays empty, so its age stands in for it.
 * Undefined when there is no lock at all.
 */
function lockExpiry(file, lockMs) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch (err) {
    return err?.code === "ENOENT" ? undefined : null;
  }
  const until = Number(text);
  if (text.trim() && Number.isFinite(until)) return until;
  try {
    return statSync(file).mtimeMs + lockMs;
  } catch {
    return undefined;
  }
}

/** Creates the lock file, failing if it already exists. */
function createLock(file, until) {
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    const fd = openSync(file, "wx");
    try {
      writeSync(fd, String(until));
    } finally {
      closeSync(fd);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Claims the right to refresh `name`, or refuses when someone else already
 * has it. Without this, every redraw would spawn its own refresh process.
 *
 * The lock is a file of its own, created with the exclusive flag, so two
 * redraws racing for it cannot both win: the operating system lets exactly
 * one create it. It records when it expires. One past that moment, or one
 * claiming to last longer than any lock can (the clock jumped), is treated
 * as abandoned and taken over.
 *
 * Passing `release` deletes the lock without writing a value, which is what
 * a lookup that answered does. Passing `holdFor` keeps it, re-stamped to
 * expire that many milliseconds from `now`: that is the back-off after a
 * failed lookup, which leaves the previous good value exactly where it is
 * and stops the next redraw from asking again straight away.
 */
export function takeLock(key, name, { now = Date.now(), release = false, holdFor = null } = {}) {
  const file = lockFileFor(key, name);
  if (release) {
    try {
      unlinkSync(file);
    } catch {
      // already gone
    }
    return true;
  }
  const lockMs = lockMsFor(name);
  if (typeof holdFor === "number") {
    // The caller holds this lock already, so a plain overwrite is safe; the
    // rename keeps a reader from seeing it empty and guessing from its age.
    return writeAtomic(file, String(now + Math.min(holdFor, lockMs)));
  }
  if (createLock(file, now + lockMs)) return true;

  const until = lockExpiry(file, lockMs);
  // Unreadable for some reason other than being gone: someone has it, and a
  // cache that cannot be read could not take the refresh's value either.
  if (until === null) return false;
  if (until !== undefined && until > now && until - now <= lockMs) return false;
  // Abandoned, or released between the create and the read. Two redraws
  // reaching this line together for one abandoned lock may both delete and
  // recreate it; the cost is one extra refresh, once per expired lock.
  try {
    unlinkSync(file);
  } catch {
    // released, or another redraw got here first
  }
  return createLock(file, now + lockMs);
}

/**
 * Starts the detached refresh for one cache key.
 *
 * `process.execPath` rather than a bare `node`: this is a spawned command,
 * and Principle IX requires the interpreter to be the one already running.
 * Arguments travel as an array and the directory as `cwd`, so nothing
 * derived from the environment is ever spliced into a shell string.
 *
 * Returns whether a process was started. `CLAUDE_STATUSLINE_NO_REFRESH=1`
 * suppresses it entirely, which is what keeps generated previews and the
 * test suite from touching anything live.
 */
export function spawnRefresh(key, name, cwd, { now = Date.now() } = {}) {
  if (process.env.CLAUDE_STATUSLINE_NO_REFRESH === "1") return false;
  if (!takeLock(key, name, { now })) return false;
  try {
    const child = spawn(process.execPath, [CLI_PATH, "refresh", name, key], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    // A spawn that fails does so asynchronously, as an 'error' event. With
    // no listener Node treats it as an unhandled error and takes the whole
    // process down, which turned a refresh that could not start into a
    // statusline that did not render. Nothing here needs the refresh to
    // succeed; releasing the lock is enough.
    child.on("error", () => {
      takeLock(key, name, { now, release: true });
    });
    child.unref();
    return true;
  } catch {
    takeLock(key, name, { now, release: true });
    return false;
  }
}
