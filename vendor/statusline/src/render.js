import path from "node:path";
import os from "node:os";
import { realpathSync } from "node:fs";
import { PALETTES, renderRow, displayWidth, separatorStyle, colourEnabled, bgSeq, STRONG, QUIET, MARK_OFF, GOOD, WARM, BEHIND } from "./theme.js";
import {
  getDirLabel,
  getDirUrl,
  getGitInfo,
  isRepository,
  getPrInfo,
  getPrLookupFailed,
  getRemoteUrl,
  getCiStatus,
  normalizePr,
  repoUrlFromPayload,
} from "./git.js";
import {
  getActiveSkills,
  getActiveSkillsTrueCount,
  getSessionActivity,
  sddStepFor,
  inProgressFeatureId,
  subagentActivity,
} from "./skills.js";
import {
  getContextPercent,
  getRateLimits,
  formatResetCountdown,
  shortCountdown,
  getContextTokens,
  getSessionCost,
  formatDuration,
  abbreviate,
  MAX_PLAUSIBLE_SPEND_PERIOD_MS,
  getPromptCache,
  cacheMinutesLeft,
} from "./tokens.js";
import { getRtkSavings } from "./rtk.js";
import { maybeStartUpdateCheck, getUpdateNotice } from "./updateCheck.js";
import { detectHarness } from "./harness.js";
import { copilotSessionActivity, AGENT_ROW_CAP } from "./copilotEvents.js";
import { readGateRuns, GATE_ROW_CAP } from "./gateRuns.js";
import { gateRows, gateChip } from "./gateRows.js";

/**
 * Under Copilot CLI, the transcript probes read its session's `events.jsonl`
 * instead of a Claude transcript, and return the same shapes, so nothing
 * downstream changes (specs/029-multi-harness). Its reader also returns the
 * running subagents, which the bar prints as rows after its lines
 * (specs/030-copilot-agent-rows); `subagentActivity`, the Claude Code roster,
 * has nothing to say here.
 */
/** The rollout's windows that have no chip of their own, as the payload carries them. */
function codexWindowsOf(payload) {
  const list = payload?.rate_limits?.other_windows;
  if (!Array.isArray(list)) return null;
  const ok = list.filter(
    (w) =>
      w &&
      typeof w.label === "string" &&
      Number.isInteger(w.window_minutes) &&
      w.window_minutes > 0 &&
      typeof w.used_percentage === "number" &&
      Number.isFinite(w.used_percentage)
  );
  return ok.length ? ok : null;
}

/** The rollout's credit balance, as text, or null. */
function codexCreditsOf(payload) {
  const balance = payload?.rate_limits?.credits?.balance;
  return typeof balance === "string" && balance.length ? { balance } : null;
}

export function harnessProbes(probe, harness, payload = null) {
  // OpenCode keeps no transcript either. Its plugin puts the working state and
  // the todo list in the payload it builds (specs/038-opencode).
  if (harness === "opencode") {
    return {
      ...probe,
      getSessionActivity: () => payload?.opencode?.activity ?? null,
      getActiveSkills: (_path, _limit, { scanned } = {}) => scanned ?? [],
      getActiveSkillsTrueCount: (_path, { scannedTrueCount } = {}) => scannedTrueCount ?? 0,
      subagentActivity: () => [],
    };
  }
  // Codex writes no Claude transcript and no skill events, and its subagents
  // are not Claude Code's (specs/035-codex-pane). The working state comes from
  // the rollout, which the pane passes in as its own getSessionActivity.
  if (harness === "codex") {
    return {
      ...probe,
      getActiveSkills: (_path, _limit, { scanned } = {}) => scanned ?? [],
      getActiveSkillsTrueCount: (_path, { scannedTrueCount } = {}) => scannedTrueCount ?? 0,
      subagentActivity: () => [],
    };
  }
  if (harness !== "copilot") return probe;
  return {
    ...probe,
    // A Copilot payload always names its session directory. One that does not
    // has no log to read, so the probe it came with answers instead; that is
    // what lets a fixture with Copilot's fields keep its own session.
    getSessionActivity: (sessionDir, opts) =>
      sessionDir ? copilotSessionActivity(sessionDir, opts) : probe.getSessionActivity(sessionDir, opts),
    getActiveSkills: (_path, _limit, { scanned } = {}) => scanned ?? [],
    getActiveSkillsTrueCount: (_path, { scannedTrueCount } = {}) => scannedTrueCount ?? 0,
    subagentActivity: () => [],
  };
}
import { elapsed, harnessAgentRows } from "./taskRows.js";
import { getOpenTabUrl, pathToFileUrl } from "./openTerminalTab.js";
import { resetMomentLabel } from "./timeIcons.js";
import { trackChanges, loadSamples } from "./changeTracker.js";
import { reading, missing, isRenderable } from "./freshness.js";
import { byLine, segment, inChannel, SEGMENTS } from "./segments.js";
import { resolveArrangement } from "./arrangement.js";
import { resolveLayout, iconTier, repoConfig } from "./config.js";
import { abbreviateBranch, cutMiddle, DEFAULT_BRANCH_PREFIXES, BRANCH_COLUMNS } from "./names.js";
import { gaugeChip, bandFor, track, paceBand, contextBand } from "./ramp.js";
import { ROLE } from "./colourRoles.js";
import { plainText } from "./text.js";
import { ratePerHour, projectFull, pushSample, sparkline } from "./samples.js";
import { fitToWidth, alignColumns, linesToRender, rowWidth, terminalWidth, terminalHeight, terminalFor, readTtySize } from "./layout.js";
import { loadCopilotSettings } from "./copilotSettings.js";
import { getCopilotQuota, formatQuotaDate } from "./copilotQuota.js";

// Nerd Font glyphs, written as escapes rather than literal private-use
// characters: pasted literals silently vanished from this file once
// already, leaving empty strings that rendered as a bare gap. Every
// codepoint here was checked against the installed FiraCode Nerd Font's
// cmap table and then rendered from that font and looked at, because a
// codepoint's name is not evidence of its glyph (Principle X). The proof
// sheet is docs/glyph-evidence.png.
//
// Octicons wherever the segment shows git or GitHub state, so the line
// reads in the vocabulary its audience already knows; Material Design and
// Devicon elsewhere.
const NF_BRANCH = "\u{F418}";    // nf-oct-git_branch (GitHub's branch icon)
const NF_PR = "\u{F407}";        // nf-oct-git_pull_request

// A blank calendar grid, deliberately NOT the 📆 emoji: every emoji font
// draws a fixed date on that glyph (Apple renders "17"), so beside a real
// expiry day it reads as a date that never changes and contradicts the
// text next to it. Unicode has no per-date emoji, so the day is text.
const NF_CALENDAR = "\u{F0A33}";  // a calendar with a week bar: the 7-day window (specs/047)

// GitHub's own diff and sync markers, so the working-tree state reads in
// the vocabulary anyone who uses GitHub already knows. Each glyph was
// rendered and inspected before being adopted: codepoint names in Nerd
// Font tables proved unreliable (F433 "repo_push" draws a down arrow,
// F45D "arrow_up" draws a signpost), so the name is not evidence.
const NF_MODIFIED = "\u{F459}";  // boxed dot, GitHub's "modified" marker
const NF_ADDED = "\u{F457}";     // boxed plus, GitHub's "added" marker
const NF_PUSH = "\u{F431}";      // nf-oct-arrow_up: commits waiting to be pushed (v8.1.0)
const NF_PULL = "\u{F433}";      // nf-oct-arrow_down: commits waiting to be pulled

// A commit, for a detached HEAD. The branch icon would claim the line is
// showing a branch when it is showing a commit id.
const NF_COMMIT = "\u{F417}";    // nf-oct-git_commit

// The rest of line 1's git and GitHub state, in the same Octicon set.
const NF_DIR = "\u{F4D4}";       // nf-oct-file_directory_open_fill: the working directory
const NF_HOME = "\u{F02DC}";     // nf-md-home: the working directory when it is $HOME
const NF_REPO = "\u{F401}";      // nf-oct-repo: the repository
const NF_WORKTREE = "\u{E5FB}";  // nf-custom-folder_git_branch: a linked worktree
const NF_REMOVED = "\u{F458}";   // nf-oct-diff_removed: boxed minus
const NF_RESET = "\u{F04E6}";    // two circular arrows: the window comes back
const NF_PR_DRAFT = "\u{F4DD}";  // nf-oct-git_pull_request_draft
const NF_PR_MERGED = "\u{F419}"; // nf-oct-git_merge
const NF_PR_CLOSED = "\u{F4DC}"; // nf-oct-git_pull_request_closed
const NF_REVIEW_APPROVED = "\u{F4A4}"; // nf-oct-check_circle_fill
const NF_REVIEW_COMMENTS = "\u{F442}"; // nf-oct-comment_discussion
const NF_REVIEW_REQUESTED = "\u{F441}"; // nf-oct-eye
const NF_EFFORT_LOW = "\u{F0875}";    // nf-md-gauge_low
const NF_EFFORT_MEDIUM = "\u{F029A}"; // nf-md-gauge
const NF_EFFORT_HIGH = "\u{F0874}";   // nf-md-gauge_full
const NF_FROM = "\u{F004D}";     // nf-md-arrow_left: what this came from
const NF_ALERT = "\u{F40C}";     // nf-oct-alert_fill: unmerged paths
const NF_CHECK = "\u{F4A4}";     // nf-oct-check_circle_fill: the run passed
const NF_CI_SKIPPED = "\u{F517}"; // nf-oct-skip: a skipped or cancelled run
const NF_X = "\u{F530}";         // nf-oct-x_circle_fill: the run failed
// F0997 was here until 2026-10-06, under the name progress_clock, and it
// draws md-progress_download: a CI run still going read as a download
// (specs/031-git-gate-rows/glyph-evidence.png shows both side by side).
const NF_RUNNING = "\u{F0996}";  // nf-md-progress_clock: still going

// Lines 2, 3 and 4. These carried emoji until 2026-09-01, and emoji cost
// two columns each where a private-use glyph costs one: eight of them were
// spending eight columns of a bar whose segments already compete for the
// width COLUMNS reports (Principle I, Glyphs).
const NF_TASKLIST = "\u{F0756}";  // nf-md-format_list_checks (was nf-oct-tasklist). F0BE, listed as
                                 // "checklist", draws the App Store logo
// A hammer and a coffee cup, chosen by the owner on 2026-09-06 from a sheet
// of twelve candidate pairs rendered from the installed font. What they
// replace is nf-md-circle against nf-md-circle_outline, which works only
// after a reader has been told what it means: a filled disc and a hollow one
// say nothing about work. These do, at a glance and without instruction, and
// their silhouettes stay apart at the one column they get.
const NF_WORKING = "\u{F08EA}";  // nf-md-hammer
const NF_IDLE = "\u{F0176}";     // nf-md-coffee
const NF_SKILLS = "\u{F0431}";   // nf-md-puzzle
const NF_MODEL = "\u{F167A}";    // nf-md-robot_outline (was nf-md-robot)
const NF_EFFORT = NF_EFFORT_HIGH;
const NF_CONTEXT = "\u{F09D1}";  // nf-md-brain: the context window (guide section 5.3)
                                 // F09DA, listed as "brain", draws a boxed
                                 // chevron in this build
const NF_TIMER = "\u{F051F}";    // an hourglass: a window that runs out, time remaining. F44E, listed as "stopwatch",
                                 // draws three flat bars in this build
const NF_STOPWATCH = "\u{F520}"; // a stopwatch: session duration, time elapsed
const NF_BURN = "\u{F0238}";     // nf-md-fire: how fast the window is going
const NF_RUST = "\u{F1679}";     // a piggy bank, which is what rtk keeps: savings
// The spend limit. Rendered from the installed font before adoption
// (specs/023-extra-usage-limit/glyph-evidence.png): F0114 nf-md-cash draws a
// banknote, which reads as currency rather than a budget being spent, and
// F00F6, listed in one cheat sheet as a cart, draws a calendar.
const NF_WALLET = "\u{F0584}";  // nf-md-wallet
// The prompt cache, one icon per state so the icon itself says which
// (Principle X). Rendered before adoption (specs/025-prompt-cache-chip/
// glyph-evidence.png): F09A2, listed as a database refresh, draws a speaker
// with a Bluetooth mark, and F06B0 draws a clock with an arrow.
const NF_HOURGLASS_FULL = "\u{F078C}";  // a warm cache with most of its life left
const NF_HOURGLASS_HALF = "\u{F051F}";  // about half of it
const NF_HOURGLASS_EMPTY = "\u{F06AD}"; // the last third
const NF_SNOWFLAKE = "\u{F0717}";   // nf-md-snowflake: cold
// The statusline's own updates, one icon per direction (specs/026-update-
// check/glyph-evidence.png). F0CE0, listed as an up arrow in a circle, points
// right; F4A9, listed as a rocket, draws a monitor; F06B1 draws a watch.
const NF_DOWNLOAD = "\u{F0394}";      // nf-md-new_box: an update is waiting
const NF_UPDATED = "\u{F12CC}";       // a cloud with a tick: updated this session
// Two modes the payload reports (specs/027-bar-polish/glyph-evidence.png).
const NF_VIM = "\u{E62B}";           // nf-custom-vim: the vim mode
const NF_SPEEDOMETER = "\u{F140B}";  // a lightning bolt: fast mode
// Copilot CLI's two figures (specs/029-multi-harness/glyph-evidence.png).
// F0565, listed as a ticket, draws a shield with a tick.
const NF_COPILOT = "\u{F4B8}";       // nf-oct-copilot: premium requests
const NF_SHIELD_OFF = "\u{F099E}";   // nf-md-shield_off: allow all
// The git gates running in this repository (specs/031-git-gate-rows/
// glyph-evidence.png). A clock reads as "still going"; a lock with a clock as
// "waiting on a lock". F0299 md-gate draws a fence and F0E86 md-boom_gate a
// crane at one cell. A gate still running and a CI run still going are the
// same fact, so they share the clock.
const NF_GATE_RUNNING = "\u{F52E}";  // nf-oct-workflow: a gate is running (guide section 5.3)
const NF_GATE_WAITING = "\u{F097F}"; // nf-md-lock_clock

