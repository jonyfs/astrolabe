/**
 * An OpenCode session, read as the payload Claude Code would have sent
 * (specs/038-opencode).
 *
 * OpenCode runs no status line command. Its TUI plugin (src/opencode/tui.tsx)
 * takes a snapshot of OpenCode's own synced state and hands it here:
 *
 *   directory, worktree, branch   api.state.path, api.state.vcs
 *   session                       api.state.session.get(id): cost, time.created,
 *                                 summary.additions/deletions
 *   messages                      api.state.session.messages(id)
 *   status                        api.state.session.status(id): idle, busy, retry
 *   todos                         api.state.session.todo(id): content, status
 *   providers                     api.state.provider: models[id].name, limit.context
 *
 * Every figure is OpenCode's own. The context share is the formula OpenCode's
 * sidebar uses: the last assistant message with output, its input, output,
 * reasoning and cache tokens over the model's context limit. Without a limit
 * the share is absent and the bar shows `?%`. OpenCode reports no usage
 * windows, so the payload carries no `rate_limits`.
 *
 * This module has no OpenCode imports, so the suite tests it under Node.
 */

import { summarizeTodoRows } from "./copilotTodos.js";

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => (typeof v === "string" && v.length > 0 ? v : null);
const count = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** The last assistant message that produced output, which is the one OpenCode's context figure reads. */
function lastAnswer(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (isObject(m) && m.role === "assistant" && isObject(m.tokens) && count(m.tokens.output) > 0) return m;
  }
  return null;
}

/** The most recent message of either kind that names a model, for the model chip before the first answer. */
function lastModelRef(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!isObject(m)) continue;
    if (m.role === "assistant" && text(m.modelID) && text(m.providerID)) {
      return { providerID: m.providerID, modelID: m.modelID, variant: text(m.variant) };
    }
    if (m.role === "user" && isObject(m.model) && text(m.model.modelID) && text(m.model.providerID)) {
      return { providerID: m.model.providerID, modelID: m.model.modelID, variant: text(m.model.variant) };
    }
  }
  return null;
}

function modelInfo(providers, providerID, modelID) {
  if (!Array.isArray(providers)) return null;
  const provider = providers.find((p) => isObject(p) && p.id === providerID);
  const model = isObject(provider?.models) ? provider.models[modelID] : null;
  return isObject(model) ? model : null;
}

/** The tokens OpenCode counts as the context in use. */
function contextTokens(tokens) {
  const parts = [tokens.input, tokens.output, tokens.reasoning, tokens.cache?.read, tokens.cache?.write].map(count);
  if (parts.slice(0, 2).some((p) => p === null)) return null;
  return parts.reduce((sum, p) => sum + (p ?? 0), 0);
}

/** Working while OpenCode is on a turn, or retrying one; the todo list as the bar's todo chip reads it. */
export function opencodeActivity(snapshot) {
  const status = snapshot?.status?.type;
  const rows = Array.isArray(snapshot?.todos)
    ? snapshot.todos.filter(isObject).map((t) => ({ status: t.status, title: t.content }))
    : [];
  return {
    skills: [],
    skillsTrueCount: 0,
    todos: summarizeTodoRows(rows),
    working: status === "busy" || status === "retry",
    background: { shells: 0, agents: 0 },
  };
}

/**
 * The payload Claude Code would have sent for this session, with an
 * `opencode` block that marks it as OpenCode's (src/harness.js reads that).
 */
export function opencodePayload(snapshot, { now = Date.now() } = {}) {
  const s = isObject(snapshot) ? snapshot : {};
  const payload = {
    opencode: {
      version: text(s.version),
      activity: opencodeActivity(s),
    },
  };
  const cwd = text(s.directory);
  if (cwd) {
    payload.cwd = cwd;
    payload.workspace = { current_dir: cwd };
    if (text(s.worktree) && s.worktree !== "/") payload.workspace.project_dir = s.worktree;
  }
  if (text(s.version)) payload.version = s.version;

  const session = isObject(s.session) ? s.session : null;
  if (session && text(session.id)) payload.session_id = `opencode-${session.id}`;

  const ref = lastModelRef(s.messages) ?? (isObject(session?.model) && text(session.model.id) && text(session.model.providerID)
    ? { providerID: session.model.providerID, modelID: session.model.id, variant: text(session.model.variant) }
    : null);
  const info = ref ? modelInfo(s.providers, ref.providerID, ref.modelID) : null;
  if (ref) payload.model = { id: ref.modelID, display_name: text(info?.name) ?? ref.modelID };
  if (ref?.variant) payload.effort = { level: ref.variant };

  const answer = lastAnswer(s.messages);
  if (answer) {
    const answerInfo = modelInfo(s.providers, answer.providerID, answer.modelID);
    const limit = count(answerInfo?.limit?.context);
    const used = contextTokens(answer.tokens);
    const cw = {};
    if (limit) cw.context_window_size = limit;
    if (limit && used !== null) {
      cw.used_percentage = (used / limit) * 100;
      cw.remaining_percentage = 100 - cw.used_percentage;
    }
    if (Object.keys(cw).length) payload.context_window = cw;
  }

  if (session) {
    const cost = {};
    if (count(session.cost) !== null) cost.total_cost_usd = session.cost;
    const started = count(session.time?.created);
    if (started !== null && now >= started) cost.total_duration_ms = now - started;
    const added = count(session.summary?.additions);
    const removed = count(session.summary?.deletions);
    if (added !== null && removed !== null) {
      cost.total_lines_added = added;
      cost.total_lines_removed = removed;
    }
    if (Object.keys(cost).length) payload.cost = cost;
  }
  return payload;
}
