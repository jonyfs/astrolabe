import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import {
  applyCodexItems,
  removeCodexStatusLine,
  codexItemsState,
  readTuiValue,
  readTuiLines,
  setTuiLines,
  removeTuiKey,
  CODEX_STATUS_LINE,
  CODEX_COLORS_LINE,
  CODEX_THEMES,
} from "./codexConfig.js";
import { copilotHome, readCopilotSettings } from "./copilotSettings.js";
import { installOpencode, uninstallOpencode, opencodeStatus } from "./opencodeConfig.js";
import { parseHooks, addCodexHook, removeCodexHook, hasCodexHook } from "./codexHooks.js";
import { findOnPath } from "./codexLaunch.js";
import { latestPointer } from "./codexSession.js";

const CLI_PATH = fileURLToPath(new URL("../bin/cli.js", import.meta.url));
const PACKAGE_PATH = fileURLToPath(new URL("../package.json", import.meta.url));

/** The oldest Node this code runs on, as `package.json`'s `engines` says. */
export const MIN_NODE_MAJOR = 18;

/**
 * Why this Node cannot run the plugin, or null when it can.
 *
 * On Node 14 the install used to print "Statusline installed." and the bar
 * then drew "statusline unavailable": nothing checked `engines`, so the
 * failure surfaced later and somewhere else (specs/024-install-update).
 */
export function unsupportedNode(version = process.versions.node) {
  const major = Number.parseInt(String(version).split(".")[0], 10);
  if (Number.isFinite(major) && major >= MIN_NODE_MAJOR) return null;
  return `Node ${MIN_NODE_MAJOR} or newer is required; this is Node ${version}.`;
}

/**
 * What is being installed: the package version, and the clone's commit when
 * there is one. Printed so that an install run over a clone that a failed
 * `git clone` never updated says plainly that it is the old code.
 */
export function installedVersion() {
  let version = null;
  try {
    version = JSON.parse(readFileSync(PACKAGE_PATH, "utf8")).version ?? null;
  } catch {
    // A missing package.json is not a reason to refuse an install.
  }
  let commit = null;
  let date = null;
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%h %cs"], {
      cwd: path.dirname(PACKAGE_PATH),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    [commit = null, date = null] = out.split(" ");
  } catch {
    // Not a clone, or no git: the version alone still says something.
  }
  return { version, commit, date };
}

// Resolved per call rather than at import time, so a test can point HOME at
// a throwaway directory. Install and uninstall write to the file a
// developer's own Claude Code reads; a test that touched it would be one
// failing assertion away from costing them their configuration.
const settingsPath = () => path.join(os.homedir(), ".claude", "settings.json");
const backupDir = () => path.join(os.homedir(), ".claude", "statusline", "backups");

/**
 * Running this straight out of a package-manager scratch directory
 * (`~/.npm/_npx/<hash>/...`) records a path that only exists until the
 * cache is evicted. The statusline then silently disappears with no
 * clue why. Refusing here, with the command that does work, is far
 * kinder than that delayed failure.
 */
function cloneCommandFor() {
  return `git clone https://github.com/jonyfs/statusline.git "${shellPath(path.join(os.homedir(), ".claude", "statusline-plugin"))}"`;
}

function assertNotRunningFromNpxCache() {
  const normalized = CLI_PATH.replace(/\\/g, "/");
  if (!normalized.includes("/_npx/")) return;
  throw new Error(
    [
      "Refusing to install from an npx cache directory.",
      "",
      `  ${CLI_PATH}`,
      "",
      "That cache is temporary and gets evicted later, which would leave",
      "Claude Code pointing at a path that no longer exists.",
      "",
      "Clone it somewhere permanent instead:",
      "",
      `  ${cloneCommandFor()}`,
      `  node "${shellPath(path.join(os.homedir(), ".claude", "statusline-plugin", "bin", "cli.js"))}" install`,
    ].join("\n")
  );
}

function loadSettings() {
  const file = settingsPath();
  if (!existsSync(file)) return {};
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new Error(`Could not parse existing ${file} — fix or remove it before installing.`);
  }
  // Valid JSON is not enough: the settings root has to be a plain object for
  // the keys to survive being written back. Assigning `statusLine` to an
  // array succeeds silently in JavaScript and is then dropped by
  // `JSON.stringify`, which serialises only a list's indices — so the install
  // reported "Statusline installed." over a file it had changed in no way.
  // A refusal is the honest outcome; a false success is the one that costs
  // someone an afternoon.
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `${file} is ${Array.isArray(parsed) ? "a list" : `a ${parsed === null ? "null" : typeof parsed}`}, not a settings object — fix or remove it before installing.`
    );
  }
  return parsed;
}

function backupSettings(settings) {
  mkdirSync(backupDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir(), `settings.${stamp}.json`);
  writeFileSync(backupPath, JSON.stringify(settings, null, 2));
  return backupPath;
}

/**
 * Written to a temporary file beside the target and renamed over it, which
 * is atomic on all three platforms. Written in place, a process killed
 * mid-write left a truncated settings file, and Claude Code reads this one
 * file for everything else it is configured with.
 */
