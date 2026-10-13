#!/usr/bin/env node
// Nothing is imported statically. The modules use syntax and APIs an old
// Node cannot load, and a failed static import happens before any line here
// runs, so the version check below would never get to say why. On Node 14
// the bar used to read "statusline unavailable" after an install that had
// reported success (specs/024-install-update).
const MIN_NODE_MAJOR = 18;

// `--format runs` or `CLAUDE_STATUSLINE_OUTPUT=runs` asks for the footer as
// data and a failure as an exit code (specs/056-runs-output-contract). It is
// read here, before anything is imported, so the error object can be printed
// even when most modules cannot load. The flag wins over the variable, and
// `--format ansi` asks for the default whatever the variable says.
// Only the render command takes the flag; every other command keeps its
// arguments as they were (`codex` passes its own through to Codex).
const argv = process.argv.slice(2);
const isFormat = (a) => a === "--format" || String(a).startsWith("--format=");
const rendering = argv.length === 0 || argv[0] === "render" || isFormat(argv[0]);
const formatAt = rendering ? argv.findIndex(isFormat) : -1;
const formatValue =
  formatAt === -1
    ? null
    : argv[formatAt].includes("=")
      ? argv[formatAt].split("=")[1]
      : (argv[formatAt + 1] ?? null);
const argvRest =
  formatAt === -1
    ? argv
    : argv.filter((a, i) => i !== formatAt && !(argv[formatAt] === "--format" && i === formatAt + 1 && formatValue !== null));
const [subcommand, ...rest] = argvRest;
const isRender = subcommand === "render" || subcommand === undefined;
const runsMode = isRender && (formatValue === "runs" || (formatValue === null && process.env.CLAUDE_STATUSLINE_OUTPUT === "runs"));

// A test can lower the version the check sees, in runs mode only.
const nodeMajor =
  runsMode && process.env.CLAUDE_STATUSLINE_TEST_NODE_MAJOR
    ? Number.parseInt(process.env.CLAUDE_STATUSLINE_TEST_NODE_MAJOR, 10)
    : Number.parseInt(process.versions.node.split(".")[0], 10);
const nodeTooOld = !(nodeMajor >= MIN_NODE_MAJOR);

/** One error object on stdout and exit 75. No import: this runs when imports are what failed. */
function runsFailure(code, message) {
  const one = String(message || "statusline could not render").replace(/[\r\n]+/g, " ").trim();
  process.stdout.write(JSON.stringify({ contract: 1, error: { code, message: one } }) + "\n");
  process.exitCode = 75;
}

/**
 * The last line of defence for the statusline command itself.
 *
 * Whatever goes wrong, this prints something plausible and exits 0. A
 * non-zero exit is a reason for the harness to stop calling the command,
 * and a stack trace printed where the bar should be is worse than a bar
 * with one line on it. Anything worth investigating goes to `doctor`,
 * which a person runs on purpose.
 */
function renderFallback() {
  // A copy of `src/unavailable.js`, which cannot be imported here: this runs
  // when imports are what failed.
  const plain = process.env.CLAUDE_STATUSLINE_ASCII === "1";
  const text = ` ${plain ? "!" : "\u{F00E8}"} statusline unavailable `;
  const noColour = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "";
  if (noColour) return text;
  const cap = plain ? "\u25B8" : "\u{E0B0}";
  return `\x1b[48;2;49;50;68m\x1b[38;2;255;255;255m${text}\x1b[0m\x1b[38;2;49;50;68m${cap}\x1b[0m`;
}

/**
 * A reader that goes away mid-write is not an error worth reporting.
 *
 * Claude Code cancels the command it has in flight when a new update
 * triggers, which closes the pipe under whichever write is happening. Node's
 * default for that is an unhandled `EPIPE`: a stack trace printed where the
 * bar should be, and a non-zero exit, which is a reason for a harness to
 * stop calling the command at all. Both are worse than printing nothing,
 * and printing nothing is the correct answer when nobody is reading.
 */
function ignoreClosedOutput() {
  for (const stream of [process.stdout, process.stderr]) {
    stream.on("error", (err) => {
      if (err?.code === "EPIPE") process.exit(0);
      throw err;
    });
  }
}

/**
 * Asks the terminal for its background and remembers the answer, for the render
 * path to read later. Only here, where the command owns the terminal: a render
 * cannot ask, because the reply would arrive on Claude Code's own input.
 */
