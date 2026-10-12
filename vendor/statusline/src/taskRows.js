/**
 * The rows Claude Code draws for running subagents.
 *
 * A second command with its own contract: it runs on its own tick, receives
 * a `tasks` array rather than a session payload, and writes one JSON line
 * per row it wants to override. Folding it into the statusline command
 * would have meant one entry point branching on which contract called it,
 * which is how both contracts end up half-tested.
 *
 * What it renders is the statusline's own vocabulary, per item F2's chosen
 * form: the same palette and the same ramp. It is also the one place a
 * progress bar still earns its width: a task row has a whole line to itself
 * and no other number competing for it, which is not true of line 4.
 *
 * Everything here is best effort. A row it cannot render is a row it stays
 * silent about, which leaves Claude Code's own rendering in place.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { PALETTES, displayWidth, colourEnabled, fgSeq } from "./theme.js";
import { eighthsBar, rampColour } from "./ramp.js";
import { abbreviate } from "./tokens.js";
import { plainText } from "./text.js";
import { readSkillsByAgent } from "./skillEvents.js";

const RESET = "\x1b[0m";

// NO_COLOR turns colour off on these rows as it does on the bar
// (src/theme.js): a reader who set it gets plain text, not escapes the
// terminal was told not to expect.
const reset = () => (colourEnabled() ? RESET : "");

const fg = (hex) => (hex ? fgSeq(hex) : "");

/**
 * The earliest instant a subagent could plausibly have started.
 *
 * A `startTime` is meant to be milliseconds since the epoch. The failure
 * this guards against is one that reads as data rather than as an error: a
 * timestamp in *seconds* is a perfectly finite number, and subtracting it
 * from a millisecond clock yields about fifty-five years, which the
 * formatter below renders as a confident `488076h00m`. A row claiming an
 * agent has been working since the 1970s is not a long-running agent, it is
 * a unit mismatch, and the honest answer is that the age is unknown.
 */
const EARLIEST_PLAUSIBLE_START = Date.UTC(2020, 0, 1);