function writeSettings(settings) {
  const file = settingsPath();
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n");
    renameSync(tmp, file);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to clean up
    }
    throw err;
  }
}

/**
 * A path as a shell command should carry it. Claude Code's statusline docs
 * ask for forward slashes on Windows, and every Windows program this
 * project starts accepts them.
 */
export function shellPath(p, platform = process.platform) {
  return platform === "win32" ? String(p).replace(/\\/g, "/") : String(p);
}

let nodeRunsCache;
/** Whether a bare `node` runs from the shell doing the install. */
function nodeRuns() {
  if (nodeRunsCache !== undefined) return nodeRunsCache;
  try {
    // No `shell: true` here. `execFileSync` searches PATH on its own, and
    // Node 26 deprecates passing arguments through a shell (DEP0190),
    // which printed a warning over the install's own output.
    execFileSync("node", ["--version"], { stdio: "ignore", timeout: 5000 });
    nodeRunsCache = true;
  } catch {
    nodeRunsCache = false;
  }
  return nodeRunsCache;
}

/**
 * A command every shell Claude Code runs it through can parse: POSIX `sh`,
 * Git Bash, and PowerShell, which it uses on Windows when Git Bash is absent
 * (specs/028-cross-platform, Principle IX).
 *
 * The script path is quoted, since it can hold spaces anywhere. The
 * interpreter is not: PowerShell reads a line that opens with a quoted
 * string as an expression and never runs it, and the `&` that would make it
 * a command is a syntax error in bash. So an interpreter with a space is
 * quoted only on POSIX, and on Windows, where the usual one is
 * `C:\Program Files\nodejs\node.exe`, it becomes a bare `node` when that
 * runs; otherwise it stays quoted and only Git Bash can run it, which
 * install says.
 */
function buildCommand(interpreter, cliPath, subcommand = "render", { platform = process.platform, nodeRuns: canRunNode = nodeRuns } = {}) {
  let interp = shellPath(interpreter, platform);
  if (/\s/.test(interp)) interp = platform === "win32" && canRunNode() ? "node" : `"${interp}"`;
  return `${interp} "${shellPath(cliPath, platform)}" ${subcommand}`;
}

/** Exposed so the cross-platform tests can check each platform's form. */
export const buildCommandForTest = buildCommand;
export const CLI_PATH_FOR_TEST = CLI_PATH;

/**
 * Prefers a bare `node` over this process's absolute executable path,
 * but only after confirming a shell can actually resolve it.
 *
 * `process.execPath` looks safer and is not: package managers hand out
 * version-pinned paths (Homebrew's `/usr/local/Cellar/node/26.7.0/bin/node`,
 * nvm's `~/.nvm/versions/node/v26.7.0/bin/node`), so pinning it means the
 * statusline breaks the next time Node is upgraded. A bare `node` follows
 * upgrades, and the probe below rules out the one case it fails — a shell
 * whose PATH has no node at all.
 */
function resolveInterpreter() {
  return nodeRuns() ? "node" : process.execPath;
}

/**
 * The skill hook's command.
 *
 * `process.execPath` here, deliberately unlike the `statusLine` command
 * above. Principle IX requires a spawned command to use the interpreter
 * already running; the bare `node` above is a documented exception that
 * predates this feature, and an exception does not extend itself to a
 * command string that did not exist before.
 */
export function buildHookCommand() {
  return buildCommand(process.execPath, CLI_PATH, "note-skill");
}

/** The command that draws the subagent task rows (item F2). */
export function buildTaskRowCommand() {
  return buildCommand(process.execPath, CLI_PATH, "task-rows");
}

/**
 * How often Claude Code re-runs the command on its own, in seconds.
 *
 * Updates are event-driven, and the events go quiet while a session is
 * idle. The countdowns and the clock are exactly the segments that keep
 * changing while nothing else does, so without an interval they freeze at
 * whatever they said when the last event fired. Item F1's chosen value.
 */
export const REFRESH_INTERVAL_SECONDS = 60;

/** Whether a command string belongs to this plugin's own CLI. */
function isOurCommand(command) {
  const normalize = (p) =>
    process.platform === "win32" ? p.replace(/\\/g, "/").toLowerCase() : p;
  return normalize(String(command || "")).includes(normalize(CLI_PATH));
}

/**
 * This plugin's skill hook, wherever its clone lives.
 *
 * `isOurCommand` matches the running clone's own path, which is right for
 * uninstall and wrong for cleanup: a clone moved or re-made elsewhere left
 * the first one's hook behind, and every skill then ran two hooks, one of
 * them in a directory that may be gone. `note-skill` is a subcommand no other
 * tool has, and it sits at the very end of the command this install writes.
 */
function isOurSkillHookAnywhere(command) {
  return /cli\.js"\s+note-skill\s*$/.test(String(command || ""));
}

/**
 * Adds the `PostToolUse` entry that records skill invocations, leaving
 * every other hook alone. Idempotent: a second install replaces this
 * plugin's own entry rather than stacking another beside it.
 */
