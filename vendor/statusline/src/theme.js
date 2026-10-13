import { WIDE } from "./data/wide.js";
import { chipColours, contrastRatio, lightenOklch, readableOn, toOklch, HIGH } from "./contrast.js";

export const PALETTES = {
  mocha: {
    crust: "#11111b", mantle: "#181825", base: "#1e1e2e",
    surface0: "#313244", surface1: "#45475a", surface2: "#585b70", text: "#cdd6f4",
    red: "#f38ba8", peach: "#fab387", yellow: "#f9e2af", green: "#a6e3a1",
    sapphire: "#74c7ec", blue: "#89b4fa", lavender: "#b4befe", mauve: "#cba6f7",
    flamingo: "#f2cdcd", teal: "#94e2d5", pink: "#f5c2e7",
  },
  frappe: {
    crust: "#232634", mantle: "#292c3c", base: "#303446",
    surface0: "#414559", surface1: "#51576d", surface2: "#626880", text: "#c6d0f5",
    red: "#e78284", peach: "#ef9f76", yellow: "#e5c890", green: "#a6d189",
    sapphire: "#85c1dc", blue: "#8caaee", lavender: "#babbf1", mauve: "#ca9ee6",
    flamingo: "#eebebe", teal: "#81c8be", pink: "#f4b8e4",
  },
  macchiato: {
    crust: "#181926", mantle: "#1e2030", base: "#24273a",
    surface0: "#363a4f", surface1: "#494d64", surface2: "#5b6078", text: "#cad3f5",
    red: "#ed8796", peach: "#f5a97f", yellow: "#eed49f", green: "#a6da95",
    sapphire: "#7dc4e4", blue: "#8aadf4", lavender: "#b7bdf8", mauve: "#c6a0f6",
    flamingo: "#f0c6c6", teal: "#8bd5ca", pink: "#f5bde6",
  },
  latte: {
    crust: "#dce0e8", mantle: "#e6e9ef", base: "#eff1f5",
    surface0: "#ccd0da", surface1: "#bcc0cc", surface2: "#acb0be", text: "#4c4f69",
    red: "#d20f39", peach: "#fe640b", yellow: "#df8e1d", green: "#40a02b",
    sapphire: "#209fb5", blue: "#1e66f5", lavender: "#7287fd", mauve: "#8839ef",
    flamingo: "#dd7878", teal: "#179299", pink: "#ea76cb",
  },

  // Two palettes from outside Catppuccin, allowed by the v4.0.0 amendment to
  // Principle I. People theme their whole terminal, and a bar that clashes
  // with the rest of it is a bar they turn off. Neither is the default:
  // Catppuccin Mocha is still what this looks like when nobody has chosen.
  //
  // Every token the Catppuccin flavors define is defined here too, so no
  // segment can reference a colour that exists in one theme and not another.
  nord: {
    crust: "#2e3440", mantle: "#3b4252", base: "#434c5e",
    surface0: "#434c5e", surface1: "#4c566a", surface2: "#616e88", text: "#eceff4",
    red: "#bf616a", peach: "#d08770", yellow: "#ebcb8b", green: "#a3be8c",
    sapphire: "#88c0d0", blue: "#5e81ac", lavender: "#81a1c1", mauve: "#b48ead",
    flamingo: "#d8dee9", teal: "#8fbcbb", pink: "#cbb0c7",
  },
  gruvbox: {
    crust: "#1d2021", mantle: "#282828", base: "#32302f",
    surface0: "#3c3836", surface1: "#504945", surface2: "#665c54", text: "#ebdbb2",
    red: "#fb4934", peach: "#fe8019", yellow: "#fabd2f", green: "#b8bb26",
    sapphire: "#8ec07c", blue: "#83a598", lavender: "#bdae93", mauve: "#b16286",
    flamingo: "#d5c4a1", teal: "#689d6a", pink: "#d3869b",
  },

  // Five editor themes, and the terminal's own colours (specs/049). Each
  // defines every token and is never the default. The values are the themes'
  // published ones mapped to the token names the bar uses; where a theme has
  // no colour for a token the nearest one stands in.
  tokyonight: {
    crust: "#15161e", mantle: "#16161e", base: "#1a1b26",
    surface0: "#24283b", surface1: "#292e42", surface2: "#3b4261", text: "#c0caf5",
    red: "#f7768e", peach: "#ff9e64", yellow: "#e0af68", green: "#9ece6a",
    sapphire: "#7dcfff", blue: "#7aa2f7", lavender: "#9aa5ce", mauve: "#bb9af7",
    flamingo: "#ff757f", teal: "#73daca", pink: "#ff007c",
  },
  rosepine: {
    crust: "#16141f", mantle: "#1f1d2e", base: "#191724",
    surface0: "#26233a", surface1: "#403d52", surface2: "#524f67", text: "#e0def4",
    red: "#eb6f92", peach: "#ebbcba", yellow: "#f6c177", green: "#9ccfd8",
    sapphire: "#31748f", blue: "#3e8fb0", lavender: "#908caa", mauve: "#c4a7e7",
    flamingo: "#ea9a97", teal: "#56949f", pink: "#ea9a97",
  },
  dracula: {
    crust: "#191a21", mantle: "#21222c", base: "#282a36",
    surface0: "#343746", surface1: "#44475a", surface2: "#6272a4", text: "#f8f8f2",
    red: "#ff5555", peach: "#ffb86c", yellow: "#f1fa8c", green: "#50fa7b",
    sapphire: "#8be9fd", blue: "#6272a4", lavender: "#caa9fa", mauve: "#bd93f9",
    flamingo: "#ff9ac1", teal: "#7ee0c6", pink: "#ff79c6",
  },
  solarized: {
    crust: "#00212b", mantle: "#073642", base: "#002b36",
    surface0: "#073642", surface1: "#586e75", surface2: "#657b83", text: "#93a1a1",
    red: "#dc322f", peach: "#cb4b16", yellow: "#b58900", green: "#859900",
    sapphire: "#2aa198", blue: "#268bd2", lavender: "#839496", mauve: "#6c71c4",
    flamingo: "#d33682", teal: "#2aa198", pink: "#d33682",
  },
  onedark: {
    crust: "#181a1f", mantle: "#21252b", base: "#282c34",
    surface0: "#2c313a", surface1: "#3e4451", surface2: "#4b5263", text: "#abb2bf",
    red: "#e06c75", peach: "#d19a66", yellow: "#e5c07b", green: "#98c379",
    sapphire: "#56b6c2", blue: "#61afef", lavender: "#a9b1d6", mauve: "#c678dd",
    flamingo: "#be5046", teal: "#4db5a8", pink: "#e06c9f",
  },
  // The terminal's own 16 colours, written as `ansi:N`. Its colours are not
  // known when the bar is drawn, so it is exempt from the contrast test and
  // draws black or bright white text on them (constitution 8.5.0, K11).
  terminal: {
    crust: "ansi:0", mantle: "ansi:0", base: "ansi:0",
    surface0: "ansi:8", surface1: "ansi:8", surface2: "ansi:8", text: "ansi:7",
    red: "ansi:1", peach: "ansi:9", yellow: "ansi:3", green: "ansi:2",
    sapphire: "ansi:6", blue: "ansi:4", lavender: "ansi:12", mauve: "ansi:5",
    flamingo: "ansi:13", teal: "ansi:14", pink: "ansi:13",
  },
};

