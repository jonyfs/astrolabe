/**
 * Skills and working state from a Copilot CLI session (specs/029-multi-harness).
 *
 * Copilot's payload names a session directory as `transcript_path`, and the
 * session writes `events.jsonl` there: one `{type, data, timestamp}` per line.
 * A real session on 2026-10-01 wrote `assistant.turn_start` and
 * `assistant.turn_end` around each answer; Copilot emits `skill.invoked` with
 * the skill's `name` in `data`. This returns the same shape the Claude
 * transcript reader does, so the rest of the bar does not know the difference,
 * plus the running subagents, which Claude Code draws itself and Copilot does
 * not (specs/030-copilot-agent-rows).
 *
 * The log is folded into a small state once and remembered in a per-session
 * sidecar under the plugin's cache, with the byte offset read so far, so a
 * redraw reads only what was appended since the last one. Before the sidecar,
 * every redraw re-read the last 2 MB, and a subagent whose `subagent.started`
 * line had scrolled out of that window lost its row while it still ran.
 */

import { openSync, readSync, fstatSync, closeSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { windowMs } from "./skills.js";
import { plainText } from "./text.js";
import { readCopilotTodos } from "./copilotTodos.js";

/** As much of the log as a redraw reads, from the end, when it has no sidecar. */
const TAIL_BYTES = 2 * 1024 * 1024;

/**
 * Past this many bytes appended since the sidecar's offset, a redraw starts
 * over from the tail instead: reading 40 MB on a redraw costs more than the
 * rows it would keep.
 */
const MAX_INCREMENT_BYTES = 32 * 1024 * 1024;

/** The Claude reader's window for "something happened just now". */
const ACTIVE_WITHIN_MS = 10_000;

/**
 * How long an idle subagent with a background command stays on the bar when
 * nothing can say whether the command still runs. Copilot CLI 1.0.91's own
 * agent panel counts an idle agent as active and hides it 120 s after it went
 * idle (`Wen=120*1e3` in its bundle); the bar follows the harness it sits in.
 */
const IDLE_GRACE_MS = 120_000;

/**
 * Inside one interaction a subagent's `assistant.turn_end` and its next
 * `assistant.turn_start` come 2 to 20 ms apart (real session, 15:13:39.936 and
 * .938). A redraw landing in that gap would otherwise drop a resumed agent's
 * row for one frame.
 */
const TURN_GAP_MS = 3_000;

/**
 * Bumped whenever the shape of the stored state changes; another one is a miss.
 * 2 since specs/033-copilot-parity added the root effort, the model the auto
 * router resolved to and the session limit: a schema 1 state has folded the
 * log without them, and would never learn them from what is appended later.
 */
const SIDECAR_SCHEMA = 2;

/** Bytes compared at each end of the part already read, to notice a rewritten file. */
const FINGERPRINT_BYTES = 256;

/** Finished subagents kept for a resume, newest last; older ones cannot come back in practice. */
const FINISHED_KEPT = 50;

/** Tool names that run a shell command in Copilot CLI (bash; powershell on Windows). */
const SHELL_TOOLS = new Set(["bash", "shell", "powershell"]);

/**
 * How many subagent rows the bar prints under Copilot before it says "+N more"
 * (specs/030-copilot-agent-rows). Copilot's footer sits under its input box,
 * and more rows than this push the conversation off a laptop screen.
 */
export const AGENT_ROW_CAP = 6;

/**
 * An event from a subagent carries the subagent's instance id at the top
 * level; the root session's events carry none (a real Copilot CLI 1.0.91
 * session, 2026-10-05). Turn state and line 2's skills read root events only:
 * a subagent finishing its own turn is not the session finishing its turn,
 * and its skills belong to its row (Principle II).
 */
function agentOf(event) {
  return plainText(event?.agentId);
}

function freshState() {
  return {
    lastAt: null,
    turnOpen: false,
    // Root skills as {name, t}; the window is applied when the answer is made,
    // because the stored state outlives the redraw that read the event.
    skills: [],
    // One record per subagent, in start order.
    subagents: [],
    // What each subagent instance has been doing, by its agentId.
    byAgent: {},
    // Shell tool calls in flight, by toolCallId, until their completion says
    // whether they left a command running in the background.
    pendingShells: {},
    // Background commands a subagent started and nothing has closed, by agentId.
    shells: {},
    // The root agent's reasoning effort, newest first: a user message records
    // the one it was sent at, a model change the one it switched to
    // (specs/033-copilot-parity). Copilot's payload has no effort field.
    effort: null,
    // The model that actually answered at the root, and the one the auto
    // router chose before any answer, for a payload whose model is `auto`.
    answeredModel: null,
    routedModel: null,
    // `maxAiCredits` while a session limit is in force, else null.
    sessionLimit: null,
  };
}

/** A positive, finite number, or null. */
function positive(v) {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

function agentState(state, id) {
  if (!state.byAgent[id]) state.byAgent[id] = { step: null, model: null, effort: null, dispatched: null, skills: [] };
  return state.byAgent[id];
}

/** The newest record for an agentId: an id is one instance, started once. */
function recordOf(state, agent) {
  for (let i = state.subagents.length - 1; i >= 0; i--) if (state.subagents[i].agent === agent) return state.subagents[i];
  return null;
}

/** The id a shell tool names, as text: Copilot prints it as `shellId: 0`. */
function shellIdOf(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return plainText(value);
}

function closeShell(state, shellId, agent = null) {
  if (shellId === null) return;
  for (const [id, list] of Object.entries(state.shells)) {
    if (agent !== null && id !== agent) continue;
    const kept = list.filter((s) => s.shellId !== shellId);
    if (kept.length) state.shells[id] = kept;
    else delete state.shells[id];
  }
}

/** The text of a tool result, which Copilot writes as `result.content`. */
/**
 * Stamps each of an agent's open shells with the first moment the agent went
 * idle after starting it. The grace a shell gets without a liveness answer
 * runs from there: measured from the agent's latest idle instead, a shell
 * from an early turn came back after every later turn and outlived itself.
 */
function markIdle(state, agent, at) {
  if (!agent || at === null) return;
  for (const shell of state.shells[agent] ?? []) if (shell.idleAt == null) shell.idleAt = at;
}

function resultText(data) {
  const content = data?.result?.content;
  return typeof content === "string" ? content : "";
}

/** Folds one event into the state. Pure apart from `state`. */
function apply(state, event) {
  const t = Date.parse(event?.timestamp);
  if (Number.isFinite(t)) state.lastAt = Math.max(state.lastAt ?? t, t);
  const at = Number.isFinite(t) ? t : null;
  const agent = agentOf(event);
  const data = event?.data && typeof event.data === "object" ? event.data : {};
  // The model a subagent's own messages and tool calls name is the one it
  // runs on. Real Copilot CLI 1.0.91 logs configured every subagent as
  // gpt-5.6-luna and dispatched all of them to mai-code-1.1-flash, and
  // Copilot itself resolves an agent's model from the dispatch first. The
  // subagent.* events repeat the configured model, so they do not count.
  if (agent && !String(event?.type).startsWith("subagent.")) {
    const dispatched = plainText(data.model);
    if (dispatched) agentState(state, agent).dispatched = dispatched;
  }
  switch (event?.type) {
    case "assistant.turn_start": {
      if (!agent) {
        state.turnOpen = true;
        break;
      }
      // A background subagent is multi-turn: after `subagent.completed` the
      // root can `write_agent` it, and the same agentId works a new turn with
      // no second `subagent.started` or `subagent.completed` (real session
      // e1fbe37a, 15:13:08). Its own turn_start is the only sign it is working
      // again, and the resumed turn is what the row's age counts from.
      const rec = recordOf(state, agent);
      if (!rec) break;
      if (rec.completedAt !== null && at !== null && at >= rec.completedAt) {
        const settled = !rec.turnOpen && (rec.turnEndAt === null || at - rec.turnEndAt > TURN_GAP_MS);
        if (rec.resumedAt === null || settled) rec.resumedAt = at;
      }
      rec.turnOpen = true;
      break;
    }
    case "assistant.turn_end":
      if (!agent) {
        state.turnOpen = false;
        break;
      }
      {
        const rec = recordOf(state, agent);
        if (rec) {
          rec.turnOpen = false;
          rec.turnEndAt = at;
          if (rec.completedAt !== null) markIdle(state, agent, at);
        }
      }
      break;
    // A skill run a second time in a session is written as a receipt that
    // points at the first one's content, with the same `name` (Copilot CLI
    // 1.0.91 schema, SkillInvokedRefData). It is an invocation all the same.
    case "skill.invoked_ref":
    case "skill.invoked": {
      const name = plainText(data.name);
      if (!name || at === null) break;
      const list = agent ? agentState(state, agent).skills : state.skills;
      list.push({ name, t: at });
      // Only the window's worth is ever shown; this keeps the stored state small.
      if (list.length > 50) list.splice(0, list.length - 50);
      break;
    }
    case "subagent.started": {
      const call = plainText(data.toolCallId);
      if (!call) break;
      state.subagents = state.subagents.filter((r) => r.call !== call);
      state.subagents.push({
        call,
        agent,
        // Only what a row draws, so the sidecar does not carry each brief's prompt.
        data: {
          agentName: plainText(data.agentName),
          agentType: plainText(data.agentType),
          agentDescription: plainText(data.agentDescription),
          agentDisplayName: plainText(data.agentDisplayName),
          model: plainText(data.model),
        },
        startTime: at,
        completedAt: null,
        turnOpen: false,
        turnEndAt: null,
        resumedAt: null,
      });
      break;
    }
    case "subagent.completed": {
      // Copilot writes this when a subagent's turn ends and it goes idle,
      // waiting for messages; its work is not necessarily over. Kept, so a
      // resume or a background command it started can bring the row back.
      const rec = state.subagents.find((r) => r.call === plainText(data.toolCallId));
      if (!rec) break;
      rec.completedAt = at ?? rec.startTime ?? 0;
      rec.turnOpen = false;
      markIdle(state, rec.agent, rec.completedAt);
      rec.resumedAt = null;
      const finished = state.subagents.filter((r) => r.completedAt !== null);
      if (finished.length > FINISHED_KEPT) {
        const drop = new Set(finished.slice(0, finished.length - FINISHED_KEPT));
        state.subagents = state.subagents.filter((r) => !drop.has(r));
        for (const r of drop) if (r.agent) delete state.shells[r.agent];
      }
      break;
    }
    case "subagent.failed": {
      const call = plainText(data.toolCallId);
      const rec = state.subagents.find((r) => r.call === call);
      state.subagents = state.subagents.filter((r) => r.call !== call);
      if (rec?.agent) delete state.shells[rec.agent];
      break;
    }
    case "session.shutdown":
    case "session.start":
    case "session.resume":
      // The process that ran them is gone; nothing it started is running.
      // A crash or a closed terminal writes no shutdown, so a start or a
      // resume, which begins a new process, also ends the old one's work.
      state.subagents = [];
      state.shells = {};
      state.pendingShells = {};
      state.turnOpen = false;
      // A resume restates the session limit it comes back with.
      if (event.type === "session.resume" && "sessionLimits" in data) state.sessionLimit = positive(data.sessionLimits?.maxAiCredits);
      break;
    // The root session's own model and effort (specs/033-copilot-parity). A
    // subagent's events carry its agentId, and its model and effort are its
    // row's, never the session's: real subagents ran mai-code-1.1-flash at
    // `low` under a root on gpt-6-luna at `medium`.
    case "user.message": {
      if (agent) break;
      const effort = plainText(data.responsesReasoning?.effort);
      if (effort) state.effort = effort;
      break;
    }
    case "session.model_change": {
      if (agent) break;
      const effort = plainText(data.reasoningEffort);
      if (effort) state.effort = effort;
      // What answered for the old model says nothing about the new one.
      state.answeredModel = null;
      state.routedModel = null;
      break;
    }
    case "session.auto_mode_resolved":
      if (!agent) state.routedModel = plainText(data.chosenModel) ?? state.routedModel;
      break;
    case "assistant.message":
      // A subagent's messages carry its agentId and the tool call that
      // started it. One real root message had an empty model, which names
      // nothing and so changes nothing.
      if (!agent && !plainText(data.parentToolCallId)) state.answeredModel = plainText(data.model) ?? state.answeredModel;
      break;
    case "session.session_limits_changed":
      if (!agent) state.sessionLimit = positive(data.sessionLimits?.maxAiCredits);
      break;
    case "subagent.configured":
      if (agent) {
        const s = agentState(state, agent);
        s.model = plainText(data.model) ?? s.model;
        s.effort = plainText(data.reasoningEffort) ?? s.effort;
      }
      break;
    case "tool.execution_start": {
      if (!agent) break;
      const s = agentState(state, agent);
      s.step = plainText(data.toolTitle) ?? plainText(data.toolName) ?? s.step;
      const tool = plainText(data.toolName);
      const args = data.arguments && typeof data.arguments === "object" ? data.arguments : {};
      const call = plainText(data.toolCallId);
      if (tool && SHELL_TOOLS.has(tool) && call) {
        const command = plainText(args.command);
        if (command) {
          state.pendingShells[call] = { agent, command, async: args.mode === "async", detach: args.detach === true };
          const keys = Object.keys(state.pendingShells);
          if (keys.length > 200) delete state.pendingShells[keys[0]];
        }
      } else if (tool === "stop_bash" || tool === "stop_powershell") {
        closeShell(state, shellIdOf(args.shellId ?? args.shell_id), agent);
      }
      break;
    }
    case "tool.execution_complete": {
      // A result that ended a shell says so in a shell_exit block (Copilot
      // CLI 1.0.91 types, ToolExecutionCompleteContentShellExit).
      const contents = Array.isArray(data.result?.contents) ? data.result.contents : [];
      for (const block of contents) if (block?.type === "shell_exit") closeShell(state, shellIdOf(block.shellId), agent);
      const call = plainText(data.toolCallId);
      const pending = call ? state.pendingShells[call] : null;
      if (!pending) break;
      delete state.pendingShells[call];
      // An async command, or a sync one that outlived its wait, comes back as
      // "<command started in background with shellId: 0>" and keeps running
      // as a child of the copilot process (real session e9781cd9, 15:10:51).
      // A sync command that finished says "<shellId: 1 completed with exit
      // code 0>" (same session, 15:11:33), which names a shell too and must
      // not open one.
      const text = resultText(data);
      const m = /shellId:\s*([\w-]+)/.exec(text);
      if (!m || data.success === false || /\b(completed|exited|exit code)\b/i.test(text)) break;
      if (!pending.async && !/\bbackground\b/i.test(text)) break;
      const list = (state.shells[pending.agent] ??= []);
      list.push({ shellId: m[1], command: pending.command, detach: pending.detach, since: at });
      break;
    }
    case "system.notification": {
      const kind = data.kind && typeof data.kind === "object" ? data.kind : {};
      if (kind.type === "shell_completed" || kind.type === "shell_detached_completed") closeShell(state, shellIdOf(kind.shellId));
      break;
    }
  }
}

/** Every complete line of `buf` folded into `state`; the unfinished tail is returned, unread. */
function applyLines(state, buf) {
  const end = buf.lastIndexOf(0x0a);
  const complete = end < 0 ? "" : buf.subarray(0, end + 1).toString("utf8");
  for (const line of complete.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    apply(state, event);
  }
  return { consumed: end + 1, rest: buf.subarray(end + 1) };
}

// The sidecar --------------------------------------------------------------

function sidecarFile(sessionDir) {
  const key = createHash("sha256").update(String(sessionDir)).digest("hex").slice(0, 16);
  // Resolved per call, the way cache.js does, so a HOME set later is honoured.
  return path.join(os.homedir(), ".claude", "statusline", "cache", `${key}.copilot-events.json`);
}

function readAt(fd, start, length) {
  const buf = Buffer.alloc(Math.max(0, length));
  const n = buf.length ? readSync(fd, buf, 0, buf.length, start) : 0;
  return buf.subarray(0, n);
}

/**
 * The first and last bytes of the part already read. The same inode with the
 * same size or more is not proof of an append: a file written over in place
 * keeps both, and its old state would then describe a different log.
 */
function fingerprint(fd, offset) {
  const head = readAt(fd, 0, Math.min(FINGERPRINT_BYTES, offset));
  const tailLen = Math.min(FINGERPRINT_BYTES, offset);
  const tail = readAt(fd, offset - tailLen, tailLen);
  return createHash("sha256").update(head).update(tail).digest("hex");
}

function loadSidecar(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    if (parsed?.schema !== SIDECAR_SCHEMA || typeof parsed.offset !== "number") return null;
    const s = parsed.state;
    const isMap = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    if (!isMap(s) || !Array.isArray(s.subagents) || !Array.isArray(s.skills) || !isMap(s.byAgent) || !isMap(s.shells) || !isMap(s.pendingShells)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Written through a temporary file and a rename, so a reader never sees half of it. */
function saveSidecar(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, file);
  } catch {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to clean up
    }
  }
}

/**
 * The folded state of the log as it stands, plus any unfinished last line.
 * Uses the sidecar when it still describes this file; otherwise reads the
 * last 2 MB, as every redraw did before the sidecar, and starts one.
 */
function readState(file, { sidecar = true } = {}) {
  let fd;
  try {
    fd = openSync(file, "r");
    const stat = fstatSync(fd);
    const size = stat.size;
    const ino = String(stat.ino);
    const store = sidecar ? sidecarFile(path.dirname(file)) : null;
    const saved = store ? loadSidecar(store) : null;
    let state;
    let offset;
    let buf;
    let fresh = false;
    if (
      saved &&
      saved.ino === ino &&
      saved.offset <= size &&
      size - saved.offset <= MAX_INCREMENT_BYTES &&
      saved.fingerprint === fingerprint(fd, saved.offset)
    ) {
      state = saved.state;
      offset = saved.offset;
      buf = readAt(fd, offset, size - offset);
    } else {
      fresh = true;
      state = freshState();
      offset = Math.max(0, size - TAIL_BYTES);
      buf = readAt(fd, offset, size - offset);
      // A read that starts mid-file starts mid-line; that first piece is not an event.
      if (offset > 0) {
        const nl = buf.indexOf(0x0a);
        const skip = nl < 0 ? buf.length : nl + 1;
        buf = buf.subarray(skip);
        offset += skip;
      }
    }
    const { consumed, rest } = applyLines(state, buf);
    const next = offset + consumed;
    if (store && (fresh || next !== saved.offset)) {
      saveSidecar(store, { schema: SIDECAR_SCHEMA, ino, offset: next, fingerprint: fingerprint(fd, next), state });
    }
    // A last line still being written, or written without a newline, counts
    // for this answer but is not stored: it will be read whole next time.
    if (rest.length && rest.toString("utf8").trim()) {
      const draft = structuredClone(state);
      applyLines(draft, Buffer.concat([rest, Buffer.from("\n")]));
      return draft;
    }
    return state;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/**
 * The row for a subagent, or null when it is not working.
 *
 * Running: started and not completed, or resumed by the root after it went
 * idle and inside that new turn. Background: idle, but a command it started
 * in the background has not been seen to end. `shellAlive` answers for that
 * command when the caller can list processes (true, false, or null for "do
 * not know"); without an answer the row stays the 120 s Copilot's own panel
 * keeps an idle agent, and then goes, since nothing written to the log says
 * when a subagent's background command ends. The redraw does not list
 * processes itself: `ps -A` took 348 to 675 ms on the reference machine
 * (gateRuns.js), more than the whole redraw is allowed.
 */
function rowState(rec, state, now, shellAlive) {
  if (rec.completedAt === null) return { status: "running", startTime: rec.startTime, counts: true };
  if (rec.resumedAt !== null && (rec.turnOpen || (rec.turnEndAt !== null && rec.turnEndAt >= rec.resumedAt && now - rec.turnEndAt < TURN_GAP_MS))) {
    return { status: "running", startTime: rec.resumedAt, counts: true };
  }
  const open = (rec.agent && state.shells[rec.agent]) || [];
  if (!open.length) return null;
  const idleSince = Math.max(rec.completedAt, rec.turnEndAt ?? 0);
  let answer = null;
  let shell = open[open.length - 1];
  if (typeof shellAlive === "function") {
    const answers = open.map((s) => {
      try {
        const v = shellAlive(s);
        return v === true || v === false ? v : null;
      } catch {
        return null;
      }
    });
    const live = answers.lastIndexOf(true);
    if (live >= 0) {
      answer = true;
      shell = open[live];
    } else if (!answers.includes(null)) answer = false;
  }
  if (answer === false) return null;
  if (answer === null) {
    const fresh = open.filter((s) => now - (s.idleAt ?? idleSince) <= IDLE_GRACE_MS);
    if (!fresh.length) return null;
    shell = fresh[fresh.length - 1];
  }
  return { status: "background", startTime: shell.since ?? rec.startTime, label: `background: ${shell.command}`, counts: answer === true };
}

export function copilotSessionActivity(
  sessionDir,
  { now = Date.now(), limit = 3, shellAlive = null, sidecar = true, readTodos = readCopilotTodos } = {}
) {
  if (typeof sessionDir !== "string" || !sessionDir) return null;
  const file = path.join(sessionDir, "events.jsonl");
  // A sidecar that cannot be used for any reason costs the redraw nothing
  // more than a read of the tail, which is what it did before there was one.
  const state = readState(file, { sidecar }) ?? (sidecar ? readState(file, { sidecar: false }) : null);
  if (state === null) return null;

  const window = windowMs();
  const inWindow = (s) => now - s.t <= window;
  let counted = false;
  const agents = [];
  for (const rec of state.subagents) {
    const row = rowState(rec, state, now, shellAlive);
    if (!row) continue;
    if (row.counts) counted = true;
    const { call, agent } = rec;
    const data = rec.data && typeof rec.data === "object" ? rec.data : {};
    const s = (agent && state.byAgent[agent]) || { step: null, model: null, effort: null, dispatched: null, skills: [] };
    const configured = s.model ?? plainText(data.model);
    const model = s.dispatched ?? configured;
    agents.push({
      id: agent ?? call,
      name: plainText(data.agentName) ?? plainText(data.agentType),
      description: plainText(data.agentDescription) ?? plainText(data.agentDisplayName),
      label: row.label ?? s.step,
      // "background" when the agent is idle and only a command it started is
      // still running, so the row does not claim the agent is thinking.
      status: row.status,
      model,
      // The effort was chosen for the configured model; the log does not say
      // whether a different dispatched model runs at it.
      effort: model === configured ? s.effort : null,
      startTime: row.startTime,
      skills: [...new Set(s.skills.filter(inWindow).map((k) => k.name).reverse())],
    });
  }

  // Newest first, each skill once.
  const unique = [...new Set(state.skills.filter(inWindow).map((k) => k.name).reverse())];
  const lastAt = state.lastAt;
  return {
    skills: unique.slice(0, limit),
    skillsTrueCount: unique.length,
    // From the session's own SQLite file, not the log: Copilot announces a
    // todo change only as an ephemeral signal that never reaches events.jsonl.
    todos: readTodos(sessionDir),
    effort: state.effort ?? null,
    resolvedModel: state.answeredModel ?? state.routedModel ?? null,
    sessionLimit: state.sessionLimit ?? null,
    // A running subagent is work in progress even when the root has gone
    // quiet, the rule Claude Code's reader follows (specs/012). An idle one
    // kept only by the grace period is not: nothing says its command runs.
    working: state.turnOpen || counted || (lastAt !== null && now - lastAt <= ACTIVE_WITHIN_MS),
    agents,
  };
}
