/**
 * Whether the clone this statusline runs from has improvements or fixes
 * waiting upstream, and, in the default behaviour, taking them
 * (specs/026-update-check).
 *
 * Nothing here runs on the redraw path except two cache reads. A redraw that
 * finds the last check a day old starts the detached refresh, which fetches,
 * classifies the pending commits by their `feat:` and `fix:` prefixes and,
 * in `auto`, applies them through the same `update()` the command uses, with
 * every refusal that has. The bar then says what happened, in a chip.
 *
 * `auto` runs code fetched from the network without a per-update decision.
 * What keeps that bounded: only a fast-forward, only from the clone's own
 * configured upstream, never over local edits or local commits, and git does
 * not transfer hooks, so a fetch runs nothing of the remote's.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { plainText } from "./text.js";
import { cutToWidth } from "./taskRows.js";
import { repoKey, readEntry, writeEntry, spawnRefresh } from "./cache.js";
import { update, REPO_ROOT_PATH } from "./update.js";

export const REPO_ROOT = REPO_ROOT_PATH;
export const UPDATE_MODES = ["auto", "notify", "off"];
export const DEFAULT_MODE = "auto";
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 30_000;
const SUBJECT_MAX = 72;

const settingsFile = () => path.join(os.homedir(), ".claude", "statusline", "updates.json");

/**
 * The behaviour in force and where it came from. The environment wins, as it
 * does for every other switch here; then the file `updates` writes; then
 * `auto`, the default the owner chose on 2026-09-29.
 */
export function readBehaviour({ env = process.env } = {}) {
  const fromEnv = env.CLAUDE_STATUSLINE_UPDATES;
  if (UPDATE_MODES.includes(fromEnv)) return { mode: fromEnv, source: "environment" };
  try {
    const mode = JSON.parse(readFileSync(settingsFile(), "utf8"))?.mode;
    if (UPDATE_MODES.includes(mode)) return { mode, source: "file" };
  } catch {
    // no file, or not one we can read: the default stands
  }
  return { mode: DEFAULT_MODE, source: "default" };
}

/** Writes the behaviour through a rename, like every other file this project owns. */
export function writeBehaviour(mode) {
  if (!UPDATE_MODES.includes(mode)) throw new Error(`Unknown update behaviour "${mode}". Use one of: ${UPDATE_MODES.join(", ")}.`);
  const file = settingsFile();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify({ mode }, null, 2) + "\n");
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

/**
 * What a commit is, from its subject. `feat` is an improvement and `fix` a
 * bug fix, with or without a scope and a breaking-change mark. Everything
 * else, merges and free text included, is neither and never triggers a
 * notice or an update on its own.
 */
export function classify(subject) {
  const m = /^(\w+)(\([^)]*\))?!?:/.exec(String(subject || ""));
  if (!m) return "other";
  if (m[1] === "feat") return "feature";
  if (m[1] === "fix") return "fix";
  return "other";
}

function runGit(root, args, timeout) {
  const r = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    ok: r.status === 0 && !r.error,
    out: (r.stdout || "").trim(),
    err: (r.stderr || "").trim().split("\n").pop() || (r.error ? String(r.error.code || r.error.message) : "failed"),
  };
}

function cleanSubject(subject) {
  const text = plainText(subject) ?? "";
  // By columns, with the ellipsis measured: a UTF-16 slice could split an
  // emoji's surrogate pair, and it counted the ellipsis as one column.
  return cutToWidth(text, SUBJECT_MAX);
}

/**
 * The commits the clone's upstream has and the clone does not. Fetches, and
 * changes nothing in the working tree or the branch.
 */
export function pendingCommits(root, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const fetched = runGit(root, ["fetch", "--quiet"], timeoutMs);
  if (!fetched.ok) return { ok: false, error: `fetch failed: ${fetched.err}` };
  const head = runGit(root, ["rev-parse", "--short", "HEAD"], 10_000);
  const upstream = runGit(root, ["rev-parse", "--short", "@{u}"], 10_000);
  if (!head.ok || !upstream.ok) return { ok: false, error: "no upstream to compare with" };
  const log = runGit(root, ["log", "--format=%s", "HEAD..@{u}"], 10_000);
  if (!log.ok) return { ok: false, error: `git log failed: ${log.err}` };
  const commits = log.out
    ? log.out.split("\n").map((subject) => ({ type: classify(subject), subject: cleanSubject(subject) }))
    : [];
  return { ok: true, error: null, head: head.out, upstreamHead: upstream.out, commits };
}

/** `1 feature, 2 fixes`, leaving out a zero. */
export function countsText({ features = 0, fixes = 0 } = {}) {
  const parts = [];
  if (features) parts.push(`${features} ${features === 1 ? "feature" : "features"}`);
  if (fixes) parts.push(`${fixes} ${fixes === 1 ? "fix" : "fixes"}`);
  return parts.join(", ");
}

function counts(commits) {
  return {
    features: commits.filter((c) => c.type === "feature").length,
    fixes: commits.filter((c) => c.type === "fix").length,
  };
}

const defaultApply = (root) => update({ root });

/**
 * One check, and in `auto` one update: the whole job of the detached
 * refresh. Returns the cache entry's value; the refresh writes it.
 */
