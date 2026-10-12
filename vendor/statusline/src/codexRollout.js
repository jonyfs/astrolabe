/**
 * A Codex CLI rollout, read as the payload Claude Code would have sent
 * (specs/035-codex-pane).
 *
 * Codex 0.160.1 runs no outside status line command, so nothing hands this
 * plugin a payload. What it does write is the session's rollout, a JSONL file
 * under `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, one `{timestamp, type,
 * payload}` record per line. Four kinds carry what the bar shows, checked
 * against real rollouts from CLI 0.118 to 0.160:
 *
 *   session_meta              id, timestamp, cwd, cli_version (first line)
 *   turn_context              model, effort, cwd (once per turn)
 *   event_msg task_started    model_context_window, and a turn is running
 *   event_msg token_count     info.{last,total}_token_usage, model_context_window,
 *                             rate_limits.{primary,secondary}.{used_percent,
 *                             window_minutes,resets_at}, rate_limits.plan_type,
 *                             rate_limits.credits.{has_credits,unlimited,balance}
 *   event_msg task_complete   the turn ended (turn_aborted when interrupted)
 *
 * The format is Codex's own and undocumented, so a field that is missing or
 * has another shape is left out of the payload, and the bar shows what it
 * shows for any absent field (Principle III). Nothing is estimated: the
 * context share is the last turn's tokens over the window Codex reports, and
 * a usage window maps to the bar's 5-hour or 7-day chip only when Codex says
 * it is 300 or 10080 minutes long. A window of any other length, such as the
 * free plan's 30 days, goes in `rate_limits.other_windows` under a label made
 * from its length, `30d`, and gets a chip of its own; the credit balance goes
 * in `rate_limits.credits` (specs/037-codex-windows). Claude Code sends
 * neither key, so both chips are Codex's alone.
 *
 * Reading is bounded like the other readers. The first line comes from the
 * head (it carries Codex's base instructions, so it can be long), the rest
 * from the last 2 MB, and a state kept by the caller lets the next read take
 * only what was appended.
 */

import { openSync, readSync, fstatSync, closeSync } from "node:fs";

/** How much of the file's start is read for the session_meta line. */
export const ROLLOUT_HEAD_BYTES = 1024 * 1024;

/** How much of the file's end is folded when there is no state to continue from. */
export const ROLLOUT_TAIL_BYTES = 2 * 1024 * 1024;

/** Past this many appended bytes, a read starts over from the tail instead. */
const MAX_INCREMENT_BYTES = 32 * 1024 * 1024;

/** The two window lengths the bar has chips for, in minutes. */
const FIVE_HOUR_MINUTES = 300;
const SEVEN_DAY_MINUTES = 10080;

/** The limit the 5h and 7d chips show. Older rollouts write no limit_id at all. */
const MAIN_LIMIT_ID = "codex";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => (typeof v === "string" && v.length > 0 ? v : null);
const count = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** A state with nothing folded into it yet. */
function emptyState(file) {
  return {
    file,
    size: 0,
    offset: 0,
    ino: null,
    bytesRead: 0,
    meta: null,
    turn: null,
    window: null,
    tokens: null,
    limits: null,
    running: false,
    lastAt: null,
  };
}

function readRange(fd, start, length) {
  const buffer = Buffer.allocUnsafe(length);
  const got = readSync(fd, buffer, 0, length, start);
  return buffer.subarray(0, got);
}

/** A JSON string value written as `"key":"..."`, unescaped, or null. */
function stringField(raw, key) {
  const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return null;
  }
}

function metaOf(payload) {
  if (!isObject(payload)) return null;
  return {
    id: text(payload.id) ?? text(payload.session_id),
    timestamp: text(payload.timestamp),
    cwd: text(payload.cwd),
    cliVersion: text(payload.cli_version),
  };
}

/**
 * The session_meta of a rollout, from at most ROLLOUT_HEAD_BYTES of its start.
 *
 * The line holds Codex's whole base instructions, so it may be longer than the
 * cap. Then the fields come from the part that was read: `id`, `timestamp`,
 * `cwd` and `cli_version` precede the instructions in every version seen.
 */
export function readRolloutHead(file, { headBytes = ROLLOUT_HEAD_BYTES } = {}) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const size = fstatSync(fd).size;
    const raw = readRange(fd, 0, Math.min(headBytes, size)).toString("utf8");
    const nl = raw.indexOf("\n");
    if (nl !== -1 || size <= headBytes) {
      try {
        const record = JSON.parse(nl === -1 ? raw : raw.slice(0, nl));
        return record?.type === "session_meta" ? metaOf(record.payload) : null;
      } catch {
        return null;
      }
    }
    if (!/"type"\s*:\s*"session_meta"/.test(raw)) return null;
    // The inner payload's fields, which follow the record's own timestamp.
    const inner = raw.slice(Math.max(0, raw.indexOf('"payload"')));
    return {
      id: stringField(inner, "id"),
      timestamp: stringField(inner, "timestamp"),
      cwd: stringField(inner, "cwd"),
      cliVersion: stringField(inner, "cli_version"),
    };
  } catch {
    return null;
  } finally {
    try {
      closeSync(fd);
    } catch {
      // already gone
    }
  }
}

