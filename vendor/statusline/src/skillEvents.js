/**
 * The per-session record of skill invocations written by the optional
 * `PostToolUse` hook.
 *
 * Why it exists: the transcript is written when Claude Code flushes it, so
 * a skill invoked a moment ago may not be readable yet. The hook fires at
 * the invocation itself, so the line reacts on the next redraw rather than
 * whenever the file catches up.
 *
 * Why the fallback stays: a hook is a second place for behaviour to live.
 * Anyone who skipped it, uses another machine, or edits their settings
 * would otherwise see a silently different statusline. The transcript scan
 * remains the source of truth; this only makes it faster (FR-019).
 *
 * The file is appended to, one JSON object per line, so a hook writing
 * while a redraw reads can never produce half a record.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { plainText } from "./text.js";
import path from "node:path";
import os from "node:os";

const MAX_TAIL_BYTES = 64 * 1024;

function skillsDir() {
  return path.join(os.homedir(), ".claude", "statusline", "skills");
}

/** The same sanitising the animation state files already use. */
export function sessionFileFor(sessionId) {
  const safe = String(sessionId || "default").replace(/[^A-Za-z0-9_-]/g, "_");
  return path.join(skillsDir(), `${safe}.jsonl`);
}

/** Appends one invocation. Best effort: losing a record costs one redraw's speed. */
export function appendSkillEvent(sessionId, skill, { now = Date.now(), agentId = null } = {}) {
  if (!skill) return false;
  try {
    mkdirSync(skillsDir(), { recursive: true });
    // `agent` is recorded only when the hook payload carried one, which it
    // does for a tool call made inside a subagent. Nothing depends on it
    // being there: a record without it is the record this file has always
    // held, and the reader below treats an absent agent as "the session".
    const record = agentId ? { skill, at: now, agent: agentId } : { skill, at: now };
    appendFileSync(sessionFileFor(sessionId), JSON.stringify(record) + "\n");
    return true;
  } catch {
    return false;
  }
}

/**
 * Recent skills for a session, newest first, deduplicated and windowed.
 *
 * Only the tail of the file is read, and a malformed line is skipped
 * rather than ending the read: a truncated write in the middle of the file
 * must not hide the good records after it.
 */
/**
 * Every distinct skill in the window, newest first — unbounded by any
 * display limit, since the file it reads is already capped at
 * `MAX_TAIL_BYTES`. `readSkillEvents` and the count both come from this so
 * the overflow indicator (specs/008-skills-line-completeness, FR-002) can
 * report a true total rather than a count computed over a capped list.
 */
