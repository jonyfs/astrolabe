/**
 * Reads the end of a session transcript without reading the whole file.
 *
 * The transcript is the only source whose cost grows with the length of
 * the session. Reading a real 78 MB transcript took 235 ms plus 86 ms to
 * split it into lines, on every redraw, for the sake of three skill names
 * at the very end of it. Reading the last 2 MB through a file descriptor
 * took 9 ms and parsing that took 8 ms.
 *
 * So the read walks backwards in chunks and stops as soon as it has what
 * it came for. Two things bound it: a byte cap, so a pathological
 * transcript cannot consume the redraw, and a time budget, so a slow disk
 * cannot either. Both are reported back, because "no skills were used
 * recently" and "the scan gave up" are different answers and the
 * diagnostic has to tell them apart.
 */

import { openSync, closeSync, fstatSync, readSync } from "node:fs";
import { TRANSCRIPT_BYTE_CAP, SOURCE_BUDGET_MS } from "./freshness.js";

const CHUNK_BYTES = 256 * 1024;

/**
 * Lines from the end of `file`, newest first, read in chunks until
 * `enough(lines)` is satisfied or a limit is reached.
 *
 * The first line of a chunk that does not start at byte 0 is a partial
 * line: its beginning is in the chunk before it. It is dropped rather than
 * parsed, since half a JSON object is not an entry.
 */
export function readTailLines(
  file,
  {
    enough = () => false,
    byteCap = TRANSCRIPT_BYTE_CAP,
    budgetMs = SOURCE_BUDGET_MS.transcript,
    now = () => Date.now(),
  } = {}
) {
  const started = now();
  let fd;
  try {
    fd = openSync(file, "r");
  } catch {
    return { lines: [], truncated: false, bytesRead: 0 };
  }

  try {
    const size = fstatSync(fd).size;
    let end = size;
    let carry = "";
    let bytesRead = 0;
    const lines = [];

    while (end > 0) {
      if (bytesRead >= byteCap) return { lines, truncated: true, bytesRead };
      if (now() - started > budgetMs) return { lines, truncated: true, bytesRead };

      const length = Math.min(CHUNK_BYTES, end);
      const start = end - length;
      const buffer = Buffer.allocUnsafe(length);
      readSync(fd, buffer, 0, length, start);
      bytesRead += length;
      end = start;

      const chunk = buffer.toString("utf8") + carry;
      const parts = chunk.split("\n");
      // Whatever precedes the first newline continues into the chunk
      // before this one, so it is carried rather than used, unless this
      // chunk starts the file and there is nothing before it.
      carry = end > 0 ? parts.shift() : "";
      if (end === 0 && parts.length === 0) break;

      for (let i = parts.length - 1; i >= 0; i--) {
        const line = parts[i];
        if (!line) continue;
        lines.push(line);
        // The caller gets the running byte count, so a walk that has gone
        // past what it was looking for can stop on distance rather than on
        // a count of entries whose size it cannot predict.
        if (enough(lines, { bytesRead })) return { lines, truncated: false, bytesRead };
      }
    }

    if (carry) {
      lines.push(carry);
    }
    return { lines, truncated: false, bytesRead };
  } catch {
    return { lines: [], truncated: false, bytesRead: 0 };
  } finally {
    try {
      closeSync(fd);
    } catch {
      // already gone
    }
  }
}

/**
 * Skills invoked recently, newest first, read from the tail of a
 * transcript.
 *
 * Entries are only roughly chronological: one real session had 16
 * out-of-order timestamps and 90 entries with none at all in its last 400
 * lines. So the walk does not stop at the first old entry; it stops when
 * it has enough skills, or when it has walked past `windowMs` of material,
 * or when it hits one of the limits above.
 */
// A backstop against a pathological transcript with hundreds of distinct
// skill names in one window, so a session that never stops using new skills
// can't turn the "count every one, don't just cap the scan" fix (FR-002,
// specs/008-skills-line-completeness) into an unbounded walk. Any real
// session's skill count is a handful to a few dozen; 500 is headroom, not a
// realistic ceiling, so it is not itself a place this can silently lie.
const SKILL_SCAN_HARD_CAP = 500;