function registerHook(settings) {
  const command = buildHookCommand();
  settings.hooks = settings.hooks || {};
  const existing = Array.isArray(settings.hooks.PostToolUse) ? settings.hooks.PostToolUse : [];

  const others = existing.filter(
    (group) =>
      !(group?.hooks || []).some((h) => isOurCommand(h?.command) || isOurSkillHookAnywhere(h?.command))
  );

  settings.hooks.PostToolUse = [
    ...others,
    { matcher: "Skill", hooks: [{ type: "command", command }] },
  ];
  return command;
}

/** Removes only the entry this plugin wrote, matched on its own CLI path. */
function removeHook(settings) {
  const groups = settings?.hooks?.PostToolUse;
  if (!Array.isArray(groups)) return false;

  const kept = groups.filter((group) => !(group?.hooks || []).some((h) => isOurCommand(h?.command)));
  if (kept.length === groups.length) return false;

  if (kept.length) settings.hooks.PostToolUse = kept;
  else delete settings.hooks.PostToolUse;
  // Leave no empty container behind that was not there before.
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
  return true;
}

/**
 * Which optional pieces an install of this plugin already in the settings
 * has. Read before anything is written, so it describes what the previous
 * install left.
 */
function installedPieces(settings) {
  return {
    hook: (settings?.hooks?.PostToolUse || []).some((group) =>
      (group?.hooks || []).some((h) => isOurCommand(h?.command) || isOurSkillHookAnywhere(h?.command))
    ),
    refreshInterval: settings?.statusLine?.refreshInterval !== undefined,
    // Installs from before 2026-09-06 (fix 018) kept the task rows under
    // `statusLine.taskCommand`; install still migrates that key, so it counts
    // as the rows being on rather than as an opt-out.
    taskRows: isOurCommand(settings?.subagentStatusLine?.command) || isOurCommand(settings?.statusLine?.taskCommand),
  };
}

/**
 * Each option is true (a flag turned it on), false (a `--no-*` flag turned
 * it off) or undefined (no flag). Undefined means on for a first install.
 *
 * Over this plugin's own install it means "as before" instead. `update` and
 * the automatic update run a plain install, and when undefined meant on,
 * every update quietly put back the hook, the interval and the task rows
 * someone had turned off (audit #17). A missing piece is the only record of
 * that choice, so it is read back from the settings rather than from a file
 * of its own that could disagree with them.
 */
export function install({ registerHook: hookFlag, refreshInterval: intervalFlag, taskRows: taskRowsFlag } = {}) {
  assertNotRunningFromNpxCache();
  const tooOld = unsupportedNode();
  if (tooOld) throw new Error(tooOld);

  const settings = loadSettings();
  const backupPath = backupSettings(settings);

  const command = buildCommand(resolveInterpreter(), CLI_PATH);
  const alreadyInstalled = settings.statusLine?.command === command;
  // Matched on the clone's path rather than the whole command, so a change
  // of interpreter (a bare `node` found on the PATH since) still counts.
  const upgrading = isOurCommand(settings.statusLine?.command);
  const before = installedPieces(settings);
  const keptOff = [];
  const choose = (flag, piece) => {
    if (flag !== undefined) return Boolean(flag);
    if (upgrading && !before[piece]) {
      keptOff.push(piece);
      return false;
    }
    return true;
  };
  const wantHook = choose(hookFlag, "hook");
  const wantInterval = choose(intervalFlag, "refreshInterval");
  const wantTaskRows = choose(taskRowsFlag, "taskRows");

  settings.statusLine = { type: "command", command };
  if (wantInterval) settings.statusLine.refreshInterval = REFRESH_INTERVAL_SECONDS;
  // The subagent rows are their own top-level setting with their own tick,
  // not a field on `statusLine`. This was installed as `statusLine.taskCommand`
  // until 2026-09-06, which Claude Code does not read: the rows kept their
  // default rendering and the snapshot the skills line reads from was never
  // written, so line 2 could never name a running agent. Removed here as well
  // as written, so an install fixes a settings file that already has it.
  delete settings.statusLine.taskCommand;
  if (wantTaskRows) {
    settings.subagentStatusLine = { type: "command", command: buildTaskRowCommand() };
  } else if (isOurCommand(settings.subagentStatusLine?.command)) {
    delete settings.subagentStatusLine;
  }
  // Registering by default keeps the skills line immediate for everyone,
  // and `--no-hook` is there for anyone who would rather not have a hook
  // in their settings. Asking interactively would break both idempotence
  // and any scripted install, which Principle IV rules out.
  const hookCommand = wantHook ? registerHook(settings) : null;
  if (!wantHook) removeHook(settings);
  writeSettings(settings);

  return {
    settingsPath: settingsPath(),
    backupPath,
    command,
    hookRegistered: Boolean(hookCommand),
    hookCommand,
    refreshInterval: wantInterval ? REFRESH_INTERVAL_SECONDS : null,
    taskRows: Boolean(wantTaskRows),
    keptOff,
    alreadyInstalled,
    // Only Git Bash can run a command whose interpreter had to stay quoted.
    needsGitBash: process.platform === "win32" && [command, hookCommand, settings.subagentStatusLine?.command].some((c) => typeof c === "string" && c.startsWith('"')),
    ...installedVersion(),
  };
}