/**
 * `CLAUDE_STATUSLINE_CONTRAST=high`: pure black or white text at 7:1, for a
 * person who needs more than the 4.5:1 floor. Read per call, like `NO_COLOR`.
 */
export const contrastHigh = (env = process.env) => String(env.CLAUDE_STATUSLINE_CONTRAST ?? "").toLowerCase() === "high";

/** Whether a palette value is one of the terminal's own colours. */
export const isAnsi = (value) => typeof value === "string" && value.startsWith("ansi:");

const POWERLINE_ARROW = "";
const POWERLINE_THIN = "\u{E0B1}";
const ASCII_ARROW = "▸";

/**
 * What each separator style draws (Principle I, v8.3.0).
 *
 * `between` joins two chips on different backgrounds, `same` two on one
 * background, `open` and `close` start and end a run, and `gap` is what sits
 * between two pills. `useText` draws `between` in the previous chip's text
 * colour, for the thin style, where the glyph is a line and not a shape.
 */
const SEPARATOR_GLYPHS = {
  arrow: { between: POWERLINE_ARROW, same: POWERLINE_THIN, open: "", close: POWERLINE_ARROW },
  slant: { between: "\u{E0BC}", same: POWERLINE_THIN, open: "", close: "\u{E0BC}" },
  thin: { between: POWERLINE_THIN, same: POWERLINE_THIN, open: "", close: POWERLINE_THIN, useText: true },
  round: { between: "", same: "\u{E0B5}", open: "\u{E0B6}", close: "\u{E0B4}", gap: " " },
  ascii: { between: ASCII_ARROW, same: ASCII_ARROW, open: "", close: ASCII_ARROW },
};