/**
 * Every `tool_use` block in an entry, including ones nested inside another
 * block's own `content` array — not just the top-level message content.
 *
 * A skill invoked by a subagent or delegated task does not always sit at
 * `message.content`: some invocation shapes carry the sub-conversation's
 * blocks nested inside a parent block's `content` (e.g. a tool result that
 * embeds what the delegated work did). Recursing one or two levels deep
 * costs nothing extra on the vast majority of entries, which have no
 * nesting at all, and is what makes a delegated skill count the same as a
 * directly invoked one (FR-003, specs/008-skills-line-completeness).
 */
function toolUseBlocksIn(entry) {
  const blocks = entry?.message?.content;
  if (!Array.isArray(blocks)) return [];
  const found = [];
  const MAX_DEPTH = 4;
  const walk = (list, level) => {
    if (!Array.isArray(list) || level > MAX_DEPTH) return;
    for (const block of list) {
      if (block?.type === "tool_use") found.push(block);
      if (Array.isArray(block?.content)) walk(block.content, level + 1);
    }
  };
  walk(blocks, 0);
  return found;
}

export function scanTailForSkills(
  file,
  { limit = 3, windowMs = 30 * 60 * 1000, now = Date.now(), byteCap, budgetMs } = {}
) {
  const cutoff = now - windowMs;
  const found = [];
  const seen = new Set();
  // How far past the window the walk keeps looking before accepting that
  // everything older is genuinely older. Without a margin, a single stray
  // old timestamp would end the scan; without a limit, a session with no
  // skills at all would read to the start of the file.
  let consecutiveOld = 0;
  const OLD_ENTRY_PATIENCE = 200;

  const collect = () => {
    const { lines, truncated, bytesRead } = readTailLines(file, {
      byteCap,
      budgetMs,
      enough: (acc) => {
        const line = acc[acc.length - 1];
        let entry;
        try {
          entry = JSON.parse(line);
        } catch {
          return false;
        }

        const stamp = Date.parse(entry?.timestamp ?? "");
        // An entry with no parseable timestamp is kept: dropping it would
        // hide a skill that may well be active, which is the worse error.
        // Entries stamped after `now` are skipped too, which at runtime
        // only happens when the clock jumps.
        if (Number.isFinite(stamp) && (stamp < cutoff || stamp > now)) {
          consecutiveOld++;
          return consecutiveOld > OLD_ENTRY_PATIENCE;
        }
        consecutiveOld = 0;

        const blocks = toolUseBlocksIn(entry);
        if (!blocks.length) return false;
        for (const block of blocks) {
          if (String(block.name || "").toLowerCase() !== "skill") continue;
          const skillName = block.input?.skill || block.input?.name;
          if (skillName && !seen.has(skillName)) {
            seen.add(skillName);
            found.push(skillName);
          }
        }
        // Scanning past `limit` distinct skills (up to the hard cap) is
        // what makes `trueCount` below an honest count rather than a
        // display cap wearing a different name (FR-002). The window,
        // byteCap and budgetMs still bound the walk the same as before.
        return found.length >= SKILL_SCAN_HARD_CAP;
      },
    });
    return { truncated, bytesRead, scanned: lines.length };
  };

  const { truncated, bytesRead } = collect();
  return { skills: found.slice(0, limit), trueCount: found.length, truncated, bytesRead };
}

/**
 * One pass over the tail for everything the bar reads from a transcript:
 * the skills, the todo list, and when the session last did anything.
 *
 * It is the same walk `scanTailForSkills` makes, and it stops on the same
 * limits. Reading the file three times for three answers would have tripled
 * the only cost on the redraw path that ever grew.
 */
