/**
 * A short history of the numbers that move.
 *
 * Three selected items need to know where a value has been, not only where it
 * is: the burn rate on the 5-hour window, the projection that follows from
 * it, and the context trend.
 *
 * The samples live in the per-session state file the change tracker already
 * writes, swept on the same schedule and failing the same safe way. A second
 * store would have doubled the failure modes for the same data.
 *
 * The ring is bounded at sixty samples, roughly six minutes of redraws, and
 * a rate is refused below five samples spanning a minute. A rate computed
 * over twelve seconds swings wildly, and a number that swings wildly beside
 * measured ones gets read as measured.
 */

/** How many samples to keep. */
export const MAX_SAMPLES = 60;

/**
 * How far back a rate may reach.
 *
 * A count is not a bound on time. Redraws are event-driven, and the installed
 * refresh interval is 60 seconds, so sixty samples can span an hour — or a
 * whole night, if the session was left open. A rate drawn across that says
 * what the average was while nobody was working, presented beside numbers
 * that describe now.
 */
export const MAX_SPAN_MS = 15 * 60_000;

/**
 * A gap this long ends the history rather than stretching it.
 *
 * Nothing was observed across the gap, so the two sides of it are two
 * different stretches of work, and a line drawn between them is a rate over
 * a period that was never measured.
 */
export const MAX_GAP_MS = 5 * 60_000;

/**
 * A drop this large in a tracked percentage means the window reset.
 *
 * The 5-hour figure only climbs inside its window; when the window rolls it
 * falls to near nothing. Samples from before that point describe a window
 * that no longer exists, and a rate spanning the boundary is arithmetic on
 * two unrelated series.
 */
export const RESET_DROP_POINTS = 5;

/** Below these, a rate is not computed at all. */
export const MIN_SAMPLES_FOR_RATE = 5;
export const MIN_SPAN_MS = 60_000;

/**
 * Appends a sample and evicts the oldest. Values that are absent stay
 * absent: a missing percentage is not a zero.
 */
export function pushSample(samples, sample) {
  const ring = Array.isArray(samples) ? samples : [];
  const clean = {
    at: sample.at,
    contextPct: numberOrNull(sample.contextPct),
    fiveHourPct: numberOrNull(sample.fiveHourPct),
    rtkPct: numberOrNull(sample.rtkPct),
  };
  // A clock that jumped backwards would make every rate negative. Drop the
  // out-of-order sample rather than the whole history.
  const last = ring[ring.length - 1];
  if (last && clean.at < last.at) return ring;

  // Two things end the history rather than extending it: a gap nobody
  // observed, and a window that reset underneath it.
  if (last && (clean.at - last.at > MAX_GAP_MS || windowReset(last, clean))) return [clean];

  const kept = [...ring, clean].filter((s) => clean.at - s.at <= MAX_SPAN_MS);
  return kept.slice(-MAX_SAMPLES);
}

/** Whether the 5-hour figure fell far enough to mean the window rolled. */
function windowReset(previous, current) {
  const before = numberOrNull(previous?.fiveHourPct);
  const after = numberOrNull(current?.fiveHourPct);
  if (before === null || after === null) return false;
  return before - after >= RESET_DROP_POINTS;
}

function numberOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Whether the ring holds enough to say anything about a direction. */
export function hasEnough(samples, field) {
  const usable = (samples || []).filter((s) => numberOrNull(s?.[field]) !== null);
  if (usable.length < MIN_SAMPLES_FOR_RATE) return false;
  return usable[usable.length - 1].at - usable[0].at >= MIN_SPAN_MS;
}

/**
 * Percentage points per hour, from the first usable sample to the last.
 *
 * Null when there is not enough history, which is the first minute of every
 * session. Rendering nothing there is deliberate: a rate is a claim about
 * the future, and one drawn from twelve seconds of past is not one worth
 * making.
 */
export function ratePerHour(samples, field) {
  if (!hasEnough(samples, field)) return null;
  const usable = samples.filter((s) => numberOrNull(s?.[field]) !== null);
  const first = usable[0];
  const last = usable[usable.length - 1];
  const hours = (last.at - first.at) / 3_600_000;
  if (hours <= 0) return null;
  return (last[field] - first[field]) / hours;
}

/**
 * When a percentage climbing at this rate would reach 100, in Unix
 * milliseconds. Null when it is falling, flat, or the rate is unknown.
 */
export function projectFull(samples, field, now) {
  const rate = ratePerHour(samples, field);
  if (rate === null || rate <= 0) return null;
  const usable = samples.filter((s) => numberOrNull(s?.[field]) !== null);
  const current = usable[usable.length - 1][field];
  if (current >= 100) return now;
  return now + ((100 - current) / rate) * 3_600_000;
}




const SPARK = "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588";

/**
 * The last `count` readings of one field as a sparkline, or null when there
 * are fewer. Scaled to the field's own range in the window, so a flat line is
 * flat and a climb is a staircase; a field that never moved is the lowest cell.
 */
export function sparkline(samples, field, count = 8) {
  const values = (Array.isArray(samples) ? samples : [])
    .map((s) => s?.[field])
    .filter((v) => typeof v === "number" && Number.isFinite(v))
    .slice(-count);
  if (values.length < count) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values
    .map((v) => SPARK[hi === lo ? 0 : Math.round(((v - lo) / (hi - lo)) * (SPARK.length - 1))])
    .join("");
}
