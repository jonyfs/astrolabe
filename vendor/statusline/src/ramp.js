/**
 * What a level looks like: its colour, and the shape of its bar.
 *
 * Two rules meet here. Colour is preattentive, so a ramp is read before it
 * is read: you know a bar is red in under a quarter of a second, without
 * looking at the number. And colour may not be the only thing carrying the
 * message, because around one man in twelve cannot separate red from green,
 * and Section 508 requires the information to survive that.
 *
 * So each band changes the bar's characters as well as its colour. A
 * screenshot in greyscale, a colour-blind reader and a terminal with a
 * broken palette all still say which band a value is in.
 *
 * Thresholds are item E4's chosen form, 60 and 85, applied to the rate
 * limits too, as E5 asked.
 */

import { ROLE } from "./colourRoles.js";

const BANDS = [
  {
    name: "ok",
    upTo: 60,
    colour: "green",
    /**
     * Solid blocks: nothing to say beyond the length itself.
     *
     * The empty cell is a light horizontal rather than the light shade it was
     * until 2026-09-07. `U+2591` is East Asian Narrow while all three fills
     * are Ambiguous, so on a terminal configured to draw Ambiguous wide the
     * bar changed width as it filled: ten cells were ten columns empty and
     * twenty full. `U+2500` is Ambiguous like the fills, so the bar is one
     * width whatever the level, and it reads as the track the fill has not
     * reached yet.
     */
    filled: "\u2588",
    empty: "\u2500",
    suffix: "",
  },
  {
    name: "warn",
    upTo: 85,
    colour: "peach",
    /** A lighter fill, visibly different from solid without colour. */
    filled: "\u2593",
    empty: "\u2500",
    suffix: "",
  },
  {
    name: "critical",
    upTo: Infinity,
    colour: "red",
    /** Lighter again, and a mark the eye catches even in one colour. */
    filled: "\u2592",
    empty: "\u2500",
    suffix: "!",
  },
];

/** The band a percentage falls in. Anything unusable is treated as unknown. */
export function bandFor(pct) {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return null;
  return BANDS.find((b) => pct < b.upTo) ?? BANDS[BANDS.length - 1];
}

/**
 * The five-cell track before a percentage (specs/046-gauges).
 *
 * Cell `i` is full when `pct >= (i + 0.5) * 20`, so a cell turns on at the
 * middle of the fifth it stands for, and a figure of 10 already shows one.
 * The first and last cell have their own caps and the three between share
 * one, which is how the Nerd Font's progress glyphs join into a bar. An
 * unknown figure is the empty track. `glyphs` is a column of the glyph
 * table; the plain one has ASCII cells, so a terminal with no Nerd Font gets
 * a track it can draw.
 */
export function track(pct, glyphs) {
  const known = typeof pct === "number" && Number.isFinite(pct);
  let out = "";
  for (let i = 0; i < 5; i++) {
    const full = known && pct >= (i + 0.5) * 20;
    const edge = i === 0 ? "Start" : i === 4 ? "End" : "Mid";
    out += glyphs[`track${full ? "Full" : "Empty"}${edge}`];
  }
  return out;
}

/**
 * The band of a usage window by pace: how far ahead of the clock the
 * figure is, not only how much is used. `pace = used - elapsed`, in points.
 * A figure on or behind the clock is fine, up to 15 points ahead is a
 * warning, more is critical, and 90 used is critical whatever the clock says.
 * With no elapsed time (the reset is unknown) the absolute bands apply.
 */
export function paceBand(usedPct, elapsedPct) {
  if (typeof usedPct !== "number" || !Number.isFinite(usedPct)) return { band: null, pace: null };
  if (typeof elapsedPct !== "number" || !Number.isFinite(elapsedPct)) {
    const b = bandFor(usedPct);
    return { band: b?.name ?? null, pace: null };
  }
  const pace = Math.round(usedPct - elapsedPct);
  if (usedPct >= 90 || pace > 15) return { band: "critical", pace };
  if (pace > 0) return { band: "warn", pace };
  return { band: "ok", pace };
}

/** The context's own bands: warn at 70 and critical at 85 unless the repository says. */
export function contextBand(pct, limits = {}) {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return { band: null };
  const valid =
    Number.isFinite(limits?.warn) && Number.isFinite(limits?.critical) && limits.warn > 0 && limits.warn < limits.critical;
  const warn = valid ? limits.warn : 70;
  const critical = valid ? limits.critical : 85;
  return { band: pct >= critical ? "critical" : pct >= warn ? "warn" : "ok" };
}

const EIGHTHS = ["", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589"];

/**
 * A bar of eight cells in eighths of a cell, for the agent rows. Whole cells
 * are `█`, the remainder is one of `▏` to `▉`, and the rest are spaces so the
 * row keeps its columns. 64 steps in 8 columns is what a nine-cell shade bar
 * could not show.
 */
export function eighthsBar(pct, cells = 8) {
  const clamped = typeof pct === "number" && Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const eighths = Math.round((clamped / 100) * cells * 8);
  const whole = Math.floor(eighths / 8);
  const part = EIGHTHS[eighths % 8];
  return "\u2588".repeat(whole) + part + " ".repeat(cells - whole - (part ? 1 : 0));
}

/**
 * The fill, icon and band of a gauge chip (specs/041-colour-budget).
 *
 * A level in the ok band is a neutral chip with a green icon: nothing is
 * wrong, so nothing is loud. The warn band is the attention colour and the
 * critical band is red. An unknown level is neutral with no icon colour, since
 * painting it green would be an answer the payload did not give. `pct` and
 * `band` travel with the chip so a later pass can leave one red among several.
 */
export function gaugeChip(pct, bandName = null) {
  const name = bandName ?? bandFor(pct)?.name ?? null;
  if (!name) return { color: ROLE.neutral };
  // `CLAUDE_STATUSLINE_RAMP=cvd`: no green against red. A blue icon, a yellow
  // fill and a red one differ in hue and in lightness (specs/049).
  const cvd = String(process.env.CLAUDE_STATUSLINE_RAMP ?? "").toLowerCase() === "cvd";
  if (name === "ok") return { color: ROLE.neutral, icon: cvd ? "blue" : ROLE.healthy, pct, band: "ok" };
  if (name === "warn") return { color: cvd ? "yellow" : ROLE.attention, pct, band: "warn" };
  return { color: ROLE.critical, pct, band: "critical" };
}

/**
 * The colour a ramped segment renders in, or the segment's own colour when
 * the value is unknown. An unknown level is not a level, and painting it
 * green would be an answer the payload did not give.
 */
export function rampColour(pct, fallback) {
  return bandFor(pct)?.colour ?? fallback;
}

/**
 * How wide a bar should be, given the terminal.
 *
 * A wider bar resolves smaller differences; a narrower one leaves room for
 * everything else. Item E3's chosen form is to scale with the terminal
 * rather than pick one number for every window.
 */
export function barWidth(columns) {
  if (typeof columns !== "number" || !Number.isFinite(columns)) return 10;
  if (columns < 100) return 8;
  if (columns <= 160) return 10;
  return 16;
}

/**
 * A bar for a percentage: filled cells, then empty ones, then the band's
 * mark when it has one.
 *
 * An unknown percentage produces an empty track rather than a full or an
 * absent one. The number beside it already says `?%`, and a bar that
 * disappeared would make the line's width jump every time the payload
 * skipped a field.
 */
export function bar(pct, columns) {
  const width = barWidth(columns);
  const band = bandFor(pct);
  if (!band) return "░".repeat(width);

  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return band.filled.repeat(filled) + band.empty.repeat(width - filled) + band.suffix;
}