/**
 * A `statusLine` in the project's own settings, which Claude Code applies
 * over the user's, so the bar a person sees there is not this one. `doctor`
 * names it; nothing here edits a project file.
 */
export function projectOverrides(cwd = process.cwd()) {
  const found = [];
  for (const name of ["settings.json", "settings.local.json"]) {
    const file = path.join(cwd, ".claude", name);
    let command;
    try {
      command = JSON.parse(readFileSync(file, "utf8"))?.statusLine?.command;
    } catch {
      continue;
    }
    if (typeof command !== "string") continue;
    const ours = /cli\.js"?\s+render\s*$/.test(command) && /statusline/i.test(command);
    if (!ours) found.push({ file, command });
  }
  return found;
}

const OUR_SUBCOMMANDS = new Set(["render", "task-rows", "note-skill"]);

/** The two quoted paths and the subcommand of a command this plugin wrote. */
function parseCommand(command) {
  // The interpreter is quoted in commands written before specs/028 and when
  // it holds a space on POSIX, and bare otherwise.
  const m = /^(?:"([^"]+)"|(\S+))\s+"([^"]+)"\s+(\S+)\s*$/.exec(String(command || ""));
  return m ? { interpreter: m[1] ?? m[2], cli: m[3], subcommand: m[4] } : null;
}

/**
 * Whether each entry this plugin wrote still points at something that exists.
 *
 * The skill hook and the subagent rows name the interpreter that ran the
 * install, as Principle IX requires, so removing that Node version breaks
 * them with nothing on screen to say why. `doctor` asks this instead. A bare
 * `node`, which the status line uses, is resolved by the shell and is not a
 * path to check.
 */
export function checkInstall(settings, exists = existsSync) {
  const entries = [];
  if (settings?.statusLine?.command) entries.push(["statusLine", settings.statusLine.command]);
  if (settings?.subagentStatusLine?.command) entries.push(["subagentStatusLine", settings.subagentStatusLine.command]);
  for (const group of settings?.hooks?.PostToolUse || []) {
    for (const h of group?.hooks || []) {
      if (isOurSkillHookAnywhere(h?.command)) entries.push(["skill hook", h.command]);
    }
  }
  return entries
    .map(([entry, command]) => [entry, parseCommand(command)])
    .filter(([, parsed]) => parsed && /cli\.js$/.test(parsed.cli) && OUR_SUBCOMMANDS.has(parsed.subcommand))
    .map(([entry, { interpreter, cli }]) => {
      const missing = [];
      if (path.isAbsolute(interpreter) && !exists(interpreter)) missing.push(`interpreter ${interpreter}`);
      if (!exists(cli)) missing.push(`script ${cli}`);
      return missing.length
        ? { entry, ok: false, problem: `${missing.join(" and ")} no longer exists` }
        : { entry, ok: true, problem: null };
    });
}

/**
 * Matches on this plugin's own CLI path rather than a bare "cli.js", so
 * uninstalling never removes some other tool's statusline that happens
 * to be a cli.js too. Windows path comparison is case-insensitive and
 * tolerates either slash direction, since the stored command may have
 * been written by a different shell than the one running now.
 */
export function uninstall() {
  const file = settingsPath();
  if (!existsSync(file)) {
    return { changed: false, reason: `${file} does not exist.` };
  }
  const settings = loadSettings();
  // The whole statusLine object goes, so the refresh interval it carries
  // goes with it. The subagent rows are a separate top-level setting and
  // are removed separately, on the same test: it was written by this
  // install and does not outlive it.
  const hasStatusLine = settings.statusLine && isOurCommand(settings.statusLine.command);
  const hasSubagentLine = isOurCommand(settings.subagentStatusLine?.command);
  const hasHook = (settings?.hooks?.PostToolUse || []).some((group) =>
    (group?.hooks || []).some((h) => isOurCommand(h?.command))
  );

  if (!hasStatusLine && !hasSubagentLine && !hasHook) {
    return { changed: false, reason: "No statusline installed by this plugin was found." };
  }

  backupSettings(settings);
  if (hasStatusLine) delete settings.statusLine;
  if (hasSubagentLine) delete settings.subagentStatusLine;
  const hookRemoved = removeHook(settings);
  writeSettings(settings);

  return { changed: true, settingsPath: file, hookRemoved };
}

// --- Other harnesses (specs/029-multi-harness) ------------------------------

const codexHome = (env) => env.CODEX_HOME || path.join(os.homedir(), ".codex");

/** A copy of a file before it is changed, beside the plugin's other backups. */
function backupFile(file, label) {
  mkdirSync(backupDir(), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const to = path.join(backupDir(), `${label}.${stamp}${path.extname(file)}`);
  writeFileSync(to, readFileSync(file));
  return to;
}

function writeAtomic(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, text);
    renameSync(tmp, file);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing to clean up
    }
    throw err;
  }
}

