/**
 * The bar's ANSI output as lines of coloured runs, for OpenCode's text
 * elements, which take colours rather than escape codes (specs/038-opencode).
 *
 * The renderer writes 24-bit colours (`38;2;r;g;b`, `48;2;r;g;b`), resets
 * (`0`, and `39`/`49` for one channel) and OSC 8 hyperlinks. Colours become
 * `#rrggbb`; a link keeps its text and loses its target, since OpenCode's
 * slot has no link element. Any other escape sequence is dropped, never
 * drawn as text.
 */

const hex = (r, g, b) => `#${[r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;

/** One SGR parameter list applied to the current colours. */
function applySgr(params, state) {
  const p = params === "" ? [0] : params.split(/[;:]/).map((n) => (n === "" ? 0 : Number(n)));
  for (let i = 0; i < p.length; i++) {
    const code = p[i];
    if (code === 0) {
      state.fg = null;
      state.bg = null;
    } else if (code === 39) state.fg = null;
    else if (code === 49) state.bg = null;
    else if ((code === 38 || code === 48) && p[i + 1] === 2 && p.length >= i + 5) {
      const colour = hex(p[i + 2], p[i + 3], p[i + 4]);
      if (code === 38) state.fg = colour;
      else state.bg = colour;
      i += 4;
    } else if ((code === 38 || code === 48) && p[i + 1] === 5) {
      i += 2;
    }
  }
}

/**
 * `[[{ text, fg, bg }, ...], ...]`, one array per line. Adjacent runs with the
 * same colours are merged; empty runs are not kept.
 */
export function parseAnsi(input) {
  const lines = [];
  let line = [];
  const state = { fg: null, bg: null };
  let buf = "";
  const flush = () => {
    if (!buf) return;
    const last = line[line.length - 1];
    if (last && last.fg === state.fg && last.bg === state.bg) last.text += buf;
    else line.push({ text: buf, fg: state.fg, bg: state.bg });
    buf = "";
  };
  const s = String(input ?? "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\x1b") {
      const next = s[i + 1];
      if (next === "[") {
        let j = i + 2;
        while (j < s.length && !/[\x40-\x7e]/.test(s[j])) j++;
        if (s[j] === "m") {
          flush();
          applySgr(s.slice(i + 2, j), state);
        }
        i = j;
        continue;
      }
      if (next === "]") {
        // OSC, ended by BEL or ESC \.
        let j = i + 2;
        while (j < s.length && s[j] !== "\x07" && !(s[j] === "\x1b" && s[j + 1] === "\\")) j++;
        i = s[j] === "\x07" ? j : j + 1;
        continue;
      }
      // A charset designation (`ESC ( B`) takes one more character; any
      // other two-character escape is just the next one.
      i += "()*+-./".includes(next) ? 2 : 1;
      continue;
    }
    if (ch === "\n") {
      flush();
      lines.push(line);
      line = [];
      continue;
    }
    if (ch === "\r") continue;
    const code = ch.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) continue;
    buf += ch;
  }
  flush();
  if (line.length) lines.push(line);
  while (lines.length && lines[lines.length - 1].length === 0) lines.pop();
  return lines;
}
