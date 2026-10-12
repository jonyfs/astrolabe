/**
 * Fitting the bar to the terminal it is actually in.
 *
 * Two facts drive this module. Claude Code sets `COLUMNS` and `LINES` before
 * running the command, so the real dimensions are knowable rather than
 * assumed at 120 columns and four rows. And with thirty segments
 * competing for those columns, most redraws cannot show everything, so
 * something is always being dropped.
 *
 * The only question is whether that choice was made on purpose. Source order
 * made it by accident: the last segment added was the first one lost,
 * regardless of what it said. Here it is made by the priority in the
 * registry, the way iTerm2's status bar has done it for years.
 *
 * Position and presence stay separate. Priority decides whether a segment
 * appears; its order decides where. A segment therefore never slides
 * sideways because a neighbour disappeared, and the eye can learn where
 * things are.
 */

import { openSync, closeSync } from "node:fs";
import tty from "node:tty";
import { displayWidth } from "./theme.js";
import { PRIORITY_BANDS } from "./segments.js";
import { copilotPadding } from "./copilotSettings.js";

/** What to assume when Claude Code is too old to set `COLUMNS`. */
export const DEFAULT_WIDTH = 120;

/** A Powerline separator occupies one column between segments. */
const SEPARATOR_COLUMNS = 1;

function positiveInt(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** The terminal's width, or 120 when it cannot be known. */
export function terminalWidth() {
  return positiveInt(process.env.COLUMNS) ?? DEFAULT_WIDTH;
}

/**
 * The terminal's height, or `Infinity` when it cannot be known.
 *
 * Unlimited is the safe unknown here: it means "render everything", which is
 * what this project did before it could read the value at all.
 */
export function terminalHeight() {
  return positiveInt(process.env.LINES) ?? Infinity;
}

/**
 * The size of the controlling terminal, read from `/dev/tty`, or null.
 *
 * GitHub Copilot CLI runs the command with all three streams piped and sets
 * neither `COLUMNS` nor `LINES`, but it does not detach it, so the command
 * still shares Copilot's terminal (specs/033-copilot-parity: `stty size
 * </dev/tty` printed `40 117` from inside Copilot 1.0.91). With no controlling
 * terminal the open fails with ENXIO, which the caller turns into the default.
 */
export function readTtySize() {
  let fd;
  let stream;
  try {
    fd = openSync("/dev/tty", "r+");
    stream = new tty.WriteStream(fd);
    const columns = positiveInt(stream.columns);
    const rows = positiveInt(stream.rows);
    return columns ? { columns, rows } : null;
  } catch {
    return null;
  } finally {
    // The stream owns the descriptor once it exists; before that, nothing does.
    if (stream) stream.destroy();
    else if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // already closed
      }
    }
  }
}

/**
 * Copilot's terminal, less the padding Copilot puts before every line, or null
 * when it cannot be read. Windows has no `/dev/tty`, so it is not tried there
 * (Principle IX).
 */
export function copilotTerminal({ platform = process.platform, readTty = readTtySize, settings = null } = {}) {
  if (platform === "win32") return null;
  let size;
  try {
    size = readTty();
  } catch {
    return null;
  }
  const columns = positiveInt(size?.columns);
  if (!columns) return null;
  // Never below the floor a single segment needs; a padding as wide as the
  // window is Copilot's problem to draw, not a reason to fit to nothing.
  const usable = Math.max(20, columns - copilotPadding(settings));
  return { columns: usable, rows: positiveInt(size?.rows) ?? Infinity, source: "tty" };
}

/**
 * The size a redraw fits to, and where it came from.
 *
 * `COLUMNS` is authoritative whenever it is set: Claude Code sets it with its
 * own layout already taken into account, and `/dev/tty` is never opened then.
 * Only Copilot, which sets nothing, is measured from the terminal. Anything
 * else keeps the old answer: 120 columns and every line.
 */
export function terminalFor(harness, { env = process.env, platform = process.platform, readTty = readTtySize, settings = null } = {}) {
  const columns = positiveInt(env?.COLUMNS);
  if (columns) return { columns, rows: positiveInt(env?.LINES) ?? Infinity, source: "COLUMNS" };
  if (harness === "copilot") {
    const measured = copilotTerminal({ platform, readTty, settings: typeof settings === "function" ? settings() : settings });
    if (measured) return measured;
  }
  return { columns: DEFAULT_WIDTH, rows: positiveInt(env?.LINES) ?? Infinity, source: "default" };
}

/** What a row of segments costs in columns, separators included. */
export function rowWidth(row) {
  if (!row.length) return 0;
  const content = row.reduce((total, s) => total + displayWidth(s.text), 0);
  // One blank column where a line-3 group changes, and the caps a style adds
  // to every chip (`extra`, set by the renderer for the pill style).
  let gaps = 0;
  let extra = 0;
  row.forEach((s, i) => {
    extra += s.extra ?? 0;
    if (i > 0 && s.group && row[i - 1].group && s.group !== row[i - 1].group) gaps += 1;
  });
  return content + row.length * SEPARATOR_COLUMNS + gaps + extra;
}

