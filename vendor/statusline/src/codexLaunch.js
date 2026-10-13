/**
 * `statusline codex [codex args]`: Codex CLI with the bar in a pane under it
 * (specs/035-codex-pane).
 *
 * Inside tmux it splits a 3-line pane under the current one, running
 * `codex-pane`, and then runs `codex` in the current pane with the arguments
 * exactly as given. Outside tmux it starts a tmux session that runs this same
 * command, so the split happens inside it. Without tmux it says how to get it
 * and starts Codex alone.
 *
 * Every command here is an argument vector. No argument is ever put into a
 * shell string (Principle IX): tmux runs a command given as several arguments
 * directly, and `codex` is started without a shell.
 *
 * tmux does not run natively on Windows, and starting `codex.cmd` there would
 * take a shell, so on Windows the command explains that and starts nothing.
 */

import { spawnSync } from "node:child_process";
import { accessSync, statSync, constants } from "node:fs";
import path from "node:path";

/** Rows the bar's pane gets: the bar's three lines. */
export const PANE_ROWS = 3;

export const TMUX_INSTALL_HINT = [
  "The bar pane under Codex needs tmux, which is not on this PATH. Install it with:",
  "  macOS:          brew install tmux",
  "  Debian/Ubuntu:  sudo apt install tmux",
  "  Fedora:         sudo dnf install tmux",
  "  Arch:           sudo pacman -S tmux",
].join("\n");

const WINDOWS_MESSAGE = [
  "The bar pane under Codex needs tmux, which does not run natively on Windows.",
  "Run Codex and this command inside WSL to get it, or start codex on its own.",
].join("\n");

/** An executable named `name` on the PATH, found without running a shell, or null. */
export function findOnPath(name, env = process.env, platform = process.platform) {
  const dirs = String(env.PATH ?? env.Path ?? "")
    .split(path.delimiter)
    .filter(Boolean);
  const exts = platform === "win32" ? String(env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";").filter(Boolean) : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      try {
        if (!statSync(candidate).isFile()) continue;
        if (platform !== "win32") accessSync(candidate, constants.X_OK);
        return candidate;
      } catch {
        // not here
      }
    }
  }
  return null;
}

/**
 * What the wrapper will do, as data: which tmux arguments, and which codex
 * command. Kept apart from running it so every branch can be tested without
 * tmux or Codex.
 */
export function planCodexLaunch({ args = [], env = process.env, platform = process.platform, tmuxPath, cwd, cliPath, nodePath, pid, now }) {
  const codex = { command: "codex", args: [...args] };
  if (platform === "win32") return { kind: "unsupported", message: WINDOWS_MESSAGE, codex: null };
  if (!tmuxPath) return { kind: "no-tmux", message: `${TMUX_INSTALL_HINT}\nStarting Codex without the bar pane.`, codex };
  const passed = passedEnv(env);
  if (env.TMUX) {
    const target = env.TMUX_PANE ? ["-t", env.TMUX_PANE] : [];
    const paneFlags = ["--cwd", cwd, "--pid", String(pid), ...(env.TMUX_PANE ? ["--codex-pane", env.TMUX_PANE] : []), "--since", String(now)];
    return {
      kind: "split",
      split: ["split-window", "-v", "-d", "-l", String(PANE_ROWS), ...target, ...passed, "-P", "-F", "#{pane_id}", "-c", cwd, "--", nodePath, cliPath, "codex-pane", ...paneFlags],
      codex,
    };
  }
  return {
    kind: "session",
    session: ["new-session", "-s", `codex-${pid}`, ...passed, "-c", cwd, "--", nodePath, cliPath, "codex", ...args],
    codex,
  };
}

/**
 * A pane gets the tmux server's environment, not this shell's, and a server
 * started earlier knows nothing of a CODEX_HOME or a bar setting exported
 * since. Those few are handed over with `-e`.
 */
function passedEnv(env) {
  const out = [];
  for (const [key, value] of Object.entries(env).sort(([a], [b]) => a.localeCompare(b))) {
    if (typeof value !== "string") continue;
    if (key === "CODEX_HOME" || key.startsWith("CLAUDE_STATUSLINE_")) out.push("-e", `${key}=${value}`);
  }
  return out;
}

/** The exit status a child's result stands for, the way a shell reports it. */
function statusOf(r) {
  if (typeof r.status === "number") return r.status;
  if (r.signal) return 128 + (signalNumbers[r.signal] ?? 1);
  return 1;
}
const signalNumbers = { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGKILL: 9, SIGTERM: 15 };

function runCodex(codex) {
  const r = spawnSync(codex.command, codex.args, { stdio: "inherit" });
  if (r.error?.code === "ENOENT") {
    process.stderr.write("codex is not on this PATH. Install it with: npm install -g @openai/codex\n");
    return 127;
  }
  if (r.error) {
    process.stderr.write(`Could not start codex: ${r.error.message}\n`);
    return 1;
  }
  return statusOf(r);
}

/** Runs the plan. Returns the exit status: Codex's own where there is one. */
export function runCodexWrapper(args, { env = process.env, platform = process.platform, cliPath, nodePath = process.execPath } = {}) {
  const plan = planCodexLaunch({
    args,
    env,
    platform,
    tmuxPath: platform === "win32" ? null : findOnPath("tmux", env, platform),
    cwd: process.cwd(),
    cliPath,
    nodePath,
    pid: process.pid,
    now: Date.now(),
  });
  if (plan.kind === "unsupported") {
    process.stderr.write(plan.message + "\n");
    return 1;
  }
  if (plan.kind === "no-tmux") {
    process.stderr.write(plan.message + "\n");
    return runCodex(plan.codex);
  }
  const tmux = findOnPath("tmux", env, platform);
  if (plan.kind === "session") {
    const r = spawnSync(tmux, plan.session, { stdio: "inherit" });
    return r.error ? 1 : statusOf(r);
  }
  const split = spawnSync(tmux, plan.split, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const paneId = split.status === 0 ? String(split.stdout).trim() : null;
  if (!paneId) process.stderr.write(`tmux could not open the bar pane (${String(split.stderr || split.error?.message || "").trim()}); starting Codex without it.\n`);
  const status = runCodex(plan.codex);
  // The pane leaves on its own when this process ends; closing it here is
  // only quicker.
  if (paneId) spawnSync(tmux, ["kill-pane", "-t", paneId], { stdio: "ignore" });
  return status;
}
