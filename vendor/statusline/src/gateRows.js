/**
 * The rows for running git gates, printed after the bar
 * (specs/031-git-gate-rows).
 *
 * One row per run: its state icon and hook, the worktree (marked `*` when it
 * is this session's, git's own mark for the current one), the branch, the
 * step it is on and how long it has been running. The columns line up across
 * the rows, the branch goes first when the width is short, and each row is cut
 * to the width, since Copilot wraps a long line rather than cutting it.
 */

import { PALETTES, displayWidth, colourEnabled, fgSeq } from "./theme.js";
import { clipAnsi, cutToWidth, elapsed } from "./taskRows.js";
import { plainText } from "./text.js";

const RESET = "\x1b[0m";
const SEP = " · ";

const fg = (hex) => (hex ? fgSeq(hex) : "");

/** The most a column is padded to; past it the cell keeps its own width. */
const MAX_COLUMN = { hook: 14, worktree: 28, branch: 30, step: 44 };

// The limits are columns, so the cut is by columns: a worktree named in CJK is
// two columns a character, and the ellipsis is as wide as the width table
// says, not one character by assumption.
const cut = cutToWidth;

/**
 * One icon per kind of hook: the commit glyph for `pre-commit`, the push
 * arrow for `pre-push`, the waiting glyph for a run queued behind the gate
 * lock, and the running glyph for anything else (specs/049-rows-themes-docs).
 */
function hookGlyph(run, glyphs) {
  if (run.state === "waiting") return glyphs.gateWaiting;
  const hook = String(run.hook ?? "").toLowerCase();
  if (/pre-?commit/.test(hook)) return glyphs.commit ?? glyphs.gateRunning;
  if (/pre-?push/.test(hook)) return glyphs.push ?? glyphs.gateRunning;
  return glyphs.gateRunning;
}

function cellsFor(run, { here, glyphs, now }) {
  const waiting = run.state === "waiting";
  const hook = plainText(run.hook) ?? "hook";
  const tree = plainText(run.worktree) ?? "?";
  return {
    waiting,
    hook: `${hookGlyph(run, glyphs)} ${cut(hook, MAX_COLUMN.hook - 2)}`,
    worktree: `${run.path && run.path === here ? "* " : "  "}${cut(tree, MAX_COLUMN.worktree - 2)}`,
    branch: run.branch ? `${glyphs.branch} ${cut(plainText(run.branch) ?? "", MAX_COLUMN.branch - 2)}` : "",
    step: cut(waiting ? "waiting for gates.lock" : plainText(run.step) ?? "", MAX_COLUMN.step),
    age: elapsed(run.startedAt, now) ?? "",
  };
}

/**
 * The rows, as text lines. `here` is this session's worktree path, `glyphs`
 * the bar's own glyph table (Nerd Font or plain), `cap` the most rows shown
 * before a `+N more` line.
 */
export function gateRows(runs, { columns = 120, palette = PALETTES.mocha, now = Date.now(), here = null, glyphs, cap = 6 } = {}) {
  if (!Array.isArray(runs) || !runs.length || !glyphs) return [];
  // Oldest first, so a row keeps its place while newer runs come and go.
  const ordered = [...runs].sort((a, b) => (a.startedAt ?? now) - (b.startedAt ?? now));
  const shown = ordered.slice(0, cap).map((run) => cellsFor(run, { here, glyphs, now }));
  const keys = ["hook", "worktree", "branch", "step", "age"];
  const width = (key, dropped) =>
    dropped.has(key) ? 0 : Math.max(0, ...shown.map((c) => displayWidth(c[key])));
  const lineWidth = (dropped) =>
    keys.filter((k) => !dropped.has(k) && width(k, dropped) > 0).reduce((sum, k, i) => sum + width(k, dropped) + (i ? SEP.length : 0), 0);
  // The branch is the first thing a short line gives up: the worktree's name
  // already says where, and the step and the age are what changes.
  const dropped = new Set();
  if (lineWidth(dropped) > columns) dropped.add("branch");

  const colours = {
    hook: (c) => (c.waiting ? palette.yellow : palette.peach),
    worktree: (c) => (c.worktree.startsWith("*") ? palette.lavender : palette.text),
    branch: () => palette.surface2,
    step: (c) => (c.waiting ? palette.yellow : palette.sapphire),
    age: () => palette.surface2,
  };
  const used = keys.filter((k) => !dropped.has(k) && width(k, dropped) > 0);
  const rows = shown.map((c) => {
    const parts = used.map((k, i) => {
      const last = i === used.length - 1;
      const pad = last ? "" : " ".repeat(Math.max(0, width(k, dropped) - displayWidth(c[k])));
      return `${fg(colours[k](c))}${c[k]}${pad}${colourEnabled() ? RESET : ""}`;
    });
    const line = parts.join(`${fg(palette.surface1)}${SEP}${colourEnabled() ? RESET : ""}`).replace(/\s+(\x1b\[0m)?$/, "$1");
    return clipAnsi(line, columns);
  });
  if (runs.length > cap) rows.push(`${fg(palette.surface2)}+${runs.length - cap} more${colourEnabled() ? RESET : ""}`);
  return rows;
}

/**
 * The line 1 chip for a window too short for the rows: how many gates run,
 * and this worktree's age when one of them is here.
 */
export function gateChip(runs, { now = Date.now(), here = null, glyphs } = {}) {
  if (!Array.isArray(runs) || !runs.length || !glyphs) return null;
  const mine = runs.find((r) => r.path && r.path === here);
  const waiting = runs.every((r) => r.state === "waiting");
  const count = `${runs.length} gate${runs.length === 1 ? "" : "s"}`;
  const age = mine ? elapsed(mine.startedAt, now) : null;
  return {
    color: waiting ? "yellow" : "peach",
    text: ` ${waiting ? glyphs.gateWaiting : glyphs.gateRunning} ${count}${age ? ` · here ${age}` : ""} `,
  };
}