function scanAllSkillEvents(sessionId, { windowMs = 30 * 60 * 1000, now = Date.now() } = {}) {
  let text;
  try {
    text = readFileSync(sessionFileFor(sessionId), "utf8");
  } catch {
    return [];
  }

  if (text.length > MAX_TAIL_BYTES) text = text.slice(-MAX_TAIL_BYTES);
  const cutoff = now - windowMs;
  const lines = text.split("\n").filter(Boolean);
  const found = [];
  const seen = new Set();

  for (let i = lines.length - 1; i >= 0; i--) {
    let record;
    try {
      record = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (typeof record?.at !== "number" || record.at < cutoff || record.at > now) continue;
    // A record carrying an agent belongs to a subagent, and its skills belong
    // on that agent's own row. Line 2 says what is shaping THIS session, and
    // folding four subagents' skills into it made that chip a list of things
    // the reader is not doing.
    if (record.agent) continue;
    const skill = plainText(record.skill);
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    found.push(skill);
  }

  return found;
}

export function readSkillEvents(sessionId, { limit = 3, windowMs = 30 * 60 * 1000, now = Date.now() } = {}) {
  return scanAllSkillEvents(sessionId, { windowMs, now }).slice(0, limit);
}

/** The true count behind `readSkillEvents`, not capped at its `limit`. */
export function readSkillEventsTrueCount(sessionId, { windowMs = 30 * 60 * 1000, now = Date.now() } = {}) {
  return scanAllSkillEvents(sessionId, { windowMs, now }).length;
}

/**
 * The most recent entry in the log, whether or not it is still inside the
 * activity window — what doctor needs to say "X expired at <time>" instead
 * of just "no skill used inside the activity window" (FR-004,
 * specs/008-skills-line-completeness). Bounded the same way every other
 * read here is, by `MAX_TAIL_BYTES`.
 */
export function mostRecentSkillEvent(sessionId) {
  let text;
  try {
    text = readFileSync(sessionFileFor(sessionId), "utf8");
  } catch {
    return null;
  }
  if (text.length > MAX_TAIL_BYTES) text = text.slice(-MAX_TAIL_BYTES);
  const lines = text.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    let record;
    try {
      record = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    // Cleaned on the way out rather than on the way in, so records written
    // before this guard existed are safe to read too.
    const skill = plainText(record?.skill);
    if (skill && typeof record?.at === "number") return { skill, at: record.at };
  }
  return null;
}

/**
 * The `note-skill` subcommand: read the hook payload from stdin, append one
 * record, say nothing, exit 0. A `PostToolUse` hook's non-zero exit is
 * feedback to the agent, and a statusline has nothing to tell it.
 */
export async function runNoteSkill({ now = Date.now() } = {}) {
  const raw = await new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });

  try {
    const payload = JSON.parse(raw || "{}");
    const input = payload?.tool_input || payload?.toolInput || {};
    // Cleaned on the way in as well: there is no reason to store a name the
    // bar will refuse to draw, and the file is easier to read without them.
    const skill = plainText(input.skill) ?? plainText(input.name) ?? plainText(payload?.skill);
    const sessionId = payload?.session_id || payload?.sessionId;
    // Present when the call came from inside a subagent, absent when it came
    // from the session itself. `session_id` stays the parent's either way, so
    // this is the only thing in the payload that separates the two.
    const agentId = payload?.agent_id || payload?.agentId || null;
    if (skill) appendSkillEvent(sessionId, skill, { now, agentId });
  } catch {
    // An unrecognised payload shape means do nothing, not fail.
  }
  return true;
}

/**
 * The skills each subagent has used inside the window, keyed by the agent id
 * the hook recorded.
 *
 * Deliberately unwindowed, unlike the session's own list. Thirty minutes
 * answers "which skills are still shaping this session", and a session runs
 * for as long as it runs; an agent is bounded — it starts, works and ends —
 * so the honest filter is whether it is still running, and the caller already
 * applies it by looking up only the ids on the current tick. Windowing on top
 * of that dropped the skills of any agent past its first half hour, which is
 * exactly the long run where knowing what it is doing matters most. A
 * finished agent's id never comes back, so its records are simply never
 * asked for; the file's own tail cap bounds what is read.
 *
 * Whether this is ever non-empty depends on something Claude Code does not
 * document: the hook reports an `agent_id` and the subagent rows report a
 * task `id`, and nothing states that they are the same value. Where they are
 * not, this returns nothing for that agent and the row says nothing extra,
 * which is the same outcome as the hook not being installed at all.
 */
export function readSkillsByAgent(sessionId) {
  const byAgent = new Map();
  let text;
  try {
    text = readFileSync(sessionFileFor(sessionId), "utf8");
  } catch {
    return byAgent;
  }
  if (text.length > MAX_TAIL_BYTES) text = text.slice(-MAX_TAIL_BYTES);
  for (const line of text.split("\n")) {
    if (!line) continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const skill = plainText(record.skill);
    if (!record?.agent || !skill) continue;
    const seen = byAgent.get(record.agent) ?? [];
    if (!seen.includes(skill)) seen.push(skill);
    byAgent.set(record.agent, seen);
  }
  return byAgent;
}
