/**
 * Colour maths for the bar: WCAG 2.2 contrast, OKLCH, and the text colour a
 * chip is drawn with.
 *
 * Pure and dependency free, so the suite can test it with the ratios the
 * design review measured. Nothing here reads the environment.
 */

const MIN_RATIO = 4.5;
const STEP = 0.04;
const FIXED_CANDIDATES = ["#11111b", "#ffffff"];

/** The high-contrast mode: pure black or white at 7:1 (specs/049). */
export const HIGH = { min: 7, candidates: ["#000000", "#ffffff"], key: "high" };

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const fromLinear = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return c;
};

/** WCAG 2.2 relative luminance. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.2 contrast ratio, 1 to 21. */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB hex to OKLCH: L 0 to 1, C chroma, h hue in degrees. */
export function toOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  const h = C < 1e-6 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

function oklchToLinear({ L, C, h }) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH to hex. Chroma is reduced until the colour fits sRGB; hue is kept. */
export function fromOklch({ L, C, h }) {
  const lightness = Math.min(1, Math.max(0, L));
  let rgb = oklchToLinear({ L: lightness, C, h });
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ L: lightness, C: mid, h }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinear({ L: lightness, C: lo, h });
  }
  return rgbToHex(rgb.map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255)));
}

/**
 * A lighter colour with the same hue. Lightness moves toward white by
 * `ratio` of what is left; chroma is kept where sRGB allows it.
 */
export function lightenOklch(hex, ratio = 0.45) {
  const { L, C, h } = toOklch(hex);
  return fromOklch({ L: L + (1 - L) * ratio, C, h });
}

function best(candidates, bg) {
  let pick = candidates[0];
  let top = contrastRatio(pick, bg);
  for (let i = 1; i < candidates.length; i++) {
    const r = contrastRatio(candidates[i], bg);
    if (r > top) {
      top = r;
      pick = candidates[i];
    }
  }
  return { fg: pick, ratio: top };
}

const readableMemo = new Map();

/**
 * A colour moved in OKLCH lightness until it reaches 4.5:1 on a background,
 * away from the background's own lightness, hue and chroma kept. A colour
 * that already reads is returned as it is.
 */
export function readableOn(hex, bg, min = MIN_RATIO) {
  const key = `${hex}|${bg}|${min}`;
  const hit = readableMemo.get(key);
  if (hit) return hit;
  let out = hex;
  if (contrastRatio(hex, bg) < min) {
    const { L, C, h } = toOklch(hex);
    const direction = toOklch(bg).L > 0.6 ? -1 : 1;
    for (let level = L + direction * STEP; level >= 0 && level <= 1; level += direction * STEP) {
      out = fromOklch({ L: level, C, h });
      if (contrastRatio(out, bg) >= min) break;
    }
  }
  readableMemo.set(key, out);
  return out;
}

const memo = new WeakMap();

/**
 * The text colour for a chip with this background, and the background to
 * draw it on.
 *
 * The candidate with the highest contrast wins, `crust` first so a tie keeps
 * the colour the bar always used. When none reaches 4.5:1 the background is
 * darkened in OKLCH, a step at a time, until one does. `snap` rounds each
 * darkened colour to what the terminal can draw, so the ratio that is checked
 * is the ratio that is shown; the memo is per palette, which is one snap.
 */
export function chipColours(palette, bg, snap = (hex) => hex, mode = null) {
  const min = mode?.min ?? MIN_RATIO;
  const cacheKey = mode ? `${mode.key}|${bg}` : bg;
  let byBg = memo.get(palette);
  if (!byBg) memo.set(palette, (byBg = new Map()));
  const hit = byBg.get(cacheKey);
  if (hit) return hit;

  const candidates = mode ? mode.candidates : [palette.crust, palette.text, ...FIXED_CANDIDATES].filter(Boolean);
  let { fg, ratio } = best(candidates, bg);
  let drawn = bg;
  if (ratio < min) {
    const { L, C, h } = toOklch(bg);
    for (let level = L - STEP; level > -STEP; level -= STEP) {
      // `snap` is the terminal's own rounding: a darker colour that rounds
      // back to the one that failed is no step at all.
      drawn = snap(fromOklch({ L: Math.max(0, level), C, h }));
      ({ fg, ratio } = best(candidates, drawn));
      if (ratio >= min || level <= 0) break;
    }
  }
  const result = { fg, bg: drawn };
  byBg.set(cacheKey, result);
  return result;
}