async function rememberTerminalBackground() {
  try {
    const { refreshTerminalBackground } = await import("../src/terminalBackground.js");
    await refreshTerminalBackground();
  } catch {
    // an unanswered query is an unknown background
  }
}

const UPDATE_COMMAND = `node "${process.argv[1]}" update`;

// One string for both answers: `--help` asked for it, and an unknown command
// needs it. Two copies is how the install flags went missing from one.
const INSTALL_FLAGS = "[--no-hook] [--no-refresh-interval] [--no-task-rows]";
const USAGE = [
  `Usage: node "${process.argv[1]}" <command>`,
  "",
  "  install " + INSTALL_FLAGS,
  "  install --harness copilot|codex|opencode [--quiet-footer|--no-quiet-footer] [--theme <catppuccin-*>|--no-theme] [--pane|--no-pane]",
  "  update " + INSTALL_FLAGS,
  "  updates [auto|notify|off]",
  "  check-updates",
  "  uninstall [--harness copilot|codex|opencode]",
  "  codex [codex arguments]      Codex CLI with the bar in a tmux pane under it",
  "  codex-pane [--cwd <dir>] [--rollout <file>] [--session <id>] [--pid <n>] [--once]",
  "  render [--format runs|ansi]   the bar; runs prints it as JSON for a host (see the README)",
  "  doctor [--json|--explain]",
  "  help",
].join("\n");

/** The line `install` and `update` print about updates (specs/026-update-check, FR-014). */
async function updatesSummary() {
  const { readBehaviour } = await import("../src/updateCheck.js");
  const { mode } = readBehaviour();
  const other = mode === "auto" ? "notify" : "auto";
  return `${mode} (change with: node "${process.argv[1]}" updates ${other})`;
}

/** `--harness copilot`, `--harness=codex` or `--harness opencode`, or null for Claude Code. */
function harnessFlag() {
  const i = rest.findIndex((a) => a === "--harness" || a.startsWith("--harness="));
  if (i === -1) return null;
  const value = rest[i].includes("=") ? rest[i].split("=")[1] : rest[i + 1];
  if (!["copilot", "codex", "opencode"].includes(value)) {
    console.error(`--harness takes copilot, codex or opencode, not "${value ?? ""}".`);
    process.exit(1);
  }
  return value;
}

/**
 * On, off, or undefined when neither flag is given. Undefined lets install
 * keep what an earlier install chose, which is what `update` relies on.
 */
function installFlags() {
  const pick = (name) => (rest.includes(`--no-${name}`) ? false : rest.includes(`--${name}`) ? true : undefined);
  return {
    registerHook: pick("hook"),
    refreshInterval: pick("refresh-interval"),
    taskRows: pick("task-rows"),
  };
}

const KEPT_OFF_NAMES = { hook: ["skill hook", "--hook"], refreshInterval: ["refresh interval", "--refresh-interval"], taskRows: ["task rows", "--task-rows"] };

/**
 * The footer as one JSON object of runs, or one error object and exit 75.
 * Truecolor is forced: the host has no terminal, and the contract hands over
 * the colour the palette resolved.
 */
async function runsMain() {
  process.env.COLORTERM = "truecolor";
  try {
    const { resolveSettings } = await import("../src/config.js");
    const settings = resolveSettings(process.cwd());
    if (settings.separator) process.env.CLAUDE_STATUSLINE_SEPARATOR = settings.separator;
    if (settings.skillWindowMin) process.env.CLAUDE_STATUSLINE_SKILL_WINDOW_MIN = String(settings.skillWindowMin);
    const { render } = await import("../src/render.js");
    const { runsDocument } = await import("../src/runs.js");
    if (process.env.CLAUDE_STATUSLINE_TEST_THROW === "1") throw new Error("deliberate failure, for the exit-code test");
    const out = await render({ flavor: settings.flavor, asciiArrows: settings.asciiArrows, strict: true });
    process.stdout.write(JSON.stringify(runsDocument(out)) + "\n");
  } catch (err) {
    if (err?.code === "bad-payload") runsFailure("bad-payload", err.message);
    else runsFailure("internal", "statusline could not render");
  }
}
const runRuns = runsMain;

