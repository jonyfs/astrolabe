/**
 * The keys this plugin writes into Codex's `config.toml` (specs/029-multi-
 * harness, specs/034-codex-items).
 *
 * Codex CLI runs no external status line command; its status line is a list
 * of built-in items under `[tui] status_line`. These are the items closest to
 * this project's bar, in its reading order. Each id was checked against the
 * strings of the Codex CLI 0.160.1 binary; specs/034-codex-items says which
 * Claude segment each one stands for, and why the others are left out.
 *
 * No TOML library: the project has no runtime dependencies (Principle IV).
 * The edit is line-level and limited to a few keys in one table, which is all
 * it needs, and every other byte of the file is kept, including CRLF endings.
 */

export const CODEX_ITEMS = [
  // Line 1 of the Claude bar: where you are.
  "project-name",
  "git-branch",
  "branch-changes",
  "pull-request-number",
  // Line 2: what is happening.
  "task-progress",
  "run-state",
  // Line 3: the model, and what it is spending.
  "model-with-reasoning",
  "fast-mode",
  "permissions",
  "context-used",
  "five-hour-limit",
  "weekly-limit",
];

/**
 * Every list this plugin has ever written, newest first. Install upgrades any
 * of them to the current one, and uninstall removes any of them; a list that
 * matches none was chosen by the person and is never touched.
 */
export const CODEX_ITEMS_HISTORY = [
  CODEX_ITEMS,
  // specs/029-multi-harness, 1.20.0 to 1.29.0.
  ["model-with-reasoning", "current-dir", "git-branch", "context-used", "five-hour-limit", "weekly-limit", "fast-mode", "run-state", "task-progress"],
];

/** The bundled Catppuccin themes `--theme` accepts, as Codex 0.160.1 names them. */
export const CODEX_THEMES = ["catppuccin-mocha", "catppuccin-macchiato", "catppuccin-frappe", "catppuccin-latte"];

export const CODEX_STATUS_LINE = `status_line = [${CODEX_ITEMS.map((i) => JSON.stringify(i)).join(", ")}]`;
export const CODEX_COLORS_LINE = "status_line_use_colors = true";

