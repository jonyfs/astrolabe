/**
 * Todo progress from a GitHub Copilot CLI session (specs/033-copilot-parity).
 *
 * Copilot keeps an agent's todo list in a SQLite file of the session's own,
 * `session.db` in the directory the payload names as `transcript_path`, in a
 * `todos` table whose rows carry `title` and `status` (`pending`,
 * `in_progress`, `done` or `blocked`). Copilot 1.0.91's system prompt
 * describes that table, its bundle checks for the file by that name, and its
 * SDK types the rows the same way. The file exists only once the agent has
 * used it; until then there is no chip, which is also what Claude Code's
 * reader does for a session with no todo list.
 *
 * Read-only, always: Copilot owns the file and may be writing it. Two ways to
 * read it, so no dependency is added (Principle IV): Node's own `node:sqlite`
 * when the running Node has it (22.13 and newer, 23.4 on the 23 line; older ones gate it behind a flag), else the `sqlite3` program
 * outside Windows, where it is usually present on macOS and Linux and usually
 * absent on Windows. With neither, the chip is absent.
 */

import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { plainText } from "./text.js";

const require = createRequire(import.meta.url);

/** No ORDER BY: the table's own order is the order Copilot's panel lists them in. */
const QUERY = "SELECT status, title FROM todos";

/** The CLI is one process on the redraw path, so it gets the transcript's own budget. */
const CLI_TIMEOUT_MS = 100;

let nodeSqlite;

/**
 * `node:sqlite`, or null on a Node without it. Node 22 and 23 announce it as
 * experimental on stderr when it loads, and the harness may show stderr, so
 * that one warning is swallowed while it loads; every other warning passes.
 */
function loadNodeSqlite() {
  if (nodeSqlite !== undefined) return nodeSqlite;
  const original = process.emitWarning;
  process.emitWarning = function (warning, ...rest) {
    const type = typeof rest[0] === "string" ? rest[0] : rest[0]?.type ?? warning?.name;
    if (type === "ExperimentalWarning" && /sqlite/i.test(String(warning?.message ?? warning))) return;
    return original.call(process, warning, ...rest);
  };
  try {
    nodeSqlite = require("node:sqlite");
    if (typeof nodeSqlite?.DatabaseSync !== "function") nodeSqlite = null;
  } catch {
    nodeSqlite = null;
  } finally {
    process.emitWarning = original;
  }
  return nodeSqlite;
}

/**
 * Each driver answers undefined when it cannot run here, so the next one is
 * tried, and null when it ran and the file had no usable list, which ends the
 * search: the other driver would read the same file.
 */
const DRIVERS = {
  node(file) {
    const sqlite = loadNodeSqlite();
    if (!sqlite) return undefined;
    let db;
    try {
      db = new sqlite.DatabaseSync(file, { readOnly: true });
      return db.prepare(QUERY).all();
    } catch {
      return null;
    } finally {
      try {
        db?.close();
      } catch {
        // already closed
      }
    }
  },
  cli(file, { platform, timeout = CLI_TIMEOUT_MS }) {
    if (platform === "win32") return undefined;
    try {
      const out = execFileSync("sqlite3", ["-readonly", "-json", file, QUERY], {
        timeout,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
      // An empty table prints nothing at all rather than `[]`.
      return out.trim() ? JSON.parse(out) : [];
    } catch (err) {
      return err?.code === "ENOENT" ? undefined : null;
    }
  },
};

/** Rows as `{ done, total, current }`, the shape Claude Code's todo reader returns. */
export function summarizeTodoRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let done = 0;
  let current = null;
  for (const row of rows) {
    const status = plainText(row?.status);
    if (status === "done" || status === "completed") done++;
    else if (current === null && status === "in_progress") current = plainText(row?.title);
  }
  return { done, total: rows.length, current };
}

/** The session's todo progress, or null when there is no list to show. */
export function readCopilotTodos(sessionDir, { drivers = ["node", "cli"], platform = process.platform, timeout } = {}) {
  if (typeof sessionDir !== "string" || !sessionDir) return null;
  const file = path.join(sessionDir, "session.db");
  if (!existsSync(file)) return null;
  for (const name of drivers) {
    const rows = DRIVERS[name]?.(file, { platform, ...(timeout ? { timeout } : {}) });
    if (rows === undefined) continue;
    return summarizeTodoRows(rows);
  }
  return null;
}