/**
 * The whole glyph set, and the substitute used when the terminal has no
 * Nerd Font. Every glyph the bar can emit is a row here, per Principle X:
 * one written inline in a render function is one `CLAUDE_STATUSLINE_ASCII=1`
 * cannot replace, and a fallback that swaps some icons and not others
 * leaves boxes on the line while claiming to have removed them.
 *
 * The substitutes are plain Unicode and emoji, which need no special font.
 * They are wider than what they stand in for, and that is the trade: a
 * terminal without the font gets a readable bar rather than a narrow one.
 *
 * Every codepoint in the `nerd` column must also be listed in
 * `scripts/extract-glyphs.py`, or it renders in the terminal and vanishes
 * from the generated previews.
 */
export const GLYPHS = {
  nerd: {
    branch: NF_BRANCH,
    commit: NF_COMMIT,
    pr: NF_PR,
    calendar: NF_CALENDAR,
    modified: NF_MODIFIED,
    added: NF_ADDED,
    push: NF_PUSH,
    pull: NF_PULL,
    dir: NF_DIR,
    home: NF_HOME,
    repo: NF_REPO,
    worktree: NF_WORKTREE,
    removed: NF_REMOVED,
    untracked: "?",
    reset: NF_RESET,
    trackEmptyStart: "\u{EE00}",
    trackEmptyMid: "\u{EE01}",
    trackEmptyEnd: "\u{EE02}",
    trackFullStart: "\u{EE03}",
    trackFullMid: "\u{EE04}",
    trackFullEnd: "\u{EE05}",
    bandCritical: "\u{F40C}",
    bandWarn: "",
    prDraft: NF_PR_DRAFT,
    prMerged: NF_PR_MERGED,
    prClosed: NF_PR_CLOSED,
    reviewApproved: NF_REVIEW_APPROVED,
    reviewComments: NF_REVIEW_COMMENTS,
    reviewRequested: NF_REVIEW_REQUESTED,
    effortLow: NF_EFFORT_LOW,
    effortMedium: NF_EFFORT_MEDIUM,
    effortHigh: NF_EFFORT_HIGH,
    from: NF_FROM,
    conflict: NF_ALERT,
    ciPass: NF_CHECK,
    ciFail: NF_X,
    ciSkipped: NF_CI_SKIPPED,
    ciRunning: NF_RUNNING,
    todo: NF_TASKLIST,
    working: NF_WORKING,
    workingFrame0: "\u{EE06}", // the spinner, one frame a redraw (specs/048)
    workingFrame1: "\u{EE07}",
    workingFrame2: "\u{EE09}",
    workingFrame3: "\u{EE0A}",
    idle: NF_IDLE,
    sleeping: "\u{F04B2}",
    yourTurn: "\u{F476}",
    clean: "\u{F4A4}",
    unavailable: "\u{F00E8}",
    skills: NF_SKILLS,
    model: NF_MODEL,
    effort: NF_EFFORT,
    context: NF_CONTEXT,
    timer: NF_TIMER,
    duration: NF_STOPWATCH,
    burn: NF_BURN,
    rtk: NF_RUST,
    spend: NF_WALLET,
    cacheWarm: NF_HOURGLASS_FULL,
    cacheWarmHalf: NF_HOURGLASS_HALF,
    cacheWarmLow: NF_HOURGLASS_EMPTY,
    cacheCold: NF_SNOWFLAKE,
    updateReady: NF_DOWNLOAD,
    updateBlocked: "\u{F01DA}",   // nf-md-download: the update cannot go in
    updateDone: NF_UPDATED,
    vim: NF_VIM,
    fast: NF_SPEEDOMETER,
    premium: NF_COPILOT,
    allowAll: NF_SHIELD_OFF,
    gateRunning: NF_GATE_RUNNING,
    gateWaiting: NF_GATE_WAITING,
  },
  /**
   * The emoji tier, for a terminal that draws pictures and has no Nerd Font.
   *
   * Every entry is one codepoint with `Emoji_Presentation=Yes`, so Unicode
   * draws it as a picture, two columns wide, without a variation selector.
   * The look-alikes that draw as text on some terminals (a lightning bolt, a
   * hot beverage, a warning sign, a keyboard) are not here, and a test reads
   * the committed Unicode data to keep it that way (specs/043-emoji-tier).
   */
  emoji: {
    branch: "\u{1F33F}",         // 🌿
    commit: "\u{1F4CD}",         // 📍
    pr: "\u{1F500}",             // 🔀
    calendar: "\u{1F4CA}",       // 📊 the 7-day window; calendars are text-presentation
    modified: "\u{1F4DD}",       // 📝
    added: "\u2795",             // ➕
    push: "\u{1F53C}",           // 🔼
    pull: "\u{1F53D}",           // 🔽
    dir: "\u{1F4C2}",            // 📂
    home: "\u{1F3E0}",           // 🏠
    repo: "\u{1F4E6}",           // 📦
    worktree: "\u{1F333}",       // 🌳
    removed: "\u2796",           // ➖
    untracked: "\u2754",         // ❔
    reset: "\u{1F504}",          // 🔄
    trackEmptyStart: "\u2B1C",    // ⬜ the track is drawn from the plain set in this tier
    trackEmptyMid: "\u2B1C",
    trackEmptyEnd: "\u2B1C",
    trackFullStart: "\u{1F7E9}",  // 🟩
    trackFullMid: "\u{1F7E9}",
    trackFullEnd: "\u{1F7E9}",
    bandCritical: "\u{1F534}",    // 🔴
    bandWarn: "\u{1F7E1}",        // 🟡
    prDraft: "\u{1F6A7}",        // 🚧
    prMerged: "\u{1F7E3}",       // 🟣
    prClosed: "\u{1F6AB}",       // 🚫
    reviewApproved: "\u2705",    // ✅
    reviewComments: "\u{1F4AC}", // 💬
    reviewRequested: "\u{1F440}", // 👀
    effortLow: "\u{1F3AF}",      // 🎯
    effortMedium: "\u{1F3AF}",
    effortHigh: "\u{1F3AF}",
    from: "\u{1F519}",           // 🔙
    conflict: "\u{1F4A5}",       // 💥
    ciPass: "\u2705",            // ✅
    ciFail: "\u274C",            // ❌
    ciSkipped: "\u23E9",         // ⏩
    ciRunning: "\u{1F504}",      // 🔄
    todo: "\u{1F4CB}",           // 📋
    working: "\u{1F528}",        // 🔨
    workingFrame0: "\u{1F528}",  // the emoji tier does not animate
    workingFrame1: "\u{1F528}",
    workingFrame2: "\u{1F528}",
    workingFrame3: "\u{1F528}",
    idle: "\u{1F4A4}",           // 💤
    sleeping: "\u{1F4A4}",
    yourTurn: "\u{1F514}",       // 🔔
    clean: "\u2705",             // ✅
    unavailable: "\u{1F6AB}",    // 🚫
    skills: "\u{1F9E9}",         // 🧩
    model: "\u{1F916}",          // 🤖
    effort: "\u{1F3AF}",         // 🎯
    context: "\u{1F9E0}",        // 🧠
    timer: "\u23F3",             // ⏳ the 5-hour window, time that runs out
    duration: "\u{1F550}",       // 🕐 time elapsed
    burn: "\u{1F525}",           // 🔥
    rtk: "\u{1FA99}",            // 🪙 savings
    spend: "\u{1F4B0}",          // 💰
    cacheWarm: "\u23F3",         // ⏳
    cacheWarmHalf: "\u23F3",
    cacheWarmLow: "\u231B",      // ⌛
    cacheCold: "\u{1F9CA}",      // 🧊
    updateReady: "\u{1F195}",     // 🆕
    updateBlocked: "\u23EC",      // ⏬
    updateDone: "\u{1F680}",      // 🚀
    vim: "\u{1F524}",            // 🔤
    fast: "\u{1F407}",           // 🐇
    premium: "\u{1F48E}",        // 💎
    allowAll: "\u{1F513}",       // 🔓
    gateRunning: "\u{1F6A6}",    // 🚦
    gateWaiting: "\u{1F512}",    // 🔒
  },
  /**
   * The set for a terminal with no Nerd Font.
   *
   * Every one of these was an emoji until 2026-09-12, which was wrong twice
   * over. An emoji is two columns wide where the glyph it stands in for is
   * one, so the substitute set drew a different bar from the real one rather
   * than the same bar in plainer clothes. And the bar had already had its
   * emoji taken off it at the owner's request; this table was simply missed.
   *
   * Nerd Font glyphs are not the answer here, tempting as it is: this table
   * exists precisely because the font is absent, so filling it with private
   * use area codepoints would leave the same empty boxes it is meant to
   * avoid. These are Geometric Shapes, Arrows and Miscellaneous Technical —
   * present in ordinary system fonts, and one column wide.
   *
   * Every codepoint below is East Asian Narrow by the Unicode table itself,
   * so a terminal configured for East Asian text draws the same widths as one
   * that is not. Checking them with `displayWidth` was not enough: it only
   * knows the Ambiguous characters someone listed, and five of these passed
   * while being Ambiguous until 2026-10-06 (specs/032-audit-fixes, whose
   * plain-glyph-evidence.png shows each replacement rendered). `U+25CB` (the
   * obvious hollow circle for idle) is Ambiguous and was rejected for that
   * reason in favour of the dotted `U+25CC`, which also reads better: a
   * broken outline for an agent that is not doing anything.
   */
  plain: {
    branch: "\u2387",     // ⎇ the conventional plain-text branch mark
    // `U+25C6` until 2026-09-12: it is East Asian Ambiguous, so this set
    // measured a different width under `CLAUDE_STATUSLINE_AMBIGUOUS_WIDE` than
    // without it. Every glyph here is Narrow, so the substitute bar is one
    // width on every terminal.
    commit: "\u25AA",     // ▪
    pr: "\u21C4",         // ⇄ two directions, which is what a pull request is
    calendar: "\u25F0",   // ◰ a page with one cell marked. Was ▤, Ambiguous
    modified: "\u25C9",   // ◉
    added: "+",
    // The plain arrows were `U+2191`/`U+2193`/`U+2190`, all three East Asian
    // Ambiguous. The doubled forms are Narrow and read the same.
    push: "\u21D1",        // ⇑
    pull: "\u21D3",        // ⇓
    dir: "\u2302",       // ⌂
    home: "\u2302",      // ⌂
    repo: "\u22A1",      // ⊡ a boxed dot
    worktree: "\u2387",  // ⎇ the branch sign, as for a branch
    removed: "-",
    untracked: "?",
    reset: "\u21BB",     // ↻
    trackEmptyStart: ".",
    trackEmptyMid: ".",
    trackEmptyEnd: ".",
    trackFullStart: "|",
    trackFullMid: "|",
    trackFullEnd: "|",
    bandCritical: "!",
    bandWarn: "",
    prDraft: "\u21C4",   // ⇄ every state of a pull request is the exchange arrows
    prMerged: "\u21C4",
    prClosed: "\u21C4",
    reviewApproved: "\u2713", // ✓
    reviewComments: "\u2709", // ✉
    reviewRequested: "\u229B", // ⊛
    effortLow: "\u21AF", // ↯ the plain set has one effort mark for every level
    effortMedium: "\u21AF",
    effortHigh: "\u21AF",
    from: "\u21D0",        // ⇐
    conflict: "\u2716",   // ✖
    ciPass: "\u2713",     // ✓
    ciFail: "\u2717",     // ✗
    ciSkipped: "-",        // a skipped or cancelled run
    ciRunning: "\u229A",  // ⊚
    todo: "\u25B8",       // ▸
    // Filled against broken: the same distinction the Nerd set draws with a
    // hammer and a coffee cup, and the one CircleCI's own columnar glyph set
    // makes with a filled and a hollow circle.
    working: "\u29BF",    // ⦿ was ◎, Ambiguous
    workingFrame0: "|",   // the plain spinner, ASCII, one column
    workingFrame1: "/",
    workingFrame2: "-",
    workingFrame3: "\\",
    idle: "\u25CC",       // ◌
    sleeping: "\u25CC",
    yourTurn: "!",
    clean: "\u2713",     // ✓
    unavailable: "!",
    skills: "\u2756",     // ❖ was ◈, Ambiguous
    model: "\u25CA",      // ◊ was ◇, Ambiguous
    effort: "\u21AF",     // ↯
    context: "\u229E",    // ⊞ a grid, as ▦ was before it; that one is Ambiguous
    timer: "\u25F7",      // ◷
    duration: "\u25D4",   // ◔
    // Not `U+25B4`: that is the gauge's own critical band mark, and one glyph
    // cannot mean both "this is the burn rate" and "this level is critical".
    burn: "\u21E1",       // ⇡
    rtk: "\u25BE",        // ▾ a reduction, which is what a saving is
    // ASCII, East Asian Narrow, in every font, and used nowhere else on the bar.
    spend: "$",
    // Both East Asian Narrow. `U+2744` has an emoji form, but its default
    // presentation is text and the bar never sends the selector that asks
    // for the other one.
    cacheWarm: "\u29D7",  // ⧗ an hourglass: still reusable
    cacheWarmHalf: "\u29D7",
    cacheWarmLow: "\u29D7",
    cacheCold: "\u2744",  // ❄
    // Both East Asian Narrow, and not the doubled arrows push and pull use.
    updateReady: "\u2913", // ⤓
    updateBlocked: "\u21E9", // ⇩
    updateDone: "\u2912",  // ⤒
    vim: "\u2328",        // ⌨
    fast: "\u21F6",       // ⇶ three arrows
    premium: "\u2726",    // ✦
    allowAll: "\u2298",   // ⊘
    gateRunning: "\u27F3", // ⟳
    gateWaiting: "\u29D6", // ⧖
  },
};

