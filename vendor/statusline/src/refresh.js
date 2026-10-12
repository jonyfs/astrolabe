/**
 * The detached refresh: one lookup, one cache write, then exit.
 *
 * Nobody is waiting on this process. The redraw that started it has
 * already printed its lines and gone, so the budgets here are generous
 * where the redraw's are tight. What matters instead is that it cannot
 * make things worse: a failed lookup leaves the previous good value
 * untouched, so one unreachable network call does not make a segment
 * disappear for a minute, and it keeps the lock for a short back-off, so a
 * lookup that keeps failing is not retried on every redraw.
 */

import { writeEntry, takeLock } from "./cache.js";
import { probeGitInfo, probePrResult, probeCiResult } from "./git.js";
import { probeRtkSavings } from "./rtk.js";
import { probeGateRuns } from "./gateRuns.js";
import { REFRESH_BUDGET_MS, MAX_AGE_MS } from "./freshness.js";

/**
 * Each probe answers with a state as well as a value.
 *
 * `found` and `none` are both answers and both get written: "this branch has
 * no pull request" is worth storing, because storing it is what clears the
 * one the previous branch left in the cache. `failed` is not an answer, and
 * writing it would let an unreachable network look like a closed pull
 * request.
 */
const PROBES = {
  // The git probe also records what it cost, which is what tells the next
  // redraw whether this repository can be asked directly or has to be read
  // from cache.
  git: (cwd, key) => {
    const started = Date.now();
    const snapshot = probeGitInfo(cwd, REFRESH_BUDGET_MS.git);
    writeEntry(key, "gitCost", Date.now() - started, { now: Date.now() });
    return snapshot === null ? { state: "failed", value: null } : { state: "found", value: snapshot };
  },
  pr: (cwd) => probePrResult(cwd, REFRESH_BUDGET_MS.gh),
  rtk: (cwd) => {
    const pct = probeRtkSavings(cwd, REFRESH_BUDGET_MS.rtk);
    return pct === null ? { state: "failed", value: null } : { state: "found", value: pct };
  },
  ci: (cwd) => probeCiResult(cwd, REFRESH_BUDGET_MS.gh),
  // The git hooks running in this repository's worktrees
  // (specs/031-git-gate-rows). Too slow for a redraw, which reads this.
  gates: (cwd) => probeGateRuns(cwd, REFRESH_BUDGET_MS.gates),
  // Copilot CLI's monthly quota (specs/033-copilot-parity). Started only by a
  // redraw under Copilot; `gh` missing or signed out fails and caches nothing.
  copilotQuota: async () => {
    const { probeCopilotQuota } = await import("./copilotQuota.js");
    return probeCopilotQuota();
  },
  // The daily update check (specs/026-update-check). It checks the clone this
  // code runs from, never `cwd`: the working directory is whatever directory
  // the refresh happened to start in, and in `auto` a check pointed at the
  // wrong repository would pull it. The result is always an answer, including
  // a failed fetch, so the next check waits a day instead of every redraw.
  update: async () => {
    const { runUpdateCheck, REPO_ROOT } = await import("./updateCheck.js");
    return { state: "found", value: runUpdateCheck({ root: REPO_ROOT }) };
  },
};

export async function runRefresh(name, key, cwd, { now = Date.now(), probes = PROBES } = {}) {
  const probe = probes[name];
  if (!probe || !key) {
    // An unknown key is not worth an error message nobody will see: this
    // process has no terminal attached.
    return false;
  }

  let result = { state: "failed", value: null };
  try {
    result = (await probe(cwd, key)) ?? result;
  } catch {
    result = { state: "failed", value: null };
  }

  if (result.state === "found" || result.state === "none") {
    // Preserve branch info when writing PR/CI cache entries so they can be
    // invalidated on branch switch. RTK and git don't need branch (global cache
    // for RTK, fast local check for git), so only wrap for pr/ci (spec 014 fix).
    let value = result.value;
    if ((name === "pr" || name === "ci") && result.value) {
      value = { ...result.value, branch: result.branch };
    } else if ((name === "pr" || name === "ci") && result.branch) {
      value = { branch: result.branch };
    }
    writeEntry(key, name, value, { now: Date.now() });
    if (name === "pr") writeEntry(key, "prFailed", false, { now: Date.now() });
    takeLock(key, name, { now, release: true });
    return result.state === "found";
  }

  // Releasing the lock here let the very next redraw spawn another process
  // for a lookup that had just failed, so an unauthenticated `gh` or a
  // missing `rtk` cost one node process every few seconds. A quarter of the
  // maximum age instead: a refresh starts at half of it, so one retry still
  // lands before the value this one left in place expires.
  // A failed pull request lookup leaves a marker, so the bar can draw a dim
  // icon instead of a blank that reads as "no pull request".
  if (name === "pr") writeEntry(key, "prFailed", true, { now: Date.now() });
  takeLock(key, name, { now: Date.now(), holdFor: (MAX_AGE_MS[name] ?? 60_000) / 4 });
  return false;
}
