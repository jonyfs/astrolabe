/**
 * Git gates running in this repository's worktrees (specs/031-git-gate-rows).
 *
 * A "gate" is a git hook doing its checks: barbershop's `pre-commit` runs lint,
 * typecheck, tests and 47 document gates, and a commit waits minutes for it,
 * in any of 36 worktrees. The bar shows which of them is busy and with what.
 *
 * Two halves, split by process like `cache.js` and `refresh.js`:
 *
 * - `probeGateRuns` runs only in the detached refresh. Listing processes cost
 *   348 to 675 ms on the reference machine, more than the whole redraw is
 *   allowed, so it never runs on the redraw path.
 * - `readGateRuns` is what the redraw calls: one cache read, one
 *   `process.kill(pid, 0)` per cached run, so a gate that ended disappears on
 *   the next redraw instead of when the cache ages out.
 *
 * Nothing here writes to a repository or to another tool's files.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readlinkSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { repoKey, readEntry, spawnRefresh } from "./cache.js";
import { plainText } from "./text.js";
import { repoConfig } from "./config.js";

/** Client-side hooks from githooks(5). Server-side ones never run in a worktree. */
export const HOOK_NAMES = new Set([
  "applypatch-msg", "pre-applypatch", "post-applypatch", "pre-commit", "pre-merge-commit",
  "prepare-commit-msg", "commit-msg", "post-commit", "pre-rebase", "post-checkout",
  "post-merge", "pre-push", "post-rewrite", "push-to-checkout", "pre-auto-gc",
  "sendemail-validate",
]);

/** Programs whose label is the script they run rather than their own name. */
const INTERPRETERS = new Set(["bash", "sh", "zsh", "dash", "ksh", "node", "python", "python3", "tsx", "ruby", "perl"]);

/**
 * A redraw starts a refresh once the cached answer is older than this. Each
 * refresh lists every process on the machine, so it is spaced out; a run that
 * ends in between still disappears at once, through the pid check.
 */
export const GATES_REFRESH_AFTER_MS = 15_000;

/**
 * The longest a cached answer is trusted at all. The installed refresh
 * interval is 60 seconds, so anything shorter would hide every row from a
 * quiet session, whose redraws always find the entry older than the last one.
 */
export const GATES_SHOW_MS = 10 * 60 * 1000;

/** Past this many rows the bar says how many more there are. */
export const GATE_ROW_CAP = 6;

// Pure parts ---------------------------------------------------------------