/** The styles a person may name. */
export const SEPARATOR_STYLES = ["arrow", "round", "slant", "thin"];

/**
 * Which separator style to draw: `arrow` by default, a named one when
 * `CLAUDE_STATUSLINE_SEPARATOR` asks for it, `ascii` for the plain tier and
 * `thin` without colour. A value that is none of those is not guessed at: the
 * default is drawn and `doctor` names it.
 */
export function separatorStyle({ asciiArrows = false, style = process.env.CLAUDE_STATUSLINE_SEPARATOR } = {}) {
  if (asciiArrows) return "ascii";
  // The solid arrow is a shape cut out of two backgrounds, and with `NO_COLOR`
  // there are no backgrounds: it becomes a row of filled triangles between
  // chips that no longer have edges. The thin one is a line, which is what a
  // divider without colour has to be.
  if (!colourEnabled()) return "thin";
  return SEPARATOR_STYLES.includes(style) ? style : "arrow";
}

/**
 * Which separator to draw.
 *
 * Powerline is the default and the design. A thin separator is a declared
 * fallback for a terminal that can reach the private use area but renders
 * the solid arrow badly, which the v4.0.0 amendment to Principle I allows
 * as long as it is asked for rather than assumed.
 */
export function separatorFor({ asciiArrows = false, style = process.env.CLAUDE_STATUSLINE_SEPARATOR } = {}) {
  return SEPARATOR_GLYPHS[separatorStyle({ asciiArrows, style })].between || POWERLINE_ARROW;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Whether this render may emit colour at all.
 *
 * `NO_COLOR` is a cross-tool convention rather than this project's invention:
 * set to anything non-empty, it means the person has asked every program on
 * the machine not to colourise, and a bar that ignores it is one they cannot
 * turn off without uninstalling it. Read per call rather than cached, so a
 * test or a preview can set it around one render.
 *
 * Colour is not the only carrier of anything the bar says — Principle X
 * requires a band mark beside the ramped figures for exactly this reason —
 * so a colourless bar loses emphasis, never information. The powerline
 * separators go with it: drawn without the two colours they sit between,
 * they are a row of solid triangles saying nothing.
 */
export function colourEnabled() {
  const raw = process.env.NO_COLOR;
  return raw === undefined || raw === "";
}

/**
 * How many colours this terminal draws: `"truecolor"` or `"256"`.
 *
 * `COLORTERM=truecolor` or `24bit` is the terminal saying so. Any other set
 * value means it did not, and Apple Terminal, which draws 256 colours and
 * sets nothing, is named by `TERM_PROGRAM`. An unset `COLORTERM` anywhere
 * else keeps 24-bit: Windows Terminal and several SSH setups draw truecolor
 * and do not set it, so an absent variable is not evidence of less.
 * Read per call, like `NO_COLOR`.
 */
export function colourDepth(env = process.env) {
  const term = (env.COLORTERM || "").toLowerCase();
  if (term === "truecolor" || term === "24bit") return "truecolor";
  if (term) return "256";
  if (env.TERM_PROGRAM === "Apple_Terminal") return "256";
  // `TERM=xterm-256color` with `COLORTERM` unset is what a 256-colour terminal
  // reports. Terminals that draw truecolor and set neither are named, since
  // they would be served the approximation for no reason: Windows Terminal,
  // and the ones that identify themselves by `TERM_PROGRAM`.
  // Inside tmux or screen `TERM` names the multiplexer's own 256-colour
  // terminal and says nothing of the one outside, which is usually truecolor
  // and often leaves `COLORTERM` unset inside the session.
  const known =
    env.WT_SESSION ||
    env.TMUX ||
    ["iTerm.app", "WezTerm", "vscode", "ghostty", "Hyper"].includes(env.TERM_PROGRAM);
  if (!known && /-256color$/.test(env.TERM || "")) return "256";
  return "truecolor";
}

const CUBE = [0, 95, 135, 175, 215, 255];
let table256 = null;

/** Indices 16 to 255 as hex, the six-level cube and the grey ramp. Never 0 to 15: themes remap those. */
function palette256() {
  if (table256) return table256;
  table256 = [];
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const hex = `#${[CUBE[r], CUBE[g], CUBE[b]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        table256.push({ index: 16 + 36 * r + 6 * g + b, hex, lab: labOf(hex) });
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const v = 8 + 10 * i;
    const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
    table256.push({ index: 232 + i, hex, lab: labOf(hex) });
  }
  return table256;
}

function labOf(hex) {
  const { L, C, h } = toOklch(hex);
  const rad = (h * Math.PI) / 180;
  return [L, C * Math.cos(rad), C * Math.sin(rad)];
}

const nearestCache = new Map();

/** The 256-colour entry nearest to `hex` by OKLab distance. */
function nearest256(hex) {
  const hit = nearestCache.get(hex);
  if (hit) return hit;
  const lab = labOf(hex);
  let pick = null;
  let top = Infinity;
  for (const entry of palette256()) {
    const d = (entry.lab[0] - lab[0]) ** 2 + (entry.lab[1] - lab[1]) ** 2 + (entry.lab[2] - lab[2]) ** 2;
    if (d < top) {
      top = d;
      pick = entry;
    }
  }
  nearestCache.set(hex, pick);
  return pick;
}

/** The hex a 256-colour index stands for, for reading a rendered bar back. */
export function colour256Hex(index) {
  return palette256().find((e) => e.index === index)?.hex ?? null;
}

/** The colour as this terminal will draw it, as hex. Truecolor is the colour itself. */
export function drawnColour(hex, depth = colourDepth()) {
  return depth === "256" ? nearest256(hex).hex : hex;
}

/** The SGR sequence for a foreground (38) or background (48) colour. */
function sgr(kind, hex) {
  if (!colourEnabled()) return "";
  if (isAnsi(hex)) {
    // The terminal's own colour: the 30s and 40s, and the bright 90s and 100s.
    const n = Number(hex.slice(5));
    const base = kind === 38 ? 30 : 40;
    return `\x1b[${n < 8 ? base + n : base + 60 + (n - 8)}m`;
  }
  if (colourDepth() === "256") return `\x1b[${kind};5;${nearest256(hex).index}m`;
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[${kind};2;${r};${g};${b}m`;
}

export const fgSeq = (hex) => sgr(38, hex);
export const bgSeq = (hex) => sgr(48, hex);
const fg = fgSeq;
const bg = bgSeq;

const RESET_SEQ = "\x1b[0m";

/** The reset, or nothing when there is no colour to reset. */
function reset() {
  return colourEnabled() ? RESET_SEQ : "";
}

/**
 * OSC 8 terminal hyperlink: wraps text so it's clickable in terminals that
 * support it (iTerm2, Windows Terminal, kitty, WezTerm, ...), without ever
 * printing the URL itself. Terminals without support just show the text.
 */
function hyperlink(url, text) {
  return `\x1b]8;;${url}\x07${text}\x1b]8;;\x07`;
}

/**
 * Terminals known to draw SGR `4:4`, the dotted underline, from what they
 * put in the environment. A table in one place: an unknown terminal gets no
 * underline at all rather than the plain one an old parser would fall back to.
 */
const STYLED_UNDERLINE = [
  (env) => Boolean(env.KITTY_WINDOW_ID) || env.TERM === "xterm-kitty",
  (env) => env.TERM_PROGRAM === "WezTerm" || Boolean(env.WEZTERM_EXECUTABLE),
  (env) => env.TERM_PROGRAM === "iTerm.app",
  (env) => Boolean(env.WT_SESSION),
  (env) => env.TERM_PROGRAM === "ghostty" || env.TERM === "xterm-ghostty",
  (env) => Number(env.VTE_VERSION) >= 5000,
];

export function styledUnderline(env = process.env) {
  // `CLAUDE_STATUSLINE_UNDERLINE=0` is the way out for a person who does not
  // want links marked.
  if (["0", "off", "false"].includes(String(env.CLAUDE_STATUSLINE_UNDERLINE ?? "").toLowerCase())) return false;
  return STYLED_UNDERLINE.some((test) => test(env));
}

/**
 * Linked text: an OSC 8 hyperlink, with a dotted underline where the
 * terminal draws one, so a name that can be clicked looks like it can.
 * Not a colour, so `NO_COLOR` keeps it.
 */
export function link(url, text) {
  const linked = hyperlink(url, text);
  return styledUnderline() ? `\x1b[4:4m${linked}\x1b[24m` : linked;
}

/**
 * Renders one Powerline row from an ordered list of {color, text, url?}
 * segments. color is a palette hex string; the segment's foreground
 * auto-selects crust (dark) or text (light) for contrast, matching the
 * reference starship.toml convention of light-text-on-solid-background.
 * An optional `url` makes the segment's text a clickable OSC 8 hyperlink.
 */

/**
 * A lighter version of a colour, for marking a segment that just changed.
 *
 * Colour is preattentive: a brighter block is noticed before it is read,
 * where a swapped glyph has to be recognised, and it does not require the
 * reader to have seen the previous frame. The segment keeps its own hue, so
 * it still says which segment it is.
 */
export function lighten(hex, ratio = 0.45) {
  return lightenOklch(hex, ratio);
}

/** A palette colour by name, or a literal hex when one is handed in. */
export function resolveColour(palette, colour) {
  if (typeof colour === "string" && colour.startsWith("#")) return colour;
  return palette[colour];
}

/**
 * The text colour and the background a chip of this colour is drawn with.
 *
 * At 256 colours the contrast is worked out on the colours the terminal will
 * actually draw, so the 4.5:1 floor holds there too.
 */
function chipOf(palette, colour) {
  const wanted = resolveColour(palette, colour);
  // The terminal's colours are unknown: black on the bright ones and bright
  // white on the dark neutrals, with no ratio to compute.
  if (isAnsi(wanted)) {
    const neutral = ["surface0", "surface1", "surface2", "base", "mantle", "crust"].includes(colour);
    return { fg: neutral ? "ansi:15" : "ansi:0", bg: wanted };
  }
  if (contrastHigh()) return chipColours(palette, wanted, undefined, HIGH);
  if (colourDepth() !== "256") return chipColours(palette, wanted);
  const drawn = chipColours(quantised(palette), drawnColour(wanted, "256"), (hex) => drawnColour(hex, "256"));
  return { fg: drawn.fg, bg: drawn.bg };
}

const quantisedPalettes = new WeakMap();

function quantised(palette) {
  let q = quantisedPalettes.get(palette);
  if (!q) {
    q = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, drawnColour(v, "256")]));
    quantisedPalettes.set(palette, q);
  }
  return q;
}