async function readStdinAsync() {
  return new Promise((resolve) => {
    let data = "";
    if (process.stdin.isTTY) {
      resolve("");
      return;
    }
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

export async function render({ asciiArrows = false, flavor = "mocha", strict = false } = {}) {
  const raw = await readStdinAsync();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
    // A host that asked for the data contract is told, where the bar a person
    // reads draws what it can (specs/056-runs-output-contract, decision 7).
    if (strict) throw Object.assign(new Error("the status payload is not a JSON object"), { code: "bad-payload" });
  }
  if (strict && (!raw.trim() || payload === null || typeof payload !== "object" || Array.isArray(payload))) {
    throw Object.assign(new Error("the status payload is not a JSON object"), { code: "bad-payload" });
  }

  if (process.env.CLAUDE_STATUSLINE_DEBUG === "1") {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const os = await import("node:os");
      const dir = path.join(os.homedir(), ".claude", "statusline");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "debug-last-payload.json"), raw || "{}");
    } catch {
      // debug-only, never let this affect the real render
    }
  }

  return renderPayload(payload, { asciiArrows, flavor });
}

/**
 * Reads every source once and returns a reading per segment.
 *
 * Separated from rendering so that "what did the sources say, how old is
 * it, and how long did it take" is answerable without producing a line.
 * The diagnostic reports exactly this, which is what stops it describing
 * behaviour the renderer does not have.
 */
/**
 * How many skills the line shows, and how many it looks for.
 *
 * It asks for more than it shows so it can say how many were left out. A
 * line that shows three of five without saying so claims those three are
 * all of them (FR-013).
 */
const SKILLS_SHOWN = 5;
const SKILLS_PROBED = 12;

function skillsReading(timed, probe, payload, scanned, scannedTrueCount) {
  // The session id lets the hook's event file be found. Without one, or
  // without the hook, the transcript answers instead and the line is the
  // same, only slower to react. `scanned` is what the activity pass already
  // found on that same walk, so the fallback costs no second read.
  const all = timed("transcript", () =>
    probe.getActiveSkills(payload?.transcript_path, SKILLS_PROBED, {
      sessionId: payload?.session_id,
      scanned,
    })
  );
  const directlyInvoked = Array.isArray(all.value) ? all.value : [];

  // Running subagents used to be folded into this list (specs/011), because
  // line 2 had nowhere else to say one was running. They have their own chip
  // now, and naming them twice on the same line reads as two facts when it is
  // one. This chip is the skills again, and only the skills.
  const list = directlyInvoked;
  // Not `list.length`: the directly-invoked half is itself already capped at
  // SKILLS_PROBED, so computing "hidden" from its length only ever reported
  // what the scan happened to examine, not what was actually active (FR-002,
  // specs/008-skills-line-completeness).
  const trueCount = probe.getActiveSkillsTrueCount(payload?.transcript_path, {
    sessionId: payload?.session_id,
    scanned,
    scannedTrueCount,
  });
  return {
    ...all,
    value: list.slice(0, SKILLS_SHOWN),
    hiddenCount: Math.max(0, trueCount - SKILLS_SHOWN),
  };
}

export function gather(payload, probe, { now = Date.now(), off = null, copilotSettings = null } = {}) {
  const timed = (source, fn) => {
    const started = Date.now();
    try {
      const value = fn();
      return reading({ value: value ?? null, at: now, source, tookMs: Date.now() - started });
    } catch (err) {
      return missing(source, err?.message || String(err), Date.now() - started);
    }
  };

  const cwd = payload?.workspace?.current_dir || payload?.cwd || process.cwd();
  const { fiveHourPct, fiveHourResetsAt, sevenDayPct, sevenDayResetsAt, spendLimitPct, spendLimitResetsAt } =
    getRateLimits(payload);
  const ctxPct = getContextPercent(payload);
  // RTK is needed both for its segment and for the sample history, so read it
  // once and reuse the timed reading.
  const rtkReading = timed("rtk", () => probe.getRtkSavings(cwd));
  const sampleHistory = pushSample(loadSamples(payload?.session_id), {
    at: now,
    contextPct: payload?.context_window?.used_percentage ?? ctxPct,
    fiveHourPct: payload?.rate_limits?.five_hour?.used_percentage ?? fiveHourPct,
    rtkPct: rtkReading.value,
  });

  // The statusline's own update check (specs/026-update-check). Starting it
  // is two cache reads and, once a day, a detached process; reading its
  // result is one more read. Neither can fail the redraw.
  try {
    probe.maybeStartUpdateCheck?.({ now });
  } catch {
    // a check that cannot start is tried again on the next redraw
  }
  const updateReading = timed("update", () => probe.getUpdateNotice?.(payload?.session_id ?? null, { now }) ?? null);

  const git = timed("git", () => probe.getGitInfo(cwd));
  // Two questions, kept apart. Line 1's own git segments need the snapshot,
  // so they follow `git.value`. Whether this is a repository at all is asked
  // of the file system: `git status` has a 150 ms budget and a 5 s cached
  // fallback, and the load a running gate puts on the machine is exactly what
  // pushes it past both. Deciding "not a repository" from that null switched
  // the gate rows, the pull request and CI off on every idle redraw while the
  // hook was still running. The walk is a few stat calls, and only runs when
  // git had no answer.
  const hasRepo = git.value !== null || (probe.isRepo ?? isRepository)(cwd) === true;
  const hasSnapshot = git.value !== null;
  // A detached HEAD has no branch name to scope a lookup by, and the short
  // commit id is not one: matching it against a stored branch would refuse
  // every cached answer instead of the wrong ones.
  const namedBranch = git.value && !git.value.detached ? git.value.branch : null;

  // One walk over the transcript answers the skills, the todo list and
  // whether anything happened recently. It runs before the skills reading so
  // that reading can use what it found rather than walking the file again.
  const activity = timed("transcript", () =>
    probe.getSessionActivity(payload?.transcript_path, { now, limit: SKILLS_PROBED })
  );
  // Whether anything is running under this session, which is the only thing
  // line 2 asks about subagents now: a running one means "working" even when
  // the top-level transcript has gone quiet (specs/012). Scoped by session id,
  // so a second Claude Code window on another project cannot answer for this
  // one.
  const sessionId = payload?.session_id ?? null;
  const subagent = probe.subagentActivity(now, sessionId);
  // The top-level transcript going quiet doesn't mean nothing is
  // happening: a subagent can be doing the actual work right now (specs/012-
  // subagent-activity-status, FR-001). A running subagent alone is enough
  // to say "working"; with none, this is a no-op and `working` is exactly
  // what the transcript already said (FR-005).
  if (activity.value) {
    activity.value.working = activity.value.working || subagent.length > 0;
  }
  const payloadPr = normalizePr(payload?.pr, "payload");
  // Cleaned once, here, so the text on line 1 and the link built from it are
  // the same identity. Raw, an object owner drew `[object Object]` and a
  // newline in a name added lines to the bar.
  const rawRepo = payload?.workspace?.repo;
  const repoOwner = payloadText(rawRepo?.owner);
  const repoName = payloadText(rawRepo?.name);
  const repoId = repoOwner && repoName ? { host: payloadText(rawRepo?.host), owner: repoOwner, name: repoName } : null;
  const payloadRepoUrl = repoUrlFromPayload(repoId);

  // What Copilot CLI's payload does not carry and its session does
  // (specs/033-copilot-parity). Under Claude Code every one of these is the
  // payload's own field or nothing, exactly as before.
  const harness = detectHarness(payload);
  const isCopilot = harness === "copilot";
  const settings = isCopilot ? (copilotSettings ?? probe.copilotSettings?.() ?? {}) : null;
  const payloadEffort = payloadText(payload?.effort?.level);
  const loggedEffort = isCopilot ? plainText(activity.value?.effort) : null;
  const settingsEffort = isCopilot ? plainText(settings?.effortLevel) : null;
  const effortReading = payloadEffort
    ? reading({ value: payloadEffort, at: now, source: "payload" })
    : loggedEffort
      ? reading({ value: loggedEffort, at: now, source: "transcript" })
      : reading({ value: settingsEffort, at: now, source: settingsEffort ? "settings" : "payload" });
  // `auto` is the router, not a model. The session log says which model it
  // routed to, and that is what Claude Code's bar would name.
  const routedModel =
    isCopilot && String(payloadText(payload?.model?.id) ?? "").toLowerCase() === "auto" ? plainText(activity.value?.resolvedModel) : null;
  // Before Codex's first turn its rollout names no model yet, and the name of
  // another vendor's model family would be wrong there (specs/035-codex-pane).
  const modelName =
    payloadText(payload?.model?.display_name) ?? payloadText(payload?.model?.id) ?? ({ codex: "Codex", opencode: "OpenCode" }[harness] ?? "Claude");

  return {
    cwd,
    dir: reading({ value: getDirLabel(cwd), at: now, source: "payload" }),
    dirUrl: timed("payload", () => probe.getDirUrl(cwd)),
    git,
    // The payload carries both of these, and did all along. Asking git and
    // gh for them cost a subprocess each: 540 ms for `gh pr view` on a warm
    // network, and its whole timeout when it cannot reach GitHub. The probes
    // stay as fallbacks, for a Claude Code too old to send the fields or a
    // pull request it has not found yet.
    remote: hasSnapshot
      ? payloadRepoUrl
        ? reading({ value: payloadRepoUrl, at: now, source: "payload" })
        : timed("git", () => probe.getRemoteUrl(cwd))
      : missing("git", "not a repository"),
    repo: hasSnapshot
      ? reading({ value: repoId, at: now, source: "payload" })
      : missing("payload", "not a repository"),
    // Both `gh` lookups are cached per repository and answer about whichever
    // branch was checked out when they ran, so the branch travels with the
    // question: a pull request or a run from the branch you just left is not
    // an older answer, it is an answer about something else.
    // A pull request lookup that failed, so a dim icon can stand where a blank
    // would read as "no pull request" (specs/048-state-feedback).
    prUnavailable: reading({
      value: hasRepo && !payloadPr ? Boolean(probe.getPrLookupFailed?.(cwd)) : false,
      at: now,
      source: "cache",
    }),
    pr: hasRepo
      ? payloadPr
        ? reading({ value: payloadPr, at: now, source: "payload" })
        : timed("gh", () => normalizePr(probe.getPrInfo(cwd, { branch: namedBranch }), "gh"))
      : missing("gh", "not a repository"),
    skills: skillsReading(timed, probe, payload, activity.value?.skills, activity.value?.skillsTrueCount),
    activity,
    // The running subagents, which only Copilot's reader returns: Claude Code
    // draws its own rows (specs/030-copilot-agent-rows).
    agents: reading({ value: Array.isArray(activity.value?.agents) ? activity.value.agents : null, at: now, source: activity.source }),
    // The git gates running in this repository's worktrees, from the cache
    // the detached refresh fills (specs/031-git-gate-rows). Only in a
    // repository, so a directory without one starts no lookup, and only when
    // the arrangement has the segment on: reading the cache is what starts the
    // refresh, and that refresh is a `ps -A` and an `lsof` every 15 s.
    gates: !hasRepo
      ? missing("cache", "not a repository")
      : off?.has("gates")
        ? missing("cache", "switched off")
        : probe.getGateRuns
          ? timed("cache", () => probe.getGateRuns(cwd, { now }))
          : missing("cache", "no reader"),
    ci: hasRepo
      ? timed("gh", () => probe.getCiStatus(cwd, { branch: namedBranch }))
      : missing("gh", "not a repository"),
    model: reading({
      value: routedModel ? `${routedModel} (auto)` : modelName,
      at: now,
      source: routedModel ? "transcript" : "payload",
    }),
    // The routed model alone, so the chip can give up "(auto)" before it
    // gives up anything else.
    modelRouted: reading({ value: routedModel, at: now, source: "transcript" }),
    effort: effortReading,
    outputStyle: reading({ value: payloadText(payload?.output_style?.name), at: now, source: "payload" }),
    // Everything below arrives on stdin. None of it costs a process, and
    // none of it was on the bar before feature 002.
    agent: reading({ value: payloadText(payload?.agent?.name), at: now, source: "payload" }),
    sessionName: reading({ value: payloadText(payload?.session_name), at: now, source: "payload" }),
    projectDir: reading({ value: payloadText(payload?.workspace?.project_dir), at: now, source: "payload" }),
    worktree: reading({
      value: payloadText(payload?.worktree?.name)
        ? { name: payloadText(payload.worktree.name), from: payloadText(payload.worktree.original_branch) }
        : payloadText(payload?.workspace?.git_worktree)
          ? { name: payloadText(payload.workspace.git_worktree), from: null }
          : null,
      at: now,
      source: "payload",
    }),
    tokens: reading({ value: getContextTokens(payload), at: now, source: "payload" }),
    sessionCost: reading({ value: getSessionCost(payload), at: now, source: "payload" }),
    context: reading({ value: ctxPct, at: now, source: "payload" }),
    fiveHour: reading({ value: fiveHourPct, at: now, source: "payload" }),
    fiveHourReset: reading({ value: fiveHourResetsAt, at: now, source: "payload" }),
    sevenDay: reading({ value: sevenDayPct, at: now, source: "payload" }),
    sevenDayReset: reading({ value: sevenDayResetsAt, at: now, source: "payload" }),
    spendLimit: reading({ value: spendLimitPct, at: now, source: "payload" }),
    spendLimitReset: reading({ value: spendLimitResetsAt, at: now, source: "payload" }),
    promptCache: reading({ value: getPromptCache(payload, now), at: now, source: "payload" }),
    update: updateReading,
    // Only present when vim mode is on; a mode that is not text is no mode.
    vim: reading({ value: payloadText(payload?.vim?.mode), at: now, source: "payload" }),
    fastMode: reading({ value: payload?.fast_mode === true ? true : null, at: now, source: "payload" }),
    // Which agent sent this payload, and the two figures only Copilot sends
    // (specs/029-multi-harness).
    harness: reading({ value: detectHarness(payload), at: now, source: "payload" }),
    premiumRequests: reading({
      value: Number.isFinite(payload?.cost?.total_premium_requests) && payload.cost.total_premium_requests > 0 ? payload.cost.total_premium_requests : null,
      at: now,
      source: "payload",
    }),
    allowAll: reading({ value: payload?.allow_all_enabled === true ? true : null, at: now, source: "payload" }),
    // The AI credits Copilot reports, and the session limit its log records
    // (specs/033-copilot-parity). Only once some were used, like the premium
    // requests beside it.
    aiCredits: reading({ value: isCopilot ? aiCreditsOf(payload, activity.value?.sessionLimit) : null, at: now, source: "payload" }),
    // The account's monthly quota, from the cache the detached refresh fills.
    // Never read under Claude Code: reading it is what starts the lookup.
    copilotQuota: isCopilot
      ? probe.getCopilotQuota
        ? timed("cache", () => probe.getCopilotQuota({ now }))
        : missing("cache", "no reader")
      : missing("cache", "Copilot CLI only"),
    // A Codex window with no chip of its own, such as the free plan's 30 days,
    // and the credit balance, both from the rollout (specs/037-codex-windows).
    // Shown whenever the fields are present, like Copilot's own; Claude Code
    // and Copilot send neither, so under them both are absent.
    codexWindow: reading({ value: codexWindowsOf(payload), at: now, source: "payload" }),
    codexCredits: reading({ value: codexCreditsOf(payload), at: now, source: "payload" }),
    rtk: rtkReading,
    samples: reading({ value: sampleHistory, at: now, source: "samples" }),
  };
}

