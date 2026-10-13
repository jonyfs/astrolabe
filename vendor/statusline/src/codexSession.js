/**
 * Which Codex session a pane belongs to (specs/035-codex-pane).
 *
 * Codex's SessionStart hook gets the session's id, its rollout path
 * (`transcript_path`) and its cwd on stdin, the same fields Claude Code's
 * hooks get. `codex-hook` stores them as a small pointer file per session
 * under `~/.claude/statusline/codex/`, with the tmux pane the hook inherited
 * from Codex, and the pane reads the pointer back. That is exact even with two
 * Codex sessions in one directory.
 *
 * The hook only runs once the person has trusted it in Codex. Until then, or
 * without `install --pane`, the pane falls back to the newest rollout under
 * `$CODEX_HOME/sessions` whose session_meta names the same cwd. That guess is
 * right for one Codex per directory.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync, existsSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { readRolloutHead } from "./codexRollout.js";

/** Pointers older than this are swept, as are those whose rollout is gone. */
export const POINTER_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

/** How long a pointer may name a rollout that does not exist yet. */
const MISSING_ROLLOUT_GRACE_MS = 24 * 3600 * 1000;

/** How many day directories, and rollouts in them, a scan looks at. */
const SCAN_DAYS = 14;
const SCAN_FILES = 40;

export const pointerDir = () => path.join(os.homedir(), ".claude", "statusline", "codex");

export const codexHomeOf = (env = process.env) => env.CODEX_HOME || path.join(os.homedir(), ".codex");

/** A file name for a session id. Anything but letters, digits, `-` and `_` makes it a hash. */
export function pointerName(sessionId) {
  const id = String(sessionId ?? "");
  if (/^[A-Za-z0-9_-]{1,128}$/.test(id)) return `${id}.json`;
  return `h-${createHash("sha256").update(id).digest("hex").slice(0, 32)}.json`;
}

const text = (v) => (typeof v === "string" && v.length > 0 ? v : null);

/** Writes the pointer for one hook input. Returns the file, or null when the input names no session. */
export function writePointer(input, { now = Date.now(), env = process.env } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const sessionId = text(input.session_id);
  if (!sessionId) return null;
  const pointer = {
    session_id: sessionId,
    rollout: text(input.transcript_path),
    cwd: text(input.cwd),
    tmux_pane: text(env.TMUX_PANE),
    event: text(input.hook_event_name),
    written_at: now,
  };
  const dir = pointerDir();
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, pointerName(sessionId));
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(pointer) + "\n");
    renameSync(tmp, file);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to clean up
    }
    throw err;
  }
  return file;
}

function readPointer(file) {
  try {
    const p = JSON.parse(readFileSync(file, "utf8"));
    if (!p || typeof p !== "object" || !text(p.session_id)) return null;
    return { ...p, file, mtimeMs: statSync(file).mtimeMs };
  } catch {
    return null;
  }
}

/** Every readable pointer, newest first. */
export function listPointers() {
  let names;
  try {
    names = readdirSync(pointerDir()).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  return names
    .map((n) => readPointer(path.join(pointerDir(), n)))
    .filter(Boolean)
    .sort((a, b) => (b.written_at ?? b.mtimeMs) - (a.written_at ?? a.mtimeMs));
}

/** Removes pointers past their age or whose rollout no longer exists. Returns how many. */
export function sweepPointers({ now = Date.now(), maxAgeMs = POINTER_MAX_AGE_MS } = {}) {
  let names;
  try {
    names = readdirSync(pointerDir());
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    const file = path.join(pointerDir(), name);
    let stale = false;
    try {
      const st = statSync(file);
      if (name.endsWith(".tmp")) stale = now - st.mtimeMs > 60_000;
      else if (now - st.mtimeMs > maxAgeMs) stale = true;
      else {
        // Codex can run the hook before it writes the first line of the
        // rollout, so a missing rollout is only a reason once a day has gone by.
        const p = readPointer(file);
        stale = !p || (now - st.mtimeMs > MISSING_ROLLOUT_GRACE_MS && p.rollout !== null && p.rollout !== undefined && !existsSync(p.rollout));
      }
    } catch {
      continue;
    }
    if (!stale) continue;
    try {
      unlinkSync(file);
      removed++;
    } catch {
      // another sweep got there first
    }
  }
  return removed;
}

/** The hook itself: one pointer, a sweep, and never a failure Codex would see. */
export function runCodexHook(raw, { now = Date.now(), env = process.env } = {}) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return null;
  }
  try {
    const file = writePointer(input, { now, env });
    sweepPointers({ now });
    return file;
  } catch {
    return null;
  }
}

/** A directory as compared: resolved, and through symlinks when it exists. */
function samePlace(a, b) {
  if (!a || !b) return false;
  const norm = (p) => {
    const resolved = path.resolve(p);
    try {
      return realpathSync(resolved);
    } catch {
      return resolved;
    }
  };
  const x = norm(a);
  const y = norm(b);
  return process.platform === "win32" ? x.toLowerCase() === y.toLowerCase() : x === y;
}