/** Folds one record into the state. Unknown kinds and shapes change nothing. */
export function foldRecord(state, record) {
  if (!isObject(record)) return state;
  const at = Date.parse(record.timestamp);
  if (Number.isFinite(at)) state.lastAt = at;
  const p = record.payload;
  if (!isObject(p)) return state;
  switch (record.type) {
    case "session_meta":
      // The first one is the session's. A forked session can carry its
      // parent's after it.
      if (!state.meta) state.meta = metaOf(p);
      return state;
    case "turn_context":
      state.turn = { model: text(p.model), effort: text(p.effort), cwd: text(p.cwd) };
      return state;
    case "event_msg":
      break;
    default:
      return state;
  }
  switch (p.type) {
    case "task_started":
      state.running = true;
      if (count(p.model_context_window)) state.window = p.model_context_window;
      break;
    case "task_complete":
    case "turn_aborted":
      state.running = false;
      break;
    case "token_count":
      if (isObject(p.info)) {
        if (count(p.info.model_context_window)) state.window = p.info.model_context_window;
        state.tokens = {
          last: isObject(p.info.last_token_usage) ? p.info.last_token_usage : null,
          total: isObject(p.info.total_token_usage) ? p.info.total_token_usage : null,
        };
      }
      // Codex keeps more than one limit (`limit_id`, with an
      // x-codex-active-limit header behind it). The 5h and 7d chips are the
      // main "codex" one's; another bucket's figures under those labels
      // would name one limit's usage as another's (Principle III).
      if (isObject(p.rate_limits) && (p.rate_limits.limit_id === undefined || p.rate_limits.limit_id === null || p.rate_limits.limit_id === MAIN_LIMIT_ID)) {
        state.limits = p.rate_limits;
      }
      break;
    default:
      break;
  }
  return state;
}

/** Folds every whole line of `buf` and returns how many bytes that consumed. */
function foldBuffer(state, buf, { skipFirst = false } = {}) {
  const lastNl = buf.lastIndexOf(0x0a);
  if (lastNl === -1) return 0;
  const lines = buf.subarray(0, lastNl).toString("utf8").split("\n");
  if (skipFirst) lines.shift();
  for (const line of lines) {
    if (!line) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    foldRecord(state, record);
  }
  return lastNl + 1;
}

/**
 * The rollout's state, continuing from `previous` when it describes the same
 * file and the file has only grown. Null when the file cannot be opened.
 */
export function readRollout(
  file,
  previous = null,
  { tailBytes = ROLLOUT_TAIL_BYTES, headBytes = ROLLOUT_HEAD_BYTES, maxIncrement = MAX_INCREMENT_BYTES } = {}
) {
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const st = fstatSync(fd);
    const size = st.size;
    const same = previous && previous.file === file && previous.ino === st.ino && size >= previous.offset;
    if (same && size - previous.offset <= maxIncrement) {
      const state = { ...previous, size, bytesRead: 0 };
      if (size > state.offset) {
        const buf = readRange(fd, state.offset, size - state.offset);
        state.bytesRead = buf.length;
        state.offset += foldBuffer(state, buf);
      }
      return state;
    }

    const state = emptyState(file);
    state.ino = st.ino;
    state.size = size;
    const start = Math.max(0, size - tailBytes);
    if (start > 0) {
      state.meta = readRolloutHead(file, { headBytes });
      state.bytesRead += Math.min(headBytes, size);
    }
    const buf = readRange(fd, start, size - start);
    state.bytesRead += buf.length;
    // A tail that does not start the file starts mid-line, unless the byte
    // before it ends a line: then its first line is whole and is a record.
    const midLine = start > 0 && readRange(fd, start - 1, 1)[0] !== 0x0a;
    const consumed = foldBuffer(state, buf, { skipFirst: midLine });
    state.offset = start + consumed;
    if (previous?.meta && !state.meta && previous.file === file) state.meta = previous.meta;
    return state;
  } catch {
    return null;
  } finally {
    try {
      closeSync(fd);
    } catch {
      // already gone
    }
  }
}

/**
 * The state of a whole rollout given as text, folded the same way a read
 * folds it. For the previews, which render a fixture without a file.
 */
export function foldRollout(text, file = null) {
  const state = emptyState(file);
  const buf = Buffer.from(String(text).endsWith("\n") ? String(text) : `${text}\n`, "utf8");
  state.offset = foldBuffer(state, buf);
  state.size = buf.length;
  return state;
}