/** Blank columns between two groups on line 3; `src/layout.js` counts the same number (GROUP_GAP there). */
const GROUP_SPACING = 3;

/** Markers a segment builder writes into its text; `renderRow` turns them into weight and colour. */
export const STRONG = "\u0001";
export const QUIET = "\u0002";
export const MARK_OFF = "\u0003";
/** Good news: the text after it is drawn in the healthy colour, readable on the chip. */
export const GOOD = "\u0004";
/** A modified count: the text after it is drawn in the modified (yellow) colour, readable on the chip. */
export const WARM = "\u0005";
/** Commits behind upstream: the text after it is drawn in the cold (sapphire) colour. */
export const BEHIND = "\u0006";

/**
 * The colour for a chip marked `quiet`, text that is read second: the palette's `text` or
 * `crust` when that still reaches 4.5:1 on the chip, otherwise the chip's
 * own text colour. Dimmed with colour rather than SGR 2, so the contrast
 * stays something the suite can measure.
 */
export function quietText(palette, colour) {
  const { fg: strong, bg } = chipOf(palette, colour);
  if (isAnsi(bg) || contrastHigh()) return strong;
  for (const token of [palette.text, palette.crust]) {
    const tone = colourDepth() === "256" ? drawnColour(token, "256") : token;
    if (tone !== strong && contrastRatio(tone, bg) >= 4.5) return tone;
  }
  return strong;
}