/** How long a task has been running, in the same units the bar uses. */
export function elapsed(startTime, now) {
  const started = typeof startTime === "number" ? startTime : Date.parse(startTime ?? "");
  if (!Number.isFinite(started)) return null;
  if (started < EARLIEST_PLAUSIBLE_START) return null;
  const seconds = Math.max(0, Math.round((now - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}m`;
}

/**
 * The tier a task is running at, from the `model` and `effort` the payload carries.
 *
 * Why a row shows this at all: with several subagents in flight, the rows are the only place a
 * person can see that the expensive one is on the expensive model. A roster on disk says what was
 * DECLARED; the row says what is RUNNING, and those are different claims — a declared tier is not
 * proof the harness honoured it, and this is the only view that shows the difference.
 *
 * The colour is the projection of the tier, not decoration: same reading at a glance whether or not
 * the text fits the width. `model` is absent until a task's model resolves (Claude Code v2.1.205),
 * and a task with no tier gets no segment rather than a guessed one.
 */
// By family and not by effort (specs/049-rows-themes-docs): Opus is `mauve`, Sonnet
// `lavender` and Haiku `teal`, as the colour budget says. The effort is still in the label, and
// red and green mean what they mean everywhere else on the bar.
const TIERS = [
  { test: (m) => m === "opus", colour: "mauve" },
  { test: (m) => m === "sonnet", colour: "lavender" },
  { test: (m) => m === "haiku", colour: "teal" },
];

/** `model` may arrive as an id, a display name or an object; all three carry the family in text. */
function modelFamily(model) {
  const raw =
    typeof model === "string" ? model : model && (model.id || model.display_name || model.name);
  if (typeof raw !== "string") return null;
  const text = raw.toLowerCase();
  for (const family of ["opus", "sonnet", "haiku", "fable"]) {
    if (text.includes(family)) return family;
  }
  return null;
}

function effortLevel(effort) {
  const raw = typeof effort === "string" ? effort : effort && (effort.level || effort.name);
  return typeof raw === "string" ? raw.toLowerCase() : null;
}

export function taskTier(task) {
  const model = modelFamily(task?.model);
  if (!model) return null;
  const effort = effortLevel(task?.effort);
  const match = TIERS.find((t) => t.test(model, effort));
  return { model, effort, colour: match ? match.colour : "surface2" };
}

/**
 * One row's body: what the task is, how long it has been at it, and how
 * much of its own context window it has used.
 *
 * The context bar needs both `tokenCount` and `contextWindowSize`, which
 * require Claude Code v2.1.205 and are absent while a task's model is still
 * resolving. A row missing either renders without the bar rather than with
 * an empty one.
 */
const SEP = " \u00b7 ";

/**
 * Names Claude Code uses when the caller did not choose one.
 *
 * `local_agent` is what an ad-hoc Task arrives as, and it is the same word
 * for every such task, so it distinguishes nothing. A named agent type
 * (`pr-shepherd`, `code-review`) says something the description does not and
 * keeps its place on the row.
 */
const GENERIC_TASK_NAMES = new Set(["local_agent", "task", "agent"]);

/**
 * How wide one column may be padded to.
 *
 * A single very long description would otherwise push every column after it
 * across the terminal. Past the cap that row simply overflows its own column
 * and loses alignment, which costs one row rather than all of them.
 */
const MAX_COLUMN = 48;

/**
 * One task as fixed positions, so two rows can be lined up against each other.
 *
 * Positional and always the same length: a task with no gauge still occupies
 * the gauge column, as blank. Without that, column three means the tier on one
 * row and the token count on the next, and padding them to a common width
 * lines up things that are not the same thing.
 */
function taskCells(task, { columns = 80, palette = PALETTES.mocha, now = Date.now(), nameIsShared = false, skills = [], treePrefix = "" } = {}) {
  // Text, or the placeholder. A name that arrives as an object interpolates
  // as the literal `[object Object]` into the column a reader uses to tell
  // one agent from another.
  const name = plainText(task.name) ?? plainText(task.type) ?? "task";
  const what = taskDescription(task);
  const tier = taskTier(task);
  const step = taskStep(task);
  // Whatever leads carries the tier colour, so the roster reads at a glance even when the row is
  // trimmed to `columns` and the spelled-out segment is the first thing to go.
  const leadColour = tier ? palette[tier.colour] ?? palette.lavender : palette.lavender;

  // The agent type is worth a column only when it identifies this task. Two
  // cases where it does not: it is the placeholder Claude Code sends for a
  // Task dispatched without a named agent type, which says only that the
  // caller did not name one; or two running tasks share it, which says only
  // that both were dispatched the same way.
  const typeIdentifies = !nameIsShared && !GENERIC_TASK_NAMES.has(name);

  const cell = (plain, colour) => (plain ? { plain, text: `${fg(colour)}${plain}${reset()}` } : { plain: "", text: "" });

  // Both numbers have to be real and non-negative for the ratio to mean
  // anything. A negative `tokenCount` used to render as `-10%` beside an
  // empty bar and `-100` tokens — three cells all stating a quantity that
  // cannot exist. An impossible count is an unknown count.
  const counted = typeof task.tokenCount === "number" && Number.isFinite(task.tokenCount) && task.tokenCount >= 0
    ? task.tokenCount
    : null;
  const windowSize =
    typeof task.contextWindowSize === "number" && Number.isFinite(task.contextWindowSize) && task.contextWindowSize > 0
      ? task.contextWindowSize
      : null;
  const pct = counted !== null && windowSize !== null ? (counted / windowSize) * 100 : null;

  // A model outside Claude's families has no tier to colour, and Copilot runs
  // plenty of them. Its rows name the model as reported instead, in the
  // neutral colour (specs/030-copilot-agent-rows); Claude Code's rows never
  // carry `modelLabel`, so for them nothing changes.
  const tierLabel = tier ? (tier.effort ? `${tier.model}\u00b7${tier.effort}` : tier.model) : plainText(task.modelLabel);
  // The bar keeps its number. Nine cells put 5% and 0% in the same picture,
  // and the figure is what separates them.
  // `bar` clamps to 0-100; the figure beside it has to agree, or a task over
  // its own window reads as `500%` against a bar that stops at full.
  // Eight cells in eighths (specs/046-gauges): sixty-four steps in the same
  // columns, where the nine shade cells it replaced had ten.
  const gauge =
    pct === null ? null : `${eighthsBar(pct)} ${pct >= 85 ? "!" : ""}${Math.round(Math.min(100, pct))}%`;

  // What the agent was asked to do leads (specs/049-rows-themes-docs): it is what a
  // reader scans for. It replaces the order the owner chose on 2026-09-08, which led with what
  // the agent costs; the three sparse columns follow it and reserve their width as before.
  const brief = what ?? (typeIdentifies ? null : name);
  return [
    cell(brief ? `${treePrefix}${brief}` : treePrefix ? treePrefix.trimEnd() : null, leadColour),
    cell(tierLabel, tier ? palette[tier.colour] ?? palette.surface2 : palette.surface2),
    cell(taskStatus(task), palette.peach),
    cell(typeIdentifies ? name : null, palette.lavender),
    cell(skills.length ? skills.join(", ") : null, palette.green),
    cell(step, palette.sapphire),
    cell(gauge, pct === null ? palette.green : palette[rampColour(pct, "green")] ?? palette.green),
    cell(counted === null ? null : abbreviate(counted), palette.surface2),
    cell(elapsed(task.startTime, now), palette.surface2),
  ];
}

/**
 * The cells joined, each padded to its column's width across the whole tick.
 *
 * A blank cell keeps its column's room and gets spaces where a separator
 * would be, so nothing after it slides left and no stray dot appears for a
 * value that is not there.
 */
function joinCells(cells, widths, palette) {
  // A column no row in the tick filled is dropped rather than padded to
  // nothing: it would still cost its separator's width, and a gap that wide
  // reads as a missing value rather than as an absent column.
  //
  // With no widths there is no tick to align to — a lone row, as the
  // diagnostic and the cases render one — so an empty cell simply vanishes
  // instead of spending three columns on a separator for nothing.
  const used = (i) => (widths ? widths[i] > 0 : Boolean(cells[i].plain));
  const lastFilled = cells.reduce((last, c, i) => (c.plain && used(i) ? i : last), -1);
  let out = "";
  for (let i = 0; i <= lastFilled; i++) {
    if (!used(i)) continue;
    out += cells[i].text;
    if (i === lastFilled) break;
    const target = Math.min(widths?.[i] ?? displayWidth(cells[i].plain), MAX_COLUMN);
    out += " ".repeat(Math.max(0, target - displayWidth(cells[i].plain)));
    out += cells[i].plain ? `${fg(palette.surface1)}${SEP}${reset()}` : " ".repeat(SEP.length);
  }
  return out;
}

/**
 * Which column a row gives up first when it will not fit.
 *
 * By index into `taskCells`, least useful first. The same reasoning the bar's
 * priority table carries: with more content than columns something is always
 * being dropped, and the only question is whether the choice was made on
 * purpose.
 *
 * The token count goes first because the gauge beside it already says the
 * proportion; the age next, as the least actionable thing on the row; then the
 * gauge itself, since the percentage it draws is the last thing it gives up.
 * What survives to the end is who the agent is, what it was asked to do, what
 * it is doing now, and what it costs.
 */
const SHED_ORDER = [
  7, // the token count: the gauge beside it already says the proportion
  8, // the age: the least actionable thing on the row
  6, // the gauge: its percentage is the last of it to go
  3, // the agent type, which is only there when it identifies something
  2, // the status, which is only there when it is not `running`
  4, // the skills it is running
  5, // the step it is on
];

/** The widths each column must reach for a tick's rows to line up. */
function columnWidths(rows, dropped = new Set()) {
  const widths = [];
  for (const cells of rows) {
    cells.forEach((c, i) => {
      widths[i] = dropped.has(i) ? 0 : Math.max(widths[i] ?? 0, displayWidth(c.plain));
    });
  }
  return widths;
}

export function renderTaskRow(task, options = {}) {
  if (!task?.id) return null;
  const palette = options.palette ?? PALETTES.mocha;
  const cells = taskCells(task, options);
  return { id: task.id, content: joinCells(cells, options.widths, palette) };
}

/**
 * The agent type, which is the value `renderTaskRow` leads with and colours
 * by tier. A task with neither `name` nor `type` returns `null`: no
 * fabricated placeholder (FR-006, specs/011-multiagent-skills-line).
 *
 * This is how the task was dispatched, not what it is doing, and the two are
 * not equally useful. A named type says something (`pr-shepherd`,
 * `code-review`); the generic one Claude Code sends for an ad-hoc Task does
 * not, and two agents dispatched the same way arrive with the same word. The
 * snapshot therefore carries the description as well, and the chip on line 2
 * prefers it.
 */
function taskLabel(task) {
  return plainText(task?.name) ?? plainText(task?.type) ?? null;
}

/** The standing brief: what this agent was asked to do, fixed for its life. */
function taskDescription(task) {
  return plainText(task?.description) ?? plainText(task?.label);
}

/**
 * What the agent is doing right now, which is not what it was asked to do.
 *
 * Claude Code sends both: `description` is the brief ("Fechar os nove achados
 * do PR 67") and `label` is the step ("Staging all fixer changes for commit").
 * They answer different questions and the row was showing only the first,
 * with the second used as a mere fallback for it.
 *
 * Nothing when the two are the same value, which is what happens for a task
 * that arrived with only one of them: repeating a sentence beside itself says
 * less than showing it once.
 */
function taskStep(task) {
  const step = plainText(task?.label);
  if (!step) return null;
  return step === taskDescription(task) ? null : step;
}

/** A status worth a column: `running` is what every row already looks like. */
function taskStatus(task) {
  const status = plainText(task?.status);
  return status && status !== "running" ? status : null;
}

/**
 * Where a session's reserved column widths are kept.
 *
 * Sibling of the roster rather than part of it: the roster is read by the
 * other process, and this is read only by this one.
 */
function widthMemoryPath(sessionId) {
  const safe = sessionId ? String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_") : "latest";
  return path.join(os.homedir(), ".claude", "statusline", "tasks", `${safe}.widths.json`);
}

/**
 * The widths this session has already reserved for its sparse columns.
 *
 * Column widths are the widest cell across the rows of one tick, which makes
 * them a function of the moment rather than of the session. Three of the
 * columns are usually empty — a status is only shown when it is not
 * `running`, an agent type only when it identifies something, and skills only
 * once an agent has invoked one — so each of them spends most of a session at
 * width zero and is dropped. The tick one of them first fills, it appears,
 * and every column to its right moves: measured at nine columns, on rows
 * whose own content had not changed at all. A row that jumps is a row nobody
 * can read across.
 *
 * bazel has the clearest statement of the rule, in a comment next to its own
 * progress bar: "To keep the UI appearance more stable, always show the
 * elapsed time if we also show a strategy (otherwise the strategy will jump
 * in the progress bar)." Once a column exists, it keeps existing.
 *
 * So a width, once reserved, is held for the rest of the session. Only the
 * three sparse columns are remembered: their content is short and bounded — a
 * status word, an agent type, a list of skill names — whereas the brief and
 * the step are free text whose width should follow whichever agents are
 * actually running, and pinning those to a long-finished agent's description
 * would waste more room than the jump ever cost.
 *
 * Shedding still wins. This reserves room; it does not argue for keeping a
 * column the terminal has no space for.
 */
const REMEMBERED_COLUMNS = [2, 3, 4];

function readWidthMemory(sessionId) {
  try {
    const raw = JSON.parse(readFileSync(widthMemoryPath(sessionId), "utf8"));
    return Array.isArray(raw?.widths) ? raw.widths.map((n) => (typeof n === "number" && n >= 0 ? n : 0)) : [];
  } catch {
    return [];
  }
}

function writeWidthMemory(sessionId, widths) {
  try {
    mkdirSync(path.dirname(widthMemoryPath(sessionId)), { recursive: true });
    writeFileSync(widthMemoryPath(sessionId), JSON.stringify({ widths }));
  } catch {
    // A bar that cannot remember a width is still a bar.
  }
}

/**
 * Where a tick's roster is written.
 *
 * Keyed by the session that produced it. It was a single `latest.json` until
 * 2026-09-06, which meant two Claude Code windows open on two projects each
 * read the other's running agents onto their own line 2 — the limitation this
 * file used to document as unavoidable, on the belief that the tick carried
 * no correlation key. It carries `session_id`, the same value the statusline
 * payload carries, so the two sides can find each other without sharing a
 * file with everybody else.
 *
 * `latest.json` remains the name used when a tick arrives without a session
 * id, so a harness that does not send one behaves exactly as it did.
 */
function snapshotPath(sessionId) {
  const safe = sessionId ? String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_") : "latest";
  return path.join(os.homedir(), ".claude", "statusline", "tasks", `${safe}.json`);
}

/**
 * Best-effort persistence of the current tick's tasks, so the separate
 * `render`/statusLine command (a different process, per its own tick) can
 * fold running subagent activity into the skills line. `task-rows` and
 * `render` share no other state (specs/011-multiagent-skills-line,
 * research.md): the snapshot is keyed by session id, with `latest.json` as
 * the fallback when the tick carries no id. A write failure never affects
 * this command's own output.
 */
function writeTaskSnapshot(tasks, now, sessionId) {
  try {
    const labeled = tasks
      .map((t) => {
        const label = taskLabel(t);
        if (!t?.id || !label) return null;
        // Only what the reader needs. The tier, the age and the context figure
        // were recorded here while line 2 described each agent; line 2 says
        // nothing about agents now, and the rows read the live tick rather
        // than this file, so writing them would be writing what nobody reads.
        return { id: t.id, label };
      })
      .filter(Boolean);
    mkdirSync(path.dirname(snapshotPath(sessionId)), { recursive: true });
    writeFileSync(snapshotPath(sessionId), JSON.stringify({ writtenAt: now, tasks: labeled }));
  } catch {
    // Best effort: losing a snapshot costs one redraw's subagent visibility,
    // never this command's own tick output.
  }
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

/**
 * The `task-rows` subcommand. Reads the tick's JSON, writes one line per row
 * it overrides, and says nothing about the rest.
 */
export async function runTaskRows({ now = Date.now(), input } = {}) {
  const raw = input ?? (await readStdin());
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return "";
  }

  const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const sessionId = payload?.session_id ?? payload?.sessionId ?? null;
  writeTaskSnapshot(tasks, now, sessionId);
  if (!tasks.length) return "";

  const flavor = process.env.CLAUDE_STATUSLINE_FLAVOR || "mocha";
  const palette = PALETTES[flavor] || PALETTES.mocha;
  const columns = typeof payload.columns === "number" ? payload.columns : 80;

  // Skills the hook attributed to a running subagent. Empty unless the hook is
  // installed and Claude Code's `agent_id` turns out to be the same value as
  // the task `id` here, which is not documented either way; an agent with
  // nothing recorded simply shows no skills.
  const skillsByAgent = readSkillsByAgent(sessionId);

  const remembered = readWidthMemory(sessionId);
  let used = [];
  const rows = alignTaskRows(tasks, {
    columns,
    palette,
    now,
    skillsByAgent,
    remembered,
    reportWidths: (w) => (used = w),
  });
  // Only what a column actually reached is remembered, and only upwards.
  const next = remembered.slice();
  for (const i of REMEMBERED_COLUMNS) {
    const reached = used[i] ?? 0;
    if (reached > (next[i] ?? 0)) next[i] = reached;
  }
  if (next.some((w, i) => w !== remembered[i])) writeWidthMemory(sessionId, next);

  return rows.map((row) => JSON.stringify(row)).join("\n");
}

/**
 * A tick's rows, aligned against each other and shed to fit.
 *
 * Separated from `runTaskRows` so the README's illustration can be produced
 * by the code that runs rather than typed by hand (Principle VIII). Every
 * input it needs is an argument: it reads no stdin, no environment and no
 * state directory, so the same tasks render the same rows anywhere.
 */
export function alignTaskRows(tasks, { columns = 80, palette = PALETTES.mocha, now = Date.now(), skillsByAgent = new Map(), remembered = [], reportWidths = null } = {}) {
  // Which names fail to tell one running task from another. Computed over the
  // whole tick, because a name can only be judged against its siblings.
  const seen = new Map();
  for (const t of tasks) {
    const n = taskLabel(t);
    if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
  }

  // A task whose parent is another task of this tick follows it, drawn with a
  // tree prefix: `├─` for each child but the last, `└─` for the last. Most
  // harnesses send no parent, so rows stay flat unless one does.
  const parentOf = (t) => t?.parentId ?? t?.parent_id ?? t?.parentTaskId ?? null;
  const ids = new Set(tasks.map((t) => t?.id).filter(Boolean));
  const childrenOf = new Map();
  for (const t of tasks) {
    const parent = parentOf(t);
    if (parent && ids.has(parent) && t?.id !== parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(t);
    }
  }
  const prefixes = new Map();
  const ordered = [];
  const placed = new Set();
  for (const t of tasks) {
    const parent = parentOf(t);
    if (parent && ids.has(parent) && t?.id !== parent) continue;
    ordered.push(t);
    placed.add(t);
    const kids = childrenOf.get(t?.id) ?? [];
    kids.forEach((kid, i) => {
      prefixes.set(kid.id, i === kids.length - 1 ? "\u2514\u2500 " : "\u251c\u2500 ");
      ordered.push(kid);
      placed.add(kid);
    });
  }
  // A task that was missed (a cycle) keeps its place at the end.
  for (const t of tasks) if (!placed.has(t)) ordered.push(t);
  tasks = ordered;

  const optionsFor = (task) => ({
    columns,
    palette,
    now,
    nameIsShared: (seen.get(taskLabel(task)) ?? 0) > 1,
    skills: skillsByAgent.get(task?.id) ?? [],
    treePrefix: prefixes.get(task?.id) ?? "",
  });

  // Two passes: the columns can only be sized once every row in the tick has
  // been measured, which is the whole point of aligning them.
  const measured = tasks
    .map((task) => {
      try {
        return task?.id ? { task, cells: taskCells(task, optionsFor(task)) } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  // Shed until the widest row fits, or until only the identity is left. A row
  // that overflows is not truncated here — Claude Code cuts it — so the choice
  // of what is lost has to be made before it goes out.
  const dropped = new Set();
  // The reserved widths are folded in before anything is shed, so a sparse
  // column that this session has already shown keeps its room even on a tick
  // where no row fills it — and nothing to its right moves.
  const reserve = (w) => {
    for (const i of REMEMBERED_COLUMNS) {
      if (dropped.has(i)) continue;
      const held = remembered[i];
      if (typeof held === "number" && held > (w[i] ?? 0)) w[i] = held;
    }
    return w;
  };
  let widths = reserve(columnWidths(measured.map((m) => m.cells), dropped));
  for (const column of SHED_ORDER) {
    const widest = Math.max(...measured.map((m) => displayWidth(joinCells(m.cells, widths, palette))));
    if (widest <= columns) break;
    dropped.add(column);
    widths = reserve(columnWidths(measured.map((m) => m.cells), dropped));
  }

  // The widths this tick settled on, for a caller that persists them. An
  // out-parameter rather than a second return value, so the previews and the
  // tests that only want rows are unaffected, and rather than a property on
  // the function, which two concurrent callers would overwrite.
  if (typeof reportWidths === "function") reportWidths(widths);

  return measured
    .map(({ task }) => {
      try {
        return renderTaskRow(task, { ...optionsFor(task), widths });
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * A row cut to `columns`, colour codes kept intact, with an ellipsis where it
 * was cut.
 *
 * Claude Code cuts an overflowing row itself. Copilot wraps one instead, and
 * a wrapped row is two rows, the second starting mid-word under the bar, so
 * under Copilot the cut has to happen here.
 */
export function clipAnsi(text, columns) {
  if (displayWidth(text.replace(/\x1b\[[0-9;]*m/g, "")) <= columns) return text;
  // The ellipsis is measured rather than counted as one column: U+2026 is
  // East Asian Ambiguous, and the width table decides how wide it draws.
  const room = columns - displayWidth(ELLIPSIS);
  let out = "";
  let used = 0;
  let coloured = false;
  for (const part of text.split(/(\x1b\[[0-9;]*m)/)) {
    if (part.startsWith("\x1b[")) {
      out += part;
      coloured = true;
      continue;
    }
    for (const cluster of graphemes(part)) {
      const width = displayWidth(cluster);
      if (used + width > room) return closeCut(out, coloured);
      out += cluster;
      used += width;
    }
  }
  return closeCut(out, coloured);
}

const ELLIPSIS = "\u2026";

// A colour opened in the kept part has to be closed after the ellipsis, or it
// bleeds into whatever the terminal draws next. With colour off and no escape
// in the text there is nothing to close.
const closeCut = (out, coloured) => `${out}${ELLIPSIS}${coloured || colourEnabled() ? RESET : ""}`;

/**
 * `text` cut to `max` columns, the ellipsis inside them, for a cell with no
 * colour codes in it.
 */
export function cutToWidth(text, max) {
  if (displayWidth(text) <= max) return text;
  const room = max - displayWidth(ELLIPSIS);
  let out = "";
  let used = 0;
  for (const cluster of graphemes(text)) {
    const width = displayWidth(cluster);
    if (used + width > room) break;
    out += cluster;
    used += width;
  }
  return `${out}${ELLIPSIS}`;
}

// A cut walks grapheme clusters, what a reader sees as one character: ⚠️ is a
// sign plus a variation selector, 1️⃣ three code points, a family emoji several
// joined by U+200D. Measured one code point at a time, the selector's second
// column was missed and a cut could fall inside a joined sequence, leaving a
// joiner glued to the ellipsis. Intl.Segmenter ships in every Node from 16;
// the fallback is the code-point walk this replaced.
const segmenter = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
function graphemes(text) {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : [...text];
}

/**
 * The subagent rows for a harness that has no row setting of its own, which
 * today is GitHub Copilot CLI (specs/030-copilot-agent-rows). Its session log
 * gives the agents already in the task shape; they go through the same cells,
 * alignment and shedding as Claude Code's rows, then are cut to the width,
 * and past `cap` one more row says how many were left out.
 */
export function harnessAgentRows(agents, { columns = 120, palette = PALETTES.mocha, now = Date.now(), cap = 6 } = {}) {
  if (!Array.isArray(agents) || !agents.length) return [];
  const shown = agents.slice(0, cap).map((agent) => {
    if (taskTier(agent)) return agent;
    const model = plainText(agent.model);
    const effort = plainText(agent.effort);
    return { ...agent, modelLabel: model ? (effort ? `${model}\u00b7${effort}` : model) : null };
  });
  const skillsByAgent = new Map(shown.map((agent) => [agent.id, Array.isArray(agent.skills) ? agent.skills : []]));
  const rows = alignTaskRows(shown, { columns, palette, now, skillsByAgent }).map((row) => clipAnsi(row.content, columns));
  if (agents.length > cap) rows.push(`${fg(palette.surface2)}+${agents.length - cap} more${reset()}`);
  return rows;
}
