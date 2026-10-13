/**
 * The footer as data: styled runs instead of ANSI text.
 *
 * A host that draws the bar in its own pane used to read the escapes back
 * into styles. The renderer emits a closed set of sequences, so the reading
 * belongs here, next to the code that writes them, where a test replays the
 * runs against the ANSI output (specs/056-runs-output-contract).
 *
 * `ansiToRuns` takes one rendered line. State starts clear on every line
 * because the renderer resets at the end of each one.
 */

export const CONTRACT = 1;

/** The error codes a host can rely on. A code is added only with a contract bump. */
export const ERROR_CODES = ["node-version", "bad-payload", "internal"];

const ALLOWED_SCHEMES = /^(https?|file):\/\//i;

// CSI ... m, and OSC 8 with a BEL or ST terminator. Anything else that starts
// with ESC is dropped without effect.
const TOKEN = /\x1b\[([0-9;:]*)m|\x1b\]8;([^;\x07\x1b]*);([^\x07\x1b]*)(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -\/]*[@-~]|\x1b./gsu;

/** The scheme in lower case, which is the only form the contract allows. */
const normaliseHref = (href) => href.replace(/^[a-z]+(?=:\/\/)/i, (s) => s.toLowerCase());

const hex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");

/** Removes every control character, including the ones the renderer uses as markers. */
const clean = (text) => text.replace(/[\u0000-\u001f\u007f-\u009f]/g, "");

/**
 * @param {string} line One rendered line, with its escapes.
 * @returns {Array<{text: string, fg?: string, bg?: string, bold?: true, dim?: true, underline?: true, href?: string}>}
 */
export function ansiToRuns(line) {
  const state = { fg: null, bg: null, bold: false, dim: false, underline: false, href: null };
  const runs = [];

  const push = (text) => {
    const body = clean(text);
    if (!body) return;
    const run = { text: body };
    if (state.fg) run.fg = state.fg;
    if (state.bg) run.bg = state.bg;
    if (state.bold) run.bold = true;
    if (state.dim) run.dim = true;
    if (state.underline) run.underline = true;
    if (state.href) run.href = state.href;
    const last = runs[runs.length - 1];
    if (
      last &&
      last.fg === run.fg &&
      last.bg === run.bg &&
      last.bold === run.bold &&
      last.dim === run.dim &&
      last.underline === run.underline &&
      last.href === run.href
    ) {
      last.text += run.text;
    } else {
      runs.push(run);
    }
  };

  const sgr = (params) => {
    // Semicolons separate parameters; a colon makes sub-parameters of one
    // (`4:4` is a dotted underline, `4:0` is none).
    const tokens = params === "" ? ["0"] : params.split(";");
    for (let i = 0; i < tokens.length; i++) {
      const [head, ...sub] = tokens[i].split(":");
      const c = head === "" ? 0 : Number(head);
      if (c === 0) {
        state.fg = null;
        state.bg = null;
        state.bold = state.dim = state.underline = false;
      } else if (c === 1) state.bold = true;
      else if (c === 2) state.dim = true;
      else if (c === 4) state.underline = !(sub.length && Number(sub[0]) === 0);
      else if (c === 22) state.bold = state.dim = false;
      else if (c === 24) state.underline = false;
      else if (c === 39 || (c >= 30 && c <= 37) || (c >= 90 && c <= 97)) state.fg = null;
      else if (c === 49 || (c >= 40 && c <= 47) || (c >= 100 && c <= 107)) state.bg = null;
      else if (c === 38 || c === 48) {
        const slot = c === 38 ? "fg" : "bg";
        // `38;2;r;g;b` and `38;5;n` use following tokens; `38:2::r:g:b` is one.
        const colon = sub.length > 0;
        const mode = colon ? Number(sub[0]) : Number(tokens[i + 1]);
        if (mode === 2) {
          const rgb = colon ? sub.slice(-3).map(Number) : tokens.slice(i + 2, i + 5).map(Number);
          if (rgb.length === 3 && rgb.every((n) => Number.isFinite(n))) {
            state[slot] = `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`;
          }
          if (!colon) i += 4;
        } else if (mode === 5) {
          // A 256-colour index has no resolved value to hand over.
          state[slot] = null;
          if (!colon) i += 2;
        }
      }
    }
  };

  let last = 0;
  const source = String(line ?? "");
  for (const m of source.matchAll(TOKEN)) {
    push(source.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined) sgr(m[1]);
    else if (m[3] !== undefined) state.href = m[3] && ALLOWED_SCHEMES.test(m[3]) ? normaliseHref(m[3]) : null;
  }
  push(source.slice(last));
  return runs;
}

/** The footer document for rendered text (lines joined by newlines). */
export function runsDocument(text) {
  const raw = String(text ?? "");
  const lines = raw === "" ? [] : raw.split("\n").map(ansiToRuns);
  // A trailing blank line is not a line of the bar.
  while (lines.length && lines[lines.length - 1].length === 0) lines.pop();
  return { contract: CONTRACT, lines };
}

/** The error document. An unknown code is reported as `internal`. */
export function errorDocument(code, message) {
  const known = ERROR_CODES.includes(code) ? code : "internal";
  const one = String(message ?? "").replace(/[\r\n]+/g, " ").trim() || "statusline could not render";
  return { contract: CONTRACT, error: { code: known, message: one } };
}