export function runUpdateCheck({ root = REPO_ROOT, now = Date.now(), applyUpdate = defaultApply, env = process.env } = {}) {
  const { mode } = readBehaviour({ env });
  const base = { checkedAt: now, mode, shownTo: null, blockedBy: null, arrived: null };
  if (mode === "off") return { ...base, ok: true, error: null, pending: [], outcome: "current" };

  const found = pendingCommits(root);
  if (!found.ok) return { ...base, ok: false, error: found.error, pending: [], outcome: "current" };

  const pending = found.commits;
  const relevant = counts(pending);
  const record = { ...base, ok: true, error: null, head: found.head, upstreamHead: found.upstreamHead, pending };
  if (!relevant.features && !relevant.fixes) return { ...record, outcome: "current" };
  if (mode === "notify") return { ...record, outcome: "ready", arrived: relevant };

  const result = applyUpdate(root) ?? { ok: false, cause: "install failed" };
  if (result.ok) return { ...record, outcome: "updated", head: result.after ?? found.upstreamHead, arrived: relevant };
  if (["local edits", "history diverged", "not a clone"].includes(result.cause)) {
    return { ...record, outcome: "blocked", blockedBy: result.cause, arrived: relevant };
  }
  return { ...record, outcome: "failed", error: result.cause ?? "update failed", arrived: relevant };
}

/** A check is due when there has never been one, or the last is a day old. */
export function updateCheckDue(value, now = Date.now()) {
  return !value || typeof value.checkedAt !== "number" || now - value.checkedAt >= CHECK_INTERVAL_MS;
}

/**
 * Called by every redraw. Two cheap reads, and at most once a day a detached
 * process; the redraw never waits for it.
 */
export function maybeStartUpdateCheck({ now = Date.now(), root = REPO_ROOT, env = process.env } = {}) {
  if (env.CLAUDE_STATUSLINE_NO_REFRESH === "1") return false;
  if (readBehaviour({ env }).mode === "off") return false;
  const key = repoKey(root);
  if (!updateCheckDue(readEntry(key, "update")?.value, now)) return false;
  return spawnRefresh(key, "update", root, { now });
}

/**
 * What the bar says about a check result, or null. `ready` and `blocked` ask
 * the user to act, so they stay while they are true. `updated` and `failed`
 * are news: they show for the first session that draws after them, and for
 * that session only.
 */
export function updateNotice(value, sessionId, { mode = readBehaviour().mode } = {}) {
  if (!value || mode === "off") return null;
  const arrived = value.arrived ?? { features: 0, fixes: 0 };
  switch (value.outcome) {
    case "ready":
      return mode === "notify" || mode === "auto" ? { state: "ready", text: `update ready · ${countsText(arrived)}` } : null;
    case "blocked":
      return { state: "blocked", text: `update blocked · ${value.blockedBy}` };
    case "updated":
    case "failed": {
      if (value.shownTo && value.shownTo !== sessionId) return null;
      const text = value.outcome === "updated" ? `statusline updated · ${countsText(arrived)}` : "update failed";
      return { state: value.outcome, text, firstShowing: !value.shownTo };
    }
    default:
      return null;
  }
}

/**
 * The redraw's reading: the notice for this session, recording which session
 * saw a one-time notice first. The record changes `shownTo` only, so the
 * check's own clock, `checkedAt`, is untouched.
 */
export function getUpdateNotice(sessionId, { root = REPO_ROOT, now = Date.now() } = {}) {
  const key = repoKey(root);
  const value = readEntry(key, "update")?.value;
  const notice = updateNotice(value, sessionId);
  if (notice?.firstShowing && sessionId) writeEntry(key, "update", { ...value, shownTo: sessionId }, { now });
  return notice;
}

/** The same notice without recording that anyone saw it, for `doctor`. */
export function peekUpdateNotice({ root = REPO_ROOT } = {}) {
  return updateNotice(readEntry(repoKey(root), "update")?.value, null);
}

/** `doctor`'s line: the behaviour, when the check last ran, and what it found. */
export function updatesLine(value, behaviour, now = Date.now()) {
  const head = `updates: ${behaviour.mode}${behaviour.source === "default" ? " (default)" : ""}`;
  if (behaviour.mode === "off") return `${head}, not checking`;
  if (!value || typeof value.checkedAt !== "number") return `${head}, never checked`;
  const hours = Math.max(0, Math.round((now - value.checkedAt) / 3_600_000));
  const when = hours === 0 ? "checked under an hour ago" : `checked ${hours}h ago`;
  if (!value.ok) return `${head}, ${when}: ${value.error}`;
  const arrived = countsText(value.arrived ?? {});
  const what = {
    current: "up to date",
    ready: `${arrived} ready`,
    updated: `updated with ${arrived}`,
    blocked: `blocked by ${value.blockedBy}`,
    failed: `update failed (${value.error})`,
  }[value.outcome] ?? value.outcome;
  return `${head}, ${when}: ${what}`;
}

/** What `check-updates` prints. Fetches; changes nothing. */
export function checkUpdatesReport(root = REPO_ROOT, { updateCommand = "update" } = {}) {
  const found = pendingCommits(root);
  if (!found.ok) return { ok: false, text: `Could not check: ${found.error}` };
  const relevant = found.commits.filter((c) => c.type !== "other");
  if (!found.commits.length) return { ok: true, text: `Up to date (${found.head}).` };
  if (!relevant.length) {
    return { ok: true, text: `Nothing you run has changed: ${found.commits.length} other commit${found.commits.length === 1 ? "" : "s"} waiting.` };
  }
  const lines = [
    `${countsText(counts(found.commits))} waiting (${found.head} to ${found.upstreamHead}):`,
    ...relevant.map((c) => `  ${c.subject}`),
    `Run: ${updateCommand}`,
  ];
  return { ok: true, text: lines.join("\n") };
}
