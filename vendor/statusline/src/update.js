/**
 * `update`: bring the clone this CLI lives in up to date, then install from it.
 *
 * The README's install is two commands, and running them again over an
 * existing install did not update anything: `git clone` refused the existing
 * directory, `install` then ran the old code, and it said it was "safe to run
 * again" (specs/024-install-update). A bare `git pull`, the documented
 * update, aborted on any local edit and started a merge on a diverged
 * history. This does the same pull, refuses every case it cannot finish
 * cleanly with the reason and the way out, and never runs a destructive git
 * command on the user's behalf.
 *
 * The install runs in a new process. This one has already loaded the old
 * modules, and an install that ran them would record the old behaviour
 * against the new files.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const CLI_PATH = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const REPO_ROOT = path.dirname(path.dirname(CLI_PATH));
/**
 * The clone command with the real profile path, forward slashes on Windows:
 * `~` means nothing to cmd.exe, so a command printed with it is one a
 * Windows user cannot paste (specs/028-cross-platform).
 */
export function cloneCommand(platform = process.platform, home = os.homedir()) {
  const target = path.join(home, ".claude", "statusline-plugin");
  const shown = platform === "win32" ? target.replace(/\\/g, "/") : target;
  return `git clone https://github.com/jonyfs/statusline.git "${shown}"`;
}

export const REPO_ROOT_PATH = REPO_ROOT;

/**
 * Without a terminal there is nobody to type a password, and git asking for
 * one would sit until the timeout. The automatic update runs detached, so it
 * says so; a person running `update` by hand keeps git's own prompt.
 */
function gitEnv() {
  return process.stdin.isTTY ? process.env : { ...process.env, GIT_TERMINAL_PROMPT: "0" };
}

function runGit(root, args) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", timeout: 60_000, env: gitEnv(), stdio: ["ignore", "pipe", "pipe"] });
  return {
    ok: r.status === 0,
    missing: r.error?.code === "ENOENT",
    // Trailing whitespace only: `status --porcelain` starts a line with a
    // space for an unstaged change, and trimming it cut the file names.
    out: (r.stdout || "").trimEnd(),
    err: (r.stderr || "").trim() || (r.error ? String(r.error.message) : ""),
  };
}

function defaultRunInstall(root, flags) {
  const cli = path.join(root, "bin", "cli.js");
  return spawnSync(process.execPath, [cli, "install", ...flags], { stdio: "inherit" });
}

/**
 * The install flags `update` passes on to the install it runs. The ones that
 * turn a piece back on matter as much as the `--no-*` ones: a plain install
 * over an existing one keeps off what was off (audit #17), so naming the
 * piece is the only way back.
 */
const INSTALL_ON_FLAGS = new Set(["--hook", "--refresh-interval", "--task-rows"]);
export function installFlagArgs(args) {
  return args.filter((f) => f.startsWith("--no-") || INSTALL_ON_FLAGS.has(f));
}

const refuse = (reason, extra = {}) => ({ ok: false, reason, exitCode: 1, ...extra });

export function update({ root = REPO_ROOT, flags = [], runInstall = defaultRunInstall, git = runGit } = {}) {
  const inside = git(root, ["rev-parse", "--is-inside-work-tree"]);
  if (inside.missing) return refuse("git is not on the PATH, and updating a clone needs it.", { cause: "no git" });
  if (!inside.ok || inside.out.trim() !== "true") {
    return refuse(`${root} is not a git clone, so there is nothing to pull. Install from a clone instead:\n\n  ${cloneCommand()}`, {
      cause: "not a clone",
    });
  }

  // Tracked changes only. An untracked file stops `pull --ff-only` only when
  // an incoming file has its path, and git then refuses by itself, naming it,
  // with nothing touched; the pull failure below reports that. Counted here,
  // any stray file refused the update and suggested a `stash` that leaves
  // untracked files where they are, so the refusal never cleared (audit #18).
  const dirty = git(root, ["status", "--porcelain", "--untracked-files=no"]);
  if (!dirty.ok) return refuse(`git status failed in ${root}: ${dirty.err}`, { cause: "git failed" });
  if (dirty.out) {
    const files = dirty.out.split("\n").map((l) => `  ${l.slice(3)}`).join("\n");
    return refuse(
      [
        `The clone has local changes, so nothing was pulled:`,
        "",
        files,
        "",
        `Set them aside with \`git -C "${root}" stash\`, or discard them with`,
        `\`git -C "${root}" checkout -- .\`, then run update again.`,
      ].join("\n"),
      { cause: "local edits" }
    );
  }

  const before = git(root, ["rev-parse", "--short", "HEAD"]).out.trim() || null;
  const pull = git(root, ["pull", "--ff-only"]);
  if (!pull.ok) {
    return refuse(
      [
        `The clone could not fast-forward, so nothing was changed. Its history has diverged from`,
        `its upstream, or it has no upstream to pull from.`,
        "",
        pull.err,
        "",
        `Look with \`git -C "${root}" status\` and decide what to keep. Nothing was reset.`,
      ].join("\n"),
      { before, cause: "history diverged" }
    );
  }
  const after = git(root, ["rev-parse", "--short", "HEAD"]).out.trim() || null;

  const installed = runInstall(root, flags);
  const status = installed?.status ?? 1;
  if (status !== 0) {
    return refuse(`The code was updated (${before} to ${after}), but the install that records it in settings failed.`, {
      before,
      after,
      exitCode: status,
      cause: "install failed",
    });
  }
  return { ok: true, before, after, current: before === after, exitCode: 0 };
}
