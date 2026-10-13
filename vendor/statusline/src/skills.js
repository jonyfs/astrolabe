import { readFileSync } from "node:fs";
import { stateRoot, readablePath } from "./paths.js";
import path from "node:path";
import os from "node:os";
import { scanTailForSkills, scanTail } from "./transcriptTail.js";
import { readSkillEvents, readSkillEventsTrueCount } from "./skillEvents.js";

/**
 * How long a skill counts as active after it was last invoked.
 *
 * Claude Code emits no "skill unloaded" event, so there is nothing to
 * observe that says a skill stopped mattering. Without a window, a skill
 * invoked once stays on the line for the rest of the session: in a real
 * transcript this showed a skill used three hours and 3,300 entries
 * earlier, sitting next to one from a minute ago as though both were
 * equally current.
 *
 * A time window is the honest approximation. It uses the timestamp the
 * transcript already records, and it degrades in the safe direction: a
 * skill that is genuinely still shaping the work will have been used
 * recently, and one that has not been touched in half an hour almost
 * certainly belongs to a finished task.
 */
const DEFAULT_WINDOW_MS = 30 * 60 * 1000;

export function windowMs() {
  const raw = process.env.CLAUDE_STATUSLINE_SKILL_WINDOW_MIN;
  if (!raw) return DEFAULT_WINDOW_MS;
  const minutes = Number(raw);
  // A non-numeric or negative override falls back rather than disabling
  // expiry by accident, which would silently restore the stale-skill bug.
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60000 : DEFAULT_WINDOW_MS;
}

// How fresh the task-rows snapshot (specs/011-multiagent-skills-line) must
// be to trust. Distinct from the 30-minute skill-activity window: this
// answers "is this snapshot still describing a running subagent", which is
// a live-tick question, not an invocation-recency one. A snapshot older
// than this is treated as "ticks stopped, nothing is running" rather than
// as thirty more minutes of assumed activity.
const TASK_SNAPSHOT_FRESHNESS_MS = 30 * 1000;


/**
 * The running subagents `task-rows` recorded on its own tick
 * (specs/011-multiagent-skills-line). Every failure mode (missing file,
 * invalid JSON, stale snapshot) returns an empty list rather than throwing:
 * with no subagent activity to report, line 2 falls back to exactly today's
 * directly-invoked-only behaviour (FR-004).
 *
 * The snapshot is keyed by session id, so two Claude Code windows on two
 * projects no longer read each other's running agents. `latest.json` is the
 * fallback name when neither side has a session id.
 */
function readTaskSnapshot(now, sessionId) {
  let raw;
  try {
    const safe = sessionId ? String(sessionId).replace(/[^A-Za-z0-9_-]/g, "_") : "latest";
    raw = readFileSync(readablePath("tasks", `${safe}.json`), "utf8");
  } catch {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed?.writtenAt !== "number" || now - parsed.writtenAt > TASK_SNAPSHOT_FRESHNESS_MS) return [];
  return Array.isArray(parsed.tasks) ? parsed.tasks : [];
}

/** Just the identifying labels, which is all the merged skills list needs. */
export function subagentActivity(now = Date.now(), sessionId = null) {
  return readTaskSnapshot(now, sessionId)
    .map((t) => t?.label)
    .filter((label) => typeof label === "string" && label.length > 0);
}

/**
 * Skills invoked recently in the current session, most recent first,
 * deduplicated by name and dropped once they fall outside the window.
 *
 * Two paths lead here, and they agree on the answer. The optional
 * `PostToolUse` hook appends each invocation to a small per-session file,
 * which is a few hundred bytes to read and is written the moment the skill
 * runs. Without the hook, the transcript's tail is scanned instead, which
 * costs more and reacts only once the entry has been flushed. The hook is
 * an accelerator, never a dependency: the fallback is the source of truth
 * for correctness.
 *
 * The transcript format is not a stable public contract, so every step is
 * defensive: a parse failure yields fewer skills rather than a crash, and
 * an entry with no usable timestamp is kept rather than discarded, since
 * dropping it would hide a skill that may well be active.
 */
export function getActiveSkills(transcriptPath, limit = 3, { now = Date.now(), sessionId, scanned } = {}) {
  const window = windowMs();

  if (sessionId) {
    const fromHook = readSkillEvents(sessionId, { limit, windowMs: window, now });
    if (fromHook.length) return fromHook;
  }

  // The activity scan walks the same tail with the same window and already
  // collected the skills on its way past them. Reading the file a second time
  // costs a second walk over a transcript that can be megabytes, for a list
  // that is already in hand.
  if (Array.isArray(scanned)) return scanned.slice(0, limit);

  if (!transcriptPath) return [];
  return scanTailForSkills(transcriptPath, { limit, windowMs: window, now }).skills;
}

/**
 * The true number of distinct active skills, not capped at a display
 * limit — what the overflow indicator's "+N" needs to be honest (FR-002,
 * specs/008-skills-line-completeness). A separate function rather than a
 * richer `getActiveSkills` return shape, so every existing caller (and
 * every test stub returning a plain array) keeps working unchanged.
 * Reuses whatever the caller already scanned (`scannedTrueCount`, from
 * `getSessionActivity`) rather than walking the transcript a second time.
 */