/**
 * How often Copilot CLI re-runs the command, in seconds (specs/033-copilot-
 * parity). Not Claude Code's 60.
 *
 * Copilot re-runs it only when its own session state changes, and none of
 * what the bar reads on its own counts as a change there: a resized window,
 * a todo the agent ticked off, an effort set with `/model`, the monthly quota
 * the refresh just fetched. Each waits for the next tick. Ten seconds keeps
 * that wait shorter than the moment it takes to glance down at the bar, at
 * six redraws a minute of a few tens of milliseconds each. Five would double
 * the redraws to save five seconds, and the slowest of those sources, the
 * quota, only changes every five minutes anyway.
 */
export const COPILOT_REFRESH_INTERVAL_SECONDS = 10;

/**
 * The parts of Copilot CLI's own footer the bar already shows, which
 * `--quiet-footer` turns off (specs/033-copilot-parity). Read from Copilot
 * 1.0.91's settings mapper. `showCustom` is not here: it is the bar itself.
 * Agent, sandbox, schedules, username and allow-all are left alone, because
 * the bar either does not show them or shows them differently.
 */
export const QUIET_FOOTER_KEYS = [
  "showDirectory",
  "showBranch",
  "showPullRequest",
  "showAiUsed",
  "showContextWindow",
  "showQuota",
  "showCodeChanges",
  "showCiStatus",
  "showModelEffort",
];

/**
 * What each footer key was before `--quiet-footer` changed it, per Copilot
 * settings file, so uninstall can put it back. Kept with the plugin's other
 * state rather than in Copilot's file, where an unknown key is Copilot's to
 * reject.
 */
const footerRecordFile = () => path.join(os.homedir(), ".claude", "statusline", "copilot-footer.json");

function loadFooterRecord() {
  try {
    const parsed = JSON.parse(readFileSync(footerRecordFile(), "utf8"));
    if (parsed?.version === 1 && parsed.files && typeof parsed.files === "object") return parsed;
  } catch {
    // none yet, or unreadable: nothing recorded
  }
  return { version: 1, files: {} };
}

function saveFooterRecord(record) {
  if (Object.keys(record.files).length === 0) {
    try {
      unlinkSync(footerRecordFile());
    } catch {
      // nothing to remove
    }
    return;
  }
  writeAtomic(footerRecordFile(), JSON.stringify(record, null, 2) + "\n");
}

const footerOf = (settings) =>
  settings.footer && typeof settings.footer === "object" && !Array.isArray(settings.footer) ? settings.footer : null;

/** The value `--quiet-footer` writes for a key. */
const quietValue = (key) => key === "showCustom";

/**
 * Turns the repeated footer items off and keeps the bar on, recording what
 * each key held first. A key already recorded keeps its first record, so a
 * second install never mistakes its own `false` for the person's choice.
 */
function quietFooter(settings, file) {
  const record = loadFooterRecord();
  const footer = footerOf(settings) ?? {};
  const entry = record.files[file] ?? { footerExisted: footerOf(settings) !== null, keys: {} };
  const remember = (key) => {
    if (!(key in entry.keys)) entry.keys[key] = Object.hasOwn(footer, key) ? { had: true, value: footer[key] } : { had: false };
  };
  for (const key of QUIET_FOOTER_KEYS) {
    remember(key);
    footer[key] = false;
  }
  // `showCustom: false` hides the bar this install is for.
  if (footer.showCustom === false) {
    remember("showCustom");
    footer.showCustom = true;
  }
  settings.footer = footer;
  record.files[file] = entry;
  saveFooterRecord(record);
}

/**
 * Puts back what `quietFooter` recorded for this file. A key whose value is no
 * longer the one written was changed since, in Copilot's own picker or by
 * hand, and that later choice stands. Returns whether anything was recorded.
 */
function restoreFooter(settings, file) {
  const record = loadFooterRecord();
  const entry = record.files[file];
  if (!entry) return false;
  const footer = footerOf(settings);
  if (footer) {
    for (const [key, before] of Object.entries(entry.keys ?? {})) {
      if (footer[key] !== quietValue(key)) continue;
      if (before?.had) footer[key] = before.value;
      else delete footer[key];
    }
    if (!entry.footerExisted && Object.keys(footer).length === 0) delete settings.footer;
  }
  delete record.files[file];
  saveFooterRecord(record);
  return true;
}