const sortedDesc = (dir) => {
  try {
    return readdirSync(dir).sort().reverse();
  } catch {
    return [];
  }
};

/** The newest rollouts under `$CODEX_HOME/sessions`, newest first by mtime, bounded. */
export function recentRollouts({ codexHome = codexHomeOf(), days = SCAN_DAYS, files = SCAN_FILES } = {}) {
  const root = path.join(codexHome, "sessions");
  const found = [];
  let daysSeen = 0;
  outer: for (const y of sortedDesc(root)) {
    for (const m of sortedDesc(path.join(root, y))) {
      for (const d of sortedDesc(path.join(root, y, m))) {
        const dir = path.join(root, y, m, d);
        for (const name of sortedDesc(dir)) {
          if (!name.startsWith("rollout-") || !name.endsWith(".jsonl")) continue;
          const file = path.join(dir, name);
          try {
            found.push({ file, mtimeMs: statSync(file).mtimeMs });
          } catch {
            // vanished between the listing and the stat
          }
        }
        if (++daysSeen >= days || found.length >= files) break outer;
      }
    }
  }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, files);
}

/** How far before `since` a session may have started and still count as the pane's. */
export const SINCE_SLACK_MS = 5000;

/** When a rollout's session started, from its session_meta, in ms; NaN when it does not say. */
export function rolloutStartedAt(file) {
  return Date.parse(readRolloutHead(file)?.timestamp ?? "");
}

/**
 * The newest rollout whose session started in `cwd`, written to since `since`, or null.
 *
 * Written to is not started: another Codex in the same directory that began
 * before the pane is still written to after it. So with `since`, a session
 * that started at or after it (less SINCE_SLACK_MS) comes first, and the
 * newest written one stands in only when none did. Otherwise two live
 * sessions would trade places as each one wrote.
 */
export function newestRolloutFor(cwd, { codexHome = codexHomeOf(), since = null } = {}) {
  let fallback = null;
  for (const { file, mtimeMs } of recentRollouts({ codexHome })) {
    if (since !== null && mtimeMs < since) break;
    const head = readRolloutHead(file);
    if (!head || !samePlace(head.cwd, cwd)) continue;
    if (since === null) return file;
    const started = Date.parse(head.timestamp ?? "");
    if (Number.isFinite(started) && started >= since - SINCE_SLACK_MS) return file;
    fallback ??= file;
  }
  return fallback;
}

/** The rollout for a session id, by Codex's file name `rollout-<time>-<id>.jsonl`. */
function rolloutById(id, codexHome) {
  if (!id) return null;
  const hit = recentRollouts({ codexHome }).find(({ file }) => path.basename(file).endsWith(`-${id}.jsonl`));
  return hit ? hit.file : null;
}

function fromPointer(p, codexHome) {
  const rollout = p.rollout && existsSync(p.rollout) ? p.rollout : rolloutById(p.session_id, codexHome);
  return rollout ? { rollout, source: "pointer", sessionId: p.session_id } : null;
}

/**
 * The rollout this pane shows, or null while there is none yet.
 *
 * In order: `rollout` given outright; the pointer for `session`; the newest
 * pointer written from Codex's tmux pane (`codexPane`); the newest pointer for
 * this directory; the newest rollout for this directory. `since` drops
 * anything older than the pane, so a wrapper never shows the session before.
 */
export function resolveCodexSession({ rollout = null, session = null, codexPane = null, cwd = process.cwd(), since = null, env = process.env } = {}) {
  if (rollout) return { rollout, source: "flag", sessionId: null };
  const codexHome = codexHomeOf(env);
  const pointers = listPointers().filter((p) => since === null || (p.written_at ?? p.mtimeMs) >= since);
  if (session) {
    const p = pointers.find((x) => x.session_id === session);
    if (p) return fromPointer(p, codexHome);
    const file = rolloutById(session, codexHome);
    return file ? { rollout: file, source: "scan", sessionId: session } : null;
  }
  if (codexPane) {
    const p = pointers.find((x) => x.tmux_pane === codexPane);
    const hit = p && fromPointer(p, codexHome);
    if (hit) return hit;
  }
  for (const p of pointers) {
    if (!samePlace(p.cwd, cwd)) continue;
    const hit = fromPointer(p, codexHome);
    if (hit) return hit;
  }
  const file = newestRolloutFor(cwd, { codexHome, since });
  return file ? { rollout: file, source: "scan", sessionId: null } : null;
}

/** The newest pointer and its age, for doctor. */
export function latestPointer({ now = Date.now() } = {}) {
  const [p] = listPointers();
  if (!p) return null;
  return { session_id: p.session_id, ageMs: Math.max(0, now - (p.written_at ?? p.mtimeMs)), cwd: p.cwd ?? null };
}