/**
 * A payload field that is supposed to be text, or nothing.
 *
 * Claude Code sends well-typed payloads, so this is not about what it does
 * send — it is about what reaches the bar when something upstream changes
 * shape. A field that arrives as an object interpolates as the literal
 * `[object Object]`, and a boolean as `true`: both render as confident,
 * meaningless text in a place a reader trusts. That has happened once here
 * already, when a refresh wrapped a numeric value in a branch object and the
 * bar spent a day showing `[object Object]` for the rtk savings.
 *
 * Control characters go with it, through `plainText`: a newline in a value
 * decided how many lines the bar had, and a raw escape in one was a command
 * the terminal ran.
 *
 * Anything that is not a string becomes null so the caller's fallback runs,
 * which is how an unknown field is meant to be handled everywhere else on
 * the bar. Numbers included: a model named `42` is a payload defect, and
 * `Claude` is a better answer than `42`.
 */
function payloadText(value) {
  return plainText(value);
}

/**
 * Copilot CLI's AI credits for this session, or null before any were used
 * (specs/033-copilot-parity). The figure is Copilot's own `formatted` string,
 * so it reads the way Copilot's footer prints it; nano-AIU over 1e9 is the
 * unit the session limit is set in, and only used for the share of it.
 */
function aiCreditsOf(payload, limit) {
  const nano = payload?.ai_used?.total_nano_aiu;
  if (typeof nano !== "number" || !Number.isFinite(nano) || nano <= 0) return null;
  const used = nano / 1e9;
  const formatted = plainText(payload?.ai_used?.formatted) ?? used.toFixed(2);
  const max = typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? limit : null;
  return { formatted, used, max, pct: max === null ? null : Math.round((used / max) * 100) };
}