/** One Codex usage window as the bar's chip, or null when it is not a known one. */
function windowOf(w) {
  if (!isObject(w)) return null;
  const pct = typeof w.used_percent === "number" && Number.isFinite(w.used_percent) ? w.used_percent : null;
  if (pct === null) return null;
  const slot = { used_percentage: pct };
  if (typeof w.resets_at === "number" && Number.isFinite(w.resets_at)) slot.resets_at = w.resets_at;
  return slot;
}

/** `43200` as `30d`, `120` as `2h`, `45` as `45m`: the window named by its length alone. */
export function windowLabel(minutes) {
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

const isWindowLength = (m) => typeof m === "number" && Number.isInteger(m) && m > 0;

/**
 * The windows that have no chip of their own, primary first, each with the
 * label its length gives it. Codex reports at most two.
 */
function otherWindowsOf(limits) {
  if (!isObject(limits)) return [];
  const out = [];
  for (const w of [limits.primary, limits.secondary]) {
    if (!isObject(w) || !isWindowLength(w.window_minutes)) continue;
    if (w.window_minutes === FIVE_HOUR_MINUTES || w.window_minutes === SEVEN_DAY_MINUTES) continue;
    const slot = windowOf(w);
    if (!slot) continue;
    out.push({ label: windowLabel(w.window_minutes), window_minutes: w.window_minutes, ...slot });
  }
  return out;
}

/**
 * The credit balance, as Codex writes it, when there is one to draw: an
 * account with credits that are not unlimited, and a balance that reads as a
 * number. Anything else is no figure, rather than a guessed one.
 */
function creditsOf(limits) {
  const c = isObject(limits) ? limits.credits : null;
  if (!isObject(c) || c.has_credits !== true || c.unlimited === true) return null;
  const balance = typeof c.balance === "string" ? c.balance.trim() : null;
  if (!balance || !/^-?\d+(\.\d+)?$/.test(balance)) return null;
  return { balance };
}

function rateLimitsOf(limits) {
  if (!isObject(limits)) return undefined;
  const out = {};
  for (const w of [limits.primary, limits.secondary]) {
    if (!isObject(w)) continue;
    const slot = windowOf(w);
    if (!slot) continue;
    if (w.window_minutes === FIVE_HOUR_MINUTES && !out.five_hour) out.five_hour = slot;
    else if (w.window_minutes === SEVEN_DAY_MINUTES && !out.seven_day) out.seven_day = slot;
  }
  return Object.keys(out).length ? out : undefined;
}

function contextOf(state) {
  if (!count(state.window)) return undefined;
  const cw = { context_window_size: state.window };
  const last = count(state.tokens?.last?.total_tokens);
  if (last !== null && state.window > 0) {
    cw.used_percentage = (last / state.window) * 100;
    cw.remaining_percentage = 100 - cw.used_percentage;
  }
  const input = count(state.tokens?.total?.input_tokens);
  const output = count(state.tokens?.total?.output_tokens);
  if (input !== null) cw.total_input_tokens = input;
  if (output !== null) cw.total_output_tokens = output;
  return cw;
}

/**
 * The payload Claude Code would have sent for this session, in its shape, with
 * a `codex` block that marks it as Codex's (src/harness.js reads that).
 */
export function rolloutPayload(state, { now = Date.now() } = {}) {
  const meta = state?.meta ?? null;
  const turn = state?.turn ?? null;
  const cwd = turn?.cwd ?? meta?.cwd ?? undefined;
  const payload = {
    codex: {
      cli_version: meta?.cliVersion ?? null,
      plan_type: text(state?.limits?.plan_type),
      rollout: state?.file ?? null,
    },
  };

  if (meta?.id) payload.session_id = `codex-${meta.id}`;
  if (cwd) {
    payload.cwd = cwd;
    payload.workspace = { current_dir: cwd };
    if (meta?.cwd) payload.workspace.project_dir = meta.cwd;
  }
  if (turn?.model) payload.model = { id: turn.model, display_name: turn.model };
  if (turn?.effort) payload.effort = { level: turn.effort };
  if (meta?.cliVersion) payload.version = meta.cliVersion;
  const cw = state ? contextOf(state) : undefined;
  if (cw) payload.context_window = cw;
  const rl = rateLimitsOf(state?.limits) ?? {};
  const windows = otherWindowsOf(state?.limits);
  if (windows.length) rl.other_windows = windows;
  const credits = creditsOf(state?.limits);
  if (credits) rl.credits = credits;
  if (Object.keys(rl).length) payload.rate_limits = rl;
  const started = Date.parse(meta?.timestamp ?? "");
  if (Number.isFinite(started) && now >= started) payload.cost = { total_duration_ms: now - started };
  return payload;
}

/**
 * What the transcript reader returns for Claude Code, for the activity chip:
 * working while a turn is open. Codex writes no skill events, and its plan
 * tool is not read here, so both are empty.
 */
export function rolloutActivity(state) {
  return {
    skills: [],
    skillsTrueCount: 0,
    todos: null,
    working: state?.running === true,
    background: { shells: 0, agents: 0 },
  };
}