const isOurRenderCommand = (command) =>
  isOurCommand(command) || (/cli\.js"?\s+render\s*$/.test(String(command || "")) && /statusline/i.test(String(command || "")));

// --- Codex (specs/034-codex-items) ------------------------------------------

/**
 * What this plugin added to each Codex config file beyond its items, so
 * uninstall removes only that: `colors` when it wrote status_line_use_colors,
 * and `theme` with the source lines of the theme `--theme` replaced (null
 * when there was none) and the name it wrote. Kept with the plugin's other
 * state rather than in Codex's file.
 */
const codexRecordFile = () => path.join(os.homedir(), ".claude", "statusline", "codex-config.json");

function loadCodexRecord() {
  try {
    const parsed = JSON.parse(readFileSync(codexRecordFile(), "utf8"));
    if (parsed?.version === 1 && parsed.files && typeof parsed.files === "object") return parsed;
  } catch {
    // none yet, or unreadable: nothing recorded
  }
  return { version: 1, files: {} };
}

function saveCodexRecord(record) {
  for (const [file, entry] of Object.entries(record.files)) if (!entry.colors && !entry.theme) delete record.files[file];
  if (Object.keys(record.files).length === 0) {
    try {
      unlinkSync(codexRecordFile());
    } catch {
      // nothing to remove
    }
    return;
  }
  writeAtomic(codexRecordFile(), JSON.stringify(record, null, 2) + "\n");
}

/** Whose status_line_use_colors this is: `ours`, `yours-on`, `yours-off` or `unset`. */
function codexColorsState(text, entry) {
  const value = readTuiValue(text, "status_line_use_colors");
  if (value === null || value === undefined) return "unset";
  if (value !== "true") return "yours-off";
  return entry?.colors ? "ours" : "yours-on";
}

/** The theme `--theme` set, while it is still the one in the file, else null. */
function codexOurTheme(text, entry) {
  if (!entry?.theme) return null;
  return readTuiValue(text, "theme") === JSON.stringify(entry.theme.wrote) ? entry.theme.wrote : null;
}

/** Puts back the theme `--theme` replaced, unless it was changed since, and drops the record. */
function restoreCodexTheme(text, entry) {
  if (!entry?.theme) return text;
  const ours = codexOurTheme(text, entry);
  const before = entry.theme.before;
  delete entry.theme;
  if (!ours) return text;
  return before ? (setTuiLines(text, "theme", before) ?? text) : removeTuiKey(text, "theme");
}

function codexStatus(file) {
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  const entry = loadCodexRecord().files[file];
  const items = codexItemsState(text);
  return {
    configured: items === "current" || items === "older",
    items,
    colors: codexColorsState(text, entry),
    theme: codexOurTheme(text, entry),
  };
}

/**
 * Codex's built-in items, in the Claude bar's order, and its colors. A list
 * this plugin wrote before is upgraded and any other list is kept. The theme
 * changes only with `theme`: a Catppuccin name sets it, false puts back the
 * one it replaced, undefined leaves it alone.
 */
function installCodex(env, theme, pane) {
  const dir = codexHome(env);
  if (!existsSync(dir)) return { ok: false, reason: `Codex is not set up here: ${dir} does not exist. Run Codex once, then install again.` };
  if (typeof theme === "string" && !CODEX_THEMES.includes(theme)) {
    return { ok: false, reason: `--theme takes one of ${CODEX_THEMES.join(", ")}, not "${theme}".` };
  }
  // The hooks file is checked before anything is written, so a file this
  // installer cannot edit leaves config.toml untouched too.
  const hooksPath = path.join(dir, "hooks.json");
  if (pane !== undefined && existsSync(hooksPath)) {
    try {
      parseHooks(readFileSync(hooksPath, "utf8"));
    } catch (err) {
      return { ok: false, reason: `${hooksPath} could not be read as Codex hooks (${err.message}). Fix it, or install without --pane.` };
    }
  }
  const file = path.join(dir, "config.toml");
  const before = existsSync(file) ? readFileSync(file, "utf8") : "";
  const applied = applyCodexItems(before);
  if (applied.text === null) {
    return {
      ok: false,
      reason: `${file} sets tui in a form this installer does not edit (a dotted key, an inline table, or an unclosed status_line). Add status_line under [tui] by hand: ${CODEX_STATUS_LINE}`,
    };
  }
  let text = applied.text;
  const record = loadCodexRecord();
  const entry = record.files[file] ?? {};

  // Colors are written only where the person has not set them.
  let colors = codexColorsState(text, entry);
  if (colors === "unset") {
    text = setTuiLines(text, "status_line_use_colors", CODEX_COLORS_LINE, { after: "status_line" });
    entry.colors = true;
    colors = "added";
  } else if (colors !== "ours") {
    delete entry.colors;
  }

  let themeResult = "unchanged";
  if (typeof theme === "string") {
    // A second --theme keeps the first record, so uninstall brings back the
    // person's own theme, not the Catppuccin one an earlier install wrote.
    if (codexOurTheme(text, entry)) entry.theme.wrote = theme;
    else entry.theme = { before: readTuiLines(text, "theme"), wrote: theme };
    text = setTuiLines(text, "theme", `theme = ${JSON.stringify(theme)}`, { after: "status_line_use_colors" });
    themeResult = "set";
  } else if (theme === false && entry.theme) {
    const restored = restoreCodexTheme(text, entry);
    themeResult = restored === text ? "unchanged" : "restored";
    text = restored;
  }
  // A plain reinstall (what `update` runs) leaves a theme an earlier --theme
  // wrote where it is; the summary says so rather than calling it Codex's own.
  if (themeResult === "unchanged" && codexOurTheme(text, entry)) themeResult = "kept";

  record.files[file] = entry;
  const backupPath = text !== before && existsSync(file) ? backupFile(file, "codex-config") : null;
  if (text !== before) writeAtomic(file, text);
  saveCodexRecord(record);
  const notes = ["Codex draws its own built-in items; this plugin chooses which, and its own bar does not run there."];
  if (applied.items === "kept") {
    notes.push(`[tui] status_line is a list you chose, so it was kept. For this plugin's list, delete that line and install again, or write: ${CODEX_STATUS_LINE}`);
  }
  if (themeResult === "set") notes.push("The theme also restyles code blocks and diffs everywhere in Codex; --no-theme or uninstall puts yours back.");
  const paneResult = applyCodexPane(hooksPath, pane);
  if (paneResult.hook === "added" || paneResult.hook === "updated") {
    notes.push(
      "Codex asks once to trust a new hook before it runs it: approve this plugin's SessionStart hook when Codex lists it. Until then the pane finds the session by its directory."
    );
  }
  return { ok: true, harness: "codex", file, backupPath, items: applied.items, colors, theme: themeResult, themeName: codexOurTheme(text, entry), notes, pane: paneResult };
}

// --- Codex pane hook (specs/035-codex-pane) -----------------------------------

/**
 * The SessionStart hook's command. Kept stable: Codex's trust is tied to its
 * text. So it takes the status line's interpreter, a bare `node` whenever a
 * shell resolves one, and not `process.execPath`: a version-pinned path
 * vanishes on the next Node upgrade, the hook then fails on every session
 * start, and the reinstall that repairs it changes the text Codex trusted.
 */
export function buildCodexHookCommand() {
  return buildCommand(resolveInterpreter(), CLI_PATH, "codex-hook");
}

/** hooks.json files this plugin created, so uninstall can remove one it emptied. */
const codexHooksRecordFile = () => path.join(os.homedir(), ".claude", "statusline", "codex-hooks.json");

function loadCodexHooksRecord() {
  try {
    const parsed = JSON.parse(readFileSync(codexHooksRecordFile(), "utf8"));
    if (parsed?.version === 1 && Array.isArray(parsed.created)) return parsed;
  } catch {
    // none yet
  }
  return { version: 1, created: [] };
}

function saveCodexHooksRecord(record) {
  if (record.created.length === 0) {
    try {
      unlinkSync(codexHooksRecordFile());
    } catch {
      // nothing to remove
    }
    return;
  }
  writeAtomic(codexHooksRecordFile(), JSON.stringify(record, null, 2) + "\n");
}

/** Takes the hook out of `file`. Removes the file when this plugin created it and nothing else is left. */
function removeCodexPaneHook(file) {
  if (!existsSync(file)) return { removed: false };
  let result;
  try {
    result = removeCodexHook(readFileSync(file, "utf8"));
  } catch {
    return { removed: false };
  }
  if (!result.removed) return { removed: false };
  const record = loadCodexHooksRecord();
  const created = record.created.includes(file);
  const backupPath = backupFile(file, "codex-hooks");
  if (result.empty && created) unlinkSync(file);
  else writeAtomic(file, result.text);
  record.created = record.created.filter((f) => f !== file);
  saveCodexHooksRecord(record);
  return { removed: true, backupPath };
}

/**
 * `pane` true registers the hook, false removes it, undefined leaves it as it
 * is, so a plain reinstall or update keeps the person's choice.
 */
function applyCodexPane(file, pane) {
  if (pane === undefined) {
    const text = existsSync(file) ? readFileSync(file, "utf8") : "";
    return { hook: hasCodexHook(text) ? "kept" : "absent", file };
  }
  if (pane === false) {
    const r = removeCodexPaneHook(file);
    return { hook: r.removed ? "removed" : "absent", file, backupPath: r.backupPath ?? null };
  }
  const existed = existsSync(file);
  const before = existed ? readFileSync(file, "utf8") : "";
  const added = addCodexHook(before, buildCodexHookCommand());
  let backupPath = null;
  if (added.state !== "present") {
    if (existed) backupPath = backupFile(file, "codex-hooks");
    writeAtomic(file, added.text);
    if (!existed) {
      const record = loadCodexHooksRecord();
      if (!record.created.includes(file)) record.created.push(file);
      saveCodexHooksRecord(record);
    }
  }
  return { hook: added.state, file, backupPath };
}

/** Removes the items, colors and theme this plugin wrote, and nothing the person set. */
function uninstallCodex(env) {
  const hooks = removeCodexPaneHook(path.join(codexHome(env), "hooks.json"));
  const file = path.join(codexHome(env), "config.toml");
  if (!existsSync(file)) {
    return hooks.removed ? { changed: true, file, hookRemoved: true } : { changed: false, reason: `${file} does not exist.` };
  }
  const result = uninstallCodexConfig(file);
  if (!hooks.removed) return result;
  return { ...result, changed: true, file, hookRemoved: true };
}

function uninstallCodexConfig(file) {
  const before = readFileSync(file, "utf8");
  const record = loadCodexRecord();
  const entry = record.files[file] ?? {};
  let text = restoreCodexTheme(before, entry);
  const themeRestored = text !== before;
  text = removeCodexStatusLine(text);
  if (entry.colors && readTuiValue(text, "status_line_use_colors") === "true") text = removeTuiKey(text, "status_line_use_colors");
  delete entry.colors;
  record.files[file] = entry;
  saveCodexRecord(record);
  if (text === before) return { changed: false, reason: "Codex's config holds nothing this plugin wrote." };
  backupFile(file, "codex-config");
  writeAtomic(file, text);
  return { changed: true, file, themeRestored };
}

/** Points another harness's status line at this plugin. */
export function installHarness(harness, { env = process.env, quietFooter: quiet, theme, pane } = {}) {
  const tooOld = unsupportedNode();
  if (tooOld) return { ok: false, reason: tooOld };
  if (harness === "copilot") {
    // The same guard as Codex. Without it the write below made the directory
    // itself, the install reported success for a harness that is not there,
    // and doctor then counted the directory as Copilot CLI found (audit #20).
    const dir = copilotHome(env);
    if (!existsSync(dir)) return { ok: false, reason: `Copilot CLI is not set up here: ${dir} does not exist. Run copilot once, then install again.` };
    const file = path.join(dir, "settings.json");
    let read;
    try {
      read = readCopilotSettings(file);
    } catch (err) {
      return { ok: false, reason: `Could not read ${file}: ${err.message}` };
    }
    const backupPath = existsSync(file) ? backupFile(file, "copilot-settings") : null;
    const command = buildCommand(resolveInterpreter(), CLI_PATH);
    read.settings.statusLine = { ...(read.settings.statusLine || {}), command, refreshInterval: COPILOT_REFRESH_INTERVAL_SECONDS };
    // Opt-in both ways: `--quiet-footer` turns the repeats off, `--no-quiet-
    // footer` puts them back, and no flag leaves the footer as it is, so a
    // plain reinstall or update never undoes either choice (Principle IV).
    let footer = "unchanged";
    if (quiet === true) {
      quietFooter(read.settings, file);
      footer = "quiet";
    } else if (quiet === false && restoreFooter(read.settings, file)) {
      footer = "restored";
    }
    writeAtomic(file, JSON.stringify(read.settings, null, 2) + "\n");
    const notes = read.hadComments ? [`${file} had comments; they are in the backup and not in the rewritten file.`] : [];
    return { ok: true, harness, file, backupPath, command, notes, refreshInterval: COPILOT_REFRESH_INTERVAL_SECONDS, footer };
  }
  if (harness === "codex") return installCodex(env, theme, pane);
  if (harness === "opencode") return installOpencode({ env, backup: (f) => backupFile(f, "opencode-tui") });
  return { ok: false, reason: `Unknown harness "${harness}". Use copilot, codex or opencode.` };
}

/** Removes this plugin from another harness's status line, and nothing else. */
export function uninstallHarness(harness, { env = process.env } = {}) {
  if (harness === "copilot") {
    const file = path.join(copilotHome(env), "settings.json");
    if (!existsSync(file)) return { changed: false, reason: `${file} does not exist.` };
    const { settings } = readCopilotSettings(file);
    if (!isOurRenderCommand(settings.statusLine?.command)) return { changed: false, reason: "Copilot's statusLine is not this plugin's." };
    backupFile(file, "copilot-settings");
    delete settings.statusLine;
    // The footer `--quiet-footer` changed goes back to what it was.
    const footerRestored = restoreFooter(settings, file);
    writeAtomic(file, JSON.stringify(settings, null, 2) + "\n");
    return { changed: true, file, footerRestored };
  }
  if (harness === "codex") return uninstallCodex(env);
  if (harness === "opencode") return uninstallOpencode({ env, backup: (f) => backupFile(f, "opencode-tui") });
  return { changed: false, reason: `Unknown harness "${harness}". Use copilot, codex or opencode.` };
}

/** Each other harness found on this machine, and whether this plugin is set up in it. */
export function harnessStatus({ env = process.env } = {}) {
  const out = [];
  const cHome = copilotHome(env);
  if (existsSync(cHome)) {
    let configured = false;
    let refreshInterval = null;
    let quietFooterOn = false;
    try {
      const { settings } = readCopilotSettings(path.join(cHome, "settings.json"));
      configured = isOurRenderCommand(settings.statusLine?.command);
      refreshInterval = Number.isInteger(settings.statusLine?.refreshInterval) ? settings.statusLine.refreshInterval : null;
      quietFooterOn = QUIET_FOOTER_KEYS.every((key) => footerOf(settings)?.[key] === false);
    } catch {
      configured = false;
    }
    out.push({ harness: "copilot", home: cHome, configured, refreshInterval, quietFooter: quietFooterOn });
  }
  const xHome = codexHome(env);
  if (existsSync(xHome)) {
    const file = path.join(xHome, "config.toml");
    const hooksPath = path.join(xHome, "hooks.json");
    // What the bar pane under Codex needs (specs/035-codex-pane).
    const pane = {
      hook: existsSync(hooksPath) && hasCodexHook(readFileSync(hooksPath, "utf8")),
      tmux: process.platform === "win32" ? null : findOnPath("tmux", env),
      latest: latestPointer(),
    };
    out.push({ harness: "codex", home: xHome, ...codexStatus(file), pane });
  }
  // OpenCode's TUI plugin (specs/038-opencode).
  const oc = opencodeStatus({ env });
  if (oc) out.push(oc);
  return out;
}
