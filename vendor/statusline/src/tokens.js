/**
 * Context %, 5-hour %, and 7-day % below come straight from Claude Code's
 * statusLine stdin payload — no local estimation. Verified against a real
 * payload captured from a live session:
 *
 *   context_window: { used_percentage, remaining_percentage, ... }
 *   rate_limits: { five_hour: { used_percentage, resets_at }, seven_day: { ... } }
 *
 * Behind a Claude gateway with spend limits, `rate_limits` also carries
 * `spend_limit` with the same two fields. Its percentage goes above 100 once
 * the limit is exceeded, and the entry is absent everywhere else, so an
 * absent spend limit is the normal case rather than an unknown one
 * (specs/023-extra-usage-limit).
 *
 * A field the payload does not carry stays null here and renders as `?%`.
 * Principle III forbids standing an estimate in its place.
 */

import { plainText } from "./text.js";

const finiteNumber = (v) => typeof v === "number" && Number.isFinite(v);

/**
 * The context figure. `used_percentage` first, always: it is the field Claude
 * Code sends and the one this was written for.
 *
 * GitHub Copilot CLI sends it as null until its first model call, and alongside
 * it two fields of its own that describe the same thing, the current context
 * against the limit it displays (specs/033-copilot-parity). They are read only
 * in that gap, so a payload that has `used_percentage` is never second-guessed.
 * Both are Copilot's figures, not estimates (Principle III); a limit of zero
 * gives no figure at all.
 */
export function getContextPercent(payload) {
  const cw = payload?.context_window;
  const pct = cw?.used_percentage;
  if (finiteNumber(pct)) return Math.round(pct);
  const current = cw?.current_context_used_percentage;
  if (finiteNumber(current) && current >= 0) return Math.round(current);
  const tokens = cw?.current_context_tokens;
  const limit = cw?.displayed_context_limit;
  if (finiteNumber(tokens) && tokens >= 0 && finiteNumber(limit) && limit > 0) return Math.round((tokens / limit) * 100);
  return null;
}

/** A usable spend figure: finite and not negative. Above 100 is allowed. */
function spendPercent(v) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

export function getRateLimits(payload) {
  const fiveHour = payload?.rate_limits?.five_hour;
  const sevenDay = payload?.rate_limits?.seven_day;
  const spend = payload?.rate_limits?.spend_limit;
  const spendLimitPct = spendPercent(spend?.used_percentage);
  return {
    spendLimitPct,
    // A reset with no figure beside it describes nothing on the bar.
    spendLimitResetsAt:
      spendLimitPct !== null && typeof spend?.resets_at === "number" ? spend.resets_at : null,
    fiveHourPct: typeof fiveHour?.used_percentage === "number" ? Math.round(fiveHour.used_percentage) : null,
    fiveHourResetsAt: typeof fiveHour?.resets_at === "number" ? fiveHour.resets_at : null,
    sevenDayPct: typeof sevenDay?.used_percentage === "number" ? Math.round(sevenDay.used_percentage) : null,
    sevenDayResetsAt: typeof sevenDay?.resets_at === "number" ? sevenDay.resets_at : null,
  };
}

/**
 * How long a window is judged to be "resetting now" once its moment has
 * passed. Inside this grace period the reset is genuinely happening; past
 * it, the payload is describing a moment that is over, and the honest
 * answer is that the next reset time is unknown rather than a countdown
 * that has been saying "now" for three hours.
 */
const RESETTING_GRACE_MS = 2 * 60 * 1000;

/** The longest window the payload describes, with room to spare. */
const MAX_PLAUSIBLE_WINDOW_MS = 30 * 24 * 3600 * 1000;

/**
 * A spend limit's period can be a calendar month, and a 31-day month would
 * trip the windows' 30-day bound. The bound exists to catch a timestamp in
 * milliseconds, which lands twenty million days out, so 32 days catches it
 * just as well.
 */
export const MAX_PLAUSIBLE_SPEND_PERIOD_MS = 32 * 24 * 3600 * 1000;