export function renderRow(palette, segments, { asciiArrows = false, width = null } = {}) {
  const style = separatorStyle({ asciiArrows });
  const glyphs = SEPARATOR_GLYPHS[style];
  const chips = segments.map((seg, i) => {
    const { fg: chipFg, bg: segBg } = chipOf(palette, seg.color);
    const readable = (c, onBg) => {
      if (isAnsi(c) || isAnsi(onBg)) return c;
      if (colourDepth() !== "256") return readableOn(c, onBg);
      // At 256 colours the adjusted colour is rounded to the nearest index,
      // which can land below the floor; ask for a little more until it does not.
      let drawn = onBg;
      for (let min = 4.5; min <= 7.01; min += 0.5) {
        drawn = drawnColour(readableOn(c, onBg, min), "256");
        if (contrastRatio(drawn, onBg) >= 4.5) return drawn;
      }
      return drawn;
    };
    const toned = seg.tone ? readable(resolveColour(palette, seg.tone), segBg) : null;
    const segFg = toned ?? (seg.quiet ? quietText(palette, seg.color) : chipFg);
    // Without colour a chip has no edge. Its leading pad becomes a thin bar,
    // the same width, so the fit that was measured with the pad still holds.
    let label = colourEnabled() ? seg.text : `\u258f${seg.text.replace(/^ /, "")}`;
    // A pill carries its own caps, so its leading pad goes and one column of
    // trailing padding stays: 0 before, 1 after, as the guide draws it
    // (specs/054-guide-gaps, owner decision of 2026-10-12).
    if (style === "round" && colourEnabled()) label = label.replace(/^ /, "");
    // `CLAUDE_STATUSLINE_PADDING=wide`: two columns before the icon of every
    // chip that follows an arrow (the review's section 5.5). Opt-in, because it
    // costs a column a chip and the track already costs about six a gauge.
    if (i > 0 && style === "arrow" && String(process.env.CLAUDE_STATUSLINE_PADDING ?? "").toLowerCase() === "wide") {
      label = ` ${label}`;
    }
    // An icon in its own colour on a neutral chip: the first word of the
    // text, drawn in the token's colour made readable on this background,
    // then the chip's own text colour again.
    if (seg.icon && colourEnabled()) {
      const accent = readable(resolveColour(palette, seg.icon), segBg);
      label = label.replace(/^(\s*)(\S+)/, (_, pad, word) => `${pad}${fg(accent)}${word}${fg(segFg)}`);
    }
    // The segment builders mark a figure strong and a reset or unit quiet with
    // three control characters (`STRONG`, `QUIET`, `MARK_OFF`), which data
    // cannot carry because the text boundary removes every control character.
    // Under `NO_COLOR` the markers are removed and nothing replaces them: the
    // bar's contract there is plain text with no escape at all, and a bold on
    // every figure would put one on every chip.
    if (/[\u0001-\u0006]/.test(label)) {
      if (!colourEnabled()) {
        label = label.replace(/[\u0001-\u0006]/g, "");
      } else {
        // `CLAUDE_STATUSLINE_DIM=sgr` asks for the terminal's own dim (SGR 2)
        // where the default is a quieter text colour that keeps 4.5:1.
        const sgrDim = String(process.env.CLAUDE_STATUSLINE_DIM ?? "").toLowerCase() === "sgr";
        const quiet = sgrDim ? "\x1b[2m" : fg(quietText(palette, seg.color));
        const good = fg(readable(resolveColour(palette, "green"), segBg));
        const warm = fg(readable(resolveColour(palette, "yellow"), segBg));
        const behind = fg(readable(resolveColour(palette, "sapphire"), segBg));
        label = label
          .replace(/\u0001/g, "\x1b[1m")
          .replace(/\u0002/g, quiet)
          .replace(/\u0004/g, good)
          .replace(/\u0005/g, warm)
          .replace(/\u0006/g, behind)
          .replace(/\u0003/g, `\x1b[22m${fg(segFg)}`);
      }
    }
    // A segment that changed is bold and underlined, with its colours as
    // they were: the mark survives `NO_COLOR`, and it does not borrow the
    // meaning of another colour.
    if (seg.emphasis) label = `\x1b[1m\x1b[4m${label}\x1b[22m\x1b[24m`;
    const text = seg.url ? link(seg.url, label) : label;
    return { segFg, segBg, text, group: seg.group ?? null, alignRight: seg.alignRight === true };
  });

  // A chip opens a run at the start of the row and after a group change. Each
  // run is closed with the style's end glyph and the next one starts a column
  // later, so a group is a gap and not a different colour.
  const open = (chip) =>
    glyphs.open ? `${reset()}${fg(chip.segBg)}${glyphs.open}${bg(chip.segBg)}` : bg(chip.segBg);
  const close = (chip) => `${reset()}${fg(chip.segBg)}${glyphs.close}${reset()}`;

  let out = "";
  chips.forEach((chip, i) => {
    const prev = chips[i - 1];
    if (i === 0) {
      out += open(chip);
    } else if (chip.alignRight && width && i === chips.length - 1) {
      // At the right edge of the row: the run is closed, the room is spaces,
      // and the chip opens a run of its own. With no room it follows as usual.
      const used = displayWidth(out) + displayWidth(glyphs.close);
      const need = displayWidth(chip.text) + displayWidth(glyphs.open) + displayWidth(glyphs.close);
      const room = width - used - need;
      // With no room it follows as usual: the width fit counts one end glyph
      // between two chips and no space, so adding one overflowed an exact fit.
      out += room > 0 ? `${close(prev)}${" ".repeat(room)}${open(chip)}` : `${close(prev)}${open(chip)}`;
    } else if (chip.group && prev.group && chip.group !== prev.group) {
      out += `${close(prev)}${" ".repeat(GROUP_SPACING)}${open(chip)}`;
    } else if (chip.segBg === prev.segBg) {
      // The same colour on both sides: a solid arrow would be a shape cut out
      // of one colour, invisible. The thin one is drawn in the text colour
      // of the chip it follows (Principle I, v8.3.0).
      out += `${fg(prev.segFg)}${bg(chip.segBg)}${glyphs.same}`;
    } else if (glyphs.open) {
      out += `${close(prev)}${glyphs.gap ?? ""}${open(chip)}`;
    } else {
      out += `${fg(glyphs.useText ? prev.segFg : prev.segBg)}${bg(chip.segBg)}${glyphs.between}`;
    }
    out += `${bg(chip.segBg)}${fg(chip.segFg)}${chip.text}`;
  });
  // Reset before the closing cap: without it, the arrow inherits the last
  // segment's own background (still active from the loop above) and its
  // triangle becomes invisible, same-colour foreground on same-colour
  // background, instead of fading into the terminal's real background.
  out += close(chips[chips.length - 1]);
  return out;
}