export function scanTail(file, { limit = 3, windowMs = 30 * 60 * 1000, now = Date.now(), byteCap, budgetMs } = {}) {
  const cutoff = now - windowMs;
  const skills = [];
  const seen = new Set();
  let todos = null;
  let lastAt = null;
  // Whether the newest message is a tool call the person has to answer. The
  // walk is newest-first, so the first message seen decides it, and only the
  // two calls that always wait count: a question and a plan to approve. A
  // permission prompt leaves no trace in the transcript, and Claude Code hides
  // the statusline while one is open (specs/048-state-feedback).
  let newestSeen = false;
  let awaiting = false;
  let consecutiveOld = 0;
  const OLD_ENTRY_PATIENCE = 200;
  // How far to keep walking after the first entry from outside the window.
  // Entry sizes vary by two orders of magnitude between sessions, so a
  // count of entries is not a bound on work: on a real 6 MB transcript, 200
  // of them ran past the whole 4 MB cap, and the scan spent 34 ms on every
  // redraw finding nothing. Bytes are the thing actually being spent.
  const BYTES_PAST_WINDOW = 512 * 1024;
  let bytesAtFirstOld = null;
  // Background work the session started and has not been told is over. The
  // walk is newest-first and a notification always follows its start, so by
  // the time a start is reached its notification, if any, is already in
  // `notified`. Starts beyond the bytes this walk reads are simply not seen,
  // which errs towards "idle", the answer the bar gave before.
  const notified = new Set();
  const pendingShells = new Set();
  const pendingAgents = new Set();
  const backgroundCutoff = now - BACKGROUND_MAX_AGE_MS;

  const { truncated, bytesRead } = readTailLines(file, {
    byteCap,
    budgetMs,
    enough: (acc, { bytesRead: soFar } = {}) => {
      let entry;
      try {
        entry = JSON.parse(acc[acc.length - 1]);
      } catch {
        return false;
      }

      const stamp = Date.parse(entry?.timestamp ?? "");
      let inWindow = true;
      if (Number.isFinite(stamp)) {
        // The newest usable stamp is the last thing the session did. The
        // walk runs newest-first, so the first one seen is the answer.
        if (lastAt === null && stamp <= now) lastAt = stamp;
        if (stamp < cutoff || stamp > now) {
          inWindow = false;
          consecutiveOld++;
          if (bytesAtFirstOld === null) bytesAtFirstOld = soFar ?? 0;
          if (consecutiveOld > OLD_ENTRY_PATIENCE) return true;
          if ((soFar ?? 0) - bytesAtFirstOld > BYTES_PAST_WINDOW) return true;
        } else {
          consecutiveOld = 0;
          bytesAtFirstOld = null;
        }
      } else {
        consecutiveOld = 0;
      }

      for (const id of notifiedIdsIn(entry)) notified.add(id);
      const started = backgroundStartIn(entry);
      // A start with no usable stamp is not counted: with nothing to age it
      // by, it could keep "working" up for a shell that died hours ago.
      if (started && !notified.has(started.id) && Number.isFinite(stamp) && stamp >= backgroundCutoff && stamp <= now) {
        (started.kind === "shell" ? pendingShells : pendingAgents).add(started.id);
      }

      const blocks = entry?.message?.content;
      if (!Array.isArray(blocks)) return false;

      if (!newestSeen) {
        newestSeen = true;
        awaiting =
          entry?.type === "assistant" &&
          blocks.some((b) => b?.type === "tool_use" && /^(askuserquestion|exitplanmode)$/i.test(String(b.name || "")));
      }

      // Skills are looked for recursively (a delegated/subagent invocation
      // may nest its blocks inside a parent block's own `content`, FR-003,
      // specs/008-skills-line-completeness); todos are not, since a todo
      // list is only ever written by the top-level session.
      if (inWindow) {
        for (const block of toolUseBlocksIn(entry)) {
          if (String(block.name || "").toLowerCase() !== "skill") continue;
          const skillName = block.input?.skill || block.input?.name;
          if (skillName && !seen.has(skillName)) {
            seen.add(skillName);
            skills.push(skillName);
          }
        }
      }

      for (const block of blocks) {
        if (block?.type !== "tool_use") continue;
        const name = String(block.name || "").toLowerCase();
        if (todos === null && (name === "todowrite" || name === "todo_write")) {
          const list = block.input?.todos;
          if (Array.isArray(list)) todos = summariseTodos(list);
        }
      }

      // Stopping at `limit` skills undercounted true activity once more
      // than `limit` distinct skills were active (FR-002,
      // specs/008-skills-line-completeness): the overflow indicator then
      // computed "hidden" from a list that was itself already capped. The
      // hard cap here is a backstop, not a display limit — `skills` is
      // still sliced to `limit` below for callers that only want the list.
      return skills.length >= SKILL_SCAN_HARD_CAP && todos !== null;
    },
  });

  return {
    skills: skills.slice(0, limit),
    skillsTrueCount: skills.length,
    todos,
    lastAt,
    awaiting,
    background: { shells: pendingShells.size, agents: pendingAgents.size },
    truncated,
    bytesRead,
  };
}