/**
 * `resetsAt` is a Unix timestamp in seconds, as returned by the payload.
 * `now` is injectable so a countdown can be tested at a chosen instant
 * rather than only against the wall clock.
 */
export function formatResetCountdown(resetsAtSeconds, now = Date.now(), { maxMs = MAX_PLAUSIBLE_WINDOW_MS } = {}) {
  if (typeof resetsAtSeconds !== "number" || !Number.isFinite(resetsAtSeconds)) return null;
  const diffMs = resetsAtSeconds * 1000 - now;
  // The windows this formats are bounded by their own names: five hours and
  // seven days. A reset further out than that is not a longer window, it is a
  // timestamp in the wrong unit — milliseconds where seconds were meant, which
  // is finite, positive, and renders as a confident `resets in 20687174d`.
  // Beyond the bound the honest answer is that the reset time is unknown,
  // which the bar already draws as `?`. A spend limit passes its own, longer
  // bound, since its period can be a month.
  if (diffMs > maxMs) return null;
  if (diffMs <= 0) {
    return diffMs > -RESETTING_GRACE_MS ? "resetting now" : null;
  }

  const totalHours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  // Past a day, hours-only reads as noise ("resets in 78h00m") — the
  // 7-day window routinely lands days out, so switch units there.
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `resets in ${days}d ${hours}h`;
  }
  return `resets in ${totalHours}h${String(minutes).padStart(2, "0")}m`;
}

/**
 * Token counts are long, and a bar cares more about a predictable column
 * count than about the last three digits. 16,742 becomes 16.7k; 1,000,000
 * becomes 1M. Item E9's chosen form.
 */