const isHeader = (l) => /^\s*\[[^\]]+\]\s*(#.*)?$/.test(l) || /^\s*\[\[[^\]]+\]\]\s*(#.*)?$/.test(l);
// TOML lets a bare key also be written quoted, and allows spaces inside the
// brackets; Codex reads `["tui"]` and `[ tui ]` as the same table as `[tui]`.
const isTui = (l) => /^\s*\[\s*(tui|"tui"|'tui')\s*\]\s*(#.*)?$/.test(l);
const keyPattern = (name) => new RegExp(`^\\s*(${name}|"${name}"|'${name}')\\s*=\\s*`);
// The root table can also define tui as a dotted key or an inline table. A
// `[tui]` header after that is a second definition, which Codex will not load.
const isRootTui = (l) => /^\s*(tui|"tui"|'tui')\s*[.=]/.test(l);
const blank = (l) => l.trim() === "";

/**
 * The line where the value that starts on `lines[i]` ends. Brackets are
 * counted outside strings and comments, so an array may close on its last
 * item's line and an item may hold a `]`. -1 when it never closes before `end`.
 */
function valueEnd(lines, i, end) {
  let depth = 0;
  for (let j = i; j < end; j++) {
    const l = lines[j];
    let quote = null;
    for (let k = j === i ? l.indexOf("=") + 1 : 0; k < l.length; k++) {
      const c = l[k];
      if (quote) {
        if (quote === '"' && c === "\\") k++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === "#") break;
      else if (c === "[") depth++;
      else if (c === "]") depth--;
    }
    if (depth <= 0) return j;
  }
  return -1;
}

/**
 * Where `[tui]`'s `name` sits, as [start, end) line indices, and the table's
 * header. `unsafe` when the file defines tui in a way a line edit cannot
 * follow, so no writer touches it.
 */
function locate(lines, name) {
  const firstHeader = lines.findIndex(isHeader);
  if (lines.slice(0, firstHeader === -1 ? lines.length : firstHeader).some(isRootTui)) return { unsafe: true };
  const header = lines.findIndex(isTui);
  if (header === -1) return { header: -1 };
  let end = header + 1;
  while (end < lines.length && !isHeader(lines[end])) end++;
  const key = keyPattern(name);
  for (let i = header + 1; i < end; i++) {
    if (!key.test(lines[i])) continue;
    const j = valueEnd(lines, i, end);
    if (j === -1) return { unsafe: true };
    return { header, key: [i, j + 1] };
  }
  return { header, key: null };
}

/** Lines split on LF, with what each added line must end in to match the file. */
function splitLines(text) {
  const crlf = text.includes("\r\n");
  return { lines: text.split("\n"), cr: crlf ? "\r" : "", eol: crlf ? "\r\n" : "\n" };
}

/**
 * The value of `[tui]`'s `name`: its source text with the key, comments and
 * the line ending taken off, or null when the key is absent. Undefined when
 * the file defines tui in a form this module does not read.
 */
export function readTuiValue(text = "", name) {
  const lines = text.split("\n");
  const { key, unsafe } = locate(lines, name);
  if (unsafe) return undefined;
  if (!key) return null;
  return lines
    .slice(key[0], key[1])
    .join("\n")
    .replace(keyPattern(name), "")
    .replace(/#.*$/gm, "")
    .replace(/\r/g, "")
    .trim();
}

/** The source lines of `[tui]`'s `name`, without line endings, or null when absent. */
export function readTuiLines(text = "", name) {
  const lines = text.split("\n");
  const { key, unsafe } = locate(lines, name);
  if (unsafe || !key) return null;
  return lines.slice(key[0], key[1]).map((l) => l.replace(/\r$/, ""));
}

/**
 * The text with `[tui]`'s `name` set to `source` (one or more lines, without
 * endings), or null when the file defines tui in a form this writer does not
 * edit. A new key goes after the key named `after` when that is present,
 * otherwise right under the header; a missing `[tui]` table is appended.
 */
export function setTuiLines(text = "", name, source, { after } = {}) {
  const { lines, cr, eol } = splitLines(text);
  const raw = Array.isArray(source) ? source : [source];
  const add = raw.map((l) => l + cr);
  const { header, key, unsafe } = locate(lines, name);
  if (unsafe) return null;
  if (header === -1) {
    const base = text === "" ? "" : text.endsWith("\n") ? text : `${text}${eol}`;
    return `${base}${base === "" ? "" : eol}[tui]${eol}${raw.join(eol)}${eol}`;
  }
  if (key) {
    lines.splice(key[0], key[1] - key[0], ...add);
    return lines.join("\n");
  }
  const anchor = after ? locate(lines, after).key : null;
  lines.splice(anchor ? anchor[1] : header + 1, 0, ...add);
  return lines.join("\n");
}

/**
 * The text without `[tui]`'s `name`. A `[tui]` table left empty goes with it,
 * with the blank line before it, which is how the writer appends one.
 */
export function removeTuiKey(text = "", name) {
  const lines = text.split("\n");
  const { header, key, unsafe } = locate(lines, name);
  if (unsafe || header === -1 || !key) return text;
  lines.splice(key[0], key[1] - key[0]);
  const tableEmpty = header + 1 >= lines.length || isHeader(lines[header + 1]) || lines.slice(header + 1).every(blank);
  if (tableEmpty && /^\[tui\]$/.test(lines[header].trim())) {
    lines.splice(header, 1);
    if (header > 0 && blank(lines[header - 1]) && lines[header - 1].length <= 1) lines.splice(header - 1, 1);
  }
  return lines.join("\n");
}

/** The items of `[tui] status_line`, null when absent, undefined when unreadable. */
function itemsOf(text) {
  const value = readTuiValue(text, "status_line");
  if (value === null || value === undefined) return value;
  try {
    // TOML strings in either quote, and a trailing comma, as JSON.
    const json = value.replace(/'([^']*)'/g, (_, s) => JSON.stringify(s)).replace(/,\s*\]/, "]");
    const items = JSON.parse(json);
    return Array.isArray(items) ? items : undefined;
  } catch {
    return undefined;
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Whose `[tui] status_line` this is: `absent`, `current` (this plugin's list
 * now), `older` (a list this plugin wrote before), `user` (any other list),
 * or `unsafe` when the file defines tui in a form this module does not edit.
 */
export function codexItemsState(text = "") {
  if (readTuiValue(text, "status_line") === undefined) return "unsafe";
  const items = itemsOf(text);
  if (items === null) return "absent";
  if (items !== undefined && same(items, CODEX_ITEMS)) return "current";
  if (items !== undefined && CODEX_ITEMS_HISTORY.some((list) => same(items, list))) return "older";
  return "user";
}

/** The text with our `status_line` set under `[tui]`, replacing any list; null when the file is not editable. */
export function setCodexStatusLine(text = "") {
  return setTuiLines(text, "status_line", CODEX_STATUS_LINE);
}

/**
 * What install does with the items: writes them when there are none,
 * upgrades a list this plugin wrote before, and keeps any other list.
 * `text` is null when the file defines tui in a form this writer does not edit.
 */
export function applyCodexItems(text = "") {
  const state = codexItemsState(text);
  if (state === "unsafe") return { text: null, items: "unsafe" };
  if (state === "user") return { text, items: "kept" };
  if (state === "current") return { text, items: "unchanged" };
  return { text: setCodexStatusLine(text), items: state === "older" ? "upgraded" : "written" };
}

/** The text without our `status_line`, current or older; a different list is left alone. */
export function removeCodexStatusLine(text = "") {
  const state = codexItemsState(text);
  return state === "current" || state === "older" ? removeTuiKey(text, "status_line") : text;
}

/** Whether `[tui] status_line` is a list this plugin wrote, current or older. */
export function hasCodexStatusLine(text = "") {
  const state = codexItemsState(text);
  return state === "current" || state === "older";
}