/** A credit count the way a person writes one: `20`, `12.5`. */
function creditCount(n) {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/**
 * Renders a payload that's already parsed. `sources` exists so the preview
 * generator can supply fixed git/PR/skill/rtk values instead of probing the
 * real machine — previews must be reproducible, and they'd otherwise show
 * whatever branch and usage happened to be live when they were generated.
 * Runtime always uses the real probes (the defaults below).
 */
export function renderPayload(
  payload,
  {
    asciiArrows = false,
    flavor = "mocha",
    sources = {},
    trackChanges: tracking = true,
    now = Date.now(),
    // Both default to what the terminal reports: `COLUMNS` and `LINES` under
    // Claude Code, `/dev/tty` under Copilot, which sets neither
    // (specs/033-copilot-parity). A caller that passes them is a test or a
    // preview, where the point is a fixed size.
    maxWidth = null,
    maxHeight = null,
    // A test or a preview passes its own; a real redraw finds the person's
    // file for itself.
    layout = null,
    // A fixed sample history, for a caller that has no session state to read
    // one from. A real redraw leaves this alone and uses its own.
    samples = null,
    // See `renderReadings`: false leaves out the rows after the bar.
    trailingRows = true,
  } = {}
) {
  const probe = {
    getGitInfo,
    isRepo: isRepository,
    getPrInfo,
    getPrLookupFailed,
    getRemoteUrl,
    getActiveSkills,
    getActiveSkillsTrueCount,
    subagentActivity,
    getSessionActivity,
    getCiStatus,
    getRtkSavings,
    getDirUrl: (cwd) => getOpenTabUrl(cwd) || getDirUrl(cwd),
    maybeStartUpdateCheck,
    getUpdateNotice,
    getGateRuns: readGateRuns,
    // Copilot CLI only (specs/033-copilot-parity): its terminal, its settings
    // file and its account's monthly quota. None of them is asked for under
    // Claude Code.
    readTty: readTtySize,
    copilotSettings: loadCopilotSettings,
    getCopilotQuota,
    ...sources,
  };

  const cwd = payload?.workspace?.current_dir || payload?.cwd || process.cwd();
  const found = layout ?? resolveLayout(cwd);
  const harness = detectHarness(payload);
  // Read once: the padding sizes the bar and the effort level is a fallback.
  const copilotSettings = harness === "copilot" ? (probe.copilotSettings?.() ?? {}) : null;
  const size =
    maxWidth === null || maxHeight === null
      ? terminalFor(harness, { readTty: probe.readTty, settings: copilotSettings })
      : null;

  // What the arrangement switched off, so gather can skip a source whose
  // only reader is a segment nobody will see.
  const off = new Set(
    resolveArrangement(SEGMENTS, found.arrangement, found.origin).placements.filter((p) => p.on === false).map((p) => p.key)
  );
  const readings = gather(payload, harnessProbes(probe, harness, payload), { now, off, copilotSettings });
  return renderReadings(readings, payload, {
    asciiArrows,
    flavor,
    tracking,
    now,
    maxWidth: maxWidth ?? size.columns,
    maxHeight: maxHeight ?? size.rows,
    arrangement: found.arrangement,
    arrangementOrigin: found.origin,
    samples,
    trailingRows,
  });
}

/** Turns readings into the lines. Split out so the diagnostic can reuse `gather`. */
export function renderReadings(
  readings,
  payload,
  {
    asciiArrows = false,
    flavor = "mocha",
    tracking = true,
    now = Date.now(),
    // The real terminal, when Claude Code tells us what it is. The old
    // constant survives as the fallback for versions that do not.
    maxWidth = terminalWidth(),
    maxHeight = terminalHeight(),
    // The diagnostic asks for the lines with their line numbers attached, so
    // it can say "line 3" rather than "the second thing printed". With line 2
    // absent those are different lines, and the diagnostic exists to explain
    // the layout rather than to renumber it.
    asRows = false,
    // Every segment this session would draw, before any of them are arranged
    // into rows or dropped for width. The composer page is built from this:
    // it rearranges real segments rather than approximating them, so a bar it
    // shows cannot differ from the bar the terminal draws.
    asPool = false,
    // A sample history to compute the burn rate and the projection from,
    // instead of the one on disk. Only a generator passes this; a real
    // redraw has its own history and must not be told a different one.
    samples: sampleOverride = null,
    // The person's own bar: which segments are on, in what order, on which
    // line, against which edge. Nothing means the registry, unchanged.
    arrangement = null,
    // Where that arrangement came from, carried through for the diagnostic.
    arrangementOrigin = "default",
    // The rows that follow the bar: Copilot's subagents and the git gates. A
    // caller that composes only the bar's own segments, as the composer page
    // does, leaves them out; an arrangement can move a segment, not a row.
    trailingRows = true,
  } = {}
) {
  // The segment key decides the maximum age; the reading name says where
  // to look. They differ for the git snapshot, which three segments share.
  const shows = (key, name = key) => isRenderable(key, readings[name], now);

  const git = shows("branch", "git") ? readings.git.value : null;
  const pr = shows("pr") ? readings.pr.value : null;
  const remoteUrl = shows("remote") ? readings.remote.value : null;
  const skills = shows("skills") ? readings.skills.value : [];
  const rtkPct = shows("rtk") ? readings.rtk.value : null;
  const modelName = shows("model") ? readings.model.value : "Claude";
  const effort = shows("effort") ? readings.effort.value : null;
  const outputStyle = shows("outputStyle") ? readings.outputStyle.value : null;
  const dirLabel = readings.dir.value;
  const dirUrl = shows("dir", "dirUrl") ? readings.dirUrl.value : null;

  // The usage figures are the one place an absent value keeps its slot:
  // Principle III and FR-010 require `?%` rather than a segment that
  // quietly disappears, so a reader can tell "unknown" from "moved".
  const ctxPct = readings.context.value;
  const fiveHourPct = readings.fiveHour.value;
  const sevenDayPct = readings.sevenDay.value;
  const fiveHourResetsAt = readings.fiveHourReset.value;
  const sevenDayResetsAt = readings.sevenDayReset.value;
  // Absent is the normal state here, so unlike the two windows it gets no
  // `?%`: most accounts have no spend limit at all (Principle III).
  const spendLimitPct = readings.spendLimit?.value ?? null;
  const spendLimitResetsAt = readings.spendLimitReset?.value ?? null;
  const promptCache = readings.promptCache?.value ?? null;
  const fiveHourResetLabel = formatResetCountdown(fiveHourResetsAt, now) ?? "reset time unknown";
  const sevenDayResetLabel = formatResetCountdown(sevenDayResetsAt, now) ?? "reset time unknown";

  // Only discrete state feeds change tracking — usage percentages tick on
  // almost every render and would leave the line permanently animated.
  // The sample history was already built in `gather` so the diagnostic can
  // report it without duplicating the work; change tracking just persists it.
  const changes = trackChanges(
    payload?.session_id,
    {
      branch: git?.branch ?? null,
      ahead: git && git.ahead !== null ? String(git.ahead) : null,
      behind: git && git.behind !== null ? String(git.behind) : null,
      pr: pr ? `${pr.number}:${pr.state}:${pr.isDraft}` : null,
      ci: readings.ci?.value ? `${readings.ci.value.status}:${readings.ci.value.conclusion}` : null,
      skills: skills.join(","),
      model: modelName,
      effort: effort ?? "",
    },
    {
      enabled: tracking,
      now,
      samples: readings.samples.value,
    }
  );

  // Sampling normally rides the session's own state file. A generated page
  // has no session, so it brings its own history rather than showing a bar
  // with two segments permanently missing.
  const sampleHistory = sampleOverride ?? readings.samples.value;

  const palette = PALETTES[flavor] || PALETTES.mocha;
  const { tier } = iconTier({ asciiArrows });
  const g = { ...GLYPHS[tier] };
  // Three events that deserve a picture even in the Nerd Font tier. Opt-in,
  // and the emoji are the ones the constitution names (Principle X).
  const eventEmoji = tier === "nerd" && process.env.CLAUDE_STATUSLINE_EVENT_EMOJI === "1";
  if (eventEmoji) {
    g.conflict = GLYPHS.emoji.conflict;
    g.updateDone = GLYPHS.emoji.updateDone;
  }
  // Skill names are joined by the thin round separator in the Nerd Font tier,
  // and by a comma where that glyph cannot be drawn (specs/050-catalog-gaps).
  const skillJoin = tier === "nerd" ? " \u{E0B5} " : ", ";
  // The band mark is a coloured circle in the emoji tier, where the rest of
  // the line is already pictures.
  // A figure keeps its width: a percentage is padded to three characters with
  // U+2007 FIGURE SPACE, so the chips after it do not move when it crosses 10
  // or 100 (specs/044-chip-copy). `?` is padded the same, so the chip does not
  // shift when the value arrives.
  const pad3 = (n) => `${"\u2007".repeat(Math.max(0, 3 - String(n).length))}${n}`;
  // The main figure of a chip is bold, and its reset and units recede
  // (specs/044-chip-copy). Three markers that `renderRow` turns into weight
  // and colour; the pool and the width measure see none of them.
  const strong = (s) => `${STRONG}${s}${MARK_OFF}`;
  const quiet = (s) => `${QUIET}${s}${MARK_OFF}`;
  // A reset under ten minutes away on a window that is nearly gone is good
  // news, and is the one countdown drawn in the healthy colour.
  const good = (s) => `${GOOD}${s}${MARK_OFF}`;
  const minutesToReset = (resetsAtSeconds) =>
    typeof resetsAtSeconds === "number" ? (resetsAtSeconds * 1000 - now) / 60_000 : null;
  const figure = (n) => strong(`${pad3(n)}%`);
  // A gauge's own pieces (specs/046-gauges). The track needs a Nerd Font, so
  // the other two tiers draw it from the plain set. The band is a mark before
  // the number in the critical band and a bold number in the warn band, and
  // the emoji tier writes the same band as a coloured circle.
  const trackSet = tier === "nerd" ? GLYPHS.nerd : GLYPHS.plain;
  const gaugeFigure = (pct, band) => {
    if (typeof pct !== "number" || !Number.isFinite(pct)) return quiet(`${"\u2007\u2007"}\u2014`);
    const number = `${pad3(pct)}%`;
    // The critical mark takes the place of the figure space when it is one
    // column wide, so the chip does not move when a figure turns critical.
    if (band === "critical") {
      const padded = pad3(pct);
      const rest = displayWidth(g.bandCritical) === 1 ? padded.replace(/^\u2007/, "") : padded;
      return `${g.bandCritical}${rest}%`;
    }
    if (band === "warn") return `${g.bandWarn}${strong(number)}`;
    return number;
  };
  // How much of a window has gone, from where its reset is: null when the
  // reset is unknown or past, or further out than the window is long.
  const elapsedPct = (resetsAtSeconds, windowMinutes) => {
    if (typeof resetsAtSeconds !== "number" || !Number.isFinite(resetsAtSeconds)) return null;
    const length = windowMinutes * 60_000;
    const remaining = resetsAtSeconds * 1000 - now;
    if (remaining < 0 || remaining > length * 1.02) return null;
    return Math.max(0, Math.min(100, (1 - remaining / length) * 100));
  };
  const paceNote = (pace, pct) =>
    typeof pace === "number" && pace > 5 && !(pct >= 100) ? ` ${quiet(`+${pace}pp`)}` : "";
  /**
   * The text and shorter forms of a gauge chip: icon, label, track, figure
   * and the pace, then (when there is one) its reset. The width guard drops
   * the track first, then the reset; the figure is last to go.
   */
  const gaugeChipText = ({ icon, label, pct, band, pace, reset = null, full = "", resetsAt = null }) => {
    const head = ` ${icon} ${label ? `${label} ` : ""}`;
    const fig = `${gaugeFigure(pct, band)}${full}${paceNote(pace, pct)}`;
    const withTrack = `${head}${track(pct, trackSet)} ${fig}`;
    const noTrack = `${head}${fig}`;
    const left = minutesToReset(resetsAt);
    const relief = band === "critical" && left !== null && left > 0 && left < 10;
    const tail = reset ? ` ${(relief ? good : quiet)(`${g.reset} ${reset}`)}` : "";
    const variants = reset ? [`${noTrack}${tail} `, `${noTrack} `] : [`${noTrack} `];
    return { text: `${withTrack}${tail} `, variants };
  };
  // Effort is a level, so its glyph fills with it. A level the table does not
  // name (`xhigh`, `max`, whatever a harness sends) is at least high.
  const effortGlyph = (level) =>
    ({ low: g.effortLow, medium: g.effortMedium, high: g.effortHigh })[String(level).toLowerCase()] ?? g.effortHigh;

  // The rows that follow the bar: Copilot's subagents (specs/030) and the git
  // gates (specs/031). Counted here because the gates fall back to a line 1
  // chip when the bar's three lines and the rows would not fit the window.
  const isCopilot = readings.harness?.value === "copilot";
  const agentList = isCopilot && Array.isArray(readings.agents?.value) ? readings.agents.value : [];
  const gateRuns = shows("gates") && Array.isArray(readings.gates?.value) ? readings.gates.value : [];
  const gateHere = hereOf(gateRuns, readings.cwd);
  const gateRowCount = gateRuns.length ? Math.min(gateRuns.length, GATE_ROW_CAP) + (gateRuns.length > GATE_ROW_CAP ? 1 : 0) : 0;

  // The Powerline arrow needs a Powerline font. Choosing the emoji tier says
  // there may be none, so it takes the plain arrow unless a separator was
  // named: declared rather than assumed, as the plain separator rule asks.
  const opts = { asciiArrows: asciiArrows || (tier === "emoji" && !process.env.CLAUDE_STATUSLINE_SEPARATOR), width: maxWidth };
  const roundStyle = separatorStyle(opts) === "round";
  const widePadding = String(process.env.CLAUDE_STATUSLINE_PADDING ?? "").toLowerCase() === "wide" && separatorStyle(opts) === "arrow";
  // The rows are kept as segment lists until every line exists, because
  // aligning the first column across the bar needs all of them at once.
  // Rendering each line to text as it was built is what left that alignment
  // written but never applied.
  const rows = [];
  // Which of the four each rendered row is. Shedding needs to know, and a
  // line that renders only sometimes made an index-based guess wrong.
  const rendered = [];
  // Every segment built this render, in build order, each recorded once.
  // Filled from `fit` because that is the single point every line's content
  // passes through before anything is dropped.
  const pool = [];
  const pooled = new Set();

  // Where every segment goes: the registry, with the person's own choices
  // over the top of it. With no arrangement this resolves to the registry
  // unchanged, which is what keeps the default bar byte-identical.
  const resolved = resolveArrangement(SEGMENTS, arrangement, arrangementOrigin);
  const placements = new Map(resolved.placements.map((p) => [p.key, p]));

  /**
   * The placement for a built segment. A skill chip has no registry row of
   * its own, so it inherits the one its key is prefixed with.
   */
  const placementFor = (key) => placements.get(key) ?? placements.get(String(key).split(":")[0]);

  /**
   * Attaches each descriptor's placement, so position and priority both come
   * from one resolved answer rather than from the order the code happened to
   * push things in.
   */
  const attach = (seg) => {
    const meta = placementFor(seg.key);
    const registryRow = segment(seg.key) || segment(String(seg.key).split(":")[0]);
    return {
      priority: meta?.priority ?? registryRow?.priority ?? 50,
      order: meta?.order ?? registryRow?.order ?? 999,
      line: meta?.line ?? registryRow?.line ?? 1,
      ...registryRow,
      ...(meta ?? {}),
      ...seg,
    };
  };

  /** Drops the least important segments until the row fits the terminal. */
  const fitRow = (row) => fitToWidth(row, maxWidth);

  /** Records a segment in the pool once, whatever the arrangement does to it. */
  const collect = (segs) => {
    for (const seg of segs) {
      if (pooled.has(seg.key)) continue;
      pooled.add(seg.key);
      const plain = (s) => String(s).replace(/[\u0001-\u0006]/g, "");
      pool.push({
        key: seg.key,
        text: plain(seg.text),
        color: seg.color,
        ...(seg.icon ? { icon: seg.icon } : {}),
        ...(seg.tone ? { tone: seg.tone } : {}),
        ...(seg.alignRight ? { alignRight: true } : {}),
        ...(seg.url ? { url: seg.url } : {}),
        // The composer page fits with the same `fitToWidth`, so a segment's
        // shorter forms travel with it or the page would drop what the
        // terminal only shortens.
        ...(seg.variants ? { variants: seg.variants.map(plain) } : {}),
        ...(seg.iconLast ? { iconLast: true } : {}),
      });
    }
  };

  // Line 1: working directory, then branch, ahead/behind, PR — each name
  // is an OSC 8 hyperlink when a target is known (dir -> file://, branch ->
  // GitHub tree view, PR -> PR page), with no visible URL text.
  const atHome = (() => {
    try {
      return Boolean(readings.cwd) && path.resolve(readings.cwd) === path.resolve(os.homedir());
    } catch {
      return false;
    }
  })();
  const dirGlyph = atHome ? g.home : g.dir;
  const dirSegment = (label) => ({
    key: "dir",
    color: ROLE.neutral,
    text: ` ${dirGlyph} ${label} `,
    // Last step: the icon alone, so the chip never has to disappear (F57).
    variants: [` ${dirGlyph} `],
    iconLast: true,
    url: dirUrl,
  });
  const l1 = [dirSegment(dirLabel)];

  // A17: Claude can move during a session, and then the directory on the bar
  // is not the directory the session started in. Both render only when they
  // differ, because in most sessions they do not.
  const projectDir = shows("projectDir") ? readings.projectDir.value : null;
  if (projectDir && projectDir !== readings.cwd) {
    l1.push({
      key: "projectDir",
      color: ROLE.neutral,
      text: ` ${g.from} ${getDirLabel(projectDir)} `,
      url: pathToFileUrl(projectDir),
    });
  }
  if (git) {
    const detached = git.detached === true || git.branch === "(detached)";
    // The prefix is abbreviated and a long name is cut in the middle, where
    // two branches differ. The link still goes to the full name.
    const prefixes = repoConfig(readings.cwd || process.cwd()).branchPrefixes ?? DEFAULT_BRANCH_PREFIXES;
    const label = detached
      ? git.oid?.slice(0, 7) || "detached"
      : cutMiddle(abbreviateBranch(git.branch, prefixes), BRANCH_COLUMNS);
    // A detached HEAD is a commit, not a branch. Linking it to a tree view
    // and drawing a branch icon beside it would say otherwise.
    // Encoded a path segment at a time: a `#` or a `%` in a branch name is
    // part of the name, and the slashes are the tree view's own.
    const branchUrl =
      !detached && remoteUrl ? `${remoteUrl}/tree/${git.branch.split("/").map(encodeURIComponent).join("/")}` : null;
    l1.push({
      key: "branch",
      color: ROLE.identity,
        emphasis: changes.isChanged("branch"),
      text: ` ${detached ? g.commit : g.branch} ${label} `,
      variants: [` ${detached ? g.commit : g.branch} `],
      iconLast: true,
      url: branchUrl,
    });
    // Working-tree state and divergence from upstream, right after the
    // branch. Each count is omitted when it's zero, so a clean branch in
    // sync with its upstream adds nothing to the line at all.
    const state = [];
    // File counts are not animated: they change on every save, and
    // Principle X reserves animation for state that changes discretely.
    if (git.changed) state.push(`${WARM}${g.modified} ${git.changed}${MARK_OFF}`);
    // Staged and removed files, from the same status read (specs/050).
    if (git.staged) state.push(`${GOOD}${g.added} ${git.staged}${MARK_OFF}`);
    if (git.removed) state.push(`${g.removed} ${git.removed}`);
    if (git.untracked) state.push(`${g.untracked} ${git.untracked}`);
    // A null ahead/behind means there is no upstream at all, which is not
    // the same as being in sync with one (FR-012).
    if (git.ahead) state.push(`${g.push} ${git.ahead}`);
    if (git.behind) state.push(`${BEHIND}${g.pull} ${git.behind}${MARK_OFF}`);
    if (state.length) {
      l1.push({ key: "worktreeState", color: ROLE.neutral, text: ` ${state.join("  ")} ` });
    } else if (git.changed === 0 && git.untracked === 0 && !git.conflicts && git.ahead !== null && git.behind !== null) {
      // A tree that is clean and in step with its upstream says so, in the
      // one place a failed read draws nothing (specs/048-state-feedback).
      l1.push({ key: "worktreeState", color: ROLE.neutral, icon: ROLE.healthy, text: ` ${g.clean} ` });
    }
    // A2's chosen form: owner and repo as text. It repeats the directory in
    // a repository whose folder is named after it, and says something the
    // directory cannot in one that is not.
    const repo = shows("repo") ? readings.repo.value : null;
    if (repo?.owner && repo.name) {
      //
      // On the directory chip's own background, in a quieter text colour.
      // `surface1` and `surface2` are 1.3:1 to 1.4:1 apart in every palette,
      // an edge nobody can see, so the two read as one block with one
      // label dimmer than the other (specs/040-contrast).
      l1.push({
        key: "repo",
        color: ROLE.neutral,
        text: ` ${g.repo} ${repo.owner}/${repo.name} `,
        quiet: true,
        url: remoteUrl,
      });
    }
    // B10: closes the loop after a push without leaving the terminal. It is
    // a cached value by construction, and disappears rather than going
    // stale, because a green tick ten minutes old is worse than none.
    const ci = shows("ci") ? readings.ci.value : null;
    if (ci) {
      const running = ci.status && ci.status !== "completed";
      const passed = ci.conclusion === "success";
      // A run that was skipped or cancelled did not fail: it says so in its
      // own mark instead of drawing the failure (specs/054).
      const skipped = !running && ["skipped", "cancelled", "neutral"].includes(ci.conclusion);
      const mark = running ? g.ciRunning : passed ? g.ciPass : skipped ? g.ciSkipped : g.ciFail;
      const icon = running ? ROLE.modified : passed ? ROLE.healthy : skipped ? undefined : ROLE.critical;
      // The runs for the branch you are on, not the repository's most recent:
      // scoping the link the same way the segment scopes its answer is what
      // stops a click landing on main's green tick from a branch you never
      // pushed.
      const runs =
        remoteUrl && !detached && git.branch
          ? `${remoteUrl}/actions?query=${encodeURIComponent(`branch:${git.branch}`)}`
          : remoteUrl;
      l1.push({
        key: "ci",
        color: ROLE.neutral,
        icon,
        text: ` ${mark} ${ci.workflow ?? "CI"} `,
        variants: [` ${mark} `],
        emphasis: changes.isChanged("ci"),
        url: runs ?? undefined,
      });
    }
    // What this session changed, which is a different question from what the
    // working tree looks like: the payload counts it, git does not. It sits
    // beside the tree counters because that is where the eye looks for a
    // diff stat.
    const sessionCost = shows("linesChanged", "sessionCost") ? readings.sessionCost.value : null;
    if (sessionCost && (sessionCost.linesAdded !== null || sessionCost.linesRemoved !== null)) {
      l1.push({
        key: "linesChanged",
        color: ROLE.neutral,
        icon: ROLE.healthy,
        text: ` +${sessionCost.linesAdded ?? 0} −${sessionCost.linesRemoved ?? 0} `,
      });
    }
    // B8: an unmerged path stops everything until it is resolved, which is
    // not what an ordinary changed file means.
    if (git.conflicts) {
      l1.push({ key: "conflicts", color: ROLE.critical, text: ` ${g.conflict} ${git.conflicts} ` });
    }
    // A19: which worktree, and what it came from. The branch name alone does
    // not always say, and a worktree is exactly when you need to be sure.
    const worktree = shows("worktree") ? readings.worktree.value : null;
    if (worktree) {
      const from = worktree.from ? ` ${g.from} ${worktree.from}` : "";
      l1.push({ key: "worktree", color: ROLE.neutral, text: ` ${g.worktree} ${worktree.name}${from} ` });
    }
    if (!pr && readings.prUnavailable?.value) {
      // Dim, with no number: the lookup did not run, which is not the same
      // answer as there being nothing to find.
      l1.push({ key: "pr", color: ROLE.neutral, quiet: true, text: ` ${g.pr} ` });
    }
    if (pr) {
      // `changes_requested` is the one review state too long to spell out on
      // a line this tight, and "changes" says it.
      const review = pr.review === "changes_requested" ? "changes" : pr.review;
      const label = pr.kind === "mr" ? "MR" : "PR";
      // The state is drawn, not only worded: a draft, a merged and a closed
      // request each have their own mark, and the review word carries its own
      // beside it. Where the source gave no state the request is open.
      const prGlyph =
        { draft: g.prDraft, merged: g.prMerged, closed: g.prClosed }[pr.prState ?? pr.review] ?? g.pr;
      const reviewGlyph =
        { approved: g.reviewApproved, commented: g.reviewComments, review_required: g.reviewRequested }[pr.review] ?? null;
      const reviewMark = reviewGlyph ? `${reviewGlyph} ` : "";
      // The count of comments, beside its own glyph, where the source has one.
      const commentMark = pr.comments ? ` ${g.reviewComments} ${pr.comments}` : "";
      // Same "show a few, count the rest" shape as the skills chip: a PR
      // with zero labels must render exactly as before this field existed
      // (specs/006, FR-003), so the suffix is only ever added, never a
      // placeholder for the empty case.
      const prLabels = pr.labels ?? [];
      const shownLabels = prLabels.slice(0, 3);
      const hiddenLabels = Math.max(0, prLabels.length - shownLabels.length);
      const labelText = shownLabels.length
        ? ` ${shownLabels.join(", ")}${hiddenLabels > 0 ? ` +${hiddenLabels}` : ""}`
        : "";
      l1.push({
        key: "pr",
        color: String(pr.state).toUpperCase() === "MERGED" ? ROLE.merged : ROLE.open,
        emphasis: changes.isChanged("pr"),
        text: ` ${prGlyph} ${label} #${pr.number}${review ? ` ${reviewMark}${review}` : ""}${commentMark}${labelText} `,
        variants: [` ${prGlyph} #${pr.number}${reviewGlyph ? ` ${reviewGlyph}` : review ? ` ${review}` : ""} `],
        url: pr.url,
      });
    }
  }
  // The statusline's own update state, in or out of a repository: it is about
  // the install, not the directory (specs/026-update-check). One colour, since
  // the channel is identity; the icon and the words say which state it is.
  const update = shows("update") ? readings.update?.value : null;
  if (update?.text) {
    // Only a waiting update is the new box: blocked and failed are the
    // download mark, so a failed install never reads as good news (specs/054).
    const icon =
      update.state === "updated" ? g.updateDone : update.state === "ready" ? g.updateReady : g.updateBlocked;
    // At the right edge of the line, and the first chip to go. Its words are
    // the first thing it gives up, which leaves the icon: the state is the
    // glyph, and the sentence is for a line with room (specs/045).
    // The icon alone (specs/048): the sentence is in `doctor`, which prints
    // what the check found, and the bar's line 1 is not the place for it.
    l1.push({ key: "update", color: ROLE.neutral, alignRight: true, text: ` ${icon} ` });
  }
  // The git gates running in this repository (specs/031-git-gate-rows): a
  // count here, and a row each after the bar when the window has room.
  if (gateRuns.length) {
    const chip = gateChip(gateRuns, { now, here: gateHere, glyphs: g });
    if (chip) l1.push({ key: "gates", ...chip });
  }
  // What every line is built from, before the arrangement decides where any
  // of it goes. Content and placement are two questions, and keeping them
  // apart is what lets a segment move to another line without its builder
  // knowing anything about it.
  const content = [...l1];

  // F7 and F6, on the line that already describes what the session is doing.
  // Both come from the transcript pass that already runs for the skills.
  const activity = shows("activity") ? readings.activity.value : null;
  function pushLine2Extras(row) {
    if (activity?.todos) {
      const { done, total, current } = activity.todos;
      const label = current ? `${current} (${done}/${total})` : `${done}/${total}`;
      row.push({ key: "todo", color: ROLE.cold, text: ` ${g.todo} ${label} ` });
    }
    // The editor's vim mode, beside what the session is doing. Absent unless
    // vim mode is on (specs/027-bar-polish).
    const vimMode = shows("vim") ? readings.vim?.value : null;
    if (vimMode) row.push({ key: "vim", color: ROLE.neutral, text: ` ${g.vim} ${vimMode} `, variants: [` ${g.vim} `] });
    if (activity?.awaiting) {
      // The session is waiting for a person: a question or a plan, answered
      // by nobody yet. It replaces the working chip, which the same recent
      // entry would otherwise keep lit.
      row.push({ key: "activity", color: ROLE.attention, text: ` ${g.yourTurn} your turn ` });
    } else if (activity) {
      // The spinner advances on the session's own render counter, never on the
      // clock, and the quiet clock turns idle into sleeping after five minutes.
      const frames = [g.workingFrame0, g.workingFrame1, g.workingFrame2, g.workingFrame3];
      const asleep = !activity.working && typeof activity.idleMs === "number" && activity.idleMs >= 5 * 60_000;
      const mark = activity.working ? frames[((changes.frame ?? 0) % 4 + 4) % 4] : asleep ? g.sleeping : g.idle;
      // How many background jobs the session is waiting on, said whenever
      // there are any: "working" alone would not tell a quiet session
      // waiting on a gate from one producing output.
      const bg = (activity.background?.shells ?? 0) + (activity.background?.agents ?? 0);
      const waiting = activity.working && bg > 0 ? ` · ${bg} bg` : "";
      row.push({
        key: "activity",
        color: ROLE.neutral,
        ...(activity.working ? { icon: ROLE.healthy } : {}),
        text: activity.working ? ` ${mark} working${waiting} ` : asleep ? ` ${mark} sleeping ` : ` ${mark} idle `,
        variants: [` ${mark} `],
      });
    }
  }

  // Line 2: active skills, one chip per skill, distinct colors, no bullets.
  // When more are active than the line shows, the count of the rest is
  // stated rather than left silent: "these three" and "three of five" are
  // different claims, and only one of them is true (FR-013).
  if (skills.length) {
    // D7's chosen form: one chip carrying the list, not one chip per skill.
    // A chip per skill spent a separator and two spaces on each name, so
    // three of them gave up a third of the line to padding. As one list they
    // read as one fact, which is what they are: what is shaping the work
    // right now.
    const hidden = readings.skills.hiddenCount ?? 0;
    // The most recent skill is index 0 (getActiveSkills's own contract:
    // newest first). The in-progress feature id takes the parenthetical
    // when a speckit-* skill is active and one is recorded; the SDD step
    // label is the fallback when no feature id is available (specs/009,
    // research.md); neither is shown for a non-speckit skill.
    const sddStep = sddStepFor(skills[0]);
    const featureId = sddStep ? inProgressFeatureId(readings.cwd) : null;
    const skillsSuffix = featureId ?? sddStep;
    const l2 = [
      {
        key: "skills",
        color: ROLE.skills,
        emphasis: changes.isChanged("skills"),
        text: ` ${g.skills} ${skills.join(skillJoin)}${hidden > 0 ? ` +${hidden}` : ""}${skillsSuffix ? ` (${skillsSuffix})` : ""} `,
        // The newest skill with how many more there are, then the icon (F57).
        iconLast: true,
        variants: [
          ...(skills.length + hidden > 1 || skillsSuffix
            ? [` ${g.skills} ${skills[0]}${skills.length + hidden > 1 ? ` +${skills.length + hidden - 1}` : ""} `]
            : []),
          ` ${g.skills} `,
        ],
      },
    ];
    pushLine2Extras(l2);
    content.push(...l2);
  } else {
    const l2 = [];
    pushLine2Extras(l2);
    content.push(...l2);
  }

  // Line 3: what is running, and what it is running out of.
  //
  // Model and effort were a line of their own until 2026-09-07. They never
  // filled one, and what is being spent reads in the same glance as what is
  // spending it. Composed from the registry: which segments belong on this
  // line, and in what order, is a property of the table rather than of this
  // function. What each one says is still built here, because that is
  // content, not layout.
  const sevenDayMoment = resetMomentLabel(sevenDayResetsAt, new Date(now));
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  // Bounded the way the countdown is: a reset past any window it could
  // describe is a unit mismatch, and naming a day for it would state a wrong
  // date with confidence. It falls through to `?` instead.
  const farOutMoment =
    typeof sevenDayResetsAt === "number" &&
    sevenDayResetsAt * 1000 - now > ONE_DAY_MS &&
    formatResetCountdown(sevenDayResetsAt, now) !== null
      ? sevenDayMoment
      : null;

  // The spend limit's reset follows the 7-day rule, with the longer bound a
  // monthly period needs.
  const spendBound = { maxMs: MAX_PLAUSIBLE_SPEND_PERIOD_MS };
  const spendFarOut =
    typeof spendLimitResetsAt === "number" &&
    spendLimitResetsAt * 1000 - now > ONE_DAY_MS &&
    formatResetCountdown(spendLimitResetsAt, now, spendBound) !== null
      ? resetMomentLabel(spendLimitResetsAt, new Date(now))
      : null;

  // A window at its limit says so in a word. The payload keeps sending the
  // same 100 until the reset, so without it a figure that cannot move reads
  // as a statusline that stopped updating (specs/023-extra-usage-limit). The
  // word sits outside the reset text so shedding the reset never removes it:
  // it is the part that explains why the number is not changing.
  const fullMark = (pct) => (typeof pct === "number" && pct >= 100 ? " full" : "");

  // Copilot CLI reports no rate limits at all, so their chips are absent there
  // rather than `?%`, which would claim an unknown figure for a limit that does
  // not exist (Principle III, specs/029-multi-harness).
  // OpenCode reports no usage windows either (specs/038-opencode).
  const noLimits = ["copilot", "opencode"].includes(readings.harness?.value) && !payload?.rate_limits;
  // Codex reports the windows its plan has, by length. One the plan does not
  // have, such as the 5-hour window on the free plan, is absent rather than
  // `?%`, for the same reason (specs/035-codex-pane).
  const isCodex = readings.harness?.value === "codex";
  const noFiveHour = noLimits || (isCodex && !payload?.rate_limits?.five_hour);
  const noSevenDay = noLimits || (isCodex && !payload?.rate_limits?.seven_day);

  // Copilot CLI's monthly quota, one chip per allowance the plan meters
  // (specs/033-copilot-parity). Labelled `month` the way the windows are
  // labelled `5h` and `7d`, with the date the month resets: it is the only
  // window Copilot has, and calling it anything shorter would invent one.
  const copilotQuota = shows("premiumQuota", "copilotQuota") ? readings.copilotQuota?.value : null;
  const quotaChip = (name) => {
    const q = copilotQuota?.quotas?.[name];
    if (!q) return null;
    const full = q.full || q.usedPct >= 100 ? " full" : "";
    const date = formatQuotaDate(copilotQuota.resetDate);
    const band = bandFor(q.usedPct)?.name ?? null;
    return {
      ...gaugeChip(q.usedPct, band),
      ...gaugeChipText({ icon: g.calendar, label: `month ${name}`, pct: q.usedPct, band, reset: date || null, full }),
    };
  };

  const line3Content = {
    model: () => {
      // Under Copilot's auto router the chip names the model that answered,
      // and "(auto)" is the first thing it gives up for width.
      const routed = shows("model", "modelRouted") ? readings.modelRouted.value : null;
      return {
        color: ROLE.identity,
        emphasis: changes.isChanged("model"),
        text: ` ${g.model} ${modelName} `,
        // No icon-only form: a model glyph alone names nothing, so the chip
        // goes whole when the line runs out of room (specs/054).
        ...(routed ? { variants: [` ${g.model} ${routed} `] } : {}),
      };
    },
    premiumQuota: () => quotaChip("premium"),
    chatQuota: () => quotaChip("chat"),
    // Copilot CLI's AI credits. The ramp colour has a level to show only once
    // a session limit is set; until then it keeps its own.
    aiCredits: () => {
      const c = shows("aiCredits") ? readings.aiCredits?.value : null;
      if (!c) return null;
      // Copilot's figure is a bare number today; anything with words in it is
      // drawn as sent rather than given a second unit.
      const bare = /^[\d.,]+$/.test(c.formatted);
      const amount = bare ? `${c.formatted} AIC` : c.formatted;
      if (c.pct === null) return { color: ROLE.money, text: ` ${g.spend} ${amount} ` };
      const band = bandFor(c.pct)?.name ?? null;
      const level = `${gaugeFigure(c.pct, band)}${fullMark(c.pct)}`;
      const against = bare ? `${c.formatted}/${creditCount(c.max)} AIC` : `${c.formatted} of ${creditCount(c.max)}`;
      return {
        ...gaugeChip(c.pct, band),
        text: ` ${g.spend} ${against} · ${level} `,
        variants: [` ${g.spend} ${amount} · ${level} `],
      };
    },
    effort: () =>
      effort
        ? { color: ROLE.identity, text: ` ${effortGlyph(effort)} ${effort} `, variants: [` ${effortGlyph(effort)} `], iconLast: true }
        : null,
    // Fast mode spends faster, so it sits with the model and effort that say
    // what is spending. Drawn only when on (specs/027-bar-polish).
    fastMode: () => (shows("fastMode") && readings.fastMode?.value ? { color: ROLE.neutral, text: ` ${g.fast} fast ` } : null),
    // The three ramped segments. Colour says which band the level is in, and
    // the bar's own characters say it again, because colour may not be the
    // only carrier (E6). An unknown level keeps the segment's own colour and
    // draws an empty track: `?%` is the honest answer, and a bar that
    // vanished would make the line's width jump.
    // The bar was ten to sixteen columns for something the number says in
    // three, on the line that is already the widest. It is gone; the band it
    // carried is now a one-character mark, so the meaning still survives
    // without colour (item E6, and Section 508).
    // The context figure carries its level in colour only. The band mark it
    // used to carry was removed on 2026-08-26 at the owner's request, so
    // this is the one ramped segment where colour is the sole carrier. The
    // 5-hour and 7-day figures beside it still mark their band, and they
    // are the ones with a consequence you cannot undo.
    context: () => {
      const { band } = contextBand(ctxPct, repoConfig(readings.cwd || process.cwd()).contextBands);
      const built = gaugeChipText({ icon: g.context, label: "", pct: ctxPct, band });
      // The last eight context readings, when asked for and when there are that
      // many: whether it is climbing or flat (specs/050-catalog-gaps).
      const spark = process.env.CLAUDE_STATUSLINE_SPARKLINE === "1" ? sparkline(sampleHistory, "contextPct", 8) : null;
      if (spark) {
        const fig = gaugeFigure(ctxPct, band);
        const longer = ` ${g.context} ${track(ctxPct, trackSet)} ${fig} ${quiet(spark)} `;
        return {
          ...gaugeChip(ctxPct, band),
          text: longer,
          variants: [built.text, ...built.variants, ` ${g.context} ${fig} `],
        };
      }
      // The word is the next thing to go after the track.
      const bare = ` ${g.context} ${gaugeFigure(ctxPct, band)} `;
      // With no word to give up the figure-only form is the one already there.
      const steps = [...built.variants, bare].filter((v, i, all) => all.indexOf(v) === i);
      return { ...gaugeChip(ctxPct, band), text: built.text, variants: steps };
    },
    // Each window says how much of it is gone and when it comes back, in one
    // chip. Until 2026-09-06 the two resets shared a segment two places away
    // reading `2h09m / 3d`, which asked the reader to know that the left half
    // belonged to the figure three chips back and the right half to the one
    // between them — and the slash read as a fraction beside `1h04m`, which
    // really is one thing over another. One subject, one chip.
    fiveHour: () => {
      if (noFiveHour) return null;
      // `?` rather than nothing when the payload carried no reset: with the
      // countdown simply absent, a reader cannot tell "the harness did not
      // say" from "a narrow terminal shed it", and the first is a fact about
      // the data (Principle III). It reads in the same vocabulary as the `?%`
      // beside it, and it is shed under width like any other reset text: the
      // chip's one variant is itself without the countdown, which the width
      // guard reaches before it drops anything essential (specs/027).
      const resets = shortCountdown(fiveHourResetsAt, now) ?? "?";
      const { band, pace } = paceBand(fiveHourPct, elapsedPct(fiveHourResetsAt, 300));
      return {
        ...gaugeChip(fiveHourPct, band),
        ...gaugeChipText({ icon: g.timer, label: "5h", pct: fiveHourPct, band, pace, reset: resets, full: fullMark(fiveHourPct), resetsAt: fiveHourResetsAt }),
      };
    },
    sevenDay: () => {
      if (noSevenDay) return null;
      // Near and far are told differently, and that is the rule rather than an
      // inconsistency: a window resetting in hours is something you wait out,
      // so it counts down; one resetting on Thursday is a date you plan
      // around, so it names the day. C4 chose the weekday for the far case on
      // the reasoning that a countdown three days long is noise; the near case
      // used to be covered by the merged segment, and now lives here.
      const moment = farOutMoment ?? shortCountdown(sevenDayResetsAt, now) ?? "?";
      const { band, pace } = paceBand(sevenDayPct, elapsedPct(sevenDayResetsAt, 10080));
      return {
        ...gaugeChip(sevenDayPct, band),
        ...gaugeChipText({ icon: g.calendar, label: "7d", pct: sevenDayPct, band, pace, reset: moment, full: fullMark(sevenDayPct), resetsAt: sevenDayResetsAt }),
      };
    },
    // The allowance a gateway reports once an administrator sets a spend
    // limit. It is drawn as reported, past 100% included, because that is how
    // the payload says the limit has been exceeded; capping it would hide the
    // one figure still moving. Its reset is shed with the 7-day one.
    // A Codex window that is neither 5 hours nor 7 days, under the label its
    // length gives it (specs/037-codex-windows). It follows the 7-day rule for
    // its reset: a date beyond a day, a countdown inside one, and `?` past the
    // window's own length, which is a timestamp in the wrong unit.
    codexWindow: () => {
      const w = shows("codexWindow") ? readings.codexWindow?.value?.[0] : null;
      if (!w) return null;
      const pct = Math.round(w.used_percentage);
      const bound = { maxMs: w.window_minutes * 60_000 + ONE_DAY_MS };
      const at = typeof w.resets_at === "number" ? w.resets_at : null;
      const counts = formatResetCountdown(at, now, bound) !== null;
      const moment = !counts ? "?" : at * 1000 - now > ONE_DAY_MS ? resetMomentLabel(at, new Date(now)) : shortCountdown(at, now, bound) ?? "?";
      const { band, pace } = paceBand(pct, elapsedPct(at, w.window_minutes));
      return {
        ...gaugeChip(pct, band),
        ...gaugeChipText({ icon: g.calendar, label: w.label, pct, band, pace, reset: moment, full: fullMark(pct), resetsAt: at }),
      };
    },
    // Codex's credit balance, drawn as Codex writes it.
    codexCredits: () => {
      const c = shows("codexCredits") ? readings.codexCredits?.value : null;
      return c ? { color: ROLE.money, text: ` ${g.spend} credits ${c.balance} ` } : null;
    },
    spendLimit: () => {
      if (noLimits) return null;
      if (spendLimitPct === null) return null;
      const moment = spendFarOut ?? shortCountdown(spendLimitResetsAt, now, spendBound) ?? "?";
      const band = bandFor(spendLimitPct)?.name ?? null;
      return {
        ...gaugeChip(spendLimitPct, band),
        ...gaugeChipText({ icon: g.spend, label: "spend", pct: spendLimitPct, band, reset: moment, resetsAt: spendLimitResetsAt }),
      };
    },
    // The prompt cache, drawn only when its state changes what you do next:
    // cold, or warm inside its closing window. A warm cache with time to
    // spare, or a provider that reports no caching, draws nothing at all. A
    // cold chip carries shorter `variants`: when the width guard reaches it,
    // the cause comes off, then the token count, and only then the chip.
    promptCache: () => {
      if (!promptCache?.observed) return null;
      if (promptCache.state === "warm") {
        if (!promptCache.closing) return null;
        // An hourglass that empties by thirds of the cache's own TTL.
        const ttlS = promptCache.ttl === "1h" ? 3600 : 300;
        const left = promptCache.secondsLeft / ttlS;
        const glyph = left > 2 / 3 ? g.cacheWarm : left > 1 / 3 ? g.cacheWarmHalf : g.cacheWarmLow;
        const minutes = cacheMinutesLeft(promptCache.secondsLeft);
        return {
          color: ROLE.neutral,
          icon: ROLE.attention,
          text: ` ${glyph} cache warm \u00b7 ${minutes} `,
          variants: [` ${glyph} ${minutes} `],
        };
      }
      const tokens = promptCache.recacheTokens !== null ? abbreviate(promptCache.recacheTokens) : null;
      const chip = (...parts) => ` ${g.cacheCold} cache cold${parts.filter(Boolean).map((t) => ` \u00b7 ${t}`).join("")} `;
      const text = chip(tokens, promptCache.cause);
      const bare = tokens ? ` ${g.cacheCold} ${tokens} ` : ` ${g.cacheCold} `;
      const variants = [chip(tokens), chip(), bare].filter((v, i, all) => v !== text && all.indexOf(v) === i);
      return { color: ROLE.cold, text, ...(variants.length ? { variants } : {}) };
    },
    // C5 asked for this figure to render only once it had moved five points,
    // on the reasoning that a number repeating itself every redraw is a
    // number nobody reads. That reasoning does not survive what the number
    // is: `rtk gain` reports a lifetime average over thousands of commands,
    // and a lifetime average does not move five points. The segment showed
    // itself on a session's first redraw and was never seen again.
    //
    // So it renders whenever there is a value. Its width is already governed
    // by its priority, the lowest on the bar, which makes it the first thing
    // a narrow line drops — the same outcome the throttle was reaching for,
    // decided by the terminal rather than by a threshold the figure cannot
    // cross.
    rtk: () => {
      if (rtkPct === null) return null;
      return { color: ROLE.money, text: ` ${g.rtk} rtk ${strong(`${rtkPct}%`)} ${quiet("saved")} `, variants: [` ${g.rtk} ${strong(`${rtkPct}%`)} `] };
    },

    // B1: a percentage says where you are; a rate says whether you get there
    // before the window resets, which is the decision you actually make.
    burnRate: () => {
      if (noLimits) return null;
      const rate = ratePerHour(sampleHistory, "fiveHourPct");
      if (rate === null || rate <= 0) return null;
      const icon = eventEmoji && bandFor(fiveHourPct)?.name === "critical" ? GLYPHS.emoji.burn : g.burn;
      const perHour = `${rate.toFixed(rate < 10 ? 1 : 0)}%/h`;
      // One chip for one fact: how fast the window is going and when that
      // runs it out. The moment is only drawn when the window would be full
      // before it resets, which is the only case that changes what you do.
      let runsOut = "";
      const at = typeof fiveHourPct === "number" && fiveHourPct >= 100 ? null : projectFull(sampleHistory, "fiveHourPct", now);
      if (at !== null && !(typeof fiveHourResetsAt === "number" && at >= fiveHourResetsAt * 1000)) {
        const d = new Date(at);
        runsOut = ` ${quiet(`full ~${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)}`;
      }
      // Eight samples of the 5-hour figure, when asked for and when there are
      // that many. Part of the long form only.
      const samples = process.env.CLAUDE_STATUSLINE_SPARKLINE === "1" ? sparkline(sampleHistory, "fiveHourPct", 8) : null;
      const short = ` ${icon} ${perHour}${runsOut} `;
      return {
        color: ROLE.neutral,
        text: samples ? ` ${icon} ${perHour} ${samples}${runsOut} ` : short,
        ...(samples ? { variants: [short] } : {}),
      };
    },
    // B2, merged into the burn rate chip above by specs/046-gauges: the
    // sentence says "full ~13:05" beside the rate, and only when the window
    // would run out before it resets, which is the only case where it changes
    // what you do. It has no key of its own any more.
    // A4, A5, A6: what the session has spent, in time and in lines.
    // Copilot's premium requests this session, and whether every tool now runs
    // without asking. Neither exists in Claude Code's payload.
    premiumRequests: () => {
      const n = shows("premiumRequests") ? readings.premiumRequests?.value : null;
      return n ? { color: ROLE.neutral, text: ` ${g.premium} ${n} premium ` } : null;
    },
    allowAll: () => (shows("allowAll") && readings.allowAll?.value ? { color: ROLE.attention, text: ` ${g.allowAll} ${strong("allow all")} ` } : null),
    duration: () => {
      const c = shows("sessionCost") ? readings.sessionCost.value : null;
      // Not before half an hour: a session two minutes old is not news.
      const label = (c?.durationMs ?? 0) >= 30 * 60_000 ? formatDuration(c.durationMs) : null;
      return label ? { color: ROLE.neutral, text: ` ${g.duration} ${strong(label)} ` } : null;
    },
  };

  const buildLine3 = () =>
    byLine(3)
      .map((s) => {
        const built = line3Content[s.key]?.();
        return built ? { key: s.key, ...built } : null;
      })
      .filter(Boolean);

  // The 120-column limit is a promise the constitution makes. Lower
  // priorities are dropped first; before anything essential goes, the
  // essential chips give up their reset text, the 7-day one first, then the
  // 5-hour countdown, through their `variants` in `fitToWidth`
  // (specs/027-bar-polish). That used to be a four-step ladder here, which
  // never ran: `fitToWidth` always made a row fit, so the ladder's own "does
  // it fit" check passed before its first step.
  /**
   * Puts every built segment on the line the arrangement gives it, in the
   * order it gives it, and drops what will not fit.
   *
   * Content is built once; placement is applied here. A
   * segment that has been switched off never reaches a row, whatever its
   * priority, and a segment moved to another line arrives there with its
   * own priority, so what a narrow terminal sheds is still a decision taken
   * in the registry.
   */
  // The directory label's own trim step: shortened from the left, because
  // the end of a path identifies it and the start rarely does. It runs before
  // the row is fitted, not after: fitting always returns a row that fits, so a
  // trim that waited for an overflow never ran, and the path kept its full
  // length while the pull request, the CI result and finally the directory
  // itself were shed around it. Nothing else on that line should go to make
  // room for the start of a path.
  //
  // Down to a floor, so the label stays recognisable; what still overflows
  // after that is shed by priority like anything else. Columns, not
  // characters: an emoji or a CJK name occupies two columns per character,
  // and counting them as one cut too little to fit.
  const MIN_DIR_COLUMNS = 12;
  const trimDir = (row, floor) => {
    const at = row.findIndex((seg) => seg.key === "dir");
    if (at === -1) return row;
    const over = rowWidth(row) - maxWidth;
    if (over <= 0) return row;
    const shortened = trimFromLeft(dirLabel, Math.max(floor, displayWidth(dirLabel) - over));
    if (shortened === null) return row;
    const out = [...row];
    out[at] = { ...row[at], text: dirSegment(shortened).text };
    return out;
  };

  /**
   * Red is the loudest thing on the bar, so it is used once. Among gauges in
   * the critical band the highest percentage keeps the red background, the
   * first in line order on a tie. The others stay critical in the text: red
   * on the neutral fill, with the band mark they already carry. Run on every
   * built segment before shedding, so a gauge that is shed cannot pass the
   * red to another by being absent.
   */
  const leaveOneRed = (segs) => {
    const order = new Map(SEGMENTS.map((s) => [s.key, s.line * 1000 + s.order]));
    const critical = segs
      .filter((s) => s.band === "critical" && typeof s.pct === "number")
      .sort((a, b) => b.pct - a.pct || (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
    for (const seg of critical.slice(1)) {
      seg.color = ROLE.neutral;
      seg.tone = ROLE.critical;
    }
  };

  const sleeping =
    Boolean(activity) && !activity.awaiting && !activity.working && typeof activity.idleMs === "number" && activity.idleMs >= 5 * 60_000;
  const assemble = () => {
    const built = [...content, ...buildLine3()];
    leaveOneRed(built);
    collect(built);
    const byLineNumber = new Map([1, 2, 3, 4].map((n) => [n, []]));
    for (const seg of built) {
      const placed = attach(seg);
      if (placementFor(seg.key)?.on === false) continue;
      // The pill style adds two caps to every chip, which the fit has to know.
      if (roundStyle) placed.extra = 1;
      // The wide padding adds one column to every chip after the first.
      if (widePadding && !roundStyle) placed.extra = 1;
      // A sleeping session recedes: line 2 is drawn in the quiet colour.
      // A chip that has its own fill goes neutral too: a quiet text colour on a
      // flamingo fill would change nothing a reader could see.
      if (sleeping && placed.line === 2) {
        placed.color = ROLE.neutral;
        placed.quiet = true;
      }
      byLineNumber.get(placed.line)?.push(placed);
    }
    const out = [];
    const lines = [];
    for (const line of [1, 2, 3, 4]) {
      // The sort is stable, so segments sharing an order keep the sequence
      // they were built in, and the skill chips keep theirs.
      const row = byLineNumber.get(line).sort((a, b) => a.order - b.order);
      if (!row.length) continue;
      // Past the floor only when the directory is all that is left and it
      // still does not fit: a cut label beats a wrapped line.
      const fitted = fitRow(trimDir(row, MIN_DIR_COLUMNS));
      out.push(fitted.length === 1 ? trimDir(fitted, 0) : fitted);
      lines.push(line);
    }
    return { rows: out, lines };
  };

  const assembled = assemble();


  rows.push(...assembled.rows);
  rendered.push(...assembled.lines);

  // The pool is complete once every line has been built, and it is the
  // whole answer for a caller that asked for it: what follows is layout,
  // which is exactly what such a caller intends to decide for itself.
  if (asPool) return pool;

  // Which lines the window has room for. Everything comes back the moment
  // the rows do: shedding answers the terminal, it is not a mode the bar
  // gets stuck in.
  const keep = linesToRender(maxHeight, rendered);
  const surviving = rows
    .map((row, i) => ({ line: rendered[i], row }))
    .filter((entry) => keep.includes(entry.line));
  // Padding the first segment of each line to a common width lines the
  // boundaries up down the bar. It yields to the width limit, line by line,
  // inside `alignColumns`.
  const aligned = alignColumns(surviving.map((entry) => entry.row), maxWidth);
  // `CLAUDE_STATUSLINE_BLOCK=1`: every line is padded to the widest one with
  // spaces on `mantle`, so the right edge is a block and not a ragged one.
  const block = process.env.CLAUDE_STATUSLINE_BLOCK === "1" && colourEnabled();
  // `CLAUDE_STATUSLINE_HAIRLINE=1`: an overline (SGR 53) across line 1, which
  // is a rule above the bar without being a fourth line. A terminal that does
  // not draw it ignores it. It is not a colour, so it stays with `NO_COLOR`
  // only where there is no other escape to add: it is skipped there.
  const hairline = process.env.CLAUDE_STATUSLINE_HAIRLINE === "1" && colourEnabled();
  const texts = surviving.map((entry, i) => {
    const text = renderRow(palette, aligned[i], opts);
    // Every reset in the row clears the overline too, so it is set again after each.
    return hairline && entry.line === 1 ? `\x1b[53m${text.replace(/\x1b\[0m/g, "\x1b[0m\x1b[53m")}\x1b[0m` : text;
  });
  const widest = block ? Math.max(0, ...texts.map((text) => displayWidth(text))) : 0;
  const drawn = surviving.map((entry, i) => {
    let text = texts[i];
    if (block) {
      const pad = widest - displayWidth(text);
      if (pad > 0) text += `${bgSeq(palette.mantle)}${" ".repeat(pad)}\x1b[0m`;
    }
    return { line: entry.line, text };
  });
  if (asRows) return drawn;
  // Under Copilot, which has no subagent row setting, the rows follow the
  // bar's lines in the same output. They are not lines of the bar: they never
  // count toward the three, and the per-line view above never sees them
  // (Principle II, specs/030-copilot-agent-rows).
  if (!trailingRows) return drawn.map((entry) => entry.text).join("\n");
  const agentRows = isCopilot ? harnessAgentRows(agentList, { columns: maxWidth, palette, now, cap: AGENT_ROW_CAP, asciiArrows }) : [];
  // The gates, in Claude Code and Copilot alike, unless the arrangement
  // switched them off. They are the first thing a short window gives up,
  // before any of the bar's own lines; the line 1 chip still counts them.
  const gateRowsFit = gateRowCount > 0 && drawn.length + agentRows.length + gateRowCount <= maxHeight;
  const gateLines =
    gateRowsFit && placementFor("gates")?.on !== false
      ? gateRows(gateRuns, { columns: maxWidth, palette, now, here: gateHere, glyphs: g, cap: GATE_ROW_CAP })
      : [];
  return [...drawn.map((entry) => entry.text), ...agentRows, ...gateLines].join("\n");
}

/**
 * The worktree this session is in, among the ones running a gate: the run
 * whose worktree path contains the session's directory, longest first.
 */
export function hereOf(runs, cwd, { platform = process.platform } = {}) {
  if (!cwd || !runs.length) return null;
  // Both sides are compared resolved and in one spelling. git prints a
  // worktree's real path while the payload's cwd can come through a symlink
  // (macOS's /tmp is /private/tmp), and on Windows git writes `C:/x` where the
  // payload writes `C:\x`, with the drive letter in either case. Returned as
  // the run stored it, because the rows match on that.
  const p = platform === "win32" ? path.win32 : path.posix;
  const key = (s) => {
    let resolved;
    try {
      resolved = realpathSync(s);
    } catch {
      resolved = s;
    }
    resolved = p.resolve(resolved);
    return platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  const here = key(cwd);
  const inside = (root) => here === root || here.startsWith(root.endsWith(p.sep) ? root : root + p.sep);
  const hits = runs
    .map((r) => r?.path)
    .filter((q) => typeof q === "string" && q)
    .map((q) => ({ q, root: key(q) }))
    .filter(({ root }) => inside(root));
  return hits.sort((a, b) => b.root.length - a.root.length)[0]?.q ?? null;
}

/**
 * A label cut from the left to fit `columns`, with a leading ellipsis, or
 * null when it already fits or cannot usefully be cut.
 *
 * Measured in columns rather than characters, so a name written in emoji or
 * CJK loses the right amount rather than half of it.
 */
function trimFromLeft(label, columns) {
  const target = Math.max(3, columns);
  if (displayWidth(label) <= target) return null;
  // The ellipsis is Ambiguous, so it is two columns where Ambiguous is drawn
  // wide; reserving a fixed one let a cut label overflow by a column there.
  const tail = displayWidth("…/");
  const chars = [...label];
  let kept = [];
  let width = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    const next = width + displayWidth(chars[i]);
    if (next > target - tail) break;
    kept.unshift(chars[i]);
    width = next;
  }
  // The cut is said in the quiet colour (E49): what is left is the name.
  return kept.length ? `${QUIET}…/${MARK_OFF}${kept.join("")}` : null;
}