/**
 * Drops the least important segments until the row fits.
 *
 * Returns the survivors in their original order, so the line's shape is
 * stable even as its contents come and go. The highest-priority segment is
 * always kept: a bar with one thing on it that overflows by a column beats a
 * bar with nothing on it.
 */
export function fitToWidth(row, width = terminalWidth()) {
  if (rowWidth(row) <= width) return row;

  const byPriority = [...row].sort((a, b) => a.priority - b.priority);
  const dropped = new Set();
  // A segment may carry `variants`: shorter texts, in the order it gives
  // them up. When the guard reaches such a segment it tries each before
  // dropping it, so the segment loses its least essential words first. The
  // order between segments is still priority's: a lower-priority neighbour
  // goes before this one shortens (specs/025-prompt-cache-chip).
  const shortened = new Map();
  const current = () =>
    row.filter((s) => !dropped.has(s.key)).map((s) => (shortened.has(s.key) ? { ...s, text: shortened.get(s.key) } : s));

  // Before the first essential segment would be dropped, every essential
  // segment still standing gives up the text it can spare, lowest priority
  // first: the 7-day reset, then the 5-hour countdown, then the spend reset.
  // Lower priorities have all gone by then, since the loop reaches essentials
  // last, and they do not come back into the room this frees
  // (specs/027-bar-polish).
  let essentialsShortened = false;
  const shortenEssentials = () => {
    essentialsShortened = true;
    for (const s of byPriority) {
      if (s.priority < PRIORITY_BANDS.essential || dropped.has(s.key)) continue;
      for (const text of s.variants || []) {
        shortened.set(s.key, text);
        const kept = current();
        if (rowWidth(kept) <= width) return kept;
      }
    }
    return null;
  };

  for (const candidate of byPriority) {
    if (dropped.size === row.length - 1) break;
    if (!essentialsShortened && candidate.priority >= PRIORITY_BANDS.essential) {
      const kept = shortenEssentials();
      if (kept) return kept;
    }
    if (shortened.has(candidate.key) && candidate.priority >= PRIORITY_BANDS.essential) {
      // Already at its shortest; nothing left but to drop it.
      shortened.delete(candidate.key);
      dropped.add(candidate.key);
      const kept = current();
      if (rowWidth(kept) <= width) return kept;
      continue;
    }
    for (const text of candidate.variants || []) {
      shortened.set(candidate.key, text);
      const kept = current();
      if (rowWidth(kept) <= width) return kept;
    }
    shortened.delete(candidate.key);
    dropped.add(candidate.key);
    const kept = current();
    if (rowWidth(kept) <= width) return kept;
  }

  const survivor = [...row].sort((a, b) => b.priority - a.priority)[0];
  return [survivor];
}

/**
 * Pads the first segment of every line to a common width, so the boundaries
 * line up down the bar and four lines read as one small table.
 *
 * Alignment yields to the width limit. The two can disagree, and only one of
 * them has a consequence: a padded line that overflows wraps, and a wrapped
 * bar costs a whole terminal row to save a few columns of tidiness.
 */
export function alignColumns(lines, width = terminalWidth()) {
  const firsts = lines.map((line) => line[0]).filter(Boolean);
  if (firsts.length < 2) return lines;

  const target = Math.max(...firsts.map((s) => displayWidth(s.text)));

  return lines.map((line) => {
    if (!line.length) return line;
    const first = line[0];
    const padding = target - displayWidth(first.text);
    if (padding <= 0) return line;
    if (rowWidth(line) + padding > width) return line;
    return [{ ...first, text: first.text + " ".repeat(padding) }, ...line.slice(1)];
  });
}

/**
 * Which lines render, given the rows available.
 *
 * Skills go first, then whatever an arrangement has put on line 4, then the
 * place. Line 3 is the last one standing, because it carries the limits whose
 * consequence you cannot undo — and since the merge of 2026-09-07 it carries
 * the model with them, so the survivor also says what is doing the spending.
 * Line 1 outlives line 2 because where you are and which branch you are on
 * decide whether an edit is safe.
 *
 * Line 4 is empty unless an arrangement moves something there. It sheds
 * before line 1 because the bar cannot know what a person put on it, and the
 * lines it does know about were ordered by the owner on 2026-08-26.
 *
 * Everything comes back the moment the rows do. Shedding is a response to
 * the window, not a mode the bar gets stuck in.
 */
const SHED_ORDER = [2, 4, 1];

export function linesToRender(available = terminalHeight(), present = [1, 2, 3]) {
  let keep = [...present];
  for (const line of SHED_ORDER) {
    if (keep.length <= available) break;
    keep = keep.filter((n) => n !== line);
  }
  return keep;
}
