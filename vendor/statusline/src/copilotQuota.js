/**
 * The GitHub Copilot account's monthly quotas (specs/033-copilot-parity).
 *
 * Copilot meters a month, not Claude Code's five hours and seven days, and its
 * status line payload carries neither. GitHub reports the month through
 * `GET /copilot_internal/user`: per quota, the share remaining, the monthly
 * entitlement, whether it is unlimited, and one reset date for the account.
 * The endpoint is internal and undocumented, so everything here is defensive:
 * a field missing or of the wrong type drops that quota, never the redraw.
 *
 * `gh` makes the call with the token it already holds, so no credential passes
 * through this code. It is a network call, so it runs only in the detached
 * refresh, the way the pull request and CI lookups do, and only under Copilot:
 * a Claude Code session never starts it.
 */

import { execFileSync } from "node:child_process";
import os from "node:os";
import { MAX_AGE_MS, REFRESH_BUDGET_MS } from "./freshness.js";
import { repoKey, readEntry, shouldRefresh, spawnRefresh } from "./cache.js";

/** The quota is the account's, whichever directory asks, so there is one entry. */
export const COPILOT_QUOTA_KEY = repoKey("copilot-quota-global");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** `2026-11-01` as `Nov 1`, read as a calendar date so no time zone moves it. */
export function formatQuotaDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date ?? ""));
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${MONTHS[month - 1]} ${day}`;
}

/**
 * One quota as the bar draws it, or null when it has nothing to meter: an
 * unlimited quota and an entitlement of zero (a plan without it) both make a
 * gauge that cannot move. `full` is GitHub's own `has_quota: false`, which is
 * what it says once the month's allowance is gone.
 */
function quota(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  if (snapshot.unlimited === true) return null;
  const entitlement = snapshot.entitlement;
  const remaining = snapshot.percent_remaining;
  if (typeof entitlement !== "number" || !Number.isFinite(entitlement) || entitlement <= 0) return null;
  if (typeof remaining !== "number" || !Number.isFinite(remaining)) return null;
  const usedPct = Math.min(100, Math.max(0, Math.round(100 - remaining)));
  return { usedPct, entitlement, unlimited: false, full: snapshot.has_quota === false || usedPct >= 100 };
}

/** The response, kept to what the bar draws, or null when it carries no quota at all. */
export function normalizeCopilotQuota(raw) {
  const snapshots = raw?.quota_snapshots;
  if (!snapshots || typeof snapshots !== "object") return null;
  const resetDate = /^\d{4}-\d{2}-\d{2}/.test(String(raw.quota_reset_date ?? ""))
    ? String(raw.quota_reset_date).slice(0, 10)
    : /^\d{4}-\d{2}-\d{2}/.test(String(raw.quota_reset_date_utc ?? ""))
      ? String(raw.quota_reset_date_utc).slice(0, 10)
      : null;
  return {
    resetDate,
    quotas: {
      premium: quota(snapshots.premium_interactions),
      chat: quota(snapshots.chat),
    },
  };
}

function runGh(timeout) {
  return execFileSync("gh", ["api", "/copilot_internal/user"], {
    timeout,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

/**
 * The live call, for the detached refresh. `gh` missing, not signed in, or the
 * network down is `failed`, which caches nothing; a response with no quota in
 * it is an answer, `none`.
 */
export function probeCopilotQuota({ timeout = REFRESH_BUDGET_MS.copilotQuota, run = runGh } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(run(timeout));
  } catch {
    return { state: "failed", value: null };
  }
  const value = normalizeCopilotQuota(parsed);
  return value ? { state: "found", value } : { state: "none", value: null };
}

/** The cached quota, for the redraw, starting a refresh when it is half expired. */
export function getCopilotQuota({ now = Date.now(), refresh = true } = {}) {
  const entry = readEntry(COPILOT_QUOTA_KEY, "copilotQuota");
  // `doctor` reads without starting a lookup.
  if (refresh && shouldRefresh("copilotQuota", entry, now)) spawnRefresh(COPILOT_QUOTA_KEY, "copilotQuota", os.homedir(), { now });
  if (!entry || now - entry.at > MAX_AGE_MS.copilotQuota) return null;
  return entry.value ?? null;
}
