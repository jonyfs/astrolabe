/**
 * How old a value is allowed to be before the statusline stops showing it,
 * and how long a redraw may wait for the source that produces it.
 *
 * These two tables are the whole freshness policy. They live here rather
 * than scattered through the renderer so that "is this segment allowed on
 * screen right now" is one question with one answer, testable without
 * rendering anything.
 */

/**
 * Claude Code re-invokes the statusline command roughly every 5-6 seconds
 * while you work. "One redraw old" therefore means about six seconds.
 */
export const REDRAW_INTERVAL_MS = 6_000;

/**
 * Maximum age per segment, in milliseconds.
 *
 * `pr` and `rtk` are expensive and change rarely, so a minute-old value is
 * honest. The git-derived segments are normally gathered fresh on every
 * redraw in about 30 ms; the 5-second allowance exists for a repository
 * large enough that `git status` blows its budget, where a slightly stale
 * branch beats no branch at all (research.md, Decision 8).
 */
export const MAX_AGE_MS = {
  dir: REDRAW_INTERVAL_MS,
  branch: 5_000,
  remote: 24 * 60 * 60 * 1000,
  // Identity parsed by Claude Code from the origin remote. It arrives with
  // the payload, so it is as current as the redraw.
  repo: REDRAW_INTERVAL_MS,
  worktree: REDRAW_INTERVAL_MS,
  conflicts: 5_000,
  // Counted by the same git snapshot the branch comes from, so it keeps the
  // same allowance. Without a row here the segment renders and the
  // diagnostic reports it as absent, which is the diagnostic contradicting
  // the line it exists to explain.
  worktreeState: 5_000,
  compaction: 1_000,
  burnRate: REDRAW_INTERVAL_MS,
  projection: REDRAW_INTERVAL_MS,
  trend: REDRAW_INTERVAL_MS,
  clock: REDRAW_INTERVAL_MS,
  projectDir: REDRAW_INTERVAL_MS,
  agent: REDRAW_INTERVAL_MS,
  sessionName: REDRAW_INTERVAL_MS,
  // Both arrive with the payload, so they are as current as the redraw. The
  // segments that read them have their own rows further down.
  tokens: 1_000,
  sessionCost: 1_000,
  contextSize: 1_000,
  exceeds200k: 1_000,
  duration: 1_000,
  linesChanged: 1_000,
  apiTime: 1_000,
  // Not a segment: the cache key the three git-derived segments share.
  git: 5_000,
  pr: 60_000,
  rtk: 60_000,
  // A network call, so it lives behind the same background refresh the
  // pull request uses. A green tick ten minutes old is worse than none.
  ci: 60_000,
  todo: REDRAW_INTERVAL_MS,
  activity: REDRAW_INTERVAL_MS,
  skills: REDRAW_INTERVAL_MS,
  model: REDRAW_INTERVAL_MS,
  effort: REDRAW_INTERVAL_MS,
  outputStyle: REDRAW_INTERVAL_MS,
  // The usage figures arrive on stdin with this very redraw. A value from
  // an earlier one describes a session state that no longer exists, so the
  // allowance is only wide enough to cover the milliseconds between
  // building the reading and checking it.
  context: 1_000,
  fiveHour: 1_000,
  fiveHourReset: 1_000,
  sevenDay: 1_000,
  sevenDayReset: 1_000,
  spendLimit: 1_000,
  spendLimitReset: 1_000,
  promptCache: 1_000,
  // The daily update check (specs/026-update-check). As a cache key this is
  // also how long its lock lasts, so a check killed part-way is retried the
  // next day rather than on the next redraw.
  update: 24 * 60 * 60 * 1000,
  vim: REDRAW_INTERVAL_MS,
  fastMode: REDRAW_INTERVAL_MS,
  harness: REDRAW_INTERVAL_MS,
  premiumRequests: REDRAW_INTERVAL_MS,
  allowAll: REDRAW_INTERVAL_MS,
  // The git gates running in this repository (specs/031-git-gate-rows). As a
  // cache key this is how long a refresh's lock lasts; the redraw checks every
  // cached run's pid itself, so the rows never outlive the processes.
  gates: 10_000,
  // Copilot CLI's monthly quota, from `gh api /copilot_internal/user`
  // (specs/033-copilot-parity). A refresh starts at half of this, so the
  // figure is about five minutes old at most in steady use; a month's meter
  // does not move faster than that matters.
  copilotQuota: 10 * 60 * 1000,
  premiumQuota: 10 * 60 * 1000,
  chatQuota: 10 * 60 * 1000,
  // The AI credits Copilot reports with this very payload.
  aiCredits: REDRAW_INTERVAL_MS,
  // Codex's other window and credit balance, read from the rollout with the
  // payload they arrive in (specs/037-codex-windows).
  codexWindow: REDRAW_INTERVAL_MS,
  codexCredits: REDRAW_INTERVAL_MS,
};

/**
 * How long a redraw may wait for each source.
 *
 * The four on-path budgets sum to 290 ms, under the 300 ms a redraw is
 * allowed by FR-001, which is the worst case where every one of them times
 * out at once. `gh` and `rtk` are not on this list: they are never called
 * during a redraw, only by the detached refresh, which has nobody waiting
 * on it.
 */
export const SOURCE_BUDGET_MS = {
  git: 150,
  transcript: 100,
  hook: 20,
  cache: 20,
};

/** Budgets for the detached refresh, which runs after the redraw has exited. */
export const REFRESH_BUDGET_MS = {
  git: 10_000,
  gh: 5_000,
  rtk: 5_000,
  // A fetch, a fast-forward and an install, one after the other.
  update: 120_000,
  // `git worktree list`, `ps` over every process and, on macOS, one `lsof`.
  gates: 5_000,
  // One `gh api` call.
  copilotQuota: 5_000,
};

/** The bytes the transcript tail read may consume before it gives up. */
export const TRANSCRIPT_BYTE_CAP = 4 * 1024 * 1024;

/** Builds a reading. `at` defaults to now, since most readings are fresh. */
export function reading({ value = null, at = Date.now(), source = "unknown", fresh = true, tookMs = 0, error = null } = {}) {
  return { value, at, source, fresh, tookMs, error };
}

/** A reading for a source that had nothing to say, carrying why for the diagnostic. */
export function missing(source, error, tookMs = 0) {
  return reading({ value: null, source, error, tookMs });
}

/**
 * Whether a segment may render right now.
 *
 * A value of `null` never renders: an absent segment is the honest way to
 * say a source had nothing. A value older than its maximum age does not
 * render either, whatever it holds, which is what stops a cached pull
 * request from posing as the current one.
 *
 * A reading stamped in the future is refused rather than trusted. At
 * runtime that only happens when the clock jumps, and trusting it would
 * keep a stale value alive for as long as the skew lasts.
 *
 * The five payload-derived usage segments are the one exception, and they
 * are handled by the renderer rather than here: they keep their slot and
 * show `?%`, because a reader who cannot see a context figure needs to
 * know it is unknown rather than wonder where the segment went
 * (Principle III, FR-010).
 */
export function isRenderable(key, reading, now = Date.now()) {
  if (!reading || reading.value === null || reading.value === undefined) return false;
  const maxAge = MAX_AGE_MS[key];
  if (maxAge === undefined) return false;
  const age = now - reading.at;
  if (age < 0) return false;
  return age <= maxAge;
}

/** How old a reading is, for the diagnostic. */
export function ageMs(reading, now = Date.now()) {
  return reading ? now - reading.at : Infinity;
}