export function abbreviate(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (Math.abs(n) < 1000) return String(Math.round(n));
  if (Math.abs(n) < 1_000_000) {
    const k = n / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  const m = n / 1_000_000;
  return `${m >= 100 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * The context window's own numbers: how many tokens are in it, how big it
 * is, and whether the payload's fixed 200k flag is set. All three come
 * straight from the payload; none is estimated.
 */
export function getContextTokens(payload) {
  const cw = payload?.context_window;
  const input = typeof cw?.total_input_tokens === "number" ? cw.total_input_tokens : null;
  const output = typeof cw?.total_output_tokens === "number" ? cw.total_output_tokens : null;
  // Copilot's displayed limit stands in for a window size it has not sent yet
  // (specs/033-copilot-parity); Claude Code never sends that field.
  const size =
    typeof cw?.context_window_size === "number"
      ? cw.context_window_size
      : finiteNumber(cw?.displayed_context_limit) && cw.displayed_context_limit > 0
        ? cw.displayed_context_limit
        : null;
  const used = input === null && output === null ? null : (input ?? 0) + (output ?? 0);
  return { input, output, used, size, exceeds200k: payload?.exceeds_200k_tokens === true };
}

/**
 * What the session has cost in time and lines. Dollars are in the payload
 * too, and were not selected.
 */
export function getSessionCost(payload) {
  const c = payload?.cost;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    durationMs: num(c?.total_duration_ms),
    apiMs: num(c?.total_api_duration_ms),
    linesAdded: num(c?.total_lines_added),
    linesRemoved: num(c?.total_lines_removed),
  };
}

/**
 * `1h04`, or `4m` under an hour. Item A4's form without its trailing `m`
 * (specs/044-chip-copy): after an `h` the minutes are already minutes.
 */
export function formatDuration(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) return null;
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h${String(minutes % 60).padStart(2, "0")}` : `${minutes}m`;
}

/**
 * A countdown with no words, for the segment that carries two of them.
 * `1h29m`, `3d`, or null when the moment is unknown or long past.
 */
export function shortCountdown(resetsAtSeconds, now = Date.now(), bound = {}) {
  const full = formatResetCountdown(resetsAtSeconds, now, bound);
  if (full === null) return null;
  if (full === "resetting now") return "now";
  // `2h09m` is `2h09`: once an `h` has said hours, the minutes need no unit.
  return full
    .replace(/^resets in /, "")
    .replace(/ (\d+)h$/, "")
    .replace(/^0h(\d\d)m$/, (_, m) => `${Number(m)}m`)
    .replace(/^(\d+h\d\d)m$/, "$1");
}

/**
 * The prompt cache, as Claude Code 2.1.283+ describes it on every redraw
 * (specs/025-prompt-cache-chip). The block is absent until the first request
 * completes, and `ttl` is only ever `5m` or `1h`, both confirmed from the
 * builder in the installed binary rather than assumed.
 *
 * Null when there is no usable block: `warm` is the subject, so without a
 * boolean there is nothing to say. Every other field is checked on its own
 * and dropped when unusable, so one bad number costs one figure, not the
 * chip.
 */
const PROMPT_CACHE_TTLS = new Set(["5m", "1h"]);

/** How close to expiry a warm cache has to be before it is worth a chip. */
export const PROMPT_CACHE_CLOSING_S = { "5m": 120, "1h": 600 };

/** No TTL is longer than this; an expiry beyond it is in the wrong unit. */
const PROMPT_CACHE_MAX_AHEAD_S = 3600;

/**
 * The miss causes, as the chip says them. `null` means the cause says nothing
 * a cold cache does not already say: a TTL expiry is what cold means, and
 * `unknown` is the absence of a cause.
 */
const PROMPT_CACHE_CAUSES = {
  tools_changed: "tools changed",
  system_prompt_changed: "prompt changed",
  model_changed: "model changed",
  messages_rewritten: "history rewritten",
  likely_server_side: "server side",
  unknown: null,
  ttl_expired_5m: null,
  ttl_expired_1h: null,
};

function cacheCause(causes) {
  if (!Array.isArray(causes)) return null;
  for (const code of causes) {
    const text = plainText(code);
    if (!text) continue;
    if (Object.hasOwn(PROMPT_CACHE_CAUSES, text)) {
      if (PROMPT_CACHE_CAUSES[text] !== null) return PROMPT_CACHE_CAUSES[text];
      continue;
    }
    // A cause added after this was written: say it as sent rather than drop
    // it or pretend to know what it means.
    return text;
  }
  return null;
}

export function getPromptCache(payload, now = Date.now()) {
  const pc = payload?.prompt_cache;
  if (!pc || typeof pc !== "object" || typeof pc.warm !== "boolean") return null;
  const finite = (v) => typeof v === "number" && Number.isFinite(v);
  const count = (v) => (finite(v) && v >= 0 ? v : null);

  const ttl = PROMPT_CACHE_TTLS.has(pc.ttl) ? pc.ttl : null;
  const aheadS = finite(pc.expires_at) ? pc.expires_at - now / 1000 : null;
  const expired = aheadS !== null && aheadS <= 0;
  const state = pc.warm && !expired ? "warm" : "cold";
  const secondsLeft =
    state === "warm" && aheadS !== null && aheadS <= PROMPT_CACHE_MAX_AHEAD_S ? Math.floor(aheadS) : null;

  return {
    state,
    ttl,
    secondsLeft,
    closing: state === "warm" && ttl !== null && secondsLeft !== null && secondsLeft <= PROMPT_CACHE_CLOSING_S[ttl],
    observed: pc.caching_observed === true,
    recacheTokens: count(pc.recache_tokens_if_cold),
    cause: state === "cold" ? cacheCause(pc.last_miss_cause?.causes) : null,
    hitRatio: finite(pc.hit_ratio) && pc.hit_ratio >= 0 && pc.hit_ratio <= 1 ? pc.hit_ratio : null,
    misses: count(pc.misses),
    requests: count(pc.requests),
  };
}

/** `1m`, `9m`, or `<1m`: whole minutes rounded down, never promising time that is not there. */
export function cacheMinutesLeft(secondsLeft) {
  if (typeof secondsLeft !== "number") return null;
  return secondsLeft < 60 ? "<1m" : `${Math.floor(secondsLeft / 60)}m`;
}
