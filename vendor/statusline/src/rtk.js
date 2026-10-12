import { execFileSync } from "node:child_process";
import { MAX_AGE_MS, REFRESH_BUDGET_MS } from "./freshness.js";
import { repoKey, readEntry, shouldRefresh, spawnRefresh } from "./cache.js";

/**
 * Token-savings stats from the `rtk` CLI (Rust Token Killer), read from
 * cache only.
 *
 * The figure moves slowly and the process costs more than the redraw can
 * spare, so the redraw reads the last known value and starts a detached
 * refresh when it is halfway to expiring. With `rtk` absent, or its output
 * unparseable, nothing is ever cached and the segment simply never
 * appears, which is what it did before.
 */
/**
 * `rtk gain` reports the average across everything rtk has ever proxied, not
 * across this repository, so one cache entry serves every directory. Keying
 * it per repository stored the same global number once per repository and
 * paid for a fresh lookup in each of them.
 */
export const RTK_CACHE_KEY = repoKey("rtk-global");

export function getRtkSavings(cwd, { now = Date.now() } = {}) {
  const key = RTK_CACHE_KEY;
  const entry = readEntry(key, "rtk");
  if (shouldRefresh("rtk", entry, now)) spawnRefresh(key, "rtk", cwd, { now });
  if (!entry || now - entry.at > MAX_AGE_MS.rtk) return null;
  return entry.value;
}

/** The live call, used by the detached refresh and by `doctor`. */
export function probeRtkSavings(cwd, timeout = REFRESH_BUDGET_MS.rtk) {
  try {
    const out = execFileSync("rtk", ["gain", "--format", "json"], {
      cwd,
      timeout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    const pct = JSON.parse(out)?.summary?.avg_savings_pct;
    if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
    return Math.round(pct);
  } catch {
    return null;
  }
}