async function main() {
  ignoreClosedOutput();
  if (nodeTooOld) {
    if (runsMode) {
      runsFailure("node-version", `statusline needs Node ${MIN_NODE_MAJOR} or newer`);
      return;
    }
    if (subcommand === "render" || subcommand === undefined) {
      process.stdout.write(` statusline needs Node ${MIN_NODE_MAJOR}+ \n`);
      return;
    }
    throw new Error(`Node ${MIN_NODE_MAJOR} or newer is required; this is Node ${process.versions.node}. Nothing was changed.`);
  }
  if (runsMode) {
    await runRuns();
    return;
  }
  switch (subcommand) {
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      break;
    case "install": {
      await rememberTerminalBackground();
      const harness = harnessFlag();
      if (harness) {
        const { installHarness } = await import("../src/install.js");
        // Copilot only (specs/033-copilot-parity): undefined leaves its own
        // footer as it is, so a plain reinstall never undoes either choice.
        const quietFooter = rest.includes("--no-quiet-footer") ? false : rest.includes("--quiet-footer") ? true : undefined;
        if (quietFooter !== undefined && harness !== "copilot") {
          console.error(`--quiet-footer is for Copilot CLI's footer; ${harness} has none to quiet.`);
          process.exit(1);
        }
        // Codex only (specs/034-codex-items): a Catppuccin name sets the
        // theme, --no-theme puts back the one it replaced, and no flag leaves
        // it alone.
        const themeAt = rest.findIndex((a) => a === "--theme" || a.startsWith("--theme="));
        let theme;
        if (rest.includes("--no-theme")) theme = false;
        else if (themeAt !== -1) theme = rest[themeAt].includes("=") ? rest[themeAt].split("=")[1] : (rest[themeAt + 1] ?? "");
        if (theme !== undefined && harness !== "codex") {
          console.error(`--theme is for Codex's own theme; ${harness} has none to set.`);
          process.exit(1);
        }
        // Codex only (specs/035-codex-pane): --pane registers the SessionStart
        // hook that tells the bar pane which session is whose, --no-pane takes
        // it out, and no flag leaves it as it is.
        const pane = rest.includes("--no-pane") ? false : rest.includes("--pane") ? true : undefined;
        if (pane !== undefined && harness !== "codex") {
          console.error(`--pane is for Codex, which cannot run the bar itself; ${harness} runs it in its own footer.`);
          process.exit(1);
        }
        const r = installHarness(harness, { quietFooter, theme, pane });
        if (!r.ok) {
          console.error(r.reason);
          process.exit(1);
        }
        console.log(`Statusline set up for ${harness}.`);
        console.log(`  Settings file: ${r.file}`);
        if (r.backupPath) console.log(`  Backup saved:  ${r.backupPath}`);
        if (r.command) console.log(`  Command:       ${r.command}`);
        if (r.refreshInterval) console.log(`  Refresh every: ${r.refreshInterval}s`);
        if (harness === "copilot") {
          const footer = {
            quiet: "the items the bar already shows are off; uninstall puts them back",
            restored: "back to what it was before --quiet-footer",
            unchanged: "Copilot's own, unchanged (--quiet-footer hides what the bar repeats)",
          }[r.footer];
          console.log(`  Footer:        ${footer}`);
        }
        if (harness === "codex") {
          const items = {
            written: "written, in the Claude bar's order",
            upgraded: "upgraded from the list an earlier version wrote",
            unchanged: "already this plugin's list",
            kept: "your own list, kept",
          }[r.items];
          const colors = {
            added: "on (status_line_use_colors, added by this plugin)",
            ours: "on (status_line_use_colors, added by this plugin)",
            "yours-on": "on (your own setting)",
            "yours-off": "off (your own setting, kept)",
          }[r.colors];
          const theme = {
            set: `${r.themeName} (--no-theme or uninstall puts yours back)`,
            restored: "back to what it was before --theme",
            kept: `${r.themeName}, set earlier by --theme (--no-theme or uninstall puts yours back)`,
            unchanged: "left as it is (--theme catppuccin-mocha sets one)",
          }[r.theme];
          console.log(`  Items:         ${items}`);
          console.log(`  Colors:        ${colors}`);
          console.log(`  Theme:         ${theme}`);
          const paneText = {
            added: `SessionStart hook added to ${r.pane?.file}`,
            updated: `SessionStart hook in ${r.pane?.file} now points at this clone`,
            present: "SessionStart hook already registered",
            kept: "SessionStart hook kept (--no-pane removes it)",
            removed: `SessionStart hook removed from ${r.pane?.file}`,
          }[r.pane?.hook];
          if (paneText) console.log(`  Pane:          ${paneText}`);
          if (r.pane?.backupPath) console.log(`  Hooks backup:  ${r.pane.backupPath}`);
          if (["added", "updated", "present", "kept"].includes(r.pane?.hook)) {
            console.log(`  Start Codex:   node "${process.argv[1]}" codex   (the bar in a tmux pane under Codex)`);
          }
        }
        if (harness === "opencode") {
          const entry = {
            added: "added to the plugin list",
            updated: "now points at this clone (it pointed at another one)",
            present: "already in the plugin list",
          }[r.entry];
          console.log(`  Plugin:        ${r.plugin}`);
          console.log(`  Entry:         ${entry}`);
        }
        for (const note of r.notes ?? []) console.log(`  Note:          ${note}`);
        console.log(`  Restart ${{ copilot: "Copilot CLI", opencode: "OpenCode" }[harness] ?? "Codex"} to see it.`);
        break;
      }
      const { install } = await import("../src/install.js");
      const result = install({
        ...installFlags(),
      });
      const version = [result.version && `v${result.version}`, result.commit, result.date && `(${result.date})`]
        .filter(Boolean)
        .join(" ");
      console.log(`Statusline installed.`);
      console.log(`  Version:       ${version || "unknown"}`);
      console.log(`  Settings file: ${result.settingsPath}`);
      console.log(`  Backup saved:  ${result.backupPath}`);
      console.log(`  Command:       ${result.command}`);
      console.log(`  Skill hook:    ${result.hookRegistered ? "registered (PostToolUse: Skill)" : "skipped"}`);
      console.log(`  Refresh every: ${result.refreshInterval ? `${result.refreshInterval}s` : "only on events"}`);
      console.log(`  Task rows:     ${result.taskRows ? "styled by this plugin" : "left to Claude Code"}`);
      if (result.keptOff?.length) {
        const pieces = result.keptOff.map((k) => KEPT_OFF_NAMES[k]);
        console.log(`  Kept off:      ${pieces.map(([name]) => name).join(", ")}, as the previous install left them.`);
        console.log(`                 To turn back on: install ${pieces.map(([, flag]) => flag).join(" ")}`);
      }
      console.log(`  Updates:       ${await updatesSummary()}`);
      if (result.needsGitBash) {
        console.log(`  Warning:       node is not on this shell's PATH, so a command had to keep a quoted`);
        console.log(`                 interpreter path. Git Bash can run it; PowerShell cannot. Install Git`);
        console.log(`                 for Windows, or put node on the PATH and run install again.`);
      }
      // This used to say "safe to run again", which read as "you are current"
      // to someone whose second `git clone` had just failed. The settings
      // being in place says nothing about whether the code is new.
      if (result.alreadyInstalled) {
        console.log(`  Settings were already in place. To get a newer version: ${UPDATE_COMMAND}`);
      }
      break;
    }
    case "update": {
      const { update, installFlagArgs } = await import("../src/update.js");
      const result = update({ flags: installFlagArgs(rest) });
      if (!result.ok) {
        console.error(result.reason);
        process.exit(result.exitCode || 1);
      }
      console.log(
        result.current
          ? `Already at the latest commit (${result.after}); settings refreshed.`
          : `Updated ${result.before} to ${result.after}.`
      );
      break;
    }
    case "updates": {
      const { readBehaviour, writeBehaviour, UPDATE_MODES } = await import("../src/updateCheck.js");
      const [mode] = rest;
      if (mode !== undefined) {
        if (!UPDATE_MODES.includes(mode)) {
          console.error(`Unknown update behaviour "${mode}". Use one of: ${UPDATE_MODES.join(", ")}.`);
          process.exit(1);
        }
        writeBehaviour(mode);
      }
      const now = readBehaviour();
      const where = {
        default: "default",
        file: `from ${(await import("node:path")).join((await import("node:os")).homedir(), ".claude", "statusline", "updates.json")}`,
        environment: "CLAUDE_STATUSLINE_UPDATES overrides the file",
      }[now.source];
      const other = now.mode === "auto" ? "notify" : "auto";
      console.log(`Updates: ${now.mode} (${where}). Change with: node "${process.argv[1]}" updates ${other}`);
      break;
    }
    case "check-updates": {
      const { checkUpdatesReport } = await import("../src/updateCheck.js");
      const report = checkUpdatesReport(undefined, { updateCommand: UPDATE_COMMAND });
      (report.ok ? console.log : console.error)(report.text);
      if (!report.ok) process.exit(1);
      break;
    }
    case "uninstall": {
      const harness = harnessFlag();
      if (harness) {
        const { uninstallHarness } = await import("../src/install.js");
        const r = uninstallHarness(harness);
        console.log(r.changed ? (r.removedFile ? `Statusline removed: ${r.file} was created by install and is gone again.` : `Statusline removed from ${r.file}.`) : r.reason);
        if (r.footerRestored) console.log(`Copilot's footer is back to what it was before --quiet-footer.`);
        if (r.themeRestored) console.log(`Codex's theme is back to what it was before --theme.`);
        if (r.hookRemoved) console.log(`SessionStart hook removed from Codex's hooks.json; other hooks were left as they were.`);
        break;
      }
      const { uninstall } = await import("../src/install.js");
      const result = uninstall();
      if (result.changed) {
        console.log(`Statusline removed from ${result.settingsPath}.`);
        if (result.hookRemoved) console.log(`Skill hook removed.`);
      } else {
        console.log(result.reason);
      }
      break;
    }
    case "doctor": {
      const { runDoctor, explainSegments } = await import("../src/doctor.js");
      // `--explain` is its own answer rather than a column on the table: the
      // table is already 122 columns wide, and a sentence per segment would
      // either wrap it or be cut to uselessness.
      if (rest.includes("--explain")) {
        process.stdout.write(explainSegments() + "\n");
        break;
      }
      if (!rest.includes("--json")) await rememberTerminalBackground();
      const out = await runDoctor({ json: rest.includes("--json") });
      process.stdout.write(out + "\n");
      break;
    }
    case "refresh": {
      const { runRefresh } = await import("../src/refresh.js");
      const [name, key] = rest;
      await runRefresh(name, key, process.cwd());
      break;
    }
    case "task-rows": {
      const { runTaskRows } = await import("../src/taskRows.js");
      const out = await runTaskRows();
      if (out) process.stdout.write(out + "\n");
      break;
    }
    case "codex-hook": {
      // Codex's SessionStart hook (specs/035-codex-pane). It prints nothing,
      // since Codex may read a hook's output, and it never fails Codex.
      const raw = await new Promise((resolve) => {
        let data = "";
        if (process.stdin.isTTY) return resolve("");
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => (data += chunk));
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", () => resolve(data));
      });
      try {
        const { runCodexHook } = await import("../src/codexSession.js");
        runCodexHook(raw);
      } catch {
        // a pointer that could not be written leaves the pane to the cwd scan
      }
      break;
    }
    case "codex-pane": {
      const { runCodexPane } = await import("../src/codexPane.js");
      process.exitCode = await runCodexPane(rest);
      break;
    }
    case "codex": {
      const { runCodexWrapper } = await import("../src/codexLaunch.js");
      process.exitCode = runCodexWrapper(rest, { cliPath: process.argv[1] });
      break;
    }
    case "note-skill": {
      const { runNoteSkill } = await import("../src/skillEvents.js");
      await runNoteSkill();
      break;
    }
    case "render":
    case undefined: {
      // Environment first, then the repository's own file, then the
      // default. A monorepo and a scratch repository do not want the same
      // bar, and neither wants to export a variable to say so.
      const { resolveSettings } = await import("../src/config.js");
      const settings = resolveSettings(process.cwd());
      const { flavor, asciiArrows } = settings;
      if (settings.separator) process.env.CLAUDE_STATUSLINE_SEPARATOR = settings.separator;
      if (settings.skillWindowMin) {
        process.env.CLAUDE_STATUSLINE_SKILL_WINDOW_MIN = String(settings.skillWindowMin);
      }
      let out;
      try {
        if (process.env.CLAUDE_STATUSLINE_TEST_THROW === "1") {
          throw new Error("deliberate failure, for the exit-code test");
        }
        const { render } = await import("../src/render.js");
        out = await render({ flavor, asciiArrows });
      } catch {
        out = renderFallback();
      }
      process.stdout.write(out + "\n");
      break;
    }
    default:
      console.error(`Unknown command: ${subcommand}`);
      console.error(USAGE);
      process.exit(1);
  }
}

main().catch((err) => {
  // Only the non-render subcommands reach this: a person typed them and is
  // waiting for an answer, so a failure belongs on stderr with an exit
  // code. `render` handles its own failure above and never gets here.
  if (runsMode) {
    runsFailure("internal", "statusline could not render");
    return;
  }
  if (subcommand === "render" || subcommand === undefined) {
    process.stdout.write(renderFallback() + "\n");
    process.exit(0);
  }
  console.error(err.message || String(err));
  process.exit(1);
});