/**
 * How long a background start with no notification is still believed.
 *
 * Background shells and async agents die with the Claude Code process, and
 * a session that was closed and resumed later never gets their
 * notifications. Without a limit, one such start would hold "working" on
 * for the rest of the session. Two hours covers a long e2e run or a slow
 * gate; anything older is more likely an orphan than a live job.
 */
const BACKGROUND_MAX_AGE_MS = 2 * 3600_000;

/**
 * The background job an entry started, if it started one: the tool_result
 * of a Bash call made with `run_in_background` carries
 * `toolUseResult.backgroundTaskId`, and an async Agent or workflow carries
 * `status: "async_launched"` with its `agentId` or `taskId`. Those ids are
 * the ones the job's task-notification later names.
 */
function backgroundStartIn(entry) {
  if (entry?.type !== "user") return null;
  const result = entry.toolUseResult;
  if (!result || typeof result !== "object") return null;
  if (typeof result.backgroundTaskId === "string" && result.backgroundTaskId) {
    return { id: result.backgroundTaskId, kind: "shell" };
  }
  if (result.status === "async_launched") {
    const id = result.agentId ?? result.taskId;
    if (typeof id === "string" && id) return { id, kind: "agent" };
  }
  return null;
}

const NOTIFICATION = /<task-notification>([\s\S]*?)<\/task-notification>/g;
const TASK_ID = /<task-id>\s*([^<\s]+)\s*<\/task-id>/;
const STATUS = /<status>\s*([a-z_]+)\s*<\/status>/;

/**
 * Ids of the background jobs an entry reports as finished.
 *
 * Claude Code writes a notification in three places, often all of them for
 * the same job: a queue-operation record (enqueue and remove), a
 * queued_command attachment, and the user turn that delivers it. Only those
 * are read. An assistant entry that quotes a notification, in a script or a
 * reply, is the model writing text, not Claude Code reporting an end. A
 * notification without a task id (a goal check-in) names no job, and one
 * whose status is still "running" has not ended it. A TaskStop result ends
 * the job it names too.
 */
function notifiedIdsIn(entry) {
  // A job stopped with the TaskStop tool gets no task-notification. Its end
  // is the tool's own result, which names the job it stopped; without this a
  // stopped shell would read as running for the whole max age.
  const stopped = entry?.type === "user" ? entry.toolUseResult : null;
  if (stopped && typeof stopped === "object" && typeof stopped.task_id === "string" && stopped.task_id && typeof stopped.task_type === "string") {
    return [stopped.task_id];
  }
  const texts = [];
  if (entry?.type === "queue-operation") {
    texts.push(entry.content);
  } else if (entry?.type === "attachment") {
    texts.push(entry.attachment?.prompt, entry.attachment?.content);
  } else if (entry?.type === "user") {
    const content = entry.message?.content;
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      for (const block of content) if (block?.type === "text") texts.push(block.text);
    }
  }

  const ids = [];
  for (const text of texts) {
    if (typeof text !== "string" || !text.includes("<task-notification>")) continue;
    for (const match of text.matchAll(NOTIFICATION)) {
      const id = TASK_ID.exec(match[1])?.[1];
      const status = STATUS.exec(match[1])?.[1];
      if (id && status && status !== "running" && status !== "pending") ids.push(id);
    }
  }
  return ids;
}

/**
 * A todo list, reduced to what fits on a bar: how many are done, how many
 * there are, and what is being worked on now.
 */
function summariseTodos(list) {
  const total = list.length;
  if (!total) return null;
  const done = list.filter((t) => t?.status === "completed").length;
  const active = list.find((t) => t?.status === "in_progress");
  return { done, total, current: active?.content ?? active?.activeForm ?? null };
}
