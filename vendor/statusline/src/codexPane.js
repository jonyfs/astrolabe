/**
 * `codex-pane`: the bar, drawn by the real renderer, in a small terminal pane
 * under Codex CLI (specs/035-codex-pane).
 *
 * Codex 0.160.1 runs no outside status line command, so this process does
 * what Claude Code does for the bar: it finds the session (src/codexSession.js),
 * turns its rollout into a payload (src/codexRollout.js), renders it at the
 * pane's own size and draws it again when something changes. The pane is the
 * bar itself, not rows added to it, so everything the bar does under Claude
 * Code holds here: the same segments, widths, shedding and gate rows.
 *
 * Redraws are in place. The cursor goes home, each line overwrites the last
 * frame's and clears what is left of it, and the rest of the pane is cleared;
 * nothing is erased first, so a redraw never flashes an empty pane. A frame
 * identical to the one on screen is not written at all.
 */

import { unavailableChip } from "./unavailable.js";
import { statSync, existsSync, watch } from "node:fs";
import { readRollout, rolloutPayload, rolloutActivity } from "./codexRollout.js";
import { resolveCodexSession, rolloutStartedAt } from "./codexSession.js";

/** How often the loop checks the rollout, the watched process and the size. */
export const PANE_TICK_MS = 1000;

/** How often the bar is drawn again with no change in the rollout: git, clocks and countdowns move on their own. */
export const PANE_REDRAW_EVERY_MS = 5000;

/** How often the session is looked up again: Codex's `/new` starts another one in the same pane. */
export const PANE_RESOLVE_EVERY_MS = 5000;

const ESC = "\x1b";
const HOME = `${ESC}[H`;
const CLEAR_LINE_END = `${ESC}[K`;
const CLEAR_BELOW = `${ESC}[J`;
const CLEAR_ALL = `${ESC}[2J`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const NO_WRAP = `${ESC}[?7l`;
const WRAP = `${ESC}[?7h`;
const RESET = `${ESC}[0m`;

/**
 * One frame. No newline after the last line: in a three-row pane it would
 * scroll the first line away.
 */
export function paneFrame(lines) {
  return HOME + lines.map((line) => line + CLEAR_LINE_END).join("\r\n") + CLEAR_BELOW;
}

/** The pane's flags. Each value is its own argument, never split or joined. */
export function parsePaneArgs(argv = []) {
  const out = { cwd: null, pid: null, codexPane: null, since: null, rollout: null, session: null, once: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? null;
    if (a === "--once") out.once = true;
    else if (a === "--cwd") out.cwd = next();
    else if (a === "--rollout") out.rollout = next();
    else if (a === "--session") out.session = next();
    else if (a === "--codex-pane") out.codexPane = next();
    else if (a === "--pid") {
      const n = Number.parseInt(next() ?? "", 10);
      out.pid = Number.isInteger(n) && n > 0 ? n : null;
    } else if (a === "--since") {
      const n = Number(next());
      out.since = Number.isFinite(n) ? n : null;
    }
  }
  return out;
}

/**
 * The session the pane shows after a lookup found `found` (null for none).
 *
 * A pointer or the flag is exact, so it always wins. A scan is a guess by
 * directory, and with two Codex sessions there it can name either one from
 * one lookup to the next. So a session the scan found is kept while its
 * rollout exists, and another scan result replaces it only when that session
 * started later: Codex's `/new` in the same pane, never the other session
 * going back and forth.
 */
export function nextPaneSession(current, found) {
  if (!found) return current;
  if (!current || current.source !== "scan" || found.source !== "scan") return found;
  if (found.rollout === current.rollout || !existsSync(current.rollout)) return found;
  const was = rolloutStartedAt(current.rollout);
  const is = rolloutStartedAt(found.rollout);
  return Number.isFinite(is) && (!Number.isFinite(was) || is > was) ? found : current;
}

/** Whether a process is still there. EPERM means it is, under another user. */
export function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === "EPERM";
  }
}

const positiveInt = (v) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** The pane's size: the terminal's own, else COLUMNS and LINES, else 120 by 3. */
function paneSize(out, env) {
  return {
    columns: positiveInt(out.columns) ?? positiveInt(env.COLUMNS) ?? 120,
    rows: positiveInt(out.rows) ?? positiveInt(env.LINES) ?? 3,
  };
}

/**
 * Runs the pane until Codex, the pane or the person ends it. With `--once`
 * it prints one frame as plain lines and returns, which is what the preview
 * and the tests use. `watch` stands in for fs.watch, so a test can take the
 * fast path away and check that the tick alone keeps the pane current.
 */