/**
 * How many terminal columns a string occupies.
 *
 * Not the same as its length in code units, and not the same as its length
 * in code points either: an emoji takes two columns, a variation selector
 * or zero-width joiner takes none, and a surrogate pair is one character
 * that `String.length` counts as two. The 120-column limit in Principle II
 * is a limit on columns, so it has to be measured in columns.
 *
 * Nerd Font glyphs sit in the private use area and are drawn single-width
 * in every terminal font that has them, so they count as one.
 */
/**
 * Exactly the East Asian Ambiguous characters this bar can emit.
 *
 * A set rather than ranges, and derived from what the glyph table, the ramp
 * and the separators actually draw rather than from the blocks they sit in.
 * The blocks are mixed: `U+25B4` and `U+25B5` are Narrow while `U+25B2` and
 * `U+25B3` beside them are Ambiguous, so a range covering Geometric Shapes
 * would count the band marks two columns wide when they render one — the very
 * misalignment this exists to prevent.
 *
 * A character here is one column in most terminals and two in a terminal
 * configured for East Asian text. Nothing in the environment reports which,
 * so the reader says.
 */
const AMBIGUOUS = new Set([
  // Drawn today:
  0x00b7, // · middle dot, the separator between a row's columns
  0x2500, // ─ the tree prefixes of a nested agent's row
  0x2588, // █ the full cell of the eighths bar and the sparkline
  0x258f, // ▏ the left edge of a chip when NO_COLOR removes its background
  0x2589, 0x258a, 0x258b, 0x258c, 0x258d, 0x258e, // ▉ to ▎ the eighths of an agent row's bar
  0x2581, 0x2582, 0x2583, 0x2584, 0x2585, 0x2586, 0x2587, // ▁ to ▇ the sparkline
  0x2014, // — an unknown figure
  0x251c, 0x2514, // ├ └ the tree prefixes of a nested agent's row
  0x2026, // … ellipsis, where a clipped row or label is cut
  // Not drawn today, and listed anyway. These are Ambiguous per Unicode
  // whether or not this bar uses them, and every one of them was on the bar
  // at some point: the arrows and the four circles were the substitute glyph
  // set until 2026-09-12, when it was rebuilt out of Narrow codepoints so it
  // measures one width on every terminal, and the larger triangles were the
  // gauge's band marks until 2026-09-07. A width table that describes more
  // characters than the renderer currently draws costs a lookup and is right
  // the day one of them comes back; one that tracked only current usage would
  // be silently wrong that day instead.
  0x2190, 0x2191, 0x2193, // ← ↑ ↓
  0x25b2, 0x25b3, // ▲ △
  0x25c6, 0x25cb, 0x25cf, 0x25d0, // ◆ ○ ● ◐
  0x2592, 0x2593, // ▒ ▓ the fills of the band bar that feature 055 removed
]);