/** `git worktree list --porcelain` as records, prunable ones dropped. */
export function parseWorktrees(text) {
  const out = [];
  let cur = null;
  for (const line of String(text ?? "").split("\n")) {
    if (line.startsWith("worktree ")) {
      cur = { path: line.slice(9), head: null, branch: null, prunable: false };
      out.push(cur);
    } else if (!cur) {
      continue;
    } else if (line.startsWith("HEAD ")) cur.head = line.slice(5);
    else if (line.startsWith("branch ")) cur.branch = line.slice(7).replace(/^refs\/heads\//, "");
    else if (line.startsWith("prunable")) cur.prunable = true;
  }
  return out.filter((w) => !w.prunable && w.path);
}

/** `ps`'s `[[dd-]hh:]mm:ss` as seconds, or null. */
export function parseEtime(raw) {
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/.exec(String(raw ?? "").trim());
  if (!m) return null;
  const [, d = 0, h = 0, min, s] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/** `ps -A -o pid=,ppid=,etime=,command=` as records. */
export function parseProcesses(text) {
  const out = [];
  for (const line of String(text ?? "").split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const etime = parseEtime(m[3]);
    out.push({ pid: Number(m[1]), ppid: Number(m[2]), etime, command: m[4].trim() });
  }
  return out;
}

const base = (p) => p.split(/[\\/]/).pop();

/** Whether a command is git itself, as the parent of a hook is. */
function isGit(command) {
  const first = String(command ?? "").split(/\s+/)[0];
  return base(first) === "git" || base(first) === "git.exe";
}

/**
 * The hook a process is running, or null. A hook is a script named after one
 * of githooks(5) whose parent is git: the same script run by hand is not a gate
 * the commit is waiting on.
 */
export function hookOf(proc, byPid) {
  const parent = byPid.get(proc.ppid);
  if (!parent || !isGit(parent.command)) return null;
  const tokens = proc.command.split(/\s+/).slice(0, 3);
  for (const t of tokens) {
    const name = base(t);
    if (HOOK_NAMES.has(name)) return { name, script: t };
  }
  return null;
}

/** What a process is, in a few words (research R7). */
export function labelOf(command) {
  // macOS lists a process caught between fork and exec as `(Python)`, its
  // image name in parentheses: not yet the program it is about to be.
  if (/^\(.*\)$/.test(String(command ?? "").trim())) return null;
  const tokens = String(command ?? "").split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;
  const prog = base(tokens[0]);
  const args = tokens.slice(1);
  if (INTERPRETERS.has(prog) || prog === "npx") {
    const script = args.find((a) => !a.startsWith("-") && (a.includes("/") || a.includes(".")));
    if (script) return plainText(base(script));
    if (prog === "npx") {
      const tool = args.find((a) => !a.startsWith("-"));
      return plainText(tool ? `npx ${tool}` : "npx");
    }
  }
  const words = [prog, ...args.filter((a) => !a.startsWith("-")).slice(0, 2)];
  return plainText(words.join(" ").slice(0, 40));
}

/**
 * The step a hook is on: the chain of named processes under it, following the
 * newest child at each level, shown as its first and its deepest label; or,
 * when the hook started several things side by side, their labels together.
 */
export function stepOf(rootPid, procs) {
  const byPpid = new Map();
  for (const p of procs) {
    if (!byPpid.has(p.ppid)) byPpid.set(p.ppid, []);
    byPpid.get(p.ppid).push(p);
  }
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  // A subshell repeats its parent's command line; it is the same step, so its
  // children stand in for it.
  const kidsOf = (pid, seen = new Set()) => {
    if (seen.has(pid)) return [];
    seen.add(pid);
    const self = byPid.get(pid);
    const out = [];
    for (const k of byPpid.get(pid) ?? []) {
      if (self && k.command === self.command) out.push(...kidsOf(k.pid, seen));
      else out.push(k);
    }
    return out;
  };
  const kids = kidsOf(rootPid);
  if (!kids.length) return null;
  if (kids.length > 1) {
    const labels = [...new Set(kids.map((k) => labelOf(k.command)).filter(Boolean))];
    const shown = labels.slice(0, 3).join(" · ");
    return labels.length > 3 ? `${shown} +${labels.length - 3}` : shown;
  }
  const first = labelOf(kids[0].command);
  let cur = kids[0];
  // The deepest process with a name; one caught mid-exec has none yet, and
  // the step stays what its parent was doing.
  let deepest = null;
  for (let depth = 0; depth < 8; depth++) {
    const next = kidsOf(cur.pid);
    if (!next.length) break;
    // The newest child: the one with the least elapsed time.
    cur = next.reduce((a, b) => ((b.etime ?? Infinity) < (a.etime ?? Infinity) ? b : a));
    deepest = labelOf(cur.command) ?? deepest;
  }
  return deepest && deepest !== first ? `${first} › ${deepest}` : first;
}

/** Every pid under `rootPid`, itself included. */
function subtree(rootPid, procs) {
  const byPpid = new Map();
  for (const p of procs) {
    if (!byPpid.has(p.ppid)) byPpid.set(p.ppid, []);
    byPpid.get(p.ppid).push(p.pid);
  }
  const out = new Set([rootPid]);
  const stack = [rootPid];
  while (stack.length) {
    for (const k of byPpid.get(stack.pop()) ?? []) {
      if (!out.has(k)) {
        out.add(k);
        stack.push(k);
      }
    }
  }
  return out;
}

// Gate scripts run directly (specs/036-direct-gates) ----------------------------

/**
 * Programs that run a script named in their arguments. `env`, `npx`, `deno`
 * and `bun` hand over to another runner, so the walk carries on past them.
 */
const RUNNERS = new Set([...INTERPRETERS, "fish", "nodejs", "ts-node", "deno", "bun", "env", "npx"]);

const progName = (token) => base(token).toLowerCase().replace(/\.exe$/, "");
// `python3.12`, and macOS framework builds, which ps lists as `.../Python`.
const isRunner = (name) => RUNNERS.has(name) || /^(python|pypy)\d*(\.\d+)*$/.test(name);

/**
 * The script a process runs: the interpreter's script argument, or the
 * command itself. Null for a command given inline (`bash -c`, `python -m`),
 * whose children are what runs, and for a process caught mid-exec.
 */
/**
 * Runner flags that take the next token as their value. Without these,
 * `node -r ./setup.js app.js` read `./setup.js` as the script and
 * `python3 -W ignore gate-x.py` read `ignore`.
 */
const FLAGS_WITH_VALUE = {
  node: ["-r", "--require", "--import", "--loader", "--experimental-loader", "-C", "--conditions"],
  python: ["-W", "-X", "-Q"],
  python3: ["-W", "-X", "-Q"],
  ruby: ["-I", "-r"],
  perl: ["-I", "-M"],
  deno: ["--config", "-c", "--import-map"],
  bun: ["--preload", "-r", "--config"],
};

export function scriptOf(command) {
  const text = String(command ?? "").trim();
  if (!text || /^\(.*\)$/.test(text)) return null;
  const tokens = text.split(/\s+/);
  if (!isRunner(progName(tokens[0]))) return tokens[0];
  let i = 0;
  while (i < tokens.length && isRunner(progName(tokens[i]))) {
    const prog = progName(tokens[i]);
    i++;
    if ((prog === "deno" || prog === "bun") && tokens[i] === "run") i++;
    for (; i < tokens.length && tokens[i].startsWith("-"); i++) {
      const flag = tokens[i];
      if ((FLAGS_WITH_VALUE[prog] ?? []).includes(flag)) {
        i++;
        continue;
      }
      if (/^-[A-Za-z]*c[A-Za-z]*$/.test(flag) || flag === "-m") return null;
      if (["-e", "--eval", "-p", "--print"].includes(flag) && !["bash", "sh", "zsh", "dash", "ksh"].includes(prog)) return null;
    }
    // `env NAME=value prog`
    while (prog === "env" && i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i++;
  }
  return tokens[i] ?? null;
}

/** A simple glob as a regular expression: `*` and `?` stay in one directory, `**` crosses them. */
function globToRegExp(glob) {
  let out = "";
  const g = glob.replace(/\\/g, "/").replace(/^\.\//, "");
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*" && g[i + 1] === "*") {
      i++;
      if (g[i + 1] === "/") {
        i++;
        out += "(?:.*/)?";
      } else out += ".*";
    } else if (c === "*") out += "[^/]*";
    else if (c === "?") out += "[^/]";
    else out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  // With a slash it names a path and matches the end of one; without, a
  // basename, which the matcher hands it.
  return new RegExp(g.includes("/") ? `(?:^|/)${out}$` : `^${out}$`);
}

/**
 * Whether a script is a gate. `patterns` null means the defaults: a basename
 * that starts with `gate` or `gates` and then `-`, `_` or `.`, or a file whose
 * own directory is named `gates`. A list replaces the defaults, and an empty
 * list matches nothing.
 */
export function gateMatcher(patterns = null) {
  if (!Array.isArray(patterns)) {
    return (script) => {
      if (!script) return false;
      const p = String(script).replace(/\\/g, "/");
      const name = p.split("/").pop();
      // A test of the gates is not a gate: gate-rows.test.js, gate_x_test.py
      // and gate.spec.ts are what a test runner runs. A pattern in
      // .statusline.json can still name them on purpose.
      if (/[._-](test|spec)\.[^.]+$|^test_|_test\.[^.]+$/i.test(name)) return false;
      return /^gates?[-_.]/i.test(name) || /(^|\/)gates\/[^/]+$/.test(p);
    };
  }
  const res = patterns.map((g) => ({ re: globToRegExp(g), whole: /[\\/]/.test(g) }));
  return (script) => {
    if (!script) return false;
    const p = String(script).replace(/\\/g, "/");
    const name = p.split("/").pop();
    return res.some(({ re, whole }) => re.test(whole ? p : name));
  };
}

/**
 * The `gates` key of `.statusline.json` as patterns: null for the defaults,
 * a list (possibly empty, which turns direct detection off) otherwise.
 */
export function gatePatternsFrom(setting) {
  if (!setting || typeof setting !== "object" || !Array.isArray(setting.patterns)) return null;
  if (!setting.patterns.length) return [];
  const usable = setting.patterns.filter((p) => typeof p === "string" && p.trim()).map((p) => p.trim());
  return usable.length ? usable : null;
}

/**
 * The processes that are a direct run's root: a matching script with no
 * matching script above it (`gates.sh` running `gate-x.py` is one run) and no
 * git hook above it (the hook's row already shows it).
 */
export function directRoots(procs, matches) {
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const out = [];
  for (const proc of procs) {
    if (!matches(scriptOf(proc.command)) || hookOf(proc, byPid)) continue;
    let covered = false;
    const seen = new Set([proc.pid]);
    for (let up = byPid.get(proc.ppid); up && !seen.has(up.pid); up = byPid.get(up.ppid)) {
      seen.add(up.pid);
      if (hookOf(up, byPid) || matches(scriptOf(up.command))) {
        covered = true;
        break;
      }
    }
    if (!covered) out.push(proc);
  }
  return out;
}

/** Every ancestor pid of a process. */
function ancestorsOf(proc, byPid) {
  const out = new Set();
  for (let up = byPid.get(proc.ppid); up && !out.has(up.pid) && up.pid !== proc.pid; up = byPid.get(up.ppid)) out.add(up.pid);
  return out;
}

/** The worktree a directory belongs to: the longest path that contains it. */
export function worktreeFor(dir, worktrees) {
  if (!dir) return null;
  let best = null;
  for (const w of worktrees) {
    const root = w.real ?? w.path;
    const prefix = /[\\/]$/.test(root) ? root : `${root}/`;
    if (dir === root || dir.startsWith(prefix) || dir.startsWith(prefix.slice(0, -1) + path.sep)) {
      if (!best || root.length > (best.real ?? best.path).length) best = w;
    }
  }
  return best;
}

/** Whether a pid is a live process. */
export function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it exists and belongs to someone else.
    return err?.code === "EPERM";
  }
}

/**
 * The runs, from what the probe gathered. Pure, so every case is testable
 * without a real process table.
 *
 * `cwdOf(pid)` answers a hook's working directory; `lockOf(worktree)` answers
 * `{ pid, mtimeMs }` for a held `gates.lock`, or null.
 */
export function collectRuns({ worktrees, procs, cwdOf = () => null, lockOf = () => null, placedBefore = () => null, isAlive = alive, now = Date.now(), gatePatterns = null }) {
  const byPid = new Map(procs.map((p) => [p.pid, p]));
  const runs = [];
  const shownTrees = new Map();
  for (const proc of procs) {
    const hook = hookOf(proc, byPid);
    if (!hook) continue;
    let tree = worktreeFor(cwdOf(proc.pid), worktrees);
    if (!tree && path.isAbsolute(hook.script)) tree = worktreeFor(hook.script, worktrees);
    // Last, where the previous probe placed this same process: a hook this
    // probe could not place is still running, and dropping it would hide it.
    if (!tree) tree = placedBefore(proc);
    if (!tree) continue;
    const under = subtree(proc.pid, procs);
    const lock = lockOf(tree);
    const holder = lock && isAlive(lock.pid) ? lock.pid : null;
    // Waiting means this run's own `gates.sh` is the one standing at the lock:
    // another hook in the same worktree (a `post-checkout`, say) is not.
    const runsGates = [...under].some((pid) => /(^|[\\/\s])gates\.sh(\s|$)/.test(byPid.get(pid)?.command ?? ""));
    const waiting = holder !== null && !under.has(holder) && runsGates;
    runs.push(runFor(tree, {
      pid: proc.pid,
      hook: hook.name,
      step: waiting ? null : stepOf(proc.pid, procs),
      startedAt: proc.etime === null ? null : now - proc.etime * 1000,
      state: waiting ? "waiting" : "running",
    }));
    if (!shownTrees.has(tree.path)) shownTrees.set(tree.path, []);
    shownTrees.get(tree.path).push(under);
  }
  // Gate scripts run without a hook: an agent's `bash .claude/scripts/gates.sh`
  // or `python3 gate-x.py` (specs/036-direct-gates).
  for (const proc of directRoots(procs, gateMatcher(gatePatterns))) {
    let tree = worktreeFor(cwdOf(proc.pid), worktrees);
    const script = scriptOf(proc.command);
    if (!tree && script && path.isAbsolute(script)) tree = worktreeFor(script, worktrees);
    if (!tree) tree = placedBefore(proc);
    if (!tree) continue;
    const under = subtree(proc.pid, procs);
    const lock = lockOf(tree);
    const holder = lock && isAlive(lock.pid) ? lock.pid : null;
    // A run holding the lock, or run by its holder, is the lock's row below,
    // as it was before direct runs were read.
    if (holder !== null && (under.has(holder) || ancestorsOf(proc, byPid).has(holder))) continue;
    const runsGates = [...under].some((pid) => /(^|[\\/\s])gates\.sh(\s|$)/.test(byPid.get(pid)?.command ?? ""));
    const waiting = holder !== null && runsGates;
    const label = plainText(base(script ?? "")) ?? labelOf(proc.command) ?? "gate";
    const below = waiting ? null : stepOf(proc.pid, procs);
    runs.push(runFor(tree, {
      pid: proc.pid,
      hook: "gate",
      kind: "direct",
      step: waiting ? null : below ? `${label} › ${below}` : label,
      startedAt: proc.etime === null ? null : now - proc.etime * 1000,
      state: waiting ? "waiting" : "running",
    }));
  }
  // A held lock no hook accounts for: `gates.sh` run by hand, or any run on a
  // platform where the process list is not read.
  for (const tree of worktrees) {
    const lock = lockOf(tree);
    if (!lock || !isAlive(lock.pid)) continue;
    if ((shownTrees.get(tree.path) ?? []).some((pids) => pids.has(lock.pid))) continue;
    const holder = byPid.get(lock.pid);
    runs.push(runFor(tree, {
      pid: lock.pid,
      hook: holder ? labelOf(holder.command) ?? "gates.sh" : "gates.sh",
      step: holder ? stepOf(lock.pid, procs) : null,
      startedAt: holder && holder.etime !== null ? now - holder.etime * 1000 : lock.mtimeMs ?? null,
      state: "running",
    }));
  }
  return runs.sort((a, b) => (a.startedAt ?? now) - (b.startedAt ?? now));
}

function runFor(tree, fields) {
  return {
    ...fields,
    worktree: plainText(base(tree.path)) ?? tree.path,
    // Resolved, so the redraw compares like with like: `realpathSync` gives
    // native separators on Windows, where git prints `C:/x`.
    path: tree.real ?? tree.path,
    branch: plainText(tree.branch) ?? (tree.head ? tree.head.slice(0, 7) : null),
  };
}

// The probe (detached refresh only) ------------------------------------------

function run(cmd, args, cwd, timeout) {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", timeout, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
}

function real(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/** A worktree's own git dir: `.git` itself, or what its `.git` file points at. */
function gitDirOf(worktreePath) {
  const dotGit = path.join(worktreePath, ".git");
  try {
    if (statSync(dotGit).isDirectory()) return dotGit;
    const m = /^gitdir:\s*(.+)$/m.exec(readFileSync(dotGit, "utf8"));
    return m ? path.resolve(worktreePath, m[1].trim()) : null;
  } catch {
    return null;
  }
}

function readLock(tree) {
  const dir = gitDirOf(tree.path);
  if (!dir) return null;
  const lockDir = path.join(dir, "gates.lock");
  try {
    const st = statSync(lockDir);
    const pid = Number(readFileSync(path.join(lockDir, "pid"), "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? { pid, mtimeMs: st.mtimeMs } : null;
  } catch {
    return null;
  }
}

/**
 * The working directories of `pids`, by pid; null when the lookup itself
 * failed, so the caller can tell "no directory" from "could not ask".
 */
function workingDirs(pids, timeout, { exec = run, platform = process.platform } = {}) {
  const out = new Map();
  if (!pids.length) return out;
  if (platform === "linux") {
    for (const pid of pids) {
      try {
        out.set(pid, readlinkSync(`/proc/${pid}/cwd`));
      } catch {
        // gone, or not ours
      }
    }
  } else if (platform === "darwin") {
    let text;
    try {
      text = exec("lsof", ["-a", "-d", "cwd", "-p", pids.join(","), "-Fpn"], undefined, timeout);
    } catch (err) {
      // The pids come from every repository on the machine, and lsof exits 1
      // when any one of them ended after `ps` listed it, still printing the
      // live ones. That output is the answer. Missing, timed out or silent
      // is not: a timeout's partial output may stop short of the hook asked about.
      // A machine with no lsof at all never will answer, so that is not a
      // failure to retry but a platform without working directories: hooks
      // with an absolute script path and held locks are still placed, as on
      // Windows (research R5).
      if (err?.code === "ENOENT") return out;
      if (err?.code === "ETIMEDOUT" || err?.signal) return null;
      text = typeof err?.stdout === "string" ? err.stdout : "";
      if (!text.trim()) return null;
    }
    let pid = null;
    for (const line of String(text).split("\n")) {
      if (line.startsWith("p")) pid = Number(line.slice(1));
      else if (line.startsWith("n") && pid !== null) out.set(pid, line.slice(1));
    }
  }
  return out;
}

/**
 * The run the previous probe gave a hook this one could not place: same pid,
 * started at the same moment (so not another process that reuses the pid),
 * in a worktree that still exists. Its place is kept; everything else about
 * it is measured again.
 */
function placedBefore(proc, previous, worktrees, now) {
  if (proc.etime === null) return null;
  const startedAt = now - proc.etime * 1000;
  const prev = previous.find((r) => r?.pid === proc.pid && typeof r.startedAt === "number" && Math.abs(r.startedAt - startedAt) <= 2_000);
  if (!prev) return null;
  return worktrees.find((w) => (w.real ?? w.path) === prev.path) ?? null;
}

/**
 * The lookup the detached refresh runs. Answers in the refresh contract:
 * `found` with the runs (an empty list is an answer too), or `failed`.
 *
 * `failed` whenever the process list or the hooks' directories could not be
 * read: an empty or shorter list written over the last good one would hide a
 * gate that is still running until the next refresh, a minute away under the
 * installed interval. Failing keeps the last answer, which the redraw still
 * trims by pid.
 */
export function probeGateRuns(cwd, budgetMs = 5_000, { now = Date.now(), exec = run, platform = process.platform, previous, gatePatterns } = {}) {
  if (gatePatterns === undefined) gatePatterns = gatePatternsFrom(repoConfig(cwd).gates);
  let worktrees;
  try {
    worktrees = parseWorktrees(exec("git", ["worktree", "list", "--porcelain"], cwd, budgetMs)).map((w) => ({ ...w, real: real(w.path) }));
  } catch {
    return { state: "failed", value: null };
  }
  let procs = [];
  let cwds = new Map();
  // Windows has no `ps`, and nothing quick that reports a working directory,
  // so there the locks are all the bar reads (Principle IX, research R5).
  if (platform !== "win32") {
    try {
      procs = parseProcesses(exec("ps", ["-A", "-o", "pid=,ppid=,etime=,command="], undefined, budgetMs));
    } catch (err) {
      // No ps installed (a slim container without procps) never recovers,
      // so failing every time would hide even the lock-held runs for good.
      // Read the locks alone, as on Windows. Any other failure keeps the last
      // good answer.
      if (err?.code !== "ENOENT") return { state: "failed", value: null };
      procs = [];
    }
    const byPid = new Map(procs.map((p) => [p.pid, p]));
    const hookPids = procs.filter((p) => hookOf(p, byPid)).map((p) => p.pid);
    // Only processes already known to be a hook or a matching script are
    // looked up, so the cost follows the runs, not the machine.
    const directPids = directRoots(procs, gateMatcher(gatePatterns)).map((p) => p.pid);
    cwds = workingDirs([...hookPids, ...directPids], budgetMs, { exec, platform });
    if (!cwds) return { state: "failed", value: null };
  }
  if (previous === undefined) {
    const prior = readEntry(repoKey(cwd), "gates")?.value?.runs;
    previous = Array.isArray(prior) ? prior : [];
  }
  const runs = collectRuns({
    worktrees,
    procs,
    cwdOf: (pid) => (cwds.has(pid) ? real(cwds.get(pid)) : null),
    lockOf: readLock,
    placedBefore: (proc) => placedBefore(proc, previous, worktrees, now),
    now,
    gatePatterns,
  });
  return { state: "found", value: { runs } };
}

// The reader (redraw) ----------------------------------------------------------

/**
 * The gates running in this directory's repository, from the cache, with any
 * whose process has ended left out. Starts a refresh when the answer is old.
 * Null when there is no answer yet; an empty list when nothing runs.
 */
export function readGateRuns(cwd, { now = Date.now(), isAlive = alive, refresh = true } = {}) {
  // A directory that does not exist runs no hooks, and a generated preview's
  // made-up path must not start a lookup on the machine that generates it.
  if (!cwd || !existsSync(cwd)) return null;
  const key = repoKey(cwd);
  const entry = readEntry(key, "gates");
  if (refresh && (!entry || now - entry.at > GATES_REFRESH_AFTER_MS)) spawnRefresh(key, "gates", cwd, { now });
  if (!entry || now - entry.at > GATES_SHOW_MS) return null;
  const runs = Array.isArray(entry.value?.runs) ? entry.value.runs : [];
  return runs.filter((r) => isAlive(r?.pid));
}