export async function runCodexPane(argv, { out = process.stdout, env = process.env, watch: watchFile = watch } = {}) {
  const opts = parsePaneArgs(argv);
  const cwd = opts.cwd ?? process.cwd();
  const { resolveSettings } = await import("./config.js");
  const settings = resolveSettings(cwd);
  if (settings.separator) process.env.CLAUDE_STATUSLINE_SEPARATOR = settings.separator;
  if (settings.skillWindowMin) process.env.CLAUDE_STATUSLINE_SKILL_WINDOW_MIN = String(settings.skillWindowMin);
  const { renderPayload } = await import("./render.js");

  let session = null;
  let state = null;
  let lastResolve = 0;

  const resolve = (now) => {
    lastResolve = now;
    let found = null;
    try {
      found = resolveCodexSession({ rollout: opts.rollout, session: opts.session, codexPane: opts.codexPane, cwd, since: opts.since, env });
    } catch {
      found = null;
    }
    const next = nextPaneSession(session, found);
    if (next && next.rollout !== session?.rollout) {
      session = next;
      state = null;
    }
  };

  const draw = (now) => {
    const { columns, rows } = paneSize(out, env);
    if (session) state = readRollout(session.rollout, state) ?? state;
    const payload = state ? rolloutPayload(state, { now }) : { codex: {} };
    // The pane's directory stands in until the rollout names one.
    if (!payload.cwd) {
      payload.cwd = cwd;
      payload.workspace = { current_dir: cwd };
    }
    const activity = state ? rolloutActivity(state) : null;
    let text;
    try {
      text = renderPayload(payload, {
        flavor: settings.flavor,
        asciiArrows: settings.asciiArrows,
        now,
        maxWidth: columns,
        maxHeight: rows,
        sources: { getSessionActivity: () => activity },
      });
    } catch {
      text = unavailableChip();
    }
    return text.split("\n").slice(0, rows);
  };

  resolve(Date.now());
  if (opts.once) {
    out.write(draw(Date.now()).join("\n") + "\n");
    return 0;
  }

  return await new Promise((done) => {
    let onScreen = "";
    let lastDraw = 0;
    let lastSeen = null;
    let watcher = null;
    let watched = null;
    let pending = null;
    let stopped = false;

    const write = (s) => {
      try {
        out.write(s);
      } catch {
        stop(0);
      }
    };

    const paint = (force = false) => {
      if (stopped) return;
      const now = Date.now();
      lastDraw = now;
      const frame = paneFrame(draw(now));
      if (!force && frame === onScreen) return;
      onScreen = frame;
      write(frame);
    };

    const soon = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        paint();
      }, 100);
    };

    // fs.watch is the fast path; the tick below is what is relied on, since
    // a watch can miss events on some file systems and platforms.
    const rewatch = () => {
      if (!session || watched === session.rollout) return;
      try {
        watcher?.close();
      } catch {
        // already closed
      }
      watcher = null;
      watched = session.rollout;
      try {
        watcher = watchFile(session.rollout, { persistent: false }, soon);
        watcher.on("error", () => {});
      } catch {
        watcher = null;
      }
    };

    const tick = () => {
      if (stopped) return;
      const now = Date.now();
      if (opts.pid && !processAlive(opts.pid)) return stop(0);
      if (!session || now - lastResolve >= PANE_RESOLVE_EVERY_MS) resolve(now);
      rewatch();
      let seen = null;
      if (session) {
        try {
          const st = statSync(session.rollout);
          seen = `${session.rollout}:${st.size}:${st.mtimeMs}`;
        } catch {
          seen = null;
        }
      }
      if (seen !== lastSeen || now - lastDraw >= PANE_REDRAW_EVERY_MS) {
        lastSeen = seen;
        paint();
      }
    };

    const onResize = () => {
      // A new size can leave old characters where no line reaches now.
      write(CLEAR_ALL);
      paint(true);
    };

    const timer = setInterval(tick, PANE_TICK_MS);

    function stop(code) {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      if (pending) clearTimeout(pending);
      try {
        watcher?.close();
      } catch {
        // already closed
      }
      try {
        out.write(RESET + WRAP + SHOW_CURSOR);
      } catch {
        // the pane is gone; nothing to restore
      }
      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.removeListener(sig, onSignal);
      out.removeListener?.("resize", onResize);
      done(code);
    }

    function onSignal() {
      stop(0);
    }

    for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, onSignal);
    out.on?.("resize", onResize);
    out.on?.("error", () => stop(0));

    write(HIDE_CURSOR + NO_WRAP + CLEAR_ALL);
    rewatch();
    paint(true);
    tick();
  });
}