/**
 * Whether Ambiguous characters are drawn two columns wide.
 *
 * Off by default, which is right for most terminals. `tmux` calls the same
 * setting `-u`, and every tool that has met this problem has one, because
 * there is no way to ask the terminal.
 */
function ambiguousIsWide() {
  return process.env.CLAUDE_STATUSLINE_AMBIGUOUS_WIDE === "1";
}

/**
 * Whether a code point is drawn two columns wide: East Asian Width W or F, or
 * Emoji_Presentation=Yes. The table is generated from Unicode's own files by
 * scripts/generate-width-table.js. A hand-written list had stopped at the
 * emoji someone had drawn that week and missed ➕ ➖ ❔ 🆕 and the coloured
 * circles beside them.
 */
// Nothing below the first range is wide, which is almost every character a
// row holds. Skipping the search for them keeps the redraw budget.
const WIDE_FIRST = WIDE[0][0];

function isWide(cp) {
  if (cp < WIDE_FIRST) return false;
  let lo = 0;
  let hi = WIDE.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [from, to] = WIDE[mid];
    if (cp < from) hi = mid - 1;
    else if (cp > to) lo = mid + 1;
    else return true;
  }
  return false;
}

export function displayWidth(text) {
  const plain = String(text)
    .replace(/\x1b\[[0-9;:]*m/g, "")
    .replace(/[\u0001-\u0006]/g, "")
    .replace(/\x1b\]8;;[^\x07]*\x07/g, "");

  const chars = [...plain];
  let width = 0;
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    // Combining marks, variation selectors and joiners draw on top of the
    // character before them rather than beside it.
    if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0x0300 && cp <= 0x036f)) continue;
    if (cp === 0x20e3) continue; // combining enclosing keycap
    // U+FE0F asks for emoji presentation, which is two columns wide
    // whatever the base character would have been on its own. ⏱️ is a
    // stopwatch plus a variation selector, and it is drawn as an emoji.
    const nextCp = chars[i + 1]?.codePointAt(0);
    const forcedEmoji = nextCp === 0xfe0f;
    const wide =
      forcedEmoji ||
      (ambiguousIsWide() && AMBIGUOUS.has(cp)) ||
      isWide(cp);
    width += wide ? 2 : 1;
  }
  return width;
}