export function getActiveSkillsTrueCount(transcriptPath, { now = Date.now(), sessionId, scanned, scannedTrueCount } = {}) {
  const window = windowMs();

  if (sessionId) {
    const hookCount = readSkillEventsTrueCount(sessionId, { windowMs: window, now });
    if (hookCount > 0) return hookCount;
  }

  if (typeof scannedTrueCount === "number") return scannedTrueCount;
  if (Array.isArray(scanned)) return scanned.length;

  if (!transcriptPath) return 0;
  return scanTailForSkills(transcriptPath, { limit: 0, windowMs: window, now }).trueCount;
}

/**
 * The same scan, with the bookkeeping the diagnostic needs: how much was
 * read, and whether the walk gave up before it ran out of material.
 */
export function getActiveSkillsDetailed(transcriptPath, limit = 3, { now = Date.now(), sessionId } = {}) {
  const window = windowMs();

  if (sessionId) {
    const fromHook = readSkillEvents(sessionId, { limit, windowMs: window, now });
    if (fromHook.length) {
      return {
        skills: fromHook,
        trueCount: readSkillEventsTrueCount(sessionId, { windowMs: window, now }),
        truncated: false,
        bytesRead: 0,
        source: "hook",
      };
    }
  }

  if (!transcriptPath) return { skills: [], trueCount: 0, truncated: false, bytesRead: 0, source: "transcript" };
  return { ...scanTailForSkills(transcriptPath, { limit, windowMs: window, now }), source: "transcript" };
}

/**
 * What the session is doing, and how far along it is: the todo list, and
 * whether Claude has done anything in the last few seconds.
 *
 * "Working" here means the transcript grew recently. It is an
 * approximation, and the honest one available: there is no event that says
 * "thinking now", and the statusline hides during permission prompts
 * anyway. A session that has been quiet for longer than the threshold reads
 * as idle, which is what it looks like from the outside.
 */
const ACTIVE_WITHIN_MS = 10_000;

export function getSessionActivity(transcriptPath, { now = Date.now(), limit = 3 } = {}) {
  // No transcript is not an idle session; it is a session this process
  // cannot see. Saying "idle" there would be a claim about something
  // unobserved.
  if (!transcriptPath) return null;
  const scan = scanTail(transcriptPath, { limit, windowMs: windowMs(), now });
  const background = scan.background ?? { shells: 0, agents: 0 };
  const recent = scan.lastAt !== null && now - scan.lastAt <= ACTIVE_WITHIN_MS;
  return {
    skills: scan.skills,
    skillsTrueCount: scan.skillsTrueCount,
    todos: scan.todos,
    // A background shell or async agent the session started writes nothing
    // to the transcript until it is notified as finished, so a session
    // waiting on a gate or a build looks quiet. It is still working: the
    // transcript says the job started and has not said it ended.
    working: recent || background.shells + background.agents > 0,
    background,
    // How long the transcript has been quiet, for the idle clock, and whether
    // the session is waiting on a person (specs/048-state-feedback).
    idleMs: scan.lastAt !== null ? Math.max(0, now - scan.lastAt) : null,
    awaiting: scan.awaiting === true,
  };
}

/**
 * The feature Spec Kit's own commands are currently pointed at, read from
 * `.specify/feature.json` at the project root — the exact file
 * `/speckit-specify`, `/speckit-plan` and `/speckit-tasks` already write
 * before doing their own work (specs/009-speckit-feature-indicator).
 *
 * Every failure mode (no `.specify` directory, no file, invalid JSON, a
 * `feature_directory` that is missing or not a string) degrades to `null`
 * rather than throwing: a project not using Spec Kit's per-feature
 * tracking is a normal case, not an error (FR-004).
 */
export function inProgressFeatureId(projectRoot = process.cwd()) {
  // The current directory may be a subdirectory of the project root, so walk
  // up until the Spec Kit marker is found or the filesystem root is reached.
  let dir = projectRoot;
  for (let depth = 0; depth < 64; depth++) {
    let raw;
    try {
      raw = readFileSync(path.join(dir, ".specify", "feature.json"), "utf8");
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    const featureDir = parsed?.feature_directory;
    if (typeof featureDir !== "string" || !featureDir) return null;
    return path.basename(featureDir);
  }
  return null;
}

/**
 * Which step of Spec Kit's spec-driven-development flow each `speckit-*`
 * skill belongs to, in plain language. Read by `sddStepFor` below; kept as
 * its own table so a new speckit skill gets one line added here rather than
 * a change to the lookup logic (specs/007-speckit-step-indicator).
 */
export const SDD_STEP_LABELS = {
  "speckit-specify": "specifying",
  "speckit-clarify": "clarifying",
  "speckit-plan": "planning",
  "speckit-tasks": "writing tasks",
  "speckit-analyze": "analyzing",
  "speckit-implement": "implementing",
  "speckit-checklist": "checklisting",
  "speckit-constitution": "setting constitution",
  "speckit-converge": "converging",
  "speckit-taskstoissues": "filing issues",
  "speckit-agent-context-update": "updating agent context",
};

/**
 * The SDD step a skill name maps to, for display next to the skills chip.
 *
 * A `speckit-*` skill missing from the table above still gets a readable
 * label (FR-006): the prefix is dropped, hyphens become spaces, and the
 * first letter is capitalized, so a raw identifier never reaches the line
 * (FR-002, SC-003). Anything not `speckit-*` returns null: it has no SDD
 * step to show, per this feature's scope (specs/007).
 */
export function sddStepFor(skillName) {
  if (typeof skillName !== "string") return null;
  if (SDD_STEP_LABELS[skillName]) return SDD_STEP_LABELS[skillName];
  if (!skillName.startsWith("speckit-")) return null;
  const rest = skillName.slice("speckit-".length).replace(/-/g, " ");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

