// Wires engine events to the io layer, the core and the status surface. No business logic.
// The engine follows $ only into functions declared in this file, so every $ call lives here.
import { ABOUT, helpText } from './modules/help'
import { otherFeatureNamed, implementRefusal, canTouchSpecs, mayChangeGit, mayWriteFiles, isUnderSpecify } from './modules/guards'
import { advisorFindings, advisorPrompt } from './modules/advisor'
import { featureContext, principlesOf, tickedBy, statusText } from './modules/context'
import { historyRows, minutes } from './modules/history-rows'
import { readFeatureDurations } from './modules/durations'
import { withPr, worktreesById, filtered } from './modules/pane-data'
import type { ConfigRow, EngineInterface, Hook, Register, RenderNode } from 'claude-code'

import { bandPr, bandSegments, bandText, nextReason, otherFeaturesCard, stepCards, type BandDensity } from './core/band'
import { hintTail } from './core/hint'
import { phaseToasts } from './core/phase-toast'
import { justFinished } from './core/next-command'
import { filterChips, filterFeatures, helpRows, moveSpecSelection, nextSort, nextStatus, parseSpecFilter, windowUnits, wrappedRows, type PaneRow, sessionRows, specsRows } from './core/pane'
import { allToggled, breadcrumb, doTaskSuggestion, isOpen, questionSuggestion, questionsIn, spaced, specChildren, tickSuggestion, toggled, withChildren, type Fold, type TreeTask } from './core/pane-tree'
import { presetOf } from './core/presets'
import { parseTasks, ticksIn } from './core/tasks-parser'
import { spinnerSuffix } from './core/spinner'
import { bandUpdateLabel, astrolabeUpdate, firstLine, isDue, isStoredUpdates, localDay, parseCliVersion, parseGstackCheck, parseSelfCheck, skillsVersusCli, releaseNotesUrl, skillsUpdate, updateLabel } from './core/updates'
import { fileUrl, joinPath } from './core/paths'
import { closeAllSuggestion, closeSuggestion, configMark, reconcileSuggestion, nextFor, planFiles, nextPriority, skillsForPhase, specDetail, OPTION_GROUPS, optionDefaults, optionGroup, parallelPrompt, parsePriority, REVIEW_MODEL, reviewPrompt, withPriority, type OptionGroup, type Priority } from './core/spec-actions'
import { parallelTasks } from './core/extensions'
import { VERSION } from './core/version'
import { QUEUE_HOTKEYS } from './core/keys'
import { duration } from './core/duration'
import { STATE_GLYPHS } from './core/glyphs'
import { statusLead } from './core/status-lead'
import { withThumb } from './core/thumb'
import { displaySectionOf, isReadyToClose } from './core/sections'
import { blockLabel, jumpLine, jumpMatches, jumpQuery, nextGroup } from './core/specs-scale'
import { usageBarRows } from './core/usage-bars'
import { deciderNote, governorBoxState, nextLevelText, projectHeader, sessionChips, todayCounts, trend24h } from './core/session-usage'
import { badgesOf, escapeStep, legacyTab, paneTitle, TABS } from './core/pane-tabs'
import { parseClientOp, type ClientOp } from './core/pane-client'
import { changedSettingsJson, LOOK_PRESETS, nextOptionValue, optionConflicts, OPTIONS_README, presetMatching } from './core/setup-extras'
import { usageRamp } from './core/usage-ramp'
import { ASK_MS, clockOf, decide, dropped, EXTEND_MS, HOLD_LIFT_MS, holdQuestion, labelOf, nextHeld, isPaused, isReadOnlyTool, parseAllow, pauseQuestion, RAISE_MS, refusal, resumePrompt, runPrompt, usageSegment, type Decision, type Question, usageRows } from './core/governor'
import { ANSI_16, chipForeground, CHIPS, FLAVORS, flavorOf, isThemeKeys, lighten, STATUS_ROLE, themeOf, type ThemeRole } from './core/theme'
import { capDiff, DIFF_FOLD_MS, foldedDiff, recapLine, recapOf, tasksDiff } from './core/summary'
import { styleSections } from './core/style'
import { ageOf, parsePullList, primaryPullAction, prOpened, pullAction, pullsBySpec, specOfBranch, PR_LIST_FIELDS } from './core/pulls'
import { EFFORTS, familyOf, MODEL_FAMILIES, modelForTask, skillModelFor, skillNameOf, SKILL_MODELS, type SkillOverrides } from './core/skill-models'
import { featureDirFor, mergedBranches, parseWorktrees, uncommittedCount, withWorktreeProgress, worktreeName, worktreeState } from './core/worktrees'
import { readFeature } from './io/snapshot'
import { deriveSpeckitState, snapshotFromMemo } from './core/speckit'
import { deriveFeature } from './core/phase'
import { chartImage, dialFrames, imagesFor } from './core/pixels'
import { emptyMemo, type Feature, type PaneState, type PaneTab, type PaneView, type UpdateId, type UpdateItem, type UpdatesState, type UsageState, type UsageReading, type QueuedAgent, type SessionStats, type SpeckitState, type FooterState } from './core/types'
import type { Preset } from './core/presets'
import type { Fs } from './io/fs-port'
import { findRoot } from './io/root'
import { nodeStatus, readResolvedConfig, renderFooter, type RunProc } from './io/statusline-run'
import { buildPayload, chooseSource, cutRuns, flavorMismatch, joinDir, parseOmit, statuslineEnv, SUPPORTED_CONTRACT, transcriptPathFor, type ResolvedConfig, type Run, type SourceReason } from './core/statusline-dep'
import { activeFilesChanged, applyFileTouch, applyRead, applyShell, applySkill, type Held, reconcileDeferred, reconcileNow, reconcileStart, reconcileTurn } from './io/reconcile'
import { bandRow, edgeWidth, type BandEdge } from './surfaces/band'
import { askTree } from './surfaces/ask'
import { dashboardSections, dashboardTree } from './surfaces/dashboard'
import { burnRate, dial, kpiChips, kpisMarkdown, phaseBars, sparkline, usageChart, kpiRows, trendRows } from './core/dashboard'
import { addDay, addWeek, dayKey, lastWeeks, pastReset, slowest, updateFeatureDurations, weekKey, weekdays, type Days, type FeatureDuration, type Weeks } from './core/history'
import { footerChipLines, footerChips, footerText, linesChanged, type FooterInput } from './core/footer'
import { detectGates, layoutLive, liveRows, liveTextRows, parseProcesses, type LiveColumn, type LiveRowsOption } from './core/live-table'
import { liveTable } from './surfaces/live-table'
import { branchWebUrl, parseCiRun, parseGitStatus, parsePullRequest, plainText, remoteWebUrl } from './core/git-status'
import { iconSet, iconsFor } from './core/icons'
import { guessLang, langOf, paneLabelWidth, t, type Lang, type TextKey } from './core/i18n'
import { paneTree } from './surfaces/pane'
import { activeMark, formatStatus } from './core/status-text'
import { formatToast } from './core/toasts'
import { type FooterOwner, footerOwnerOf, parseFooterOwner, statuslineConfigured } from './modules/footer-owner'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const
// The session memo lives apart from what drawings read, so no redraw carries it (spec 009).
const MEMO = { plugin: 'astrolabe', key: 'memo' } as const
const PANE_STATE = { plugin: 'astrolabe', key: 'pane' } as const
const PANE_ID = 'astrolabe'
const PANE_TITLE = '🧭 Astrolabe'
const ASK_ID = 'astrolabe-usage'
// The queued run letters come from core/keys.ts: `q` first, never `b` (it pages back, 043 #29).
/** `/astrolabe doctor` (048 #79): what Astrolabe needs, each line with the fix when it is missing. */
/** The doctor's checks, one line each; `doctor` and the Help tab's Health block share them (052 #42). */
async function doctorLines($: EngineInterface): Promise<string[]> {
  const probe = (argv: string[]) =>
    $.process.run(argv, { timeoutMs: 3000 }).catch(() => ({ exitCode: 127, stdout: '', stderr: 'not found' }))
  const [git, gh, specify] = await Promise.all([probe(['git', '--version']), probe(['gh', '--version']), probe(['specify', 'version'])])
  const auth = gh.exitCode === 0 ? await probe(['gh', 'auth', 'status']) : undefined
  const state = (await $.state.get(SPECKIT)).value
  const lines: string[] = []
  const check = (isOk: boolean, text: string, fix: string) => lines.push(isOk ? `  ✓ ${text}` : `  ✗ ${text}: ${fix}`)
  check(git.exitCode === 0, git.exitCode === 0 ? firstLine(git.stdout) : 'git not found', 'install git from https://git-scm.com')
  check(gh.exitCode === 0, gh.exitCode === 0 ? firstLine(gh.stdout) : 'gh not found', 'install the GitHub CLI from https://cli.github.com for the PRs tab and the pullRequest option')
  if (auth !== undefined) check(auth.exitCode === 0, auth.exitCode === 0 ? 'gh signed in' : 'gh not signed in', 'run gh auth login')
  check(specify.exitCode === 0, specify.exitCode === 0 ? `specify ${firstLine(specify.stdout)}` : 'specify not found', 'install Spec Kit: uv tool install specify-cli --from git+https://github.com/github/spec-kit.git')
  check(state?.present === true, state?.present === true ? `Spec Kit project at ${state.root ?? '?'}` : 'no Spec Kit project here', 'run specify init --here')
  // The project's skills against the CLI (054 #98), named when they differ.
  if (state?.root !== undefined && specify.exitCode === 0) {
    const manifest = await $.fs.read(`${state.root}/.specify/integrations/speckit.manifest.json`).catch(() => undefined)
    const versions = skillsVersusCli(typeof manifest === 'string' ? manifest : undefined, parseCliVersion(specify.stdout))
    if (versions !== undefined) {
      check(
        versions.behind === 'none',
        versions.behind === 'none' ? `Spec Kit skills match the CLI (${versions.cli})` : `Spec Kit skills ${versions.skills}, CLI ${versions.cli}`,
        versions.behind === 'skills' ? `refresh the skills: ${SKILLS_REFRESH.join(' ')}` : 'upgrade the CLI: uv tool upgrade specify-cli',
      )
    }
  }
  const icons = iconsFor(iconsOption, 'terminal')
  lines.push(`  · icons: ${icons}${icons === 'nerd' ? ' (needs a Nerd Font in the terminal; set icons to emoji or ascii if glyphs show as boxes)' : ''}`)
  const set = Object.entries(optionsSeen).filter(([, v]) => v !== undefined)
  lines.push(`  · options: ${set.length === 0 ? 'all defaults' : set.map(([k, v]) => `${k}=${String(v)}`).join(', ')} (change them in /config or the Config tab)`)
  // The hook budget (054 #15): the engine gives each hook 10 s.
  check(slowestHook === undefined || slowestHook.ms < 5000, slowestHook === undefined ? 'no hook work timed yet' : `slowest hook work: ${slowestHook.name}, ${slowestHook.ms} ms of the 10 s budget`, 'a large project or a slow disk; /astrolabe status still works, and the Specs tab reads the rest later')
  return lines
}

async function doctor($: EngineInterface): Promise<string> {
  return ['🧭 Astrolabe doctor', ...(await doctorLines($))].join('\n')
}

/** Reads the doctor's checks into the session for the Help tab, at most once a minute (052 #42). */
async function refreshHealth($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const held = (await $.state.get(SESSION)).value?.health
  if (held !== undefined && now - held.at < 60_000) return
  const lines = await doctorLines($).catch(() => undefined)
  if (lines !== undefined) await flushStats($, s => ({ ...s, health: { at: now, lines } }))
}

const WELCOMED = 'welcomed'
/** How many sessions have started; the footer's help chip shows for the first three (052 #46). It rides in the `welcomed` value (`0.118.0|2`), so the store keeps one key. */
let sessionNumber = Number.POSITIVE_INFINITY
const ASK = { plugin: 'astrolabe', key: 'ask' } as const
const DEFAULT_PANE: PaneState = { tab: 'specs', autoOpened: false }

/** The filters `m` cycles (078 FR-034), and the name each one shows. */
const PRESET_FILTERS = ['', 'is:active', 'has:questions', 'is:ready'] as const
const PRESET_OF: Readonly<Record<string, 'all' | 'mine' | 'blocked' | 'ready'>> = { '': 'all', 'is:active': 'mine', 'has:questions': 'blocked', 'is:ready': 'ready' }
const UPDATES = { plugin: 'astrolabe', key: 'updates' } as const
const UPDATES_STORE = 'updates'
const RELEASES_URL = 'https://api.github.com/repos/jonyfs/astrolabe/releases/latest'
const UPDATES_HIDDEN = 'updates:hidden'
const SKILLS_REFRESH = ['specify', 'init', '--here', '--integration', 'claude', '--force']
const USAGE = { plugin: 'astrolabe', key: 'usage' } as const
const QUEUE_MAX = 20
const DEFAULT_USAGE: UsageState = { readings: [], history: [], inFlight: 0, queue: [], paused: false }
const HISTORY_POINTS = 10
const SESSION = { plugin: 'astrolabe', key: 'session' } as const
const FOOTER = { plugin: 'astrolabe', key: 'footer' } as const
const SERIES_POINTS = 60
const HISTORY = 'history'
const DAYS = 'days'
const FEATURE_DURATIONS = 'feature-durations'
// The disk version the plugins were last reloaded for (034).
const RELOADED = 'reloaded'
// Who draws the footer once jonyfs/statusline is installed (050 #97): 'astrolabe' or 'statusline'.
const FOOTER_OWNER = 'footerOwner'
let footerOwner: FooterOwner = 'astrolabe'
const GIT_STATUS = ['git', 'status', '--porcelain=v2', '--branch', '--show-stash']
// The branch's pull request and its checks (023), opt-in, at most once per five minutes per branch.
const GH_PR = ['gh', 'pr', 'view', '--json', 'number,url,statusCheckRollup,isDraft,labels']
// The branch's last CI run (068 #41), read with the pull request: at most once per five minutes.
const GH_RUN = (branch: string): string[] => ['gh', 'run', 'list', '--branch', branch, '--limit', '1', '--json', 'status,conclusion']
const PR_TTL_MS = 300_000

// The session's numbers between writes (018): a tool call costs no state write; they are
// written at the end of each main turn and at each measure. A reload loses one turn's counts.
const live = { toolCalls: 0, drifts: 0, driftsById: {} as Record<string, number>, agentsRun: 0, agentsById: {} as Record<string, number>, ticksMain: 0, ticksSub: 0, agentsQueued: 0, linesAdded: 0, linesRemoved: 0, model: undefined as string | undefined, effort: undefined as string | undefined, skills: [] as string[], todo: undefined as SessionStats['todo'], cache: undefined as SessionStats['cache'], fast: undefined as boolean | undefined, dirs: undefined as SessionStats['dirs'] }
// The footer's room: the last width a drawing saw, less the warning mark and "astrolabe: " the terminal adds.
let columnsSeen = 120
let surfaceSeen: string | null = 'terminal'
let iconsOption: unknown = 'auto'
// The person's language (019): the `language` option, or the guess from their prompts.
let languageOption: unknown = 'auto'
let guessedLang: Lang | undefined
const currentLang = (): Lang => langOf(languageOption, guessedLang)

/** A reading whose window has already reset: the bars skip it (it reads `renewed` elsewhere). */
const isRenewedReading = (r: UsageReading, now: number): boolean => r.resetsAt !== undefined && Date.parse(r.resetsAt) <= now

const decisionOf = (usage: UsageState, now: number): Decision =>
  decide(usage.readings, usage.history, usage.override, now, usage.holdLift, usage.held, governThresholds)

const STATUS_COALESCE_MS = 200
let statusWindowUntil = Number.NEGATIVE_INFINITY
let statusTimer: ReturnType<EngineInterface['clock']['after']> | undefined
let pendingStatus: Held['state'] | undefined

/** The window an override is given for: the one binding now (016); none known, every window. */
type GovernThresholdsMap = Record<string, { hold?: number; stop?: number }>
// The parsed options, set in register (047 #66, #67).
let governThresholds: GovernThresholdsMap = {}
let quietHours: { start: number; end: number } | null = null
const isQuietHours = (): boolean => {
  if (quietHours === null) return false
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  return quietHours.start <= quietHours.end
    ? minutes >= quietHours.start && minutes < quietHours.end  // e.g., 09:00-17:00
    : minutes >= quietHours.start || minutes < quietHours.end // e.g., overnight 22:00-06:00
}
const kindOf = (usage: UsageState, now: number, governThresholds?: GovernThresholdsMap): { kind?: string } => {
  const kind = decide(usage.readings, usage.history, usage.override, now, usage.holdLift, usage.held, governThresholds).highest?.kind
  return kind === undefined ? {} : { kind }
}

/** The status entry: the footer of spec 018, the Spec Kit part first (008, 018). */
async function drawStatus($: EngineInterface, state: Held['state']): Promise<void> {
  if (footerOwner === 'statusline') return
  // With the footer in the pane (035), the status entry keeps only what is never dropped.
  const [usage, stats] = await Promise.all([$.state.get(USAGE), $.state.get(SESSION)])
  if (footerIn === 'pane' && columnsSeen < WIDE_STATUS_COLUMNS) {
    // The lead only (065 #15): feature, phase, percentage and the deciding window. From 140 columns
    // the status entry shows the whole footer on one line (054 #47).
    const now = await $.clock.now()
    const decision = decisionOf(usage.value ?? DEFAULT_USAGE, now)
    const kind = decision.highest?.kind
    $.ui.status(statusLead(state, decision.highest === undefined ? undefined : decision, Math.max(20, columnsSeen), now, currentLang(), kind === undefined ? undefined : governThresholds[kind], 14))
    return
  }
  $.ui.status(footerText({ ...(await footerInput($, state, Math.max(20, columnsSeen - 14), { usage: usage.value ?? DEFAULT_USAGE, stats: stats.value })), lead: false }))
}

async function showStatus($: EngineInterface, state: Held['state']): Promise<void> {
  currentTaskText = state.currentTask?.text
  const now = await $.clock.now()
  if (now >= statusWindowUntil) {
    statusWindowUntil = now + STATUS_COALESCE_MS
    await drawStatus($, state)
    return
  }
  pendingStatus = state
  if (statusTimer !== undefined) return
  statusTimer = $.clock.after(statusWindowUntil - now, () => {
    statusTimer = undefined
    const latest = pendingStatus
    pendingStatus = undefined
    if (latest === undefined) return
    statusWindowUntil += STATUS_COALESCE_MS
    void drawStatus($, latest).catch(error => {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    })
  })
}

/** What the footer shows, for the status entry and the pane alike (018, 035). */
async function footerInput(
  $: EngineInterface,
  state: Held['state'],
  width: number,
  snapshot: { usage: UsageState; stats?: SessionStats },
): Promise<FooterInput> {
  const { usage, stats } = snapshot
  const now = await $.clock.now()
  return {
      speckit: columns => formatStatus(state, columns, currentLang()),
      lang: currentLang(),
      readings: usage.readings,
      decision: decisionOf(usage, now),
      ...(stats?.context === undefined ? {} : { context: stats.context }),
      ...(stats?.model === undefined ? {} : { model: stats.model }),
      ...(stats?.effort === undefined ? {} : { effort: stats.effort }),
      ...(stats?.git === undefined ? {} : { git: stats.git }),
      ...(stats?.lines === undefined ? {} : { lines: stats.lines }),
      ...(stats?.dirs === undefined ? {} : { dir: { path: stats.dirs.cwd, start: stats.dirs.start } }),
      ...(stats?.git?.remote === undefined ? {} : { repo: stats.git.remote }),
      ...(stats?.skills === undefined || stats.skills.length === 0 ? {} : { skills: stats.skills }),
      ...(stats?.todo === undefined || stats.todo.total === 0 ? {} : { todo: stats.todo }),
      ...(stats?.cache === undefined ? {} : { cache: stats.cache }),
      ...(stats?.fast === true ? { fast: true } : {}),
      ...(stats === undefined ? {} : { burnSamples: { count: stats.series.length, spanMs: stats.series.length < 2 ? 0 : stats.series[stats.series.length - 1]!.at - stats.series[0]!.at } }),
      ...(stats?.advisor === undefined || stats.advisor.runs === 0 ? {} : { advisor: { runs: stats.advisor.runs } }),
      astrolabe: { version: VERSION },
      ...(stats === undefined ? {} : { startedAt: stats.startedAt }),
      ...(sessionNumber <= 3 ? { helpHint: true } : {}),
      ...((rate => (rate === undefined ? {} : { burn: rate }))(stats === undefined ? undefined : burnRate(stats.series))),
      ...(state.runningSkill === undefined
        ? {}
        : { skill: { name: state.runningSkill.name, ...((m => (m === undefined ? {} : { model: m }))(skillModels === 'auto' ? skillModelFor(state.runningSkill.name, skillOverrides)?.model : undefined)) } }),
      now,
      icons: iconSet(iconsFor(iconsOption, surfaceSeen as never)),
      columns: width,
      thresholds: governThresholds,
  }
}

// The live table (069): which rows it draws, the widths its columns have needed, the gate scan.
let liveRowsOption: LiveRowsOption = 'both'
let liveReservation: Partial<Record<LiveColumn, number>> = {}
let gateScanTimer: ReturnType<EngineInterface['clock']['after']> | undefined
const GATE_SCAN_MS = 15_000
// The last time a gate was seen, for the failed-gate toast (069 #44).
let gateSeenAt: number | undefined
let agentCounter = 0
// Commands that may run a gate, running now.
let gateCommands = 0

// Where the footer goes (035): the pane (the status entry keeps the lead), the status entry, or both.
let footerIn: 'pane' | 'status' | 'both' = 'pane'
// The pane footer's rows (041 #1): one, or statusline's three lines.
let footerLines: '1' | '3' = '1'
// The rule above the pane footer's chips (041 #8).
let footerSeparator: 'solid' | 'thin' | 'none' = 'solid'
// A branch, PR, skills or model chip that just changed draws a shade lighter for 30 seconds
// (041 #5, 068 #49), then settles; usage chips never brighten.
const FRESH_MS = 30_000
const BRIGHTEN_CHIPS: ReadonlySet<string> = new Set(['git', 'pr', 'skills', 'model'])
const FRESH_SHARE = 0.25
const chipAges = new Map<string, { text: string; at?: number }>()
let freshDeadline: number | undefined
let noColor = false

/** Whether a chip's text just changed, or is still within a few seconds of its last change (041 #5). */
const freshChip = (key: string, text: string, now: number): boolean => {
  const entry = chipAges.get(key)
  const changed = entry !== undefined && entry.text !== text
  chipAges.set(key, { text, at: changed ? now : entry?.at })
  return changed || (entry?.at !== undefined && now - entry.at < FRESH_MS)
}

/** Redraws the pane once the freshest chip settles (041 #5). */
const scheduleFresh = ($: EngineInterface, now: number): void => {
  const at = now + FRESH_MS
  if (freshDeadline !== undefined && freshDeadline <= at) return
  freshDeadline = at
  $.clock.after(Math.max(0, at - now), () => {
    freshDeadline = undefined
    try {
      $.ui.invalidate('ui.render')
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
  })
}

// The options' defaults from plugin.json, read once at session start (052 #39).
let defaultsSeen: Record<string, string | number | boolean> = {}
let bandDensity: BandDensity = 'full'
// How roomy the Specs list is (078 FR-096).
let paneDensity: 'compact' | 'comfortable' = 'compact'
let gitNeedsRefresh = true

/** Writes what the session counted since the last write, merged with `change`, if anything moved. */
async function flushStats($: EngineInterface, change: (s: SessionStats) => SessionStats = s => s): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { value, version } = await $.state.get(SESSION)
    const now = await $.clock.now()
    const before: SessionStats = value ?? { startedAt: now, turns: 0, toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, series: [] }
    const counted: SessionStats = {
      ...before,
      toolCalls: before.toolCalls + live.toolCalls,
      drifts: before.drifts + live.drifts,
      ...(Object.keys(live.driftsById).length === 0
        ? {}
        : { driftsByFeature: Object.fromEntries([...new Set([...Object.keys(before.driftsByFeature ?? {}), ...Object.keys(live.driftsById)])].map(id => [id, (before.driftsByFeature?.[id] ?? 0) + (live.driftsById[id] ?? 0)])) }),
      agentsRun: before.agentsRun + live.agentsRun,
      ...(Object.keys(live.agentsById).length === 0
        ? {}
        : { agentsByFeature: Object.fromEntries([...new Set([...Object.keys(before.agentsByFeature ?? {}), ...Object.keys(live.agentsById)])].map(id => [id, (before.agentsByFeature?.[id] ?? 0) + (live.agentsById[id] ?? 0)])) }),
      agentsQueued: before.agentsQueued + live.agentsQueued,
      ...(live.ticksMain + live.ticksSub === 0
        ? {}
        : { ticksBy: { main: (before.ticksBy?.main ?? 0) + live.ticksMain, sub: (before.ticksBy?.sub ?? 0) + live.ticksSub } }),
      ...(live.linesAdded + live.linesRemoved === 0
        ? {}
        : { lines: { added: (before.lines?.added ?? 0) + live.linesAdded, removed: (before.lines?.removed ?? 0) + live.linesRemoved } }),
      ...(live.model === undefined ? {} : { model: live.model }),
      ...(live.effort === undefined ? {} : { effort: live.effort }),
      // Facts the footer reads (068): kept in memory between turns, written with the next flush.
      ...(live.skills.length === 0 ? {} : { skills: [...new Set([...(before.skills ?? []), ...live.skills])].slice(-12) }),
      ...(live.todo === undefined ? {} : { todo: live.todo }),
      ...(live.cache === undefined ? {} : { cache: live.cache }),
      ...(live.fast === undefined ? {} : { fast: live.fast }),
      ...(live.dirs === undefined ? {} : { dirs: live.dirs }),
    }
    const next = change(counted)
    if (value !== undefined && JSON.stringify(next) === JSON.stringify(value)) return
    if ((await $.state.set(SESSION, next, { ifVersion: version })).isSet) {
      live.toolCalls = 0
      live.drifts = 0
      live.driftsById = {}
      live.agentsRun = 0
      live.agentsById = {}
      live.ticksMain = 0
      live.ticksSub = 0
      live.agentsQueued = 0
      live.linesAdded = 0
      live.linesRemoved = 0
      return
    }
  }
}

/** Shows a bounded notification and keeps its full text in the Session tab (052 #44). */
async function showToast($: EngineInterface, text: string, options?: { timeoutMs?: number; kind?: 'ok' | 'warn' | 'update' }): Promise<void> {
  const formatted = formatToast(text, t(currentLang(), 'toast.details'), options?.kind ?? 'ok')
  if (formatted.full !== undefined) await flushStats($, stats => ({ ...stats, toastDetails: formatted.full }))
  $.ui.toast(formatted.text, options?.timeoutMs === undefined ? undefined : { timeoutMs: options.timeoutMs })
}

/** One `git status` at the end of a main turn (018 FR-003): no shell, 2 s at most. */
async function readGit($: EngineInterface, root: string | undefined, branch: string | undefined, afterGitCommand = false): Promise<SessionStats['git'] | undefined> {
  // A branch read from the repository files says there is a repository: no extra check.
  if (root === undefined || (branch === undefined && !afterGitCommand)) return undefined
  try {
    const run = await $.process.run(GIT_STATUS, { cwd: root, timeoutMs: 2000 })
    if (run.exitCode !== 0) return undefined
    // The remote's web page, asked once per session (054 #79).
    if (remoteWeb === undefined) {
      const remote = await $.process.run(['git', 'remote', 'get-url', 'origin'], { cwd: root, timeoutMs: 2000 }).catch(() => undefined)
      remoteWeb = remote?.exitCode === 0 ? (remoteWebUrl(remote.stdout) ?? null) : null
    }
    const state = parseGitStatus(run.stdout)
    return remoteWeb === null ? state : { ...state, remote: remoteWeb }
  } catch {
    return undefined
  }
}

// The remote's web page for this session; null once asked and there is none.
let remoteWeb: string | null | undefined

let prRunning = false

const DEFER_BATCH = 100

/** Reads the deferred features a batch at a time, one timer each, until none is left (040). */
async function loadDeferred($: EngineInterface): Promise<void> {
  try {
    const held = (await $.state.get(SPECKIT)).value
    const pending = held?.features.filter(f => f.warnings.includes('loading')).map(f => f.dir) ?? []
    if (pending.length === 0) return
    const batch = pending.slice(0, DEFER_BATCH)
    const now = await $.clock.now()
    const fs = fsOf($)
    const next = await guarded($, async previous => (previous === undefined ? undefined : reconcileDeferred(fs, previous, batch, now)))
    if (next !== undefined) await showStatus($, next.state)
    await captureFeatureDurations($, next, now)
    if (pending.length > batch.length) $.clock.after(0, () => void loadDeferred($))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Keep project-wide specify-to-done timings in the store, not the bounded session state (054 #32). */
async function captureFeatureDurations($: EngineInterface, held: Held | undefined, now: number): Promise<void> {
  if (held === undefined) return
  const root = held.state.root
  if (root === undefined) return
  try {
    const key = `${FEATURE_DURATIONS}:${root}`
    const stored = await $.store.get(key)
    const records = stored === undefined ? {} : readFeatureDurations(stored)
    if (records === undefined) {
      featureDurationsByRoot.delete(root)
      $.ui.log(`astrolabe: invalid saved feature durations for ${root}`, { to: 'debug' })
      return
    }
    const updated = updateFeatureDurations(
      records,
      held.state.features.filter(feature => !feature.warnings.includes('loading')),
      now,
    )
    if (updated.changed) await $.store.set(key, updated.records)
    const finished = Object.values(updated.records)
      .filter((record): record is FeatureDuration & { completedAt: number; ms: number } => record.completedAt !== undefined && record.ms !== undefined)
      .sort((a, b) => b.completedAt - a.completedAt)
    featureDurationsByRoot.set(root, finished)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

// skillModels (030): off, or auto to send a skill's requests with the model and effort it does best with.
let skillModels: unknown = 'off'
// The skill the main thread last started this turn, cleared when the turn ends (030).
let skillRunning: string | undefined
// What the person changed in the Setup table: the model family and effort of a skill (078 FR-079).
let skillOverrides: SkillOverrides = {}

/** Gets the currently running skill (030). */
export function getSkillRunning(): string | undefined {
  return skillRunning
}

const PULLS_TTL_MS = 120_000
let pullsRunning = false

/** Reads the open pull requests for the PRs tab (032), at most every two minutes unless forced. */
async function refreshPulls($: EngineInterface, force = false): Promise<void> {
  if (pullsRunning) return
  const root = (await $.state.get(SPECKIT)).value?.root ?? (await $.session.cwd())
  const at = await $.clock.now()
  const was = (await $.state.get(SESSION)).value?.pulls
  if (!force && was !== undefined && at - was.at < PULLS_TTL_MS) return
  pullsRunning = true
  try {
    const run = await $.process.run(['gh', 'pr', 'list', '--state', 'open', '--limit', '20', '--json', PR_LIST_FIELDS], { cwd: root, timeoutMs: 8000 }).catch(() => undefined)
    // A gh that fails or hangs says so instead of leaving the tab on "Reading…" (054 #14).
    if (run === undefined || run.exitCode !== 0) {
      const error = run === undefined ? 'gh did not answer in 8 s' : firstLine(run.stderr || run.stdout) || `gh exited ${run.exitCode}`
      await flushStats($, s => ({ ...s, pulls: { at, rows: s.pulls?.rows ?? [], error } }))
      return
    }
    const rows = parsePullList(run.stdout)
    // The release gate (054 #60): plugin.json's version against the tags, where there is a plugin.json.
    const manifest = await $.fs.read(`${root}/.claude-plugin/plugin.json`).catch(() => undefined)
    const version = typeof manifest === 'string' ? /"version"\s*:\s*"(\d+\.\d+\.\d+)"/.exec(manifest)?.[1] : undefined
    let release: SessionStats['release']
    if (version !== undefined) {
      const tags = await $.process.run(['git', 'tag', '--list', 'v*', '--sort=-v:refname'], { cwd: root, timeoutMs: 3000 }).catch(() => undefined)
      const names = tags?.exitCode === 0 ? tags.stdout.split('\n').map(x => x.trim()).filter(x => x !== '') : []
      // How many commits the latest tag does not have (078 FR-068).
      const since = names[0] === undefined ? undefined : await $.process.run(['git', 'rev-list', '--count', `${names[0]}..HEAD`], { cwd: root, timeoutMs: 3000 }).catch(() => undefined)
      const unreleased = since?.exitCode === 0 ? Number(since.stdout.trim()) : undefined
      release = { version, tagged: names.includes(`v${version}`), ...(names[0] === undefined ? {} : { latest: names[0] }), ...(unreleased === undefined || !Number.isFinite(unreleased) ? {} : { unreleased }) }
    }
    await flushStats($, s => ({ ...s, pulls: { at, rows }, ...(release === undefined ? {} : { release }) }))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    pullsRunning = false
  }
}

/** Runs an action on a pull request (032) after its second press, then reads the list again. */
async function runPullAction($: EngineInterface, action: 'approve' | 'update' | 'merge', n: number, head?: string): Promise<void> {
  try {
    const lang = currentLang()
    // A merge waits for green checks (054 #58): pending or failing checks refuse it here.
    const checks = (await $.state.get(SESSION)).value?.pulls?.rows.find(r => r.number === n)?.checks
    if (action === 'merge' && (checks === 'pending' || checks === 'fail')) {
      await showToast($, t(lang, checks === 'pending' ? 'prs.mergePending' : 'prs.mergeFailing', { n }), { kind: 'warn' })
      return
    }
    const root = (await $.state.get(SPECKIT)).value?.root ?? (await $.session.cwd())
    const run = await $.process.run(pullAction(action, n, head), { cwd: root, timeoutMs: 30_000 })
    await showToast($, run.exitCode === 0 ? t(lang, `prs.done.${action}`, { n }) : t(lang, 'prs.failed', { n, error: (run.stderr || run.stdout).trim().split('\n')[0] ?? '', fix: pullAction(action, n).join(' ') }), run.exitCode === 0 ? undefined : { kind: 'warn' })
    await refreshPulls($, true)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** The PRs tab (032), led by gstack's /ship for the branch when gstack is installed (054 #96). */
function pullsBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
  stats: SessionStats | undefined,
  speckit?: SpeckitState,
): Array<{ node: RenderNode; rows: number; select?: string }> {
  const elements = $.ui.resolve(e)
  const branch = stats?.git?.branch
  const ship =
    stats?.gstack === true && branch !== undefined && branch !== 'main' && branch !== 'master' && 'Button' in elements
      ? [{ rows: 1, node: <elements.Button key="gstack-ship" label={t(currentLang(), 'prs.ship', { branch })} plain onPress={() => void $.clock.after(0, () => void runSkill($, 'ship', `branch ${branch}`))} /> }]
      : []
  const release = stats?.release
  const gate =
    release === undefined
      ? []
      : [
          {
            rows: 1,
            node: (
              <elements.Text key="astrolabe-release-gate" color={release.tagged ? tokens0[STATUS_ROLE.warning] : tokens0[STATUS_ROLE.success]} wrap="truncate-end">
                {`${t(currentLang(), release.tagged ? 'prs.release.tagged' : 'prs.release.ready', { version: release.version, latest: release.latest ?? '—' })}${release.unreleased === undefined || release.latest === undefined ? '' : ` · ${t(currentLang(), 'prs.release.since', { n: release.unreleased, tag: release.latest })}`}`}
              </elements.Text>
            ),
          },
        ]
  return [...ship, ...gate, ...pullsRows($, e, pane, stats, speckit)]
}

/** The PRs tab's rows (032): a link per pull request, its state, and the buttons GitHub allows. */
function pullsRows(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
  stats: SessionStats | undefined,
  speckit?: SpeckitState,
): Array<{ node: RenderNode; rows: number; select?: string }> {
  const elements = $.ui.resolve(e)
  const { Box, Text, Button } = elements
  const Link = 'Link' in elements ? elements.Link : undefined
  const lang = currentLang()
  const rows = stats?.pulls?.rows
  if (rows === undefined) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'prs.loading')}</Text> }]
  if (stats?.pulls?.error !== undefined && rows.length === 0) return [{ rows: 1, node: <Text color={tokens0[STATUS_ROLE.error]}>{t(lang, 'prs.listFailed', { error: stats.pulls.error })}</Text> }]
  if (rows.length === 0) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'prs.none')}</Text> }]
  const press = (key: string, run: () => void) => async () => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (held.confirm === key) {
      const { confirm: _gone, ...rest } = held
      await $.state.set(PANE_STATE, rest)
      $.clock.after(0, run)
    } else {
      await $.state.set(PANE_STATE, { ...held, confirm: key })
      // The second press must come within 10 s; after that the row asks again from scratch (052 #41).
      $.clock.after(10_000, () => void (async () => {
        const now = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        if (now.confirm !== key) return
        const { confirm: _late, ...rest } = now
        await $.state.set(PANE_STATE, rest)
      })().catch(error => $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })))
    }
  }
  // Checks as cells: ✓ passed, ✖ failed, ◷ pending (066 #28).
  const mark = (c: string) => (c === 'pass' ? '✓' : c === 'fail' ? '✖' : c === 'pending' ? STATE_GLYPHS.elapsed : '·')
  const colour = (c: string) => (c === 'pass' ? tokens0[STATUS_ROLE.success] : c === 'fail' ? tokens0[STATUS_ROLE.error] : c === 'pending' ? tokens0[STATUS_ROLE.warning] : tokens0.muted)
  const columns = (e.props as { bodyColumns?: number }).bodyColumns ?? 80
  // The filter of the tab: `is:failing`, `is:draft`, `is:approved`, `is:behind`, `is:mine` (the branch you are on), words (078 FR-070).
  const tokens = (pane.filter ?? '').trim().toLowerCase().split(/\s+/).filter(x => x !== '')
  const words = tokens.filter(x => !x.startsWith('is:')).join(' ')
  const is = new Set(tokens.filter(x => x.startsWith('is:')).map(x => x.slice(3)))
  const mine = stats?.git?.branch
  const wanted = rows.filter(pr =>
    (words === '' || `#${pr.number} ${pr.title} ${pr.branch}`.toLowerCase().includes(words)) &&
    (!is.has('failing') || pr.checks === 'fail') &&
    (!is.has('draft') || pr.isDraft) &&
    (!is.has('approved') || pr.review === 'approved') &&
    (!is.has('behind') || pr.merge === 'BEHIND') &&
    (!is.has('mine') || (mine !== undefined && pr.branch === mine)),
  )
  // The ones that need the person lead: failing checks, then requested changes, then the rest (078 FR-066).
  const need = (pr: (typeof rows)[number]): number => (pr.checks === 'fail' ? 0 : pr.review === 'changes' ? 1 : pr.merge === 'BEHIND' ? 2 : pr.checks === 'pending' ? 3 : 4)
  const ordered = [...wanted].sort((a, b) => need(a) - need(b) || b.number - a.number)
  // The table's columns: the title takes what the checks, the review and the age leave (078 FR-061).
  const reviewWidth = Math.max(...Object.values({ a: 'approved', b: 'changes requested', c: 'review required', d: 'no review' }).map(w => w.length))
  const titleRoom = Math.max(12, columns - 4 - 8 - reviewWidth - 4 - 6)
  const spec = (pr: (typeof rows)[number]) => specOfBranch(pr.branch, speckit?.features ?? [])
  const header = { rows: 1, node: <Text key="prs-header" color={tokens0.faint} wrap="truncate-end">{t(lang, 'prs.header')}</Text> }
  const noPr =
    mine === undefined || mine === 'main' || mine === 'master' || rows.some(pr => pr.branch === mine) || is.size > 0 || words !== ''
      ? []
      : [
          {
            rows: 1,
            node: (
              <Box key="prs-no-pr" flexDirection="row">
                <Text color={tokens0.muted}>{`${t(lang, 'prs.noPr', { branch: mine })}  `}</Text>
                <Button key="prs-open-pr" label={t(lang, 'prs.openPr')} plain onPress={() => void $.prompt.suggest({ text: `Open a pull request for branch ${mine} with: gh pr create --fill` }).catch(() => undefined)} />
              </Box>
            ),
          },
        ]
  const standing = pane.selectedPr !== undefined && ordered.some(pr => `pr-${pr.number}` === pane.selectedPr) ? pane.selectedPr : ordered[0] === undefined ? undefined : `pr-${ordered[0].number}`
  if (ordered.length === 0) return [header, ...noPr, { rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'pane.noMatch', { filter: (pane.filter ?? '').trim() })}</Text> }]
  return [header, ...noPr, ...ordered.flatMap(pr => {
    const title = `#${pr.number} ${pr.title}`
    const shownTitle = [...title].length > titleRoom ? `${[...title].slice(0, titleRoom - 1).join('')}…` : title
    const cells = pr.runs === undefined || pr.runs.length === 0 ? mark(pr.checks) : pr.runs.slice(0, 6).map(run => mark(run.result)).join('')
    // Who opened it and how long ago, as of the last read (052 #40).
    const age = pr.createdAt === undefined || stats?.pulls === undefined ? '' : ageOf(pr.createdAt, stats.pulls.at)
    const opened = [pr.author === undefined ? '' : `@${pr.author}`, age].filter(x => x !== '').join(' ')
    const facts = [opened, pr.branch].filter(x => x !== '').join('  ')
    // Draft and labels are small chips, dim for a draft (078 FR-065).
    const chips = [pr.isDraft ? `[${t(lang, 'prs.draft')}]` : '', ...pr.labels.map(l => `[${l}]`)].filter(x => x !== '').join(' ')
    const buttons: RenderNode[] = []
    const add = (action: 'approve' | 'update' | 'merge') => {
      const key = `pr-${action}-${pr.number}`
      buttons.push(<Button key={key} label={pane.confirm === key ? t(lang, 'prs.confirmAction', { action: t(lang, `prs.${action}`).toLowerCase(), n: pr.number }) : t(lang, `prs.${action}`)} onPress={press(key, () => void runPullAction($, action, pr.number, pr.head))} />, <Text> </Text>)
    }
    if (pr.review !== 'approved' && !pr.isDraft) add('approve')
    if (pr.merge === 'BEHIND') add('update')
    if (pr.merge === 'CLEAN' && !pr.isDraft) add('merge')
    const dir = spec(pr)
    const feature = speckit?.features.find(f => f.dir === dir)
    return [
      {
        rows: 1,
        select: `pr-${pr.number}`,
        node: (
          <Box flexDirection="row">
            <Text color={tokens0.accent} bold>{standing === `pr-${pr.number}` ? '❯ ' : '  '}</Text>
            {Link !== undefined && pr.url !== '' ? <Link href={pr.url} label={shownTitle} /> : <Text color={colour(pr.checks)}>{shownTitle}</Text>}
            <Text>{' '.repeat(Math.max(2, titleRoom - [...shownTitle].length + 2))}</Text>
            <Text color={colour(pr.checks)}>{cells.padEnd(8)}</Text>
            <Text color={pr.isDraft ? tokens0.faint : tokens0.text} wrap="truncate-end">{`${t(lang, `prs.review.${pr.review}`).padEnd(reviewWidth)}  ${age}`}</Text>
          </Box>
        ),
      },
      {
        rows: 1,
        node: (
          <Box flexDirection="row">
            <Text color={pr.isDraft ? tokens0.faint : tokens0.muted}>{`   ${chips === '' ? '' : `${chips}  `}${facts}  `}</Text>
            {feature === undefined ? null : <Button key={`pr-spec-${pr.number}`} label={`→ ${feature.id}`} plain onPress={async () => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              const { help: _h, tasksOnly: _t, selectedTask: _s, ...rest } = held
              await $.state.set(PANE_STATE, { ...rest, tab: 'specs', selectedFeature: feature.id })
            }} />}
            {feature === undefined ? null : <Text> </Text>}
            {buttons}
          </Box>
        ),
      },
      // Each check, linked to its run (054 #80), at most 6.
      ...(Link === undefined || pr.runs === undefined
        ? []
        : [
            {
              rows: 1,
              node: (
                <Box flexDirection="row">
                  <Text color={tokens0.muted}>{'   '}</Text>
                  {pr.runs.slice(0, 6).map(run => (
                    <Link key={`pr-run-${pr.number}-${run.name}`} href={run.url} label={`${mark(run.result)} ${run.name} `} />
                  ))}
                </Box>
              ),
            },
          ]),
    ]
  })]
}

// Astrolabe's own /config rows (028), read at session start and after a save.
let configRows: ConfigRow[] = []

/** The Config tab's rows (028): a heading per group that folds, an option per row, its control and card. */
function configBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
  speckit?: SpeckitState,
): Array<{ node: RenderNode; rows: number; /** The key the arrow keys stand on when the unit is an option (079). */ select?: string; /** Drawn over the rows below the option while it is hovered, out of the flow (079). */ card?: { scope: string; node: RenderNode } }> {
  const elements = $.ui.resolve(e)
  const { Box, Text, Button } = elements
  const Select = 'Select' in elements ? elements.Select : undefined
  const Input = 'Input' in elements ? elements.Input : undefined
  const Link = 'Link' in elements && e.surface === 'terminal' ? elements.Link : undefined
  const lang = currentLang()
  const draft = pane.draft ?? {}
  const setDraft = async (key: string, value: string | number | boolean) => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    await $.state.set(PANE_STATE, { ...held, draft: { ...(held.draft ?? {}), [key]: value } })
  }
  const rows: Array<{ node: RenderNode; rows: number; select?: string; card?: { scope: string; node: RenderNode } }> = []
  if (configRows.length === 0) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'config.none')}</Text> }]
  // The values as they would be with the draft, for the conflicts between options (078 FR-082).
  const values: Record<string, unknown> = {}
  for (const row of configRows) values[row.key.replace(/^astrolabe\./, '')] = row.key in draft ? draft[row.key] : row.value
  const conflicts = optionConflicts(values, lang)
  // `/` finds an option by its name and by what it says (board 4, 075 FR-017, 078 FR-074).
  const needle = (pane.filter ?? '').trim().toLowerCase()
  const wanted = (row: ConfigRow) => needle === '' || `${row.key} ${row.label} ${row.description ?? ''}`.toLowerCase().includes(needle)
  const groups = Object.keys(OPTION_GROUPS) as OptionGroup[]
  const ordered = groups.flatMap(group => configRows.filter(row => optionGroup(row.key) === group && wanted(row)).map((row, i) => ({ row, group, heading: i === 0 ? group : undefined })))
  if (needle !== '' && ordered.length === 0) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'pane.noMatch', { filter: needle })}</Text> }]
  const changedGroups = new Set(configRows.filter(r => r.key in draft && draft[r.key] !== r.value).map(r => optionGroup(r.key)))
  // Only the group with a change is open, and the first one; a search opens every group it finds (078 FR-071).
  const isOpen = (group: OptionGroup): boolean => needle !== '' || changedGroups.has(group) || (pane.groupsOpen === undefined ? group === groups[0] : pane.groupsOpen.includes(group))
  const toggle = (group: OptionGroup) => async () => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    const openNow = new Set(groups.filter(g => (held.groupsOpen === undefined ? g === groups[0] : held.groupsOpen.includes(g))))
    if (openNow.has(group)) openNow.delete(group)
    else openNow.add(group)
    await $.state.set(PANE_STATE, { ...held, groupsOpen: [...openNow] })
  }
  // The look presets: one key each, set as a draft that Save applies (078 FR-075).
  if (needle === '') {
    const matching = presetMatching(values)
    rows.push({
      rows: 1,
      node: (
        <Box key="setup-presets" flexDirection="row">
          <Text color={tokens0.muted}>{`${t(lang, 'setup.presets')}  `}</Text>
          {(['minimal', 'balanced', 'full'] as const).map(name => (
            <Button
              key={`setup-preset-${name}`}
              label={t(lang, `setup.preset.${name}` as TextKey)}
              {...(matching === name ? { variant: 'primary' as const } : {})}
              onPress={async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                const next: Record<string, string | number | boolean> = { ...(held.draft ?? {}) }
                for (const [field, value] of Object.entries(LOOK_PRESETS[name])) {
                  const row = configRows.find(r => r.key === `astrolabe.${field}`)
                  if (row !== undefined && !row.isLocked) next[row.key] = value
                }
                await $.state.set(PANE_STATE, { ...held, draft: next })
              }}
            />
          ))}
        </Box>
      ),
    })
  }
  // The band as the drafted density would draw it, under the presets (078 FR-076).
  if (needle === '' && speckit !== undefined) {
    const density = values['bandDensity'] === 'compact' || values['bandDensity'] === 'minimal' ? values['bandDensity'] : 'full'
    const line = bandText(bandSegments(speckit, Math.min(100, (e.props as { bodyColumns?: number }).bodyColumns ?? 80), { density }))
    if (line.trim() !== '') rows.push({ rows: 1, node: <Text key="setup-preview" color={tokens0.muted} wrap="truncate-end">{`${t(lang, 'setup.preview')}  ${line}`}</Text> })
  }
  for (const { row, group, heading } of ordered) {
    if (heading !== undefined) {
      const n = configRows.filter(r => optionGroup(r.key) === group).length
      rows.push({
        rows: 1,
        node: <Button key={`config-group-${heading}`} label={`${isOpen(group) ? '▾' : '▸'} ${t(lang, `config.group.${heading}` as TextKey)} ${n}`} plain onPress={toggle(group)} />,
      })
    }
    if (!isOpen(group)) continue
    const shown = row.key in draft ? draft[row.key] : row.value
    const changed = row.key in draft && draft[row.key] !== row.value
    // ● a change not saved yet; • a saved value that differs from the option's default (052 #39).
    // The option the arrow keys stand on has `❯` in a gutter every row keeps (079).
    const stood = (pane.selectedOption ?? ordered.find(o => isOpen(o.group))?.row.key) === row.key
    const label = `${stood ? '❯ ' : '  '}${configMark(changed, row.value, defaultsSeen, row.key)}${row.label}`.padEnd(32)
    const key = `config-${row.key}`
    let control: RenderNode
    if (row.isLocked) control = <Text color={tokens0.muted}>{`${String(shown)} (${t(lang, 'config.locked')})`}</Text>
    else if (row.kind === 'boolean') control = <Button key={key} label={shown === true ? '[x] on' : '[ ] off'} onPress={() => setDraft(row.key, shown !== true)} />
    else if (row.kind === 'choice' && row.options !== undefined && Select !== undefined)
      control = <Select key={key} options={row.options.map(value => ({ value }))} value={String(shown)} onSelect={(value: string) => setDraft(row.key, value)} />
    else if (row.kind === 'choice' && row.options !== undefined) {
      const options = row.options
      const next = options[(options.indexOf(String(shown)) + 1) % options.length] ?? String(shown)
      // `‹ value ›` with the other choices after it (board 4); a press moves to the next one.
      control = (
        <Box key={key} flexDirection="row">
          <Button label={`‹ ${String(shown)} ›`} onPress={() => setDraft(row.key, next)} />
          <Text color={tokens0.faint}>{`  ${options.filter(o => o !== String(shown)).join(' · ')}`}</Text>
        </Box>
      )
    } else if (Input !== undefined) {
      const save = (value: string) => setDraft(row.key, row.kind === 'number' ? Number(value) : value)
      control = <Input key={key} value={String(shown)} onInput={save} onSubmit={save} />
    } else control = <Text>{String(shown)}</Text>
    const defaultValue = defaultsSeen[row.key]
    const field = row.key.replace(/^astrolabe\./, '')
    const named = conflicts.filter(c => c.field === field)
    // One option back to its default, as a draft (078 FR-077).
    const offDefault = !row.isLocked && defaultValue !== undefined && shown !== defaultValue
    rows.push({
      // The option and the conflicts named under it; the card is not part of the height (079).
      rows: 1 + named.length,
      select: row.key,
      // The card is an absolute box drawn after every row, so it paints over them and moves none: in
      // the flow it pushed the settings below down on every hover (079).
      card: {
        scope: `config-row-${row.key}`,
        node: (
          <Box flexDirection="column" paddingX={1} backgroundColor={tokens0.barEmpty}>
            <Text color={tokens0.accent}>{`${t(lang, 'config.default')}: ${defaultValue === undefined ? t(lang, 'word.unknown') : String(defaultValue)}`}</Text>
            <Text color={tokens0.text} wrap="wrap">{row.description ?? t(lang, 'config.noDescription')}</Text>
            {Link === undefined ? null : <Link href={OPTIONS_README} label={`${t(lang, 'setup.readme')} ↗`} />}
          </Box>
        ),
      },
      node: (
        <Box key={`config-row-${row.key}`} flexDirection="column" hover={{ scope: `config-row-${row.key}` }}>
          <Box flexDirection="row">
            <Text color={stood ? tokens0.accent : changed ? tokens0.current : tokens0.text} bold={stood}>{label}</Text>
            {control}
            {offDefault ? <Button key={`config-reset-${row.key}`} label={t(lang, 'setup.resetOne')} plain onPress={() => setDraft(row.key, defaultValue)} /> : null}
            {row.key === 'astrolabe.icons' && String(shown) === 'auto' ? <Text color={tokens0.faint}>{`  (${t(lang, iconsFor('auto', e.surface) === 'nerd' ? 'config.iconsNerd' : iconsFor('auto', e.surface) === 'ascii' ? 'config.iconsAscii' : 'config.iconsEmoji')})`}</Text> : null}
          </Box>
          {named.map((c, i) => (
            <Text key={`config-conflict-${row.key}-${i}`} color={tokens0.current} wrap="truncate-end">{`  ▲ ${c.text}`}</Text>
          ))}
        </Box>
      ),
    })
  }
  return rows
}

/** Save, Reset, Cancel and the copy button: one bar that stays in view above the options (078 FR-073). */
function configBar(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
): RenderNode[] {
  const { Box, Text, Button } = $.ui.resolve(e)
  const lang = currentLang()
  const draft = pane.draft ?? {}
  if (configRows.length === 0) return []
  const pending = Object.keys(draft).filter(k => draft[k] !== configRows.find(r => r.key === k)?.value)
  return [
    <Box key="config-bar" flexDirection="row">
      <Button key="config-save" label={pending.length === 0 ? t(lang, 'config.saved') : t(lang, 'config.save', { n: pending.length })} variant="primary" onPress={() => saveConfig($)} />
      <Text> </Text>
      {/* Every option back to its default, as a draft Save applies (054 #63). */}
      <Button key="config-reset" label={t(lang, 'config.reset')} onPress={() => draftDefaults($)} />
      <Text> </Text>
      <Button key="config-cancel" label={t(lang, 'config.cancel')} onPress={async () => {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        const { draft: _gone, ...rest } = held
        await $.state.set(PANE_STATE, rest)
      }} />
      {pending.length === 0 ? null : <Text> </Text>}
      {pending.length === 0 ? null : <Button key="config-copy" label={t(lang, 'setup.copy')} plain onPress={() => void copyNext($, changedSettingsJson(Object.fromEntries(pending.map(k => [k, draft[k]!]))), e.surface)} />}
    </Box>,
  ]
}

/**
 * The model table of Setup (030, 078 FR-079): each skill with the model family and effort auto mode
 * sends it with, as two buttons that cycle; `▸` marks the skill running now. A choice is kept in the
 * mod's store and laid over the built-in table.
 */
function modelSkillTabBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  _pane: PaneState,
): Array<{ node: RenderNode; rows: number }> {
  const { Box, Text, Button } = $.ui.resolve(e)
  const lang = currentLang()
  const auto = skillModels === 'auto'
  const active = getSkillRunning()
  const rows: Array<{ node: RenderNode; rows: number }> = []
  const change = (name: string, patch: { model?: (typeof MODEL_FAMILIES)[number]; effort?: (typeof EFFORTS)[number] }) => async () => {
    skillOverrides = { ...skillOverrides, [name]: { ...(skillOverrides[name] ?? {}), ...patch } }
    await $.store.set('skillOverrides', skillOverrides).catch(() => undefined)
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    await $.state.set(PANE_STATE, { ...held })
  }
  const names = Object.keys(SKILL_MODELS)
  for (const category of ['speckit', 'gstack'] as const) {
    rows.push({ rows: 1, node: <Text key={`models-${category}`} color={tokens0.accent} bold>{t(lang, `models.category.${category}`)}</Text> })
    for (const name of names.filter(n => (category === 'speckit') === n.startsWith('speckit-'))) {
      const entry = skillModelFor(name, skillOverrides)!
      const running = auto && active !== undefined && skillNameOf(active) === name
      const family = familyOf(entry.model)
      const nextFamily = MODEL_FAMILIES[(MODEL_FAMILIES.indexOf(family) + 1) % MODEL_FAMILIES.length]!
      const nextEffort = EFFORTS[(EFFORTS.indexOf(entry.effort) + 1) % EFFORTS.length]!
      rows.push({
        rows: 1,
        node: (
          <Box key={`skill-${name}`} flexDirection="row">
            <Text color={running ? tokens0.current : tokens0.text}>{`${running ? '▸' : ' '} ${name.padEnd(22)}`}</Text>
            <Button key={`model-${name}`} label={`‹ ${family} ›`} plain onPress={change(name, { model: nextFamily })} />
            <Text> </Text>
            <Button key={`effort-${name}`} label={`‹ ${entry.effort} ›`} plain onPress={change(name, { effort: nextEffort })} />
            <Text color={tokens0.faint}>{`  ${entry.why}${running ? `  ← ${t(lang, 'models.running')}` : ''}`}</Text>
          </Box>
        ),
      })
    }
  }
  rows.push({ rows: 1, node: <Text color={tokens0.muted}>{auto ? t(lang, 'models.autoModeActive', { active: active ?? t(lang, 'models.idle') }) : t(lang, 'models.autoModeOff')}</Text> })
  return rows
}

/** Applies the Config tab's changes through $.config.set (028); options reload the mod. */
/** The options' defaults from our own plugin.json (054 #63). */
async function defaults($: EngineInterface): Promise<Record<string, string | number | boolean>> {
  const text = await fsOf($).read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => '')
  return optionDefaults(text)
}

/** Puts every option that differs from its default in the draft, for Save to apply (054 #63). */
async function draftDefaults($: EngineInterface): Promise<void> {
  const wanted = await defaults($)
  const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
  const draft = { ...(held.draft ?? {}) }
  for (const row of configRows) if (!row.isLocked && row.key in wanted && wanted[row.key] !== row.value) draft[row.key] = wanted[row.key]!
  await $.state.set(PANE_STATE, { ...held, draft })
}

/** `/astrolabe config reset`: every option back to its default now (054 #63). */
async function resetConfig($: EngineInterface): Promise<string> {
  const wanted = await defaults($)
  const rows = (await $.config.list().catch(() => [] as ConfigRow[])).filter(row => row.key.startsWith('astrolabe.'))
  const changed: string[] = []
  for (const row of rows) {
    if (row.isLocked || !(row.key in wanted) || wanted[row.key] === row.value) continue
    const result = await $.config.set({ key: row.key, value: wanted[row.key]! }).catch(() => ({ deny: 'refused' }))
    if (!('deny' in result && result.deny !== undefined)) changed.push(row.key.replace(/^astrolabe\./, ''))
  }
  configRows = (await $.config.list().catch(() => [] as ConfigRow[])).filter(row => row.key.startsWith('astrolabe.'))
  return t(currentLang(), changed.length === 0 ? 'config.resetNone' : 'config.resetDone', { list: changed.join(', ') })
}

async function saveConfig($: EngineInterface): Promise<void> {
  const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
  const draft = held.draft ?? {}
  const refused: string[] = []
  let saved = 0
  for (const [key, value] of Object.entries(draft)) {
    if (configRows.find(r => r.key === key)?.value === value) continue
    const result = await $.config.set({ key, value }).catch((error: unknown) => ({ deny: error instanceof Error ? error.message : String(error) }))
    if ('deny' in result && result.deny !== undefined) refused.push(`${key}: ${result.deny}`)
    else saved += 1
  }
  const { draft: _gone, ...rest } = held
  await $.state.set(PANE_STATE, rest)
  configRows = (await $.config.list().catch(() => [] as ConfigRow[])).filter(row => row.key.startsWith('astrolabe.'))
  const lang = currentLang()
  await showToast($, refused.length === 0 ? t(lang, 'config.applied', { n: saved }) : t(lang, 'config.refused', { list: refused.join('; ') }), refused.length === 0 ? undefined : { kind: 'warn' })
}

// The options as loaded, for drawings that need more than one (039).
let optionsSeen: Readonly<Record<string, unknown>> = {}

// How many units each pane tab drew last (038), to clamp a scroll that arrives between draws.
const unitsShown: Partial<Record<string, number>> = {}
/** What the pane body shows: the help overlay above the tab, or the tab (066 #21). */
const viewOf = (pane: Pick<PaneState, 'tab' | 'help'>): PaneView => (pane.help === true ? 'help' : pane.tab)
const featureDurationsByRoot = new Map<string, FeatureDuration[]>()
let specSelectionRows: Array<{ key: string; index: number }> = []
// The rows the arrow keys stand on in Setup and PRs, with the window drawn (079).
let listSelection: { tab: 'setup' | 'prs'; rows: Array<{ key: string; index: number }>; window: { start: number; end: number }; selected: string | undefined } | undefined
let selectedSpecRow: string | undefined
let specSelectionWindow = { start: 0, end: 0 }
let specLinksEnabled = false
// The roadmap read once per session and root (044 #40); a turn's work may redraw the Specs tab
// many times, and each redraw must not read the file again (054 #1).
const roadmapCache = new Map<string, string | undefined>()

// Whether a finished feature gets a summary from a small model (026 #53), off by default.
let featureSummary = false
const SUMMARIES = 'summaries'

/** Five lines on a finished feature, from `haiku`, kept in $.store and shown in the Session tab (026 #53). */
async function summarizeFeature($: EngineInterface, feature: { dir: string; id: string; name: string }): Promise<void> {
  try {
    const root = (await $.state.get(SPECKIT)).value?.root
    if (root === undefined) return
    const fs = fsOf($)
    const spec = await fs.read(`${root}/specs/${feature.dir}/spec.md`).catch(() => '')
    const tasks = await fs.read(`${root}/specs/${feature.dir}/tasks.md`).catch(() => '')
    const reply = await $.model.complete({
      model: 'haiku',
      maxTokens: 300,
      prompt: `Summarize this finished Spec Kit feature in at most five short lines, plain text, no headings: what it delivers and anything left open.\n\n${spec.slice(0, 8000)}\n\n${tasks.slice(0, 4000)}`,
    })
    if (!reply.isAnswered) return
    const stored = await $.store.get(SUMMARIES).catch(() => undefined)
    const all = typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? (stored as Record<string, string>) : {}
    await $.store.set(SUMMARIES, { ...all, [feature.dir]: reply.text.trim().split('\n').slice(0, 5).join('\n') })
    await flushStats($, s => ({ ...s, lastSummary: { dir: feature.dir, text: reply.text.trim().split('\n').slice(0, 5).join('\n') } }))
    await showToast($, t(currentLang(), 'summary.ready', { feature: `${feature.id} ${feature.name}` }))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

const GIT_WORKTREES = ['git', 'worktree', 'list', '--porcelain']
let worktreesRunning = false

/** Reads what the repository's other worktrees work on (037): one git call, then their spec files. */
async function refreshWorktrees($: EngineInterface, root: string): Promise<void> {
  if (worktreesRunning) return
  worktreesRunning = true
  try {
    const run = await $.process.run(GIT_WORKTREES, { cwd: root, timeoutMs: 2000 }).catch(() => undefined)
    const list = run?.exitCode === 0 ? parseWorktrees(run.stdout) : []
    const main = list[0]
    const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
    const rel = main === undefined ? '' : norm(root).startsWith(norm(main.path)) ? norm(root).slice(norm(main.path).length) : ''
    const fs = fsOf($)
    const found: NonNullable<SessionStats['worktrees']> = []
    const previous = (await $.state.get(SESSION)).value?.worktrees ?? []
    // Branches already merged into the main checkout's branch (054 #50), one git call.
    const merged = main?.branch === undefined ? new Set<string>() : await $.process.run(['git', 'branch', '--merged', main.branch], { cwd: root, timeoutMs: 2000 }).then(r => (r.exitCode === 0 ? mergedBranches(r.stdout) : new Set<string>())).catch(() => new Set<string>())
    for (const wt of list.slice(1, 9)) {
      const old = previous.find(item => item.path !== undefined && norm(item.path) === norm(wt.path) && item.head === wt.head && item.branch === wt.branch)
      if (old !== undefined && wt.head !== undefined) {
        const status = await $.process.run(['git', 'status', '--porcelain'], { cwd: wt.path, timeoutMs: 2000 }).catch(() => undefined)
        const { changed: _changed, merged: _merged, ...kept } = old
        found.push({
          ...kept,
          name: worktreeName(wt.path),
          ...(wt.branch === undefined ? {} : { branch: wt.branch }),
          head: wt.head,
          path: wt.path,
          ...(status?.exitCode === 0 ? { changed: uncommittedCount(status.stdout) } : {}),
          ...(wt.branch !== undefined && merged.has(wt.branch) ? { merged: true } : {}),
        })
        continue
      }
      const specRoot = `${norm(wt.path)}${rel}`
      if (norm(specRoot) === norm(root)) continue
      const dirs = (await fs.list(`${specRoot}/specs`).catch(() => [])).filter(d => d.kind === 'dir').map(d => d.name)
      const dir = featureDirFor(wt.branch, dirs)
      if (dir === undefined) continue
      const feature = deriveFeature(await readFeature(fs, specRoot, dir))
      // Its uncommitted files (054 #51).
      const status = await $.process.run(['git', 'status', '--porcelain'], { cwd: wt.path, timeoutMs: 2000 }).catch(() => undefined)
      const changed = status?.exitCode === 0 ? uncommittedCount(status.stdout) : undefined
      found.push({
        name: worktreeName(wt.path),
        ...(wt.branch === undefined ? {} : { branch: wt.branch }),
        ...(wt.head === undefined ? {} : { head: wt.head }),
        dir,
        id: feature.id,
        featureName: feature.name,
        phase: feature.phase,
        done: feature.done,
        total: feature.total,
        path: wt.path,
        ...(changed === undefined ? {} : { changed }),
        ...(wt.branch !== undefined && merged.has(wt.branch) ? { merged: true as const } : {}),
      })
    }
    // A linked worktree names the main checkout's branch (068 #41).
    const origin = main?.branch !== undefined && norm(root) !== norm(main.path) ? main.branch : undefined
    await flushStats($, ({ worktrees: _old, ...s }) => {
      const kept = found.length === 0 ? s : { ...s, worktrees: found }
      if (kept.git === undefined) return kept
      const { origin: _origin, ...git } = kept.git
      return { ...kept, git: origin === undefined ? git : { ...git, origin } }
    })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    worktreesRunning = false
  }
}

// Whether Claude is told of the Spec Kit work (026), and what it was last told.
let claudeContext = true
let lastTold: string | undefined
// Focus mode (054 #88), kept in the session's state across a reload.
let focusMode = false

// Features whose implement step was refused once this session (054 #57): a repeat call goes through.
const implementWaived = new Set<string>()

/** The constitution's Core Principles, by heading, as a reminder (026 #51). */
async function constitutionReminder($: EngineInterface): Promise<string | undefined> {
  const root = (await $.state.get(SPECKIT)).value?.root
  if (root === undefined) return undefined
  const text = await fsOf($).read(`${root}/.specify/memory/constitution.md`).catch(() => undefined)
  const principles = text === undefined ? [] : principlesOf(text)
  return principles.length === 0 ? undefined : `Astrolabe: check this step against the constitution (.specify/memory/constitution.md): ${principles.join('; ')}.`
}

/** `/astrolabe ask` (026 #54): one question over the session's own transcript, answered in a toast. */
/** The Dashboard's numbers as a Markdown table (054 #99, 046 #59), or undefined before the first turn. */
async function kpisText($: EngineInterface): Promise<string | undefined> {
  const stats = (await $.state.get(SESSION)).value
  if (stats === undefined) return undefined
  const state = (await $.state.get(SPECKIT)).value
  const feature = state === undefined ? undefined : state.features.find(f => f.dir === state.active?.dir)
  const now = await $.clock.now()
  const binding = decisionOf((await $.state.get(USAGE)).value ?? DEFAULT_USAGE, now).highest
  const rows = [
    ...(feature === undefined || feature.total === 0 ? [] : [[t(currentLang(), 'kpis.tasks'), `${feature.done}/${feature.total}`] as [string, string]]),
    ...kpiRows(stats, binding, now, currentLang()),
    ...historyRows(stats, feature, state === undefined || state.root === undefined ? [] : featureDurationsByRoot.get(state.root) ?? [], currentLang()),
  ]
  return kpisMarkdown(t(currentLang(), 'kpis.title', { feature: feature === undefined ? '—' : `${feature.id} ${feature.name}` }), rows)
}

/** Tokens as `182k` or `1.2M`. */
const tokensText = (n: number): string => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

/** A press that needs a second one within ten seconds (052 #41), for actions that cost a turn (061). */
async function confirmPress($: EngineInterface, key: string, run: () => void): Promise<void> {
  const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
  if (held.confirm === key) {
    const { confirm: _gone, ...rest } = held
    await $.state.set(PANE_STATE, rest)
    run()
    return
  }
  await $.state.set(PANE_STATE, { ...held, confirm: key })
  $.clock.after(10_000, () => void (async () => {
    const now = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (now.confirm !== key) return
    const { confirm: _late, ...rest } = now
    await $.state.set(PANE_STATE, rest)
  })().catch(error => $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })))
}

/** Runs one of gstack's skills on a feature (051), from a timer: a command does not run inside a render. */
async function runSkill($: EngineInterface, skill: string, about: string): Promise<void> {
  await $.command.run({ command: skill, args: `Spec Kit feature ${about}` }).catch(async (error: unknown) => {
    await showToast($, t(currentLang(), 'gstack.failed', { skill }), { kind: 'warn' })
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  })
}

/** Sets a spec's priority in this project's store and the session (051). */
async function setPriority($: EngineInterface, id: string, level: Priority): Promise<string> {
  const state = (await $.state.get(SPECKIT)).value
  const feature = state?.features.find(f => f.id === id)
  if (state?.root === undefined || feature === undefined) return t(currentLang(), 'priority.none', { id })
  const map = withPriority((await $.state.get(SESSION)).value?.priorities ?? {}, id, level)
  await $.store.set(`priority:${state.root}`, map).catch(() => undefined)
  await flushStats($, st => ({ ...st, priorities: map }))
  return t(currentLang(), 'priority.set', { feature: `${feature.id} ${feature.name}`, level })
}

/** The deep review (051): spec, plan and tasks to a stronger model; the findings to the Session tab. */
async function deepReview($: EngineInterface, feature: { dir: string; id: string; name: string }): Promise<void> {
  try {
    const root = (await $.state.get(SPECKIT)).value?.root
    if (root === undefined) return
    const fs = fsOf($)
    const read = (file: string) => fs.read(`${root}/specs/${feature.dir}/${file}`).catch(() => '')
    const [spec, plan, tasks] = await Promise.all([read('spec.md'), read('plan.md'), read('tasks.md')])
    const constitution = await fs.read(`${root}/.specify/memory/constitution.md`).catch(() => '')
    const reply = await $.model.complete({ ...REVIEW_MODEL, prompt: reviewPrompt(feature, { spec, plan, tasks }, principlesOf(constitution)) })
    const text = reply.isAnswered ? reply.text.trim() : t(currentLang(), 'ask.failed', { reason: reply.reason })
    const at = await $.clock.now()
    await flushStats($, st => ({ ...st, lastReview: { id: feature.id, text: text.split('\n').slice(0, 12).join('\n'), at } }))
    await showToast($, t(currentLang(), 'review.ready', { feature: `${feature.id} ${feature.name}` }), { timeoutMs: 15_000 })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

async function askFork($: EngineInterface, question: string, about: string): Promise<void> {
  try {
    const reply = await $.model.fork({ prompt: `About the Spec Kit feature ${about}, answer in at most three sentences, plain text: ${question}` })
    const text = reply.isAnswered ? reply.text.trim() : t(currentLang(), 'ask.failed', { reason: reply.reason })
    await showToast($, text, reply.isAnswered ? { timeoutMs: 15_000 } : { timeoutMs: 15_000, kind: 'warn' })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

// The theme tokens, for drawings outside register's closure (025).
let tokens0: ReturnType<typeof themeOf> = themeOf({})
// The accessible mode (025 #48): ascii icons, text charts, no hover, no animation, no pictures.
let accessible = false

/**
 * Opened on request: it takes the keys (1 to 4 at once) and Esc closes it. An unasked open never
 * takes focus (Principle VII).
 */
async function openPane($: EngineInterface): Promise<void> {
  // The title names the active feature (052 #4) the way the band and the footer do (054 #30).
  const state = (await $.state.get(SPECKIT)).value
  const title = paneTitle(state)
  await $.ui.open({ id: PANE_ID, title, focus: true, closeOnEscape: true })
  if (footerSource === 'statusline') $.clock.after(0, () => void refreshStatusline($))
}

// Whether the plugins reload by themselves when a new version lands on disk (034).
let autoReload = true
// The version on disk this module last acted on, so one version reloads at most once (034).
let actedOn: string | undefined

/** Compares the version in our own plugin.json with the one running; reloads once when they differ (034). */
async function checkDiskVersion($: EngineInterface): Promise<void> {
  try {
    const text = await fsOf($).read(`${$.plugin.root}/.claude-plugin/plugin.json`).catch(() => undefined)
    if (text === undefined) return
    const version = (JSON.parse(text) as { version?: unknown }).version
    if (typeof version !== 'string' || version === VERSION || version === actedOn) return
    const stored = await $.store.get(RELOADED).catch(() => undefined)
    if (stored === version) return
    actedOn = version
    await $.store.set(RELOADED, version).catch(() => undefined)
    const lang = currentLang()
    if (!autoReload) {
      await showToast($, t(lang, 'toast.onDisk', { version, running: VERSION }), { kind: 'update' })
      return
    }
    await showToast($, t(lang, 'toast.reloading', { version, running: VERSION }), { kind: 'update' })
    await $.command.run({ command: 'reload-plugins' })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

// Whether Claude Code's theme is a light one, read at session start (024): the charts' colors.
let isLightTheme = false
// Whether the terminal draws pictures (024 #5), from the images option and its variables.
let isImageTerminal = false
let pictureCache: { key: string; picture: { rgba: string; width: number; height: number } } | undefined
// The active tasks at the end of the last main turn, to diff the next one against (024).
let turnTasks: { dir: string; tasks: NonNullable<SpeckitState['activeTasks']> } | undefined


/**
 * What the Specs and Tasks tabs draw above their rows (024): the filter and the active spec's
 * summary with links to its files, or the last turn's tasks diff. Only elements the surface has.
 */
function paneHeader(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
  state: SpeckitState,
  stats: SessionStats | undefined,
  filterCount?: { kept: number; total: number },
  now = 0,
  /** The rows in view of a list longer than the pane (067 #35): `rows 12–40 of 140`. */
  range?: { from: number; to: number; total: number },
  /** Where the selected row sits: `Specs › 002 › US2 › T012` (078 FR-024). */
  crumb?: string,
): RenderNode[] {
  const elements = $.ui.resolve(e)
  const Input = 'Input' in elements ? elements.Input : undefined
  const Markdown = 'Markdown' in elements ? elements.Markdown : undefined
  const Code = 'Code' in elements ? elements.Code : undefined
  const Button = 'Button' in elements ? elements.Button : undefined
  const active = state.active
  // One filter for Specs (and its tasks), Help and Setup (043 #23, 078).
  if (viewOf(pane) === 'specs' || viewOf(pane) === 'help' || viewOf(pane) === 'setup' || viewOf(pane) === 'prs') {
    const out: RenderNode[] = []
    if (Input !== undefined) {
      // Each keystroke filters; Enter keeps the text the same way.
      const setFilter = async (value: string) => {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        await $.state.set(PANE_STATE, { ...held, filter: value })
      }
      out.push(
        <Input key="astrolabe-filter" placeholder={t(currentLang(), viewOf(pane) === 'specs' ? 'pane.filter' : viewOf(pane) === 'setup' ? 'pane.findOption' : viewOf(pane) === 'prs' ? 'prs.filter' : 'pane.filterRows')} value={pane.filter ?? ''} onInput={setFilter} onSubmit={setFilter} />,
      )
      // A `#` jump (067 #31): the ids the query completes to, live.
      const jump = viewOf(pane) === 'specs' ? jumpQuery(pane.filter) : undefined
      if (jump !== undefined) out.push(<elements.Text key="astrolabe-jump" color={tokens0.accent}>{jumpLine(state.features, jump)}</elements.Text>)
      if (filterCount !== undefined) {
        // The filter's tokens as one muted row with the count (061): `phase:plan · has:questions · 3/12 rows`.
        const chips = viewOf(pane) === 'specs' ? filterChips(pane.filter, pane.status) : []
        const count = range !== undefined && range.total > range.to - range.from + 1
          ? t(currentLang(), 'pane.range', range)
          : t(currentLang(), 'pane.filterCount', filterCount)
        out.push(<elements.Text key="astrolabe-filter-count" color={tokens0.muted} wrap="truncate-end">{`${crumb === undefined ? '' : `${crumb} · `}${chips.length === 0 ? count : `${chips.join(' · ')} ${count}`}`}</elements.Text>)
      }
    }
    if (viewOf(pane) === 'specs' && pane.tasksOnly === true && Code !== undefined && stats?.tasksDiff !== undefined && stats.tasksDiff.dir === active?.dir) {
      const age = stats.tasksDiff.at === undefined ? 0 : now - stats.tasksDiff.at
      if (age > DIFF_FOLD_MS) out.push(<elements.Text key="astrolabe-diff-folded" color={tokens0.muted}>{foldedDiff(stats.tasksDiff.text, stats.tasksDiff.file, age, currentLang())}</elements.Text>)
      else out.push(<Code source={capDiff(stats.tasksDiff.text, currentLang())} format="diff" path={stats.tasksDiff.file} />)
    }
    // The spec's summary and its links ride on the selected row now (board 3, 075 FR-006); the
    // run of [P] tasks and the issues button are the actions under the Tasks list (taskActions).
    return out
  }
  return []
}

/** What a Specs filter token may read besides the feature itself (061): priorities and worktrees. */
const specFilterContext = (stats: SessionStats | undefined) => ({ priorities: stats?.priorities ?? {}, worktrees: worktreesById(stats?.worktrees) })

/** Counts a subagent run, and against the feature that was active when it started (054 #37). */
async function noteAgentRun($: EngineInterface): Promise<void> {
  live.agentsRun += 1
  const id = (await $.state.get(SPECKIT)).value?.active?.id
  if (id !== undefined) live.agentsById[id] = (live.agentsById[id] ?? 0) + 1
}

/** Notes the turn's change to the active tasks as diff hunks for the Tasks tab (024 #8). */
async function noteTasksDiff($: EngineInterface, state: SpeckitState | undefined): Promise<void> {
  const dir = state?.active?.dir
  const tasks = state?.activeTasks
  const before = turnTasks
  const diffAt = await $.clock.now()
  turnTasks = dir === undefined || tasks === undefined ? undefined : { dir, tasks }
  if (before === undefined || dir === undefined || tasks === undefined || before.dir !== dir) return
  const text = tasksDiff(before.tasks, tasks)
  if (text === undefined) return
  const file = state?.activeDocs?.includes('tasks.md') === true ? 'tasks.md' : 'spec.md'
  await flushStats($, s => ({ ...s, tasksDiff: { dir, file, text, at: diffAt } }))
}

/** Asks `gh` for the branch's pull request when the cached answer is older than five minutes (023). */
async function refreshPr($: EngineInterface, root: string, branch: string, force = false): Promise<void> {
  if (prRunning) return
  prRunning = true
  try {
    const now = await $.clock.now()
    const cached = (await $.state.get(SESSION)).value?.prCache
    if (cached !== undefined && cached.branch === branch && now - cached.at < PR_TTL_MS && !force) return
    // gh missing, signed out or no pull request: no part, no error; the next try is in five minutes.
    const run = await $.process.run(GH_PR, { cwd: root, timeoutMs: 5000 }).catch(() => undefined)
    const pr = run?.exitCode === 0 ? parsePullRequest(run.stdout) : undefined
    const runs = await $.process.run(GH_RUN(branch), { cwd: root, timeoutMs: 5000 }).catch(() => undefined)
    const ci = runs?.exitCode === 0 ? parseCiRun(runs.stdout) : undefined
    await flushStats($, s => {
      // A turn may have ended on another branch while `gh` ran: only this branch takes its PR and CI.
      const git = s.git?.branch === branch ? (({ ci: _old, ...rest }) => (ci === undefined ? rest : { ...rest, ci }))(withPr(s.git, pr)) : s.git
      return { ...s, prCache: { branch, at: now, ...(pr === undefined ? {} : { pr }), ...(ci === undefined ? {} : { ci }) }, ...(git === undefined ? {} : { git }) }
    })
    const speckit = (await $.state.get(SPECKIT)).value
    if (speckit !== undefined) await showStatus($, speckit)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    prRunning = false
  }
}

/**
 * A subagent's request names its run (069 #43): the oldest live record without a run takes the
 * id, the model and the tokens its usage reports. A background agent's tool call returns at once,
 * so the run's own requests are the only signal it is still going.
 */
async function noteSubagentStep($: EngineInterface, agentId: string, model: string | undefined, result: unknown, request?: unknown): Promise<void> {
  const usage = (result as { usage?: Record<string, unknown> | null } | undefined)?.usage
  const sum = usage === undefined || usage === null ? 0 : ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'].reduce((n, k) => n + (typeof usage[k] === 'number' ? (usage[k] as number) : 0), 0)
  const at = await $.clock.now()
  // The run's first request: its opening message, as the brief when no tool call named it.
  const first = ((request as { messages?: ReadonlyArray<{ role?: string; content?: unknown }> } | undefined)?.messages ?? []).find(m => m.role === 'user')?.content
  const text = typeof first === 'string' ? first : Array.isArray(first) ? first.map(part => (typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '')).join(' ') : ''
  await flushStats($, s => {
    const list = s.liveAgents ?? []
    const mine = list.find(a => a.engineId === agentId) ?? list.find(a => a.engineId === undefined)
    // This engine launches subagents without a tool call a mod sees: the run makes its own row.
    if (mine === undefined) {
      const brief = plainText(text.replace(/\s+/g, ' ').trim() === '' ? 'subagent' : text.replace(/\s+/g, ' ').trim(), 60)
      const row = { id: `run-${agentId}`, engineId: agentId, brief, startedAt: at, ...(model === undefined ? {} : { model }), ...(sum > 0 ? { tokens: sum } : {}) }
      return { ...s, liveAgents: [...list, row].slice(-12) }
    }
    return {
      ...s,
      liveAgents: list.map(a =>
        a === mine ? { ...a, engineId: agentId, ...(a.model === undefined && model !== undefined ? { model } : {}), tokens: (a.tokens ?? 0) + sum } : a,
      ),
    }
  })
}

/** The prompt cache's time to live: five minutes, an hour when the response created an hour-long entry (068 #42). */
const CACHE_TTL_MS = 300_000
const CACHE_TTL_LONG_MS = 3_600_000

/**
 * Keeps what the last main-thread response says about the prompt cache (068 #42). The engine
 * hands a mod no cache payload, so the chip rests on the response's usage when it carries one.
 */
function noteCache(model: string | undefined, result: unknown, at: number): void {
  const usage = (result as { usage?: Record<string, unknown> | null } | undefined)?.usage
  if (usage === undefined || usage === null) return
  const num = (...keys: string[]): number => {
    for (const key of keys) if (typeof usage[key] === 'number') return usage[key] as number
    return 0
  }
  const read = num('cache_read_input_tokens', 'cacheReadInputTokens', 'cacheRead')
  const created = num('cache_creation_input_tokens', 'cacheCreationInputTokens', 'cacheCreation')
  const input = num('input_tokens', 'inputTokens', 'input')
  if (read + created === 0) return
  const long = typeof usage.cache_creation === 'object' && usage.cache_creation !== null && Number((usage.cache_creation as Record<string, unknown>).ephemeral_1h_input_tokens) > 0
  // A response that read nothing right after a model switch rebuilt the cache because of the switch.
  const changed = read === 0 && model !== undefined && lastCacheModel !== undefined && lastCacheModel !== model
  lastCacheModel = model
  live.cache = { at, tokens: read + created + input, ttlMs: long ? CACHE_TTL_LONG_MS : CACHE_TTL_MS, ...(changed ? { reason: 'model changed' } : {}) }
}
let lastCacheModel: string | undefined

/** Notes the model and effort of each main-thread request (018), leaving the request untouched. */
async function* noteModel($: Parameters<Hook<'turn.step'>>[0], e: Parameters<Hook<'turn.step'>>[1], next: Parameters<Hook<'turn.step'>>[2]) {
  // skillModels auto (030): while a skill with an entry runs, its model and effort.
  // A task's own kind wins while speckit-implement runs (054 #94); otherwise the skill's entry.
  const byTask = skillModels === 'auto' && e.agentId === undefined && /^speckit[-.]implement$/.test(skillRunning ?? '') ? modelForTask(currentTaskText) : undefined
  const pick = byTask ?? (skillModels === 'auto' && e.agentId === undefined ? skillModelFor(skillRunning, skillOverrides) : undefined)
  const step = pick === undefined ? e : { ...e, model: pick.model, effort: pick.effort }
  if (e.agentId === undefined) {
    live.model = step.model
    live.effort = step.effort === undefined ? undefined : String(step.effort)
    // Fast mode, when the request says so (068 #47); false resets it.
    const mode = e as unknown as { speed?: unknown; fastMode?: unknown; fast?: unknown }
    live.fast = mode.speed === 'fast' || mode.fastMode === true || mode.fast === true
  }
  const result = yield* next(step)
  if (e.agentId === undefined) noteCache(step.model, result, await $.clock.now())
  else await noteSubagentStep($, e.agentId, step.model, result, e)
  // The advisor is a server tool the API runs inside the request (055): count each run.
  const advised = ((result as { serverToolUses?: ReadonlyArray<{ name: string }> } | undefined)?.serverToolUses ?? []).filter(use => use.name === 'advisor').length
  if (advised > 0 && e.agentId === undefined) {
    const at = await $.clock.now()
    await flushStats($, st => ({ ...st, advisor: { ...st.advisor, runs: (st.advisor?.runs ?? 0) + advised, at } }))
    if (advisorAsked !== undefined) advisorAsked.ran = true
  }
  // The answer of the turn Astrolabe asked for goes to the Session tab (055 T004).
  const response = result as { answer?: string; stopReason?: string | null } | undefined
  if (e.agentId === undefined && advisorAsked !== undefined && response?.stopReason !== 'tool_use' && response?.stopReason !== 'pause_turn') {
    const asked = advisorAsked
    advisorAsked = undefined
    const text = advisorFindings(response?.answer ?? '')
    if (asked.ran && text !== '') {
      const at = await $.clock.now()
      await flushStats($, st => ({ ...st, advisor: { runs: st.advisor?.runs ?? 0, at: st.advisor?.at ?? at, last: { id: asked.id, text, at } } }))
    }
  }
  return result
}

// The advisor review Astrolabe asked for, until the turn that answers it ends (055 T004).
let advisorAsked: { id: string; ran: boolean } | undefined

/** Sends the advisor prompt and waits for its answer (055). */
const askAdvisor = ($: EngineInterface, feature: { id: string; name: string; dir: string }): void => {
  advisorAsked = { id: feature.id, ran: false }
  $.clock.after(0, () => void $.prompt.submit({ text: advisorPrompt(feature) }).catch(() => undefined))
}

/** Read-modify-write of astrolabe.usage with ifVersion, retried like `guarded`. */
async function updateUsage($: EngineInterface, change: (usage: UsageState) => UsageState): Promise<UsageState> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { value, version } = await $.state.get(USAGE)
    const next = change(value ?? DEFAULT_USAGE)
    if ((await $.state.set(USAGE, next, { ifVersion: version })).isSet) return next
  }
  return (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
}

async function setUsageOverride($: EngineInterface, target: number, ms: number): Promise<string> {
  const now = await $.clock.now()
  const until = now + ms
  await updateUsage($, u => ({ ...u, override: { target, until, ...kindOf(u, now, governThresholds) } }))
  const speckit = (await $.state.get(SPECKIT)).value
  if (speckit !== undefined) await showStatus($, speckit)
  return `🧭 stop and ceiling raised to ${target}% until ${clockOf(new Date(until).toISOString())}; new subagents still wait from 80%`
}

/** The band's `lift 1h` button (065 #13): one hour past the hold, and past stop and ceiling too. */
async function liftBand($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  await updateUsage($, u => ({ ...u, holdLift: now + HOLD_LIFT_MS, override: { target: 95, until: now + HOLD_LIFT_MS, ...kindOf(u, now, governThresholds) } }))
  const speckit = (await $.state.get(SPECKIT)).value
  if (speckit !== undefined) await showStatus($, speckit)
}

async function revokeUsageOverride($: EngineInterface): Promise<string> {
  await updateUsage($, ({ override: _gone, ...u }) => u)
  const speckit = (await $.state.get(SPECKIT)).value
  if (speckit !== undefined) await showStatus($, speckit)
  return '🧭 usage override revoked: stop at 88%, ceiling at 90%'
}

async function decisionNow($: EngineInterface): Promise<{ usage: UsageState; decision: Decision }> {
  const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
  return { usage, decision: decisionOf(usage, await $.clock.now()) }
}

/** Submits one resume prompt for what the pause or the hold left waiting, then clears it. */
async function resume($: EngineInterface, why: string): Promise<void> {
  try {
    const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
    if (usage.queue.length === 0 && !usage.paused) return
    const since = usage.waitingSince
    await updateUsage($, ({ waitingSince: _w, ...u }) => ({ ...u, queue: [], paused: false }))
    if (since !== undefined) {
      const waited = Math.max(0, (await $.clock.now()) - since)
      await flushStats($, st => ({ ...st, waitedMs: (st.waitedMs ?? 0) + waited }))
    }
    await logGovernor($, t(currentLang(), 'log.resumed', { why }))
    const speckit = (await $.state.get(SPECKIT)).value
    const task = speckit?.currentTask
    const feature = speckit?.features.find(f => f.dir === speckit.active?.dir)
    const where = task === undefined || feature === undefined ? undefined : `${task.id === undefined ? '' : `${task.id} `}${task.text} in ${feature.id} ${feature.name}`
    await $.prompt.submit({ text: resumePrompt(usage.queue, why, where) })
    // A phone notice when the work starts again (022 #31); the engine skips it while the person is present.
    await $.tool
      .call({ tool: 'PushNotification', tool_use_id: `astrolabe-resume-${await $.clock.now()}`, message: t(currentLang(), 'push.resumed', { why }), status: 'proactive' } as never)
      .catch(() => undefined)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** The context warning (022 #33), once a session and again after a compact. Cost is not shown (054): on a subscription it means nothing. */
async function warnUsage($: EngineInterface, percent: number | undefined): Promise<void> {
  const lang = currentLang()
  const stats = (await $.state.get(SESSION)).value
  const warned = { ...(stats?.warned ?? {}) }
  const toasts: string[] = []
  if (percent !== undefined) {
    if (percent >= 85 && warned.context !== true) {
      toasts.push(t(lang, 'toast.context', { p: Math.round(percent) }))
      warned.context = true
    } else if (percent < 70 && warned.context === true) warned.context = false
  }
  if (JSON.stringify(warned) === JSON.stringify(stats?.warned ?? {})) return
  await flushStats($, s => ({ ...s, warned }))
  for (const text of toasts) await showToast($, text, { kind: 'warn' })
}

// The images option (024): auto, on or off.
let imagesOption: unknown
// Whether the footer asks gh for the branch's pull request (023), off by default.
let pullRequests = false
// When the last main turn ended; the prompt cache timer fires only if no turn came after it (022 #34).
const CACHE_WARN_MS = 270_000
/** From this width the status entry shows the whole footer on one line, even with the footer in the pane (054 #47). */
const WIDE_STATUS_COLUMNS = 140
/** The text of the task being worked on, for the model per task kind (054 #94). */
let currentTaskText: string | undefined
let cacheWarningTimer: ReturnType<EngineInterface['clock']['after']> | undefined

// The timer is transient; session.start and later usage readings rebuild it from $.state.
let resumeAt: number | undefined
let resumeTimer: ReturnType<EngineInterface['clock']['after']> | undefined

/**
 * At a window's reset: redraw the status (the window renewed), then resume only if no other
 * window still holds or pauses; otherwise wait for the reset of the one binding now (016).
 */
async function afterReset($: EngineInterface, why: string): Promise<void> {
  try {
    const { decision } = await decisionNow($)
    const speckit = (await $.state.get(SPECKIT)).value
    if (speckit !== undefined) await showStatus($, speckit)
    if (decision.band === 'ok' || decision.band === 'throttle') await resume($, why)
    else await armResume($, decision)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

async function armResume($: EngineInterface, decision: Decision): Promise<void> {
  const reset = decision.highest?.resetsAt === undefined ? Number.NaN : Date.parse(decision.highest.resetsAt)
  if (Number.isNaN(reset) || resumeAt === reset) return
  resumeTimer?.cancel()
  resumeAt = reset
  const wait = Math.max(0, reset - (await $.clock.now())) + 1000
  const why = `${decision.highest?.kind === 'seven_day' ? '7d' : '5h'} reset`
  resumeTimer = $.clock.after(wait, () => {
    resumeAt = undefined
    resumeTimer = undefined
    void afterReset($, why)
  })
}

// One usage question at a time (015, 017). The gate never waits for it: a hook has 10 s, so it
// refuses with the cautious default at once and the question runs in the plugin's own time,
// from a timer. The answer then acts on the queue and the pause. `pick` settles it from a
// press in the pane or the pane's close.
let isAsking = false
let pick: ((value: string) => void) | undefined
// Whether a person is at the prompt: a -p run or the SDK is never asked (015).
let isInteractive = true
const TIMED_OUT = '\u0000timeout'
// What a refusal adds while the person is asked, so Claude waits instead of retrying.
const ASKING_NOTE = 'The person is being asked; if they allow it, a prompt will say so. Do not retry it.'

/** A lift of the hold or of the ceiling, for its own window (016); false for any other answer. */
async function applyLift($: EngineInterface, question: Question, value: string): Promise<boolean> {
  const now = await $.clock.now()
  const target = question.options.find(o => o.value === value)?.target
  const change: ((u: UsageState) => UsageState) | undefined =
    value === 'lift' && question.kind === 'hold'
      ? ({ asked: _gone, ...u }) => ({ ...u, holdLift: now + HOLD_LIFT_MS })
      : (value === 'extend' || value === 'raise') && target !== undefined
        ? ({ asked: _gone, ...u }) => ({ ...u, override: { target, until: now + (value === 'extend' ? EXTEND_MS : RAISE_MS), ...kindOf(u, now, governThresholds) } })
        : undefined
  if (change === undefined) return false
  await updateUsage($, change)
  const speckit = (await $.state.get(SPECKIT)).value
  if (speckit !== undefined) await showStatus($, speckit)
  return true
}

/**
 * What an answer does, whenever it comes (017). The default (or no answer) is remembered for
 * the band. `drop` takes the call out of the queue; `run` takes it out and lets that one
 * prompt through once, then tells Claude to send it again; a lift resumes what waits.
 */
async function answer($: EngineInterface, question: Question, value: string, item?: QueuedAgent): Promise<void> {
  await logGovernor($, `→ ${question.options.find(o => o.value === value)?.label ?? value}`)
  if (await applyLift($, question, value)) {
    await resume($, value === 'lift' ? 'subagents allowed for 1 hour, one at a time' : 'ceiling raised')
    return
  }
  if (value === 'run' && item !== undefined) {
    await updateUsage($, u => ({ ...u, queue: u.queue.filter(q => q.id !== item.id), passes: [...(u.passes ?? []), item.prompt].slice(-QUEUE_MAX) }))
    await $.prompt.submit({ text: runPrompt(item) })
    return
  }
  if (value === 'drop') {
    await updateUsage($, u => ({ ...u, queue: u.queue.filter(q => q.id !== item?.id), asked: { kind: 'hold', answer: 'drop' } }))
    return
  }
  await updateUsage($, u => (u.asked?.kind === question.kind ? u : { ...u, asked: { kind: question.kind, answer: question.fallback } }))
}

/** Opens the question from a timer, outside the hook that refused; one at a time. */
function askLater($: EngineInterface, question: Question, item?: QueuedAgent): void {
  if (isAsking) return
  isAsking = true
  void logGovernor($, question.text).catch(() => undefined)
  $.clock.after(0, () => {
    void askNow($, question, item)
  })
}

/**
 * The question itself (015): a focused pane with a Select, or the engine's dialog where the
 * pane cannot be placed. The pane closes after ASK_MS or on Esc, taking the default; an answer
 * in the dialog after that still applies.
 */
async function askNow($: EngineInterface, question: Question, item?: QueuedAgent): Promise<void> {
  let resolve: (value: string) => void = () => undefined
  const picked = new Promise<string>(r => {
    resolve = r
  })
  pick = resolve
  try {
    const deadline = (await $.clock.now()) + ASK_MS
    await $.state.set(ASK, { question, deadline })
    $.clock.after(ASK_MS, () => resolve(TIMED_OUT))
    const opened = await $.ui
      .open({ id: ASK_ID, title: '🧭 Astrolabe · usage', focus: true, closeOnEscape: true, holdToasts: true, rows: question.options.length + 4 })
      .catch(() => ({ isPlaced: false }))
    let isSettled = false
    if (!opened.isPlaced) {
      // Not drawn (a narrow terminal): close it so it never shows up later, and ask in the
      // engine's dialog, which stays until it is answered.
      await $.ui.close({ id: ASK_ID }).catch(() => undefined)
      void $.ui.ask(question.text, { options: question.options.map(o => o.label), header: 'Usage' }).then(
        async label => {
          const value = question.options.find(o => o.label === label)?.value
          if (!isSettled) resolve(value ?? question.fallback)
          else if (value !== undefined) await answer($, question, value, item)
        },
        () => resolve(question.fallback),
      )
    }
    const value = await picked
    isSettled = true
    await answer($, question, value === TIMED_OUT ? question.fallback : value, item)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    pick = undefined
    isAsking = false
    await $.state.set(ASK, {}).catch(() => undefined)
    await $.ui.close({ id: ASK_ID }).catch(() => undefined)
  }
}

function fsOf($: EngineInterface): Fs {
  return {
    read: path => $.fs.read(path) as Promise<string>,
    list: path => $.fs.list(path),
    exists: path => $.fs.exists(path),
    stat: path => $.fs.stat(path),
    write: (path, text) => $.fs.write(path, text),
  }
}

const MAX_ATTEMPTS = 5

/**
 * Runs one update of astrolabe.speckit: reads the held value, lets `work` compute the
 * next one, and writes it only if nobody wrote meanwhile (ifVersion), retrying from a
 * fresh read otherwise. Tool calls run concurrently (parallel subagents), so a plain
 * get-then-set would lose updates. A failure goes to the debug log and never breaks
 * the session.
 */
async function guarded($: EngineInterface, work: (previous: Held | undefined) => Promise<Held | undefined>): Promise<Held | undefined> {
  const started = Date.now()
  try {
    return await guardedOnce($, work)
  } finally {
    noteSlow('state update', Date.now() - started)
  }
}

// The slowest hook work this load of the module, for /astrolabe doctor (054 #15).
let slowestHook: { name: string; ms: number } | undefined
const noteSlow = (name: string, ms: number): void => {
  if (slowestHook === undefined || ms > slowestHook.ms) slowestHook = { name, ms }
}

async function guardedOnce($: EngineInterface, work: (previous: Held | undefined) => Promise<Held | undefined>): Promise<Held | undefined> {
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const { value: memo, version } = await $.state.get(MEMO)
      const shown = await $.state.get(SPECKIT)
      const stale = memo !== undefined && (shown.value?.memoVersion ?? -1) < version
      let recovered: Held | undefined
      if (stale && memo !== undefined) {
        const snapshot = snapshotFromMemo(memo)
        if (snapshot !== undefined) recovered = deriveSpeckitState(snapshot, memo, await $.clock.now())
      }
      const previous =
        memo === undefined ? undefined : recovered === undefined ? (shown.value === undefined ? undefined : { state: shown.value, memo }) : { state: recovered.state, memo }
      const next = await work(previous)
      if (next === undefined) return undefined
      if (stale && recovered !== undefined && next.memo === memo) {
        const latestMemo = await $.state.get(MEMO)
        if (latestMemo.version !== version) continue
        const latestShown = await $.state.get(SPECKIT)
        if ((latestShown.value?.memoVersion ?? -1) >= version) return next
        const repaired = { ...next.state, memoVersion: version, updatedAt: Date.now() }
        if (!(await $.state.set(SPECKIT, repaired, { ifVersion: latestShown.version })).isSet) continue
        await showStatus($, next.state)
        return next
      }
      // Nothing changed: no write, no redraw (spec 009, FR-003).
      if (previous !== undefined && next.memo === previous.memo && next.state === previous.state) return previous
      const written = await $.state.set(MEMO, next.memo, { ifVersion: version })
      if (written.isSet) {
        // Two writers can finish out of order: the state carries its memo version, and an
        // older one never replaces a newer one, so the drawing never lags the memo.
        // When it was written, for the pane's legend (054 #26).
        const state = { ...next.state, memoVersion: written.version, updatedAt: Date.now() }
        for (let tries = 0; tries < MAX_ATTEMPTS; tries += 1) {
          const shown = await $.state.get(SPECKIT)
          if ((shown.value?.memoVersion ?? -1) >= written.version) break
          if ((await $.state.set(SPECKIT, state, { ifVersion: shown.version })).isSet) break
        }
        await showStatus($, next.state)
        return next
      }
    }
    $.ui.log(`astrolabe: gave up after ${MAX_ATTEMPTS} conflicting updates`, { to: 'debug' })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
  return undefined
}

/**
 * The Session tab in four blocks (052 #24, 054 #22): Project, Governor, Activity, Updates, each
 * under a heading and only when it has rows. Each state is read once (054 #1). The governor's
 * state row takes the band's colour (052 #25).
 */
async function sessionTabRows(
  $: EngineInterface,
  state: SpeckitState,
  usage: UsageState,
  stats: SessionStats | undefined,
  updates: readonly UpdateItem[],
  /** The update waiting for its second click (Spec Kit skills rewrite files). */
  confirming?: string,
  /** The pane's columns, for the live table, and which folded blocks are open (078). */
  layout: { columns: number; updatesOpen: boolean; logOpen: boolean; turnsOpen: boolean } = { columns: 80, updatesOpen: false, logOpen: false, turnsOpen: false },
): Promise<PaneRow[]> {
  const lang = currentLang()
  const labelWidth = paneLabelWidth(lang)
  const now = await $.clock.now()
  const label = (text: string) => text.padEnd(labelWidth)
  const valueRow = (
    key: string,
    name: string,
    value: string,
    role: ThemeRole = 'text',
    extra: Pick<PaneRow, 'action' | 'href'> = {},
  ): PaneRow => {
    const field = label(name)
    return { key, text: `${field}${value}`, role, label: field, value, ...extra }
  }
  const band = decisionOf(usage, now).band
  const bandRole: ThemeRole = band === 'ok' ? 'done' : band === 'stop' || band === 'ceiling' ? 'blocked' : 'current'
  const branch = stats?.git?.branch
  const governorDecision = decisionOf(usage, now)
  const overrideActive = usage.override !== undefined && usage.override.until > now
  const project = projectHeader([
    ...sessionRows(state, now, lang, labelWidth).flatMap(row => {
      // The chips of the active feature sit under its row (board 4, 075 FR-013).
      if (row.key !== 'session-active') return [row]
      const feature = state.features.find(f => f.dir === state.active?.dir)
      const chips = feature === undefined ? [] : sessionChips({ done: feature.done, total: feature.total, taskTimes: (stats?.taskTimes ?? []).filter(x => x.dir === feature.dir), turns: stats?.turns ?? 0, ...(stats?.cost === undefined ? {} : { cost: stats.cost }) })
      return chips.length === 0 ? [row] : [row, { key: 'session-chips', text: `${''.padEnd(labelWidth)}${chips.map(c => `[ ${c} ]`).join(' ')}`, role: 'muted' as ThemeRole }]
    }),
  ], { now: t(lang, 'session.now'), labelWidth, ...(branch === undefined ? {} : { branch }), ...(branch === undefined || stats?.git?.remote === undefined ? {} : { branchHref: branchWebUrl(stats.git.remote, branch) }) })
  let queueIndex = 0
  const governor = [
    ...usageRows(usage, now, governThresholds).map(([name, text]) => {
      const queued = name === 'queue' || name === '' ? usage.queue[queueIndex] : undefined
      if (queued !== undefined) {
        const hotkey = QUEUE_HOTKEYS[queueIndex]
        queueIndex += 1
        return valueRow(
          `usage-queue-${queued.id}`,
          name,
          `${queued.id} ${queued.description} · /astrolabe run ${queued.id}`,
          'text',
          { action: { id: queued.id, label: hotkey === undefined ? t(lang, 'queue.runButton', { key: '-' }) : t(lang, 'queue.runButton', { key: hotkey }), ...(hotkey === undefined ? {} : { hotkey }) } },
        )
      }
      return valueRow(`usage-${name}`, name, text, name === 'state' ? bandRole : 'text')
    }),
    ...(isPaused(governorDecision)
      ? [{ key: 'usage-allow', text: '', role: 'text' as const, action: { id: 'usage-allow', label: t(lang, 'governor.allow'), hotkey: 'l', kind: 'allow' as const } }]
      : []),
    ...(overrideActive
      ? [{ key: 'usage-revoke', text: '', role: 'text' as const, action: { id: 'usage-revoke', label: t(lang, 'governor.revoke'), hotkey: 'v', kind: 'revoke' as const } }]
      : []),
    // Today's governor steps, at most 10 (054 #62), folded to one row until opened (078 FR-059).
    ...((today: Array<{ at: number; text: string }>) =>
      today.length === 0
        ? []
        : layout.logOpen
          ? [
              valueRow('governor-log-fold', t(lang, 'session.governor'), t(lang, 'session.log.hide', { n: today.length }), 'muted', { action: { id: 'log', label: t(lang, 'session.fold'), kind: 'fold' as const } }),
              ...today.map((entry, i) => valueRow(`governor-log-${i}`, '', `${clockOf(new Date(entry.at).toISOString()) ?? ''} ${entry.text}`, 'muted')),
            ]
          : [valueRow('governor-log-fold', t(lang, 'session.governor'), t(lang, 'session.log.show', { n: today.length }), 'muted', { action: { id: 'log', label: t(lang, 'session.unfold'), kind: 'fold' as const } })])(
      (usage.log ?? []).filter(entry => new Date(entry.at).toDateString() === new Date(now).toDateString()).slice(-10),
    ),
  ]
  const summary = stats?.lastSummary
  const review = stats?.lastReview
  const advisor = stats?.advisor
  const activity = [
    ...(stats === undefined ? [] : [valueRow('tool-calls', t(lang, 'kpi.toolCalls'), String(stats.toolCalls))]),
    ...(stats?.toastDetails === undefined ? [] : [valueRow('toast-details', t(lang, 'session.toastDetails'), stats.toastDetails, 'muted')]),
    ...(summary === undefined ? [] : summary.text.split('\n').map((line, i) => valueRow(`summary-${i}`, i === 0 ? `${t(lang, 'session.summary')} ${summary.dir}` : '', line, 'muted'))),
    ...(advisor === undefined ? [] : [valueRow('advisor', t(lang, 'session.advisor'), t(lang, 'advisor.runs', { n: advisor.runs, at: clockOf(new Date(advisor.at).toISOString()) ?? '' }))]),
    ...(advisor?.last === undefined ? [] : advisor.last.text.split('\n').map((line, i) => valueRow(`advisor-${i}`, i === 0 ? `${t(lang, 'session.advisor')} ${advisor.last!.id}` : '', line))),
    ...(review === undefined ? [] : [
      // `review 002 · 6 findings (opus xhigh) · 5m ago`: the findings are the lines under it (board 4, 075 FR-015).
      { key: 'review-heading', text: `${t(lang, 'session.review')} ${review.id} · ${t(lang, 'session.findings', { n: review.text.split('\n').filter(line => line.trim() !== '').length })} (${REVIEW_MODEL.model} ${REVIEW_MODEL.effort}) · ${now - review.at < 60_000 ? t(lang, 'time.justNow') : t(lang, 'time.ago', { age: minutes(now - review.at) })}`, role: 'text' as ThemeRole },
      ...review.text.split('\n').map((line, i) => valueRow(`review-${i}`, '', line, 'text', line.trim() === '' ? {} : { action: { id: `${review.id}\n${line}`, label: t(lang, 'tree.ask'), kind: 'finding' as const } })),
    ]),
  ]
  // Every live row, past the three per kind the table above the prompt keeps (069 #43).
  // The same columns as the table above the prompt, aligned (078 FR-053).
  const liveList: PaneRow[] = liveTextRows(
    layoutLive({
      rows: liveRows({
        agents: stats?.liveAgents ?? [],
        gates: stats?.liveGates ?? [],
        cache: stats?.cache,
        readings: usage.readings,
        thresholds: governThresholds,
        band,
        now,
        option: liveRowsOption,
        lang,
      }),
      columns: Math.max(30, layout.columns - 2),
      reservation: {},
      all: true,
    }),
  )
  // Each with a link to the new version's release notes when there is one (054 #82).
  const allUpdateRows = updates.map(item => ((url => valueRow(`update-${item.id}`, 'update', `${updateLabel(item, confirming === item.id)} (installed ${item.installed})`, 'current', { action: { id: item.id, label: t(lang, 'updates.install'), kind: 'update' as const }, ...(url === undefined ? {} : { href: url }) }))(releaseNotesUrl(item))))
  // Two or more updates fold behind one row, `⬆ 2 updates`, until it is opened (078 FR-054).
  const updateRows: PaneRow[] =
    allUpdateRows.length < 2
      ? allUpdateRows
      : [
          valueRow('updates-fold', 'update', t(lang, 'updates.many', { n: allUpdateRows.length, names: updates.map(u => u.id).join(', ') }), 'current', { action: { id: 'updates', label: layout.updatesOpen ? t(lang, 'session.fold') : t(lang, 'updates.review'), kind: 'fold' as const } }),
          ...(layout.updatesOpen ? allUpdateRows : []),
        ]
  // Without Spec Kit the project rows say so on their own; no headings then.
  // The usage bars with governor ticks lead the tab (066, board 4).
  const liveReadings = usage.readings.filter(r => !isRenewedReading(r, now))
  const note = deciderNote(liveReadings, usage.history, now)
  const deciding = [...liveReadings].sort((a, b) => b.percentUsed - a.percentUsed)[0]
  const bars = usageBarRows({
    readings: liveReadings,
    ...(stats?.context === undefined ? {} : { context: stats.context }),
    thresholds: governThresholds,
    now,
    ...(note === undefined || deciding === undefined ? {} : { note: { kind: deciding.kind, text: note } }),
  })
  // The 24 hour trend of the deciding window, under the bars (071).
  const trend = trend24h({ series: stats?.series ?? [], now, ...(deciding?.resetsAt === undefined ? {} : { resetsAt: deciding.resetsAt }) })
  const trendRow = trend === undefined ? [] : [valueRow('usage-trend', t(lang, 'session.trend', { window: deciding === undefined ? '' : labelOf(deciding.kind) }), trend, 'muted')]
  // The governor box (071): what acts, the queue with its run buttons, lift and revoke. Those
  // rows leave the Governor block while the box shows, so each appears once.
  const isLiftActive = usage.holdLift !== undefined && usage.holdLift > now
  const box = governorBoxState({ band: governorDecision.band, queued: usage.queue.length, override: overrideActive, lift: isLiftActive })
  const MOVES = /^usage-(?:queue-|allow$|revoke$)/
  // At hold the box offers `lift 1h` (the band's button); a pause offers the allow row it already had.
  const liftRow = box.show && box.lift && governorDecision.band === 'hold' && !isLiftActive
    ? [{ key: 'usage-lift', text: '', role: 'text' as const, action: { id: 'usage-lift', label: t(lang, 'session.box.lift'), hotkey: 'l', kind: 'lift' as const } }]
    : []
  const boxButtons = box.show ? [...liftRow, ...governor.filter(r => MOVES.test(r.key))] : []
  const governorRest = box.show ? governor.filter(r => !MOVES.test(r.key)) : governor
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const counts = todayCounts(usage.log ?? [], dayStart.getTime())
  const decider = governorDecision.highest
  const stateLine =
    isPaused(governorDecision)
      ? t(lang, 'session.box.pause', { window: decider === undefined ? '' : labelOf(decider.kind), at: decider?.resetsAt === undefined ? '?' : (clockOf(decider.resetsAt) ?? '?') })
      : governorDecision.band === 'hold'
        ? t(lang, 'session.box.hold', { window: decider === undefined ? '' : labelOf(decider.kind), at: decider?.resetsAt === undefined ? '?' : (clockOf(decider.resetsAt) ?? '?') })
        : governorDecision.band === 'throttle'
          ? t(lang, 'session.box.slow', { cap: governorDecision.cap, window: decider === undefined ? '' : labelOf(decider.kind) })
          : t(lang, 'session.box.clear')
  const boxRows = !box.show
    ? []
    : [
        { key: 'governor-box-top', text: `╭─ ${t(lang, 'session.box.title')} ${'─'.repeat(28)}╮`, role: 'current' as ThemeRole },
        { key: 'governor-box-state', text: `│ ${stateLine}`, role: bandRole },
        // What the deciding window reaches next (078 FR-049).
        ...((next => (next === undefined ? [] : [{ key: 'governor-box-next', text: `│ ${t(lang, 'session.box.next', { next })}`, role: 'muted' as ThemeRole }]))(decider === undefined ? undefined : nextLevelText(decider.percent))),
        ...boxButtons,
        { key: 'governor-box-today', text: `│ ${t(lang, 'session.box.today', { holds: counts.holds, pauses: counts.pauses })}`, role: 'muted' as ThemeRole },
        { key: 'governor-box-bottom', text: `╰${'─'.repeat(t(lang, 'session.box.title').length + 31)}╯`, role: 'current' as ThemeRole },
      ]
  // Tokens per turn as a sparkline with the turn that used most marked, and a folded timeline of turns (078 FR-052, FR-056).
  const turnLog = stats?.turnLog ?? []
  const spent = turnLog.flatMap(x => (x.tokens === undefined ? [] : [x.tokens]))
  const peak = spent.length === 0 ? undefined : turnLog.reduce((best, x) => ((x.tokens ?? 0) > (best.tokens ?? 0) ? x : best), turnLog[0]!)
  const perTurn: PaneRow[] =
    spent.length < 2 || peak === undefined
      ? []
      : [valueRow('turn-tokens', t(lang, 'session.perTurn'), `${sparkline(spent.slice(-20))}  ${t(lang, 'session.peak', { at: clockOf(new Date(peak.at).toISOString()) ?? '', n: tokensText(peak.tokens ?? 0) })}`, 'muted')]
  const timeline: PaneRow[] =
    turnLog.length === 0
      ? []
      : layout.turnsOpen
        ? [
            valueRow('turn-log-fold', t(lang, 'session.turns'), t(lang, 'session.log.hide', { n: turnLog.length }), 'muted', { action: { id: 'turns', label: t(lang, 'session.fold'), kind: 'fold' as const } }),
            ...turnLog.slice().reverse().slice(0, 12).map((x, i) => valueRow(`turn-log-${i}`, '', [clockOf(new Date(x.at).toISOString()) ?? '', x.id, x.task, x.tokens === undefined ? undefined : tokensText(x.tokens), x.text].filter((p): p is string => p !== undefined && p !== '').join(' · '), 'muted')),
          ]
        : [valueRow('turn-log-fold', t(lang, 'session.turns'), t(lang, 'session.turnCount', { n: turnLog.length }), 'muted', { action: { id: 'turns', label: t(lang, 'session.unfold'), kind: 'fold' as const } })]
  // What the doctor found that is wrong, each with its fix (078 FR-058); the passed checks stay in Help.
  const health: PaneRow[] = (stats?.health?.lines ?? [])
    .filter(line => line.trimStart().startsWith('✗'))
    .map((line, i) => {
      const text = line.trim().replace(/^✗/, '✖')
      const fix = /(?:run |: )((?:gh|uv|specify|claude|npm|git|brew)\b[^]*)$/.exec(text)?.[1]
      return { key: `health-${i}`, text, role: 'current' as ThemeRole, ...(fix === undefined ? {} : { copy: fix }) }
    })
  if (!state.present) return [...bars, ...trendRow, ...boxRows, ...project, ...governorRest, ...liveList, ...activity, ...updateRows, ...health]
  const activityRows = [...activity, ...perTurn, ...timeline]
  const block = (key: string, rows: Array<{ key: string; text: string; role: ThemeRole; bold?: boolean }>) =>
    rows.length === 0 ? [] : [{ key: `block-${key}`, text: t(lang, `session.block.${key}` as TextKey), role: 'accent' as ThemeRole, bold: true }, ...rows]
  return [...bars, ...trendRow, ...boxRows, ...block('project', project), ...block('governor', governorRest), ...block('live', liveList), ...block('activity', activityRows), ...block('updates', updateRows), ...block('health', health)]
}

/** Brings the Spec Kit state up to date mid-turn (053); writes only when something moved. */
/** After this long without a turn, the band dims (042 #19) and the idle poller refreshes (058). */
const IDLE_POLL_MS = 600_000
/** The idle poller stops after this many refreshes with no turn in between (058). */
const IDLE_POLL_MAX = 6
let idlePollTimer: ReturnType<EngineInterface['clock']['after']> | undefined

/**
 * Re-reads what the band and the pane show from outside the session (058): the specs, git, the
 * worktrees, this branch's pull request and, on the PRs tab, the open pull requests. The write
 * redraws both, so an idle band dims and a stale pane catches up.
 */
async function refreshNow($: EngineInterface): Promise<void> {
  await syncNow($)
  const state = (await $.state.get(SPECKIT)).value
  const branch = (await $.state.get(MEMO)).value?.base?.branch
  const root = state?.root ?? (await $.session.cwd())
  const git = await readGit($, root, branch, true)
  await flushStats($, stats => (git === undefined ? stats : { ...stats, git: withPr(git, stats.git !== undefined && stats.git.branch === git.branch ? stats.git.pr : undefined) }))
  if (git !== undefined) gitNeedsRefresh = false
  if (root !== undefined) await refreshWorktrees($, root)
  if (pullRequests && root !== undefined && branch !== undefined) await refreshPr($, root, branch, true)
  if (((await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE).tab === 'prs') await refreshPulls($, true)
}

/**
 * Reads the process list and `gates.lock` for git hooks and gate scripts (069 #44), and keeps
 * them in the session state. Runs on the mod clock; the draw path only reads the result.
 */
async function scanGates($: EngineInterface): Promise<void> {
  if (liveRowsOption !== 'gates' && liveRowsOption !== 'both') return
  const state = (await $.state.get(SPECKIT)).value
  const root = state?.root ?? (await $.session.cwd())
  const now = await $.clock.now()
  const ps = await $.process.run(['ps', '-axo', 'pid=,ppid=,etime=,command='], { timeoutMs: 3000 }).catch(() => undefined)
  const rows = ps?.exitCode === 0 ? parseProcesses(ps.stdout) : []
  const fs = fsOf($)
  const read = async (path: string): Promise<string | undefined> => (await fs.read(path).catch(() => undefined)) ?? undefined
  let patterns: string[] | undefined
  const config = await read(`${root}/.statusline.json`)
  if (config !== undefined) {
    try {
      const list = (JSON.parse(config) as { gates?: { patterns?: unknown } }).gates?.patterns
      if (Array.isArray(list)) patterns = list.filter((p): p is string => typeof p === 'string' && p !== '' && p.length < 80).slice(0, 12)
    } catch {
      patterns = undefined
    }
  }
  const lock = (await read(`${root}/gates.lock`)) ?? (await read(`${root}/.git/gates.lock`))
  const lockPid = lock === undefined ? undefined : Number.parseInt(lock.trim(), 10)
  const gates = detectGates(rows, {
    root,
    now,
    ...(patterns === undefined ? {} : { patterns }),
    ...(lockPid === undefined || !Number.isFinite(lockPid) || !rows.some(r => r.pid === lockPid) ? {} : { lockPid }),
  }).slice(0, 12)
  if (gates.length > 0) gateSeenAt = now
  await flushStats($, ({ liveGates: _old, ...rest }) => (gates.length === 0 ? rest : { ...rest, liveGates: gates }))
  $.ui.invalidate('ui.render')
}

/**
 * The gate scan (069 #44): armed while a command that may run a git hook or a gate script is
 * running, then every 15 seconds for as long as a gate is seen. A session that runs no such
 * command never reads the process list.
 */
function armGateScan($: EngineInterface, delay = GATE_SCAN_MS): void {
  if (liveRowsOption !== 'gates' && liveRowsOption !== 'both') return
  if (gateScanTimer !== undefined) return
  gateScanTimer = $.clock.after(delay, async () => {
    gateScanTimer = undefined
    await scanGates($).catch(() => undefined)
    const seen = ((await $.state.get(SESSION)).value?.liveGates ?? []).length > 0
    if (gateCommands > 0 || seen) armGateScan($)
  })
}

/** A command that may run a git hook or a gate script. */
const mayRunGate = (command: string): boolean => /\bgit\s+(?:\S+\s+)*(?:commit|push|merge|rebase|cherry-pick|am)\b|\bgates?[-_.\/]/.test(command)

// The footer statusline draws (070): the choice, Node's state, the one in-flight render and its pacing.
let footerSource: 'statusline' | 'native' = 'statusline'
// How the bundled copy runs and what it leaves out (081), and the last `--print-config` answer.
let footerStatuslineMode: 'live' | 'passive' = 'live'
let footerOmit = ''
let footerResolved: ResolvedConfig | undefined
let footerResolvedAt = Number.NEGATIVE_INFINITY
let footerResolvedKey = ''
let nodeState: 'ok' | 'missing' | 'old' | undefined
let nodeCheckedAt = Number.NEGATIVE_INFINITY
let footerRefreshing = false
let footerRetryArmed = false
let footerLastRefresh = Number.NEGATIVE_INFINITY
let footerFailures = 0
let footerBackoffUntil = 0
let footerGoodAt: number | undefined
let lastPaneDrawAt = Number.NEGATIVE_INFINITY
let footerTimer: ReturnType<EngineInterface['clock']['after']> | undefined
const FOOTER_FLOOR_MS = 5000
const FOOTER_STALE_MS = 90_000
const FOOTER_REUSE_MS = 60_000
const FOOTER_TICK_MS = 30_000
const FOOTER_CONFIG_MS = 60_000
const FOOTER_BACKOFF_MS = [5000, 15_000, 60_000]

/** The process runner of this module, built where `$` lives: no `$` crosses an import. */
function procOf($: EngineInterface): RunProc {
  return async (argv, init) => {
    const r = await $.process.run(argv, init)
    return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr }
  }
}

/** The bundled statusline: its CLI path and `VERSION`, or undefined when it is not there. */
async function bundledStatusline($: EngineInterface): Promise<{ cli: string; version: string; commit: string } | undefined> {
  const dir = `${$.plugin.root}/vendor/statusline`
  const fs = fsOf($)
  try {
    const meta = JSON.parse(await fs.read(`${dir}/VERSION`)) as { version?: unknown; commit?: unknown }
    if (typeof meta.version !== 'string' || typeof meta.commit !== 'string') return undefined
    if (!(await fs.exists(`${dir}/bin/cli.js`))) return undefined
    return { cli: `${dir}/bin/cli.js`, version: meta.version, commit: meta.commit.slice(0, 7) }
  } catch {
    return undefined
  }
}

/** Runs the bundled statusline for the pane footer and keeps the answer in its own state key (070). */
async function refreshStatusline($: EngineInterface, onlyWhileShown = false): Promise<void> {
  if (footerRefreshing) return
  const now = await $.clock.now()
  // A trigger from an event does nothing while the pane has not been on screen lately: no process runs for a footer nobody sees.
  if (footerSource !== 'statusline' || footerIn === 'status' || (onlyWhileShown && now - lastPaneDrawAt > 2 * FOOTER_TICK_MS)) return
  const waitMs = Math.max(FOOTER_FLOOR_MS - (now - footerLastRefresh), footerBackoffUntil - now)
  if (waitMs > 0) {
    // A trigger inside the floor or the backoff is not lost: one retry when it ends.
    if (!footerRetryArmed) {
      footerRetryArmed = true
      $.clock.after(waitMs + 50, () => {
        footerRetryArmed = false
        void refreshStatusline($)
      })
    }
    return
  }
  footerRefreshing = true
  footerLastRefresh = now
  try {
    const flavor = flavorOf(optionsSeen, isLightTheme)
    const bundled = await bundledStatusline($)
    // Node is asked again a minute after a "not ok" answer, so installing it needs no reload.
    if (nodeState === undefined || (nodeState !== 'ok' && now - nodeCheckedAt > 60_000)) {
      nodeState = await nodeStatus(procOf($))
      nodeCheckedAt = now
    }
    const choice = chooseSource({ choice: footerSource, flavor, node: nodeState, copy: bundled !== undefined, failing: false })
    if (choice.source === 'native' || bundled === undefined) {
      await setFooterState($, undefined, { source: 'native', ...(choice.reason === undefined ? {} : { reason: choice.reason }), ...(bundled === undefined ? {} : { version: bundled.version, commit: bundled.commit }) })
      return
    }
    const usage = await $.session.usage().catch(() => undefined)
    const stats = (await $.state.get(SESSION)).value
    const sessionId = await $.session.id().catch(() => undefined)
    const cwd = await $.session.cwd().catch(() => undefined)
    const modelId = stats?.model
    // Where Claude Code keeps the transcript, so the renderer can read the skills and the activity (077).
    const home = (await $.env.get('HOME').catch(() => undefined)) ?? (await $.env.get('USERPROFILE').catch(() => undefined))
    const configDir = await $.env.get('CLAUDE_CONFIG_DIR').catch(() => undefined)
    const transcriptPath = transcriptPathFor({ ...(home === undefined ? {} : { home }), ...(configDir === undefined ? {} : { configDir }), ...(cwd === undefined ? {} : { cwd }), ...(sessionId === undefined ? {} : { sessionId }) })
    const payload = buildPayload({
      rateLimits: (usage?.rateLimits ?? []).map(r => ({ kind: r.kind, percentUsed: r.percentUsed, ...(r.resetsAt === undefined ? {} : { resetsAt: r.resetsAt }) })),
      ...(usage?.context === undefined ? {} : { context: { ...(usage.context.percent === undefined ? {} : { percent: usage.context.percent }), ...(usage.context.window === undefined ? {} : { window: usage.context.window }) } }),
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(cwd === undefined ? {} : { cwd }),
      ...(modelId === undefined ? {} : { model: { id: modelId } }),
      ...(stats?.effort === undefined ? {} : { effort: stats.effort }),
      ...(transcriptPath === undefined ? {} : { transcriptPath }),
      ...(usage?.startedAt === undefined ? {} : { startedAt: usage.startedAt, now }),
      ...(stats?.lines === undefined ? {} : { lines: stats.lines }),
      ...(stats?.fast === true ? { fast: true } : {}),
    })
    const surface = surfaceSeen
    const ascii = iconsFor(iconsOption, surface as never) === 'ascii' || accessible || surface !== 'terminal'
    const width = Math.max(20, columnsSeen - 4)
    // Passive mode writes only inside a folder of this plugin's own data (081); without one it writes nothing.
    const dataDir = footerStatuslineMode === 'passive' ? await $.env.get('CLAUDE_PLUGIN_DATA').catch(() => undefined) : undefined
    const env = statuslineEnv({
      columns: width,
      lines: 3,
      flavor,
      ascii,
      mode: footerStatuslineMode,
      ...(dataDir === undefined || dataDir === '' ? {} : { cacheDir: joinDir(dataDir, 'statusline-cache') }),
      omit: footerOmit,
    })
    const result = await renderFooter({ run: procOf($), cli: bundled.cli, payload, env, now: () => Date.now(), cwd: cwd ?? '.' })
    if (result.ok) {
      footerFailures = 0
      footerBackoffUntil = 0
      footerGoodAt = now
      // What the copy resolved, at most once a minute and after a render that worked, never on the draw path (081).
      // The answer depends on the environment (flavor, glyph set, mode, omit list), not on the size.
      const configKey = JSON.stringify({ ...env, COLUMNS: undefined, LINES: undefined, cwd })
      if (configKey !== footerResolvedKey || now - footerResolvedAt >= FOOTER_CONFIG_MS) {
        const changed = configKey !== footerResolvedKey
        footerResolvedAt = now
        footerResolvedKey = configKey
        const read = await readResolvedConfig({ run: procOf($), cli: bundled.cli, env, cwd: cwd ?? '.' })
        // A read that failed keeps the last good answer, unless it was for other settings.
        if (read !== undefined || changed) footerResolved = read
      }
      const embed = { mode: footerStatuslineMode, omit: footerOmit, asked: flavor, ...(footerResolved === undefined ? {} : { config: footerResolved }) }
      await setFooterState($, { at: now, columns: width, lines: result.lines.map(l => l.map(run => ({ ...run }))) }, { source: 'statusline', version: bundled.version, commit: bundled.commit, format: result.format, ...(result.format === 'runs' ? { contract: SUPPORTED_CONTRACT } : {}), embed })
      return
    }
    footerFailures += 1
    footerBackoffUntil = now + (FOOTER_BACKOFF_MS[Math.min(footerFailures - 1, FOOTER_BACKOFF_MS.length - 1)] ?? 60_000)
    const reusable = footerGoodAt !== undefined && now - footerGoodAt < FOOTER_REUSE_MS
    // The last good lines stay for a minute; after that the native footer shows with the reason.
    // A newer contract or the renderer's own node check name the reason; the rest is a failed render.
    const reason: SourceReason = result.reason === 'contract-newer' ? 'contract-newer' : result.reason === 'contract-error' && result.code === 'node-version' ? 'node-old' : 'renderer-failed'
    if (!reusable || result.reason === 'contract-newer') await setFooterState($, undefined, { source: 'native', reason, version: bundled.version, commit: bundled.commit })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    footerRefreshing = false
  }
}

/** Writes the footer state only when it changed, so an identical render redraws nothing. */
async function setFooterState($: EngineInterface, render: FooterState['render'] | undefined, health: NonNullable<FooterState['health']>): Promise<void> {
  const before = (await $.state.get(FOOTER)).value
  const next: FooterState = { ...(render === undefined ? {} : { render }), health }
  const same = (a?: FooterState['render']) => JSON.stringify(a === undefined ? undefined : { columns: a.columns, lines: a.lines })
  if (JSON.stringify(before?.health) === JSON.stringify(health) && same(before?.render) === same(render)) {
    // The time is not state a reader needs: keep the stored render as it is.
    return
  }
  await $.state.set(FOOTER, next)
}

/** The Setup tab's lines about the footer source (070 FR-010). */
function footerSetupRows(state: FooterState | undefined, lang: Lang): string[] {
  const health = state?.health
  const rows: string[] = []
  const bundled = health?.version === undefined ? undefined : t(lang, 'footer.setup.bundled', { version: health.version, commit: health.commit ?? '?' })
  rows.push(`${t(lang, 'footer.setup.source')}: ${health?.source === 'statusline' ? (bundled ?? 'statusline') : t(lang, 'footer.setup.native')}`)
  if (health?.source === 'native' && health.reason !== undefined && health.reason !== 'native-chosen') {
    rows.push(`${t(lang, 'footer.setup.because')}: ${t(lang, `footer.fallback.${health.reason}` as TextKey)}`)
  }
  if (health?.source === 'statusline' && health.format !== undefined) {
    rows.push(`${t(lang, 'footer.setup.format')}: ${health.format === 'runs' ? t(lang, 'footer.setup.formatRuns', { contract: String(health.contract ?? SUPPORTED_CONTRACT) }) : t(lang, 'footer.setup.formatAnsi')}`)
  }
  const embed = health?.embed
  // What the copy resolved wins over what was asked for: an older copy that ignores a switch says so.
  const config = embed?.config
  const passive = config?.passive ?? (embed?.mode ?? footerStatuslineMode) === 'passive'
  rows.push(`${t(lang, 'footer.setup.mode')}: ${t(lang, passive ? 'footer.setup.modePassive' : 'footer.setup.modeLive')}`)
  const omitted = config === undefined ? (embed?.omit ?? footerOmit) : config.omitted.join(',')
  if (omitted !== '') rows.push(`${t(lang, 'footer.setup.omit')}: ${omitted}`)
  if (config !== undefined) {
    rows.push(`${t(lang, 'footer.setup.resolved')}: ${t(lang, 'footer.setup.resolvedLine', { flavor: config.flavor, glyphs: config.glyphs ?? '?', separator: config.separator ?? '?' })}`)
    if (embed !== undefined && flavorMismatch(embed.asked, config)) rows.push(t(lang, 'footer.setup.flavorMismatch', { asked: embed.asked, drawn: config.flavor }))
  }
  rows.push(t(lang, 'footer.setup.use'))
  return rows
}

/** Arms the 30 s refresh while the pane is on screen. */
function armFooterTick($: EngineInterface): void {
  footerTimer?.cancel()
  footerTimer = undefined
  if (footerSource !== 'statusline') return
  footerTimer = $.clock.after(FOOTER_TICK_MS, async () => {
    footerTimer = undefined
    const now = await $.clock.now()
    if (now - lastPaneDrawAt < 2 * FOOTER_TICK_MS) await refreshStatusline($)
    armFooterTick($)
  })
}

/** Arms the idle poller after a turn: a refresh every ten idle minutes, at most six (058). */
function armIdlePoll($: EngineInterface, done = 0): void {
  idlePollTimer?.cancel()
  idlePollTimer = $.clock.after(IDLE_POLL_MS + 1000, async () => {
    idlePollTimer = undefined
    await refreshNow($).catch(() => undefined)
    if (done + 1 < IDLE_POLL_MAX) armIdlePoll($, done + 1)
  })
}

async function syncNow($: EngineInterface, activeChanged?: boolean): Promise<void> {
  const fs = fsOf($)
  const now = await $.clock.now()
  const held = await guarded($, async previous => (previous === undefined ? undefined : reconcileNow(fs, previous, now, activeChanged)))
  await captureFeatureDurations($, held, now)
}

let probing = false

/** Each tab's scroll offset for this project, kept in the store so a reload keeps it (043 #30). */
async function savedScrolls($: EngineInterface, root: string | undefined): Promise<Record<string, number>> {
  if (root === undefined) return {}
  const saved = await $.store.get(`scroll:${root}`).catch(() => undefined)
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  return Object.fromEntries(Object.entries(saved as Record<string, unknown>).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] >= 0))
}

async function rememberScroll($: EngineInterface, tab: string, offset: number): Promise<void> {
  try {
    const root = ((await $.state.get(SPECKIT)).value)?.root
    if (root === undefined) return
    const saved = await savedScrolls($, root)
    if ((saved[tab] ?? 0) === offset) return
    await $.store.set(`scroll:${root}`, { ...saved, [tab]: offset })
  } catch {
    // A store that fails only forgets the offset.
  }
}

/**
 * The cheap freshness check (investigate): three stats of the active feature's spec.md, plan.md
 * and tasks.md. Nothing is read, written or drawn unless one moved, then the same read as
 * `syncNow`. Runs after tools that may write files without Astrolabe seeing it, and on a timer
 * while a turn runs, so progress follows subagents, shells, MCP tools and other editors.
 */
async function probeNow($: EngineInterface): Promise<void> {
  if (probing) return
  probing = true
  try {
    const shown = (await $.state.get(SPECKIT)).value
    if (shown?.root === undefined || shown.active === undefined) return
    if (await activeFilesChanged(fsOf($), { state: shown })) await syncNow($, true)
  } catch (error) {
    logError($, error)
  } finally {
    probing = false
  }
}

// How often a running turn checks the active feature's files (investigate).
const LIVE_PROBE_MS = 2000
let liveProbe: ReturnType<EngineInterface['clock']['every']> | undefined

/** Arms the turn's file probe; replaces one already running. */
function armLiveProbe($: EngineInterface): void {
  liveProbe?.cancel()
  liveProbe = $.clock.every(LIVE_PROBE_MS, () => void probeNow($))
}

function disarmLiveProbe(): void {
  liveProbe?.cancel()
  liveProbe = undefined
}

/** Spec folders seen this session, so the stats are written once per folder. */
const touchedSpecsSeen = new Set<string>()

async function touchFile(
  $: EngineInterface,
  preset: Preset,
  path: string,
  isWrite: boolean,
  change?: { before: string; after: string },
): Promise<void> {
  const fs = fsOf($)
  const now = await $.clock.now()
  // The specs Claude read or edited this session (067 #40), for the Touched section.
  const touchedDir = /\/specs\/([^/]+)\//.exec(path)?.[1]
  if (touchedDir !== undefined && !touchedSpecsSeen.has(touchedDir)) {
    touchedSpecsSeen.add(touchedDir)
    const dir = touchedDir
    await flushStats($, stats => ({ ...stats, touchedSpecs: [...(stats.touchedSpecs ?? []).filter(d => d !== dir), dir].slice(-20) }))
  }
  let drift: string | undefined
  const held = await guarded($, async previous => {
    if (previous === undefined) return undefined
    const touched = await applyFileTouch(fs, previous, path, isWrite, now, change, currentLang())
    drift = touched.drift
    return touched.held
  })
  if (held !== undefined && drift !== undefined && preset.toasts !== 'none') {
    live.drifts += 1
    // Per feature too (054 #35): the one active when the alarm went off.
    const id = held.state.active?.id
    if (id !== undefined) live.driftsById[id] = (live.driftsById[id] ?? 0) + 1
    await showToast($, drift, { kind: 'warn' })
  }
}

/**
 * After a reconcile with `toasts: all`: compare phases with this session's baseline and
 * toast moves forward (005). The baseline lives in the session memo (013), so two sessions
 * on one project never hide each other's toasts. Writes the memo only when it changed.
 */
/** The reconcile whose plan files were last checked, so a repeat draw reads nothing (067 #33). */
let planCheckedAt: string | undefined

/**
 * Files plan.md names that are not there (067 #33), for the active spec and the ones ready to
 * close, at most ten, read after a reconcile and never while drawing (Principle XII).
 */
async function checkPlanFiles($: EngineInterface, held: Held | undefined): Promise<void> {
  const state = held?.state
  if (state === undefined || state.root === undefined) return
  const key = `${state.root}|${state.memoVersion ?? ''}`
  if (planCheckedAt === key) return
  planCheckedAt = key
  const fs = fsOf($)
  const targets = state.features
    .filter(f => f.phase !== 'abandoned' && (f.dir === state.active?.dir || displaySectionOf(f, state.active?.dir) === 'close'))
    .slice(0, 10)
  const missing: Record<string, string[]> = {}
  for (const f of targets) {
    const plan = await fs.read(`${state.root}/specs/${f.dir}/plan.md`).catch(() => undefined)
    if (plan === undefined) continue
    const gone: string[] = []
    for (const path of planFiles(plan).slice(0, 12)) {
      if (!(await fs.exists(`${state.root}/${path}`).catch(() => true))) gone.push(path)
    }
    if (gone.length > 0) missing[f.dir] = gone
  }
  await flushStats($, stats => (JSON.stringify(stats.planMissing ?? {}) === JSON.stringify(missing) ? stats : { ...stats, planMissing: missing }))
}

async function afterReconcile($: EngineInterface, preset: Preset, held: Held | undefined): Promise<void> {
  await checkPlanFiles($, held).catch(() => undefined)
  // Under the compact preset a finished phase brightens its chip for 30 seconds instead of a toast (065 #18).
  const brightens = preset.toasts !== 'all' && preset.band
  if ((preset.toasts !== 'all' && !brightens) || held === undefined || held.state.root === undefined) return
  try {
    const baseline = held.memo.baseline ?? {}
    const active = held.state.active
    const nextOf = active !== undefined && held.state.nextCommand !== undefined ? { [active.dir]: held.state.nextCommand } : {}
    const toasted = held.memo.toasted ?? []
    const out = phaseToasts(held.state.features, baseline, toasted, held.memo.baselined === true, nextOf, currentLang())
    if (brightens) {
      if (out.toasts.length > 0) {
        const until = (await $.clock.now()) + 30_000
        await flushStats($, stats => ({ ...stats, phaseBrightUntil: until }))
        $.clock.after(30_000, () => $.ui.invalidate('ui.render'))
      }
    } else {
      for (const toast of out.toasts) await showToast($, toast.text)
    }
    const isSame = held.memo.baselined === true && out.toasted.length === toasted.length && JSON.stringify(out.baseline) === JSON.stringify(baseline)
    if (!isSame) {
      await guarded($, async previous =>
        previous === undefined
          ? undefined
          : { ...previous, memo: { ...previous.memo, baselined: true, toasted: out.toasted, baseline: out.baseline } },
      )
    }
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** Runs the next Spec Kit command (020a), from the band's button or /astrolabe next. */
async function runNext($: EngineInterface, command: string): Promise<void> {
  await $.command.run({ command: command.replace(/^\//, ''), args: '' }).catch((error: unknown) => {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  })
}

async function runQueued($: EngineInterface, id: string): Promise<string> {
  const item = ((await $.state.get(USAGE)).value ?? DEFAULT_USAGE).queue.find(q => q.id === id)
  if (item === undefined) return `🧭 nothing queued as ${id}`
  await updateUsage($, u => ({ ...u, queue: u.queue.filter(q => q.id !== item.id), passes: [...(u.passes ?? []), item.prompt].slice(-QUEUE_MAX) }))
  await logGovernor($, `→ run ${item.id} now`)
  $.clock.after(0, () => void $.prompt.submit({ text: runPrompt(item) }).catch(() => undefined))
  return `🧭 running ${item.id} now: ${item.description}`
}

async function copyNext($: EngineInterface, command: string, surface: string): Promise<void> {
  const copied = await $.ui.copy({ text: command, surface: surface as never }).catch(() => ({ isCopied: false }))
  if (copied.isCopied) await showToast($, t(currentLang(), 'next.copied', { cmd: command }))
}

// The last next command proposed in the prompt box (020a): each new one is proposed once.
let lastSuggested: string | undefined

async function suggestNext($: EngineInterface, held: Held | undefined, before?: Held): Promise<void> {
  // A feature just finished (054 #90): propose a retrospective, Spec Kit's when the project has it, else gstack's.
  const finished = before === undefined || held === undefined ? undefined : justFinished(before.state.features, held.state.features)
  if (finished !== undefined && isInteractive) {
    const root = held?.state.root
    const hasSpeckitRetro = root !== undefined && (await fsOf($).read(`${root}/.claude/skills/speckit-retro/SKILL.md`).catch(() => undefined)) !== undefined
    lastSuggested = hasSpeckitRetro ? '/speckit-retro' : '/retro'
    await $.prompt.suggest({ text: lastSuggested }).catch(() => undefined)
    return
  }
  const nextCommand = held?.state.nextCommand
  const active = held?.state.features.find(feature => feature.dir === held.state.active?.dir)
  const command = nextCommand === undefined ? undefined : active === undefined ? nextCommand : `${nextCommand} ${active.id}`
  if (command === undefined || command === lastSuggested || !isInteractive) return
  lastSuggested = command
  await $.prompt.suggest({ text: command }).catch(() => undefined)
}

const doneOf = (held: Held | undefined) => (held?.state.features ?? []).reduce((n, f) => n + f.done, 0)
const finishedOf = (held: Held | undefined) => (held?.state.features ?? []).filter(f => f.phase === 'done').length

/**
 * After a main turn (021): the tasks it ticked, by its duration; how long the task that was
 * current took once it is done; and this week's counts in $.store, across sessions.
 */
async function noteProgress($: EngineInterface, before: Held | undefined, held: Held | undefined, now: number, durationMs: number): Promise<void> {
  try {
    const ticked = Math.max(0, doneOf(held) - doneOf(before))
    const finished = Math.max(0, finishedOf(held) - finishedOf(before))
    // A feature just finished (026 #53): a five-line summary from a small model, if asked for.
    if (featureSummary && finished > 0) {
      const was = new Set((before?.state.features ?? []).filter(f => f.phase === 'done').map(f => f.dir))
      for (const f of (held?.state.features ?? []).filter(f => f.phase === 'done' && !was.has(f.dir))) {
        const feature = { dir: f.dir, id: f.id, name: f.name }
        $.clock.after(0, () => void summarizeFeature($, feature))
      }
    }
    const was = before?.memo.currentTask
    const isTicked = was !== undefined && held?.memo.currentTask?.id !== was.id && held?.state.activeTasks?.some(task => task.id === was.id && task.isDone) === true
    if (ticked > 0 || isTicked) {
      await flushStats($, s => ({
        ...s,
        ...(ticked > 0 ? { turnTicks: [...(s.turnTicks ?? []), { ms: durationMs, n: ticked }].slice(-20) } : {}),
        ...(isTicked ? { taskTimes: [...(s.taskTimes ?? []), { dir: was!.dir, id: was!.id, ms: now - was!.startedAt }].slice(-50) } : {}),
      }))
    }
    // Three turns on one task and nothing ticked: Claude may be spinning (054 #85).
    const current = held?.state.currentTask?.id ?? held?.state.activeTasks?.find(task => !task.isDone)?.id
    if (current !== undefined) {
      let spinning = false
      await flushStats($, s => {
        const turns = ticked > 0 || s.spin?.id !== current ? (ticked > 0 ? 0 : 1) : s.spin.turns + 1
        spinning = turns >= 3 && s.spin?.told !== true
        return { ...s, spin: { id: current, turns, ...(spinning || (s.spin?.id === current && s.spin.told === true && ticked === 0) ? { told: true as const } : {}) } }
      })
      if (spinning && presetOf(optionsSeen).toasts !== 'none') await showToast($, t(currentLang(), 'toast.spin', { id: current }), { kind: 'warn' })
    }
    if (ticked > 0 || finished > 0) {
      const stored = await $.store.get(HISTORY)
      const weeks = typeof stored === 'object' && stored !== null && !Array.isArray(stored) ? (stored as Weeks) : {}
      const next = addWeek(weeks, weekKey(now), ticked, finished)
      await $.store.set(HISTORY, next)
      const week = next[weekKey(now)]
      const storedDays = await $.store.get(DAYS)
      const days = addDay(typeof storedDays === 'object' && storedDays !== null && !Array.isArray(storedDays) ? (storedDays as Days) : {}, dayKey(now), ticked)
      if (ticked > 0) await $.store.set(DAYS, days)
      await flushStats($, s => ({ ...s, ...(week === undefined ? {} : { week }), weekdays: weekdays(days, now), weeksTrend: lastWeeks(next, now) }))
    }
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** A warning when the open tasks, at this feature's pace, run past the 5h reset (045 #50). */
async function pastResetRows(
  $: EngineInterface,
  state: Held['state'],
  stats: SessionStats | undefined,
  usage: UsageState,
): Promise<Array<{ key: string; text: string; role: 'current' }>> {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  const window = usage.readings.find(r => r.kind === 'five_hour')
  if (feature === undefined || stats === undefined || window?.resetsAt === undefined) return []
  const left = pastReset(stats.taskTimes ?? [], feature.dir, feature.total - feature.done, window.resetsAt, await $.clock.now())
  if (left === undefined) return []
  return [{ key: 'past-reset', text: t(currentLang(), 'tasks.pastReset', { time: minutes(left), n: feature.total - feature.done, at: clockOf(window.resetsAt) ?? '' }), role: 'current' }]
}

// The tasks of the specs the tree shows (078): the active spec's come with the state; the others
// are read from their tasks.md once per memo version.
const specFilesCache = new Map<string, { key: string; tasks: TreeTask[]; spec?: string }>()

/** One spec's tasks, and its spec.md when it has open questions to list (078 FR-045). */
async function specFilesOf($: EngineInterface, state: SpeckitState, f: Feature, wantSpec: boolean): Promise<{ tasks: TreeTask[]; spec?: string }> {
  if (state.root === undefined) return { tasks: [] }
  const key = `${state.root}|${state.memoVersion ?? 'x'}|${f.done}/${f.total}|${wantSpec}`
  const hit = specFilesCache.get(f.dir)
  if (hit !== undefined && hit.key === key && state.memoVersion !== undefined) return { tasks: hit.tasks, ...(hit.spec === undefined ? {} : { spec: hit.spec }) }
  const text = await $.fs.read(`${state.root}/specs/${f.dir}/${f.track === 'quick' ? 'spec.md' : 'tasks.md'}`).catch(() => '')
  const spec = wantSpec ? await $.fs.read(`${state.root}/specs/${f.dir}/spec.md`).catch(() => '') : undefined
  const tasks = parseTasks(text)
  specFilesCache.set(f.dir, { key, tasks, ...(spec === undefined ? {} : { spec }) })
  return { tasks, ...(spec === undefined ? {} : { spec }) }
}

/**
 * The Specs tab as a tree (078): each spec row, and under an open one its questions, its current
 * task and its stories with their tasks. `past` rows (the 5h reset warning) sit under the active spec.
 */
async function specsTreeRows(
  $: EngineInterface,
  e: Parameters<Hook<'ui.render'>>[1],
  state: SpeckitState,
  stats: SessionStats | undefined,
  pane: PaneState,
  filter: string | undefined,
  columns: number,
  past: PaneRow[],
): Promise<{ rows: PaneRow[]; kept: number }> {
  const lang = currentLang()
  const activeDir = state.active?.dir
  const words = parseSpecFilter(filter).words
  const now = await $.clock.now()
  const baseFold: Fold = { ...(pane.opened === undefined ? {} : { opened: pane.opened }), ...(pane.closed === undefined ? {} : { closed: pane.closed }) }
  // With words in the filter every spec's tasks are read (capped), so a task match keeps its spec (078 FR-007).
  const wanted = words === '' ? state.features.filter(f => f.total > 0 && isOpen(f.dir, activeDir, baseFold)) : state.features.filter(f => f.total > 0).slice(0, 40)
  const files = new Map<string, { tasks: TreeTask[]; spec?: string }>()
  await Promise.all(wanted.map(async f => {
    const wantSpec = (f.clarifications ?? 0) > 0 && isOpen(f.dir, activeDir, baseFold)
    const read = f.dir === activeDir && state.activeTasks !== undefined && !wantSpec ? { tasks: [...state.activeTasks] } : await specFilesOf($, state, f, wantSpec)
    files.set(f.dir, read)
  }))
  const taskDirs = new Set<string>()
  if (words !== '') for (const [dir, got] of files) if (got.tasks.some(t => t.text.toLowerCase().includes(words) || (/^t\d+$/.test(words) && (t.id ?? '').toLowerCase().includes(words)))) taskDirs.add(dir)
  const fold: Fold = {
    opened: [...new Set([...(baseFold.opened ?? []), ...taskDirs])],
    closed: (baseFold.closed ?? []).filter(d => !taskDirs.has(d)),
  }
  const context = { ...specFilterContext(stats), taskDirs }
  const visible = filtered(state, filter, pane.status, context)
  const features = withWorktreeProgress(visible.features, stats?.worktrees)
  const base = specsRows(
    { ...visible, features },
    columns,
    lang,
    stats?.priorities ?? {},
    worktreesById(stats?.worktrees),
    (filter ?? '').trim() === '' && (pane.status ?? 'all') === 'all',
    stats?.worktrees?.map(w => ({ name: w.name, id: w.id, featureName: w.featureName, phase: w.phase, done: w.done, total: w.total, status: worktreeState(w) })) ?? [],
    e.surface === 'desktop',
    pane.sort ?? 'status',
    state.root === undefined ? undefined : roadmapCache.has(state.root) ? roadmapCache.get(state.root) : await $.fs.read(`${state.root}/docs/roadmap.md`).then(text => { roadmapCache.set(state.root!, text); return text }).catch(() => { roadmapCache.set(state.root!, undefined); return undefined }),
    { ...(pane.view === undefined ? {} : { view: pane.view }), filtered: !((filter ?? '').trim() === '' && (pane.status ?? 'all') === 'all'), open: pane.open ?? [], group: pane.group ?? 'status', touched: stats?.touchedSpecs ?? [], planMissing: stats?.planMissing ?? {}, tree: fold, pulls: pullsBySpec(stats?.pulls?.rows, state.features) },
  )
  const tasksOnly = pane.tasksOnly === true
  const childrenOf = (f: Feature): PaneRow[] => {
    const got = files.get(f.dir)
    const isActive = f.dir === activeDir
    const tasks = isActive ? [...(state.activeTasks ?? got?.tasks ?? [])] : got?.tasks ?? []
    const rows = specChildren(f, tasks, {
      columns,
      lang,
      now,
      isActive,
      tasksOnly,
      ...(state.root === undefined ? {} : { root: state.root }),
      ...(isActive && state.currentTask !== undefined ? { currentTask: state.currentTask } : {}),
      times: stats?.taskTimes ?? [],
      ...(words === '' ? {} : { words }),
      questions: questionsIn(got?.spec),
      ...(f.checklist === undefined ? {} : { checklist: f.checklist }),
      wrap: e.surface === 'desktop' || columns >= 100,
    })
    return isActive ? [...past, ...rows] : rows
  }
  const active = state.features.find(f => f.dir === activeDir)
  if (tasksOnly && active !== undefined) {
    const head = base.find(r => r.key === `feature-${active.id}`)
    if (head !== undefined) return { rows: [head, ...childrenOf(active)], kept: visible.features.length }
  }
  const tree = withChildren(base, features, f => isOpen(f.dir, activeDir, fold) && f.total + (f.clarifications ?? 0) > 0, childrenOf)
  return { rows: paneDensity === 'comfortable' ? spaced(tree) : tree, kept: visible.features.length }
}

/**
 * What the Specs list's surface module posted (080): the keys the arrows, Enter and the letters
 * stand for, applied with the functions the buttons and the Enter hook use, so a key and a click do
 * the same. The module is code: every field was checked by `parseClientOp`.
 */
async function applyClientOp($: EngineInterface, op: ClientOp): Promise<void> {
  const state = (await $.state.get(SPECKIT)).value
  if (state === undefined) return
  const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
  const activeDir = state.active?.dir
  const stats = (await $.state.get(SESSION)).value
  /** The spec a row key names: `feature-<id>`, or `task-<dir>-<id>`. */
  const dirOf = (key: string): string | undefined =>
    state.features.find(f => `feature-${f.id}` === key.replace(/~\d+$/, ''))?.dir ?? state.features.find(f => key.startsWith(`task-${f.dir}-`))?.dir
  const setFold = async (fold: { opened: string[]; closed: string[] }) => {
    const { selectedTask: _t, ...rest } = held
    await $.state.set(PANE_STATE, { ...rest, ...fold })
    if (state.root !== undefined) await $.store.set(`folds:${state.root}`, fold).catch(() => undefined)
  }
  const baseFold = { ...(held.opened === undefined ? {} : { opened: held.opened }), ...(held.closed === undefined ? {} : { closed: held.closed }) }
  const goTo = async (offset: number) => {
    const to = Math.max(0, Math.min(Math.max(0, (unitsShown['specs'] ?? 1) - 1), offset))
    // The selection follows the window: the first row that can be selected at or after the new top.
    const row = specSelectionRows.find(r => r.index >= to) ?? specSelectionRows.at(-1)
    const picked = row === undefined ? {} : row.key.startsWith('task-') ? { selectedTask: row.key } : { selectedFeature: row.key.slice('feature-'.length) }
    const { selectedTask: _t, ...rest } = held
    await $.state.set(PANE_STATE, { ...rest, ...picked, scroll: { tab: 'specs', offset: to } })
    await rememberScroll($, 'specs', to)
  }
  switch (op.op) {
    case 'select': {
      const { selectedTask: _t, ...rest } = held
      await $.state.set(PANE_STATE, op.key.startsWith('task-') ? { ...rest, selectedTask: op.key } : { ...rest, selectedFeature: op.key.slice('feature-'.length) })
      if (state.root !== undefined) await $.store.set(`selection:${state.root}`, op.key).catch(() => undefined)
      return
    }
    case 'fold': {
      const dir = dirOf(op.key)
      if (dir === undefined) return
      const open = isOpen(dir, activeDir, baseFold)
      if ((op.mode === 'open' && open) || (op.mode === 'close' && !open)) return
      await setFold(toggled(dir, activeDir, baseFold))
      return
    }
    case 'page': {
      const size = Math.max(1, specSelectionWindow.end - specSelectionWindow.start - 1)
      const from = held.scroll?.tab === 'specs' ? held.scroll.offset : 0
      await goTo(from + op.by * size)
      return
    }
    case 'home':
      await goTo(0)
      return
    case 'end':
      await goTo(Math.max(0, (unitsShown['specs'] ?? 1) - 1))
      return
    case 'tab': {
      const at = TABS.findIndex(item => item.tab === held.tab)
      const next = TABS[(at + op.by + TABS.length) % TABS.length]
      if (next === undefined) return
      const { help: _h, ...rest } = held
      await $.state.set(PANE_STATE, { ...rest, tab: next.tab })
      if (state.root !== undefined) await $.store.set(`tab:${state.root}`, next.tab).catch(() => undefined)
      return
    }
    case 'block': {
      const open = new Set(held.open ?? [])
      if (open.has(op.key)) open.delete(op.key)
      else open.add(op.key)
      await $.state.set(PANE_STATE, { ...held, open: [...open] })
      return
    }
    case 'copy':
      await copyNext($, op.text, 'terminal')
      return
    case 'action': {
      if (op.kind === 'close') void $.prompt.suggest({ text: closeAllSuggestion(op.id.split('\n')) }).catch(() => undefined)
      else if (op.kind === 'reconcile') void $.prompt.suggest({ text: reconcileSuggestion(op.id) }).catch(() => undefined)
      else if (op.kind === 'ask') void $.prompt.suggest({ text: questionSuggestion(op.id) }).catch(() => undefined)
      else if (op.kind === 'specify') void $.prompt.suggest({ text: `/speckit-specify ${op.id}` }).catch(() => undefined)
      else if (op.kind === 'parallel') {
        const [dir, ...ids] = op.id.split('\n')
        const feature = state.features.find(f => f.dir === dir)
        const picked = (dir === activeDir ? state.activeTasks ?? [] : []).filter(task => task.id !== undefined && ids.includes(task.id))
        if (feature !== undefined && picked.length > 0) void $.clock.after(0, () => void $.prompt.submit({ text: parallelPrompt(feature, picked) }).catch(() => undefined))
      }
      return
    }
    case 'act': {
      const selected = selectedSpecRow
      const dir = selected === undefined ? undefined : dirOf(selected)
      const feature = state.features.find(f => f.dir === dir)
      switch (op.key) {
        case 't': {
          const { tasksOnly: _was, ...rest } = held
          await $.state.set(PANE_STATE, held.tasksOnly === true ? rest : { ...rest, tasksOnly: true })
          return
        }
        case 'e':
          await setFold(allToggled(state.features.filter(f => f.total > 0).map(f => f.dir), activeDir, baseFold))
          return
        case 'x': {
          if (selected === undefined || !selected.startsWith('task-') || feature === undefined) return
          const id = selected.slice(`task-${feature.dir}-`.length)
          const tasks = feature.dir === activeDir ? state.activeTasks ?? [] : specFilesCache.get(feature.dir)?.tasks ?? []
          const task = tasks.find(x => x.id === id)
          if (task !== undefined) void $.prompt.suggest({ text: tickSuggestion(feature, { ...(task.id === undefined ? {} : { id: task.id }), ...(task.line === undefined ? {} : { line: task.line }), text: task.text }) }).catch(() => undefined)
          return
        }
        case 'u': {
          if (feature === undefined || feature.dir === activeDir || state.root === undefined) return
          const root = state.root
          await confirmPress($, `use-${feature.id}`, () => void (async () => {
            await $.store.set(`feature:${root}`, feature.dir).catch(() => undefined)
            await showToast($, t(currentLang(), 'specs.selected', { id: feature.id, name: feature.name }))
          })())
          return
        }
        case 'p':
          if (feature !== undefined) await setPriority($, feature.id, nextPriority(stats?.priorities?.[feature.id])).catch(() => undefined)
          return
        case 's':
          await $.state.set(PANE_STATE, { ...held, status: nextStatus(held.status) })
          return
        case 'o':
          await $.state.set(PANE_STATE, { ...held, sort: nextSort(held.sort) })
          return
        case 'c': {
          const { filter: _f, status: _s, ...rest } = held
          await $.state.set(PANE_STATE, rest)
          return
        }
        case 'r':
          await refreshNow($).catch(() => undefined)
          return
        case 'a':
          if (feature !== undefined) await confirmPress($, `advisor-${feature.id}`, () => askAdvisor($, feature))
          return
        default:
          return
      }
    }
  }
}

/** One line of the governor's history (021): what it asked, what was answered, when it resumed. */
async function logGovernor($: EngineInterface, text: string): Promise<void> {
  const at = await $.clock.now()
  await updateUsage($, u => ({ ...u, log: [...(u.log ?? []), { at, text }].slice(-20) }))
}

/** Opens the pane once per session without being asked (preset full, wide fullscreen). */
async function openUnasked($: EngineInterface): Promise<void> {
  try {
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (pane.autoOpened) return
    await $.state.set(PANE_STATE, { ...pane, autoOpened: true })
    await $.ui.open({ id: PANE_ID, title: PANE_TITLE })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

function logError($: EngineInterface, error: unknown): void {
  $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
}

async function setUpdates($: EngineInterface, change: (held: UpdatesState) => UpdatesState): Promise<void> {
  const held = (await $.state.get(UPDATES)).value ?? { items: [] }
  await $.state.set(UPDATES, change(held))
}

/** Runs one tool and returns its stdout, or undefined when it is missing or fails. */
async function stdoutOf($: EngineInterface, argv: readonly string[], cwd?: string): Promise<string | undefined> {
  try {
    const run = await $.process.run(argv, cwd === undefined ? undefined : { cwd })
    return run.exitCode === 0 ? run.stdout : undefined
  } catch {
    return undefined
  }
}

/**
 * jonyfs/statusline and this footer would both draw under the prompt (050 #97): read the pick
 * from the store, and while there is none and a statusline command is set, toast once how to pick.
 */
async function settleFooterOwner($: EngineInterface): Promise<void> {
  try {
    const stored = parseFooterOwner(await $.store.get(FOOTER_OWNER).catch(() => undefined))
    const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
    const settings = home === undefined || home === '' ? undefined : await $.fs.read(`${home.replace(/[\\/]+$/, '')}/.claude/settings.json`).catch(() => undefined)
    const { owner, ask } = footerOwnerOf(stored, statuslineConfigured(settings as string | undefined))
    footerOwner = owner
    if (!ask) return
    // Asked once: the question is marked as answered with the default, the command changes it.
    await $.store.set(FOOTER_OWNER, 'astrolabe').catch(() => undefined)
    await showToast($, t(currentLang(), 'footer.asked'))
  } catch (error) {
    logError($, error)
  }
}

/** gstack's update check, found from the home directory; undefined when gstack is not installed. */
async function gstackCheck($: EngineInterface): Promise<string | undefined> {
  const home = (await $.env.get('HOME')) ?? (await $.env.get('USERPROFILE'))
  if (home === undefined || home === '') return undefined
  const path = `${home.replace(/[\\/]+$/, '')}/.claude/skills/gstack/bin/gstack-update-check`
  return (await $.fs.exists(path).catch(() => false)) ? path : undefined
}

/** Updates the person hid with the hide button stay hidden until a newer version shows up. */
async function visible($: EngineInterface, items: readonly UpdateItem[]): Promise<UpdateItem[]> {
  const hidden = await $.store.get(UPDATES_HIDDEN)
  const map = typeof hidden === 'object' && hidden !== null ? (hidden as Record<string, string>) : {}
  return items.filter(item => map[item.id] !== item.latest)
}

async function hideUpdates($: EngineInterface): Promise<void> {
  try {
    const held = (await $.state.get(UPDATES)).value ?? { items: [] }
    const before = await $.store.get(UPDATES_HIDDEN)
    const map = typeof before === 'object' && before !== null ? (before as Record<string, string>) : {}
    await $.store.set(UPDATES_HIDDEN, { ...map, ...Object.fromEntries(held.items.map(i => [i.id, i.latest])) })
    await $.state.set(UPDATES, { items: [] })
  } catch (error) {
    logError($, error)
  }
}

/** Spec 007: once per local day, ask each tool whether it has an update. Never throws. */
async function checkUpdates($: EngineInterface): Promise<void> {
  try {
    const today = localDay(await $.clock.now())
    const stored = await $.store.get(UPDATES_STORE)
    const known = isStoredUpdates(stored) ? stored : undefined
    if (known !== undefined) {
      const shown = await visible($, known.items)
      await setUpdates($, held => ({ ...held, items: shown }))
    }
    if (!isDue(known, today)) return
    await $.store.set(UPDATES_STORE, { checkedOn: today, items: known?.items ?? [] })
    const items: UpdateItem[] = []
    const gstackPath = await gstackCheck($)
    const gstack = gstackPath === undefined ? undefined : await stdoutOf($, [gstackPath])
    const gstackItem = gstack === undefined ? undefined : parseGstackCheck(gstack)
    if (gstackItem !== undefined) items.push(gstackItem)
    const self = await stdoutOf($, ['specify', 'self', 'check'])
    const selfItem = self === undefined ? undefined : parseSelfCheck(self)
    if (selfItem !== undefined) items.push(selfItem)
    const root = (await $.state.get(SPECKIT)).value?.root
    if (root !== undefined) {
      const manifest = await $.fs.read(`${root}/.specify/integrations/speckit.manifest.json`).catch(() => undefined)
      const cli = await stdoutOf($, ['specify', 'version'])
      const skills = skillsUpdate(typeof manifest === 'string' ? manifest : undefined, cli === undefined ? undefined : parseCliVersion(cli))
      if (skills !== undefined) items.push(skills)
    }
    try {
      const release = await $.http.fetch(RELEASES_URL, { headers: { accept: 'application/vnd.github+json' } })
      const mine = release.ok ? astrolabeUpdate(VERSION, release.text) : undefined
      if (mine !== undefined) items.push(mine)
    } catch {
      // offline: Astrolabe's own check is skipped until tomorrow
    }
    await $.store.set(UPDATES_STORE, { checkedOn: today, items })
    const shown = await visible($, items)
    await setUpdates($, held => ({ ...held, items: shown }))
  } catch (error) {
    logError($, error)
  }
}

async function dropUpdate($: EngineInterface, id: UpdateId): Promise<void> {
  await setUpdates($, held => ({ items: held.items.filter(i => i.id !== id) }))
  const stored = await $.store.get(UPDATES_STORE)
  if (isStoredUpdates(stored)) await $.store.set(UPDATES_STORE, { ...stored, items: stored.items.filter(i => i.id !== id) })
}

/** Runs the action of one update Button (contracts/updates.md). */
async function runUpdate($: EngineInterface, id: UpdateId): Promise<void> {
  try {
    const held = (await $.state.get(UPDATES)).value ?? { items: [] }
    const item = held.items.find(i => i.id === id)
    if (item === undefined || held.running !== undefined) return
    if (id === 'speckit-skills' && held.confirming !== id) {
      await $.state.set(UPDATES, { ...held, confirming: id })
      return
    }
    await $.state.set(UPDATES, { items: held.items, running: id })
    let failure: string | undefined
    if (id === 'gstack') {
      // Engine rule: a slash command runs through $.command.run, not as a prompt.
      await $.command.run({ command: 'gstack-upgrade', args: '' }).catch((error: unknown) => {
        logError($, error)
        failure = '🧭 could not start /gstack-upgrade; type /gstack-upgrade yourself'
      })
    } else {
      const root = (await $.state.get(SPECKIT)).value?.root
      const argv =
        id === 'specify' ? ['specify', 'self', 'upgrade'] : id === 'astrolabe' ? ['claude', 'plugin', 'update', 'astrolabe'] : SKILLS_REFRESH
      const cwd = id === 'speckit-skills' ? root : undefined
      const run = await $.process
        .run(argv, cwd === undefined ? undefined : { cwd })
        .catch((error: unknown) => ({ exitCode: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) }))
      if (run.exitCode !== 0) {
        const line = firstLine(run.stderr || run.stdout)
        failure =
          id === 'specify'
            ? `🧭 specify upgrade failed: ${line}; run specify self upgrade`
            : id === 'astrolabe'
              ? `🧭 Astrolabe update failed: ${line}; run claude plugin update astrolabe`
              : `🧭 Spec Kit skills refresh failed: ${line}; run ${SKILLS_REFRESH.join(' ')} in ${cwd ?? 'the project'}`
      }
    }
    if (failure !== undefined) {
      await showToast($, failure, { kind: 'warn' })
      await setUpdates($, h => ({ items: h.items }))
      return
    }
    await dropUpdate($, id)
    if (id === 'specify') await showToast($, `specify updated to ${item.latest}`)
    if (id === 'speckit-skills') await showToast($, `Spec Kit skills refreshed to ${item.latest}`)
    if (id === 'astrolabe') await showToast($, `Astrolabe updated to ${item.latest}; run /reload-plugins`)
  } catch (error) {
    logError($, error)
    await setUpdates($, h => ({ items: h.items })).catch(() => undefined)
  }
}

// Read by the gate, set from the plugin's options when it registers (spec 008, 015).
let governs = true
let observes = false
let asks = true

// Gates every tool call while usage is high. A failure here never refuses: it passes. A
// call whose answer does not settle it (another call's "run", a lift) goes through again.
type GateArgs = Parameters<Hook<'tool.call'>>

async function gate($: GateArgs[0], e: GateArgs[1], next: GateArgs[2]): Promise<Awaited<ReturnType<Hook<'tool.call'>>>> {
  live.toolCalls += 1
  try {
    return await gateCall($, e, next)
  } finally {
    try {
      await flushStats($)
      // A tool Astrolabe does not know (an MCP file writer) may have written the feature's files.
      if (typeof e.tool === 'string' && e.tool.startsWith('mcp__')) await probeNow($)
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
  }
}

async function gateCall($: GateArgs[0], e: GateArgs[1], next: GateArgs[2]): Promise<Awaited<ReturnType<Hook<'tool.call'>>>> {
  if (observes) {
    const { usage, decision } = await decisionNow($)
    const isSubagentCall = (e as { agentId?: string }).agentId !== undefined
    if (e.tool === 'Agent') {
      let running = usage.inFlight
      await updateUsage($, u => {
        running = u.inFlight
        return { ...u, inFlight: u.inFlight + 1 }
      })
      if (decision.highest !== undefined && (decision.cap === 0 || (decision.band === 'throttle' && running >= decision.cap))) {
        const input = e as unknown as { description?: string }
        const detail = decision.band === 'throttle' ? `throttle, cap ${decision.cap}: ${running} subagents running` : decision.band
        await logGovernor($, `observe: would queue ${input.description ?? 'subagent'} (${detail})`)
      }
      await noteAgentRun($)
      try {
        return await next(e)
      } finally {
        await updateUsage($, u => ({ ...u, inFlight: Math.max(0, u.inFlight - 1) }))
      }
    }
    if (decision.highest !== undefined && isPaused(decision) && !isSubagentCall && !isReadOnlyTool(String(e.tool))) {
      await logGovernor($, `observe: would pause ${String(e.tool)} (${decision.band})`)
    }
    return next(e)
  }
  if (e.tool === 'Agent' && !governs) await noteAgentRun($)
  if (!governs) return next(e)
  const { usage, decision } = await decisionNow($)
  if (decision.highest === undefined) return next(e)
  const resetClock = clockOf(decision.highest.resetsAt)
  // A running subagent is never stopped (SC-001) and never asks: only the main thread does.
  const isSubagentCall = (e as { agentId?: string }).agentId !== undefined
  // Counted before it runs; `isCounted` when the cap check already counted it.
  const runAgent = async (isCounted = false) => {
    await noteAgentRun($)
    if (!isCounted) await updateUsage($, u => ({ ...u, inFlight: u.inFlight + 1 }))
    try {
      return await next(e)
    } finally {
      await updateUsage($, u => ({ ...u, inFlight: Math.max(0, u.inFlight - 1) }))
    }
  }
  if (e.tool === 'Agent') {
    // Under a cap, the check and the count are one write, so calls at once never all pass.
    let isAdmitted = false
    let running = usage.inFlight
    if (decision.band === 'throttle') {
      await updateUsage($, u => {
        running = u.inFlight
        isAdmitted = u.inFlight < decision.cap
        return isAdmitted ? { ...u, inFlight: u.inFlight + 1 } : u
      })
    }
    if (decision.cap === 0 || (decision.band === 'throttle' && !isAdmitted)) {
      const input = e as unknown as { description?: string; prompt?: string; subagent_type?: string }
      // At hold the person is asked (015) after the call is queued, never before: a hook that
      // waited would run out of time and let the call through (017).
      const isAsked = asks && !isQuietHours() && isInteractive && decision.band === 'hold' && !isSubagentCall
      const remembered = isAsked && usage.asked?.kind === 'hold' ? usage.asked.answer : undefined
      if (isAsked) {
        // The one call the person let through ("Run this one now"), sent again by Claude.
        let isPass = false
        await updateUsage($, u => {
          const passes = u.passes ?? []
          const at = passes.indexOf(input.prompt ?? '')
          isPass = at >= 0
          return isPass ? { ...u, passes: passes.filter((_, i) => i !== at) } : u
        })
        if (isPass) return runAgent()
        if (remembered === 'drop') return { deny: dropped(decision) }
      }
      let queuedAs = ''
      live.agentsQueued += 1
      const waitNow = await $.clock.now()
      await updateUsage($, u => {
        // The next free number, so an id never repeats after one leaves (049); at most QUEUE_MAX wait (049 #85).
        const full = u.queue.length >= QUEUE_MAX
        queuedAs = full ? '' : `q${Math.max(0, ...u.queue.map(q => Number(q.id.slice(1)) || 0)) + 1}`
        const since = u.waitingSince ?? waitNow
        if (full) return { ...u, paused: u.paused || isPaused(decision), waitingSince: since }
        return {
          ...u,
          waitingSince: since,
          paused: u.paused || isPaused(decision),
          queue: [
            ...u.queue,
            {
              id: queuedAs,
              description: input.description ?? 'subagent',
              prompt: input.prompt ?? '',
              ...(input.subagent_type === undefined ? {} : { subagentType: input.subagent_type }),
            },
          ],
        }
      })
      await armResume($, decision)
      const refused = refusal(decision, { queuedAs, inFlight: running, ...(resetClock === undefined ? {} : { resetClock }) })
      if (isAsked && remembered === undefined && queuedAs !== '') {
        askLater($, holdQuestion(decision, input.description ?? 'subagent', resetClock, currentLang()), {
          id: queuedAs,
          description: input.description ?? 'subagent',
          prompt: input.prompt ?? '',
        })
        return { deny: `${refused}. ${ASKING_NOTE}` }
      }
      return { deny: refused }
    }
    return runAgent(isAdmitted)
  }
  // Only the main thread pauses; a subagent's own requests for more subagents are gated above.
  if (isPaused(decision) && !isSubagentCall && !isReadOnlyTool(String(e.tool))) {
    const isAsked = asks && !isQuietHours() && isInteractive && usage.asked?.kind !== 'pause'
    if (isAsked) askLater($, pauseQuestion(decision, String(e.tool), resetClock, currentLang()))
    await updateUsage($, u => (u.paused ? u : { ...u, paused: true }))
    await armResume($, decision)
    const refused = refusal(decision, resetClock === undefined ? {} : { resetClock })
    return { deny: isAsked ? `${refused}. ${ASKING_NOTE}` : refused }
  }
  return next(e)
}

export const register: Register = (on, options) => {
  const preset = presetOf(options)
  const tokens = themeOf(options)
  optionsSeen = options
  tokens0 = tokens
// Whether the last band draw saw a fullscreen terminal of 144 columns or more. The pane
// never opens unasked below that (Principle VII); session.start reports no width.
  let isWide = false
  const checksUpdates = options['checkUpdates'] !== false
  observes = options['observeUsage'] === true || options['governUsage'] === 'observe'
  governs = !observes && options['governUsage'] !== false && options['governUsage'] !== 'off'
  asks = governs && options['askOnLimit'] !== false
  governThresholds = typeof options['governThresholds'] === 'string' ? (() => { try { return JSON.parse(options['governThresholds'] as string) as GovernThresholdsMap } catch { return {} } })() : {}
  // Quiet hours (047 #67): a local-time window never to ask, always apply the default.
  quietHours = (() => {
    if (typeof options['quietHours'] !== 'string' || options['quietHours'].trim() === '') return null
    const [start, end] = options['quietHours'].split('-').map(s => s.trim())
    if (start === undefined || end === undefined) return null
    const parseHour = (s: string): number | null => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(s)
      if (m === null) return null
      const h = Number(m[1]), min = Number(m[2])
      return (h >= 0 && h < 24 && min >= 0 && min < 60) ? h * 60 + min : null
    }
    const startM = parseHour(start), endM = parseHour(end)
    if (startM === null || endM === null) return null
    return { start: startM, end: endM }
  })()
  pullRequests = options['pullRequest'] === true
  accessible = options['accessible'] === true
  claudeContext = options['claudeContext'] !== false
  skillModels = options['skillModels']
  featureSummary = options['featureSummary'] === true
  iconsOption = accessible ? 'ascii' : options['icons']
  footerIn = options['footerIn'] === 'status' || options['footerIn'] === 'both' ? options['footerIn'] : 'pane'
  footerLines = options['footerLines'] === '3' ? '3' : '1'
  footerSource = options['footerSource'] === 'native' ? 'native' : 'statusline'
  const embedMode = options['footerStatuslineMode'] === 'passive' ? 'passive' : 'live'
  const embedOmit = parseOmit(options['footerOmit'])
  footerStatuslineMode = embedMode
  footerOmit = embedOmit
  liveRowsOption = options['liveRows'] === 'agents' || options['liveRows'] === 'gates' || options['liveRows'] === 'off' ? options['liveRows'] : 'both'
  footerSeparator = options['footerSeparator'] === 'thin' || options['footerSeparator'] === 'none' ? options['footerSeparator'] : 'solid'
  bandDensity = options['bandDensity'] === 'compact' || options['bandDensity'] === 'minimal' ? options['bandDensity'] : 'full'
  paneDensity = options['paneDensity'] === 'comfortable' ? 'comfortable' : 'compact'
  autoReload = options['autoReload'] !== false
  imagesOption = options['images']
  languageOption = options['language']

  // The person's language (019): guessed from what they type, kept for the session.
  on('prompt.submit', async ($, e, next) => {
    // A turn starts: the idle poller waits for it to end (058).
    idlePollTimer?.cancel()
    idlePollTimer = undefined
    armLiveProbe($)
    if (e.origin.kind === 'composer') {
      const guess = guessLang(e.text)
      if (guess !== undefined && guess !== guessedLang) {
        guessedLang = guess
        await flushStats($, s => ({ ...s, language: guess }))
      }
      // What Claude is told of the Spec Kit work (026 #50): on the message, so the prompt cache
      // stays whole, and only when it changed since the last prompt.
      if (claudeContext) {
        const state = (await $.state.get(SPECKIT)).value
        const memo = (await $.state.get(MEMO)).value
        const driftWarning = memo?.driftWarning
        const told = state === undefined ? undefined : featureContext(state, driftWarning, focusMode)
        // A prompt that names another feature than the active one (054 #91): say so, every time.
        const other = state === undefined ? undefined : otherFeatureNamed(e.text, state)
        const extra = other === undefined ? [] : [other]
        if ((told !== undefined && told !== lastTold) || extra.length > 0) {
          if (told !== undefined) lastTold = told
          if (told !== undefined && driftWarning !== undefined) {
            await guarded($, async previous => {
              if (previous?.memo.driftWarning?.dir !== driftWarning.dir || previous.memo.driftWarning.task !== driftWarning.task) return undefined
              const { driftWarning: _warning, ...memo } = previous.memo
              return { ...previous, memo }
            })
          }
          return next({ ...e, context: [...(e.context ?? []), ...(told === undefined ? [] : [told]), ...extra] })
        }
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.step', noteModel)

  // Writing style for everything Claude writes here (029 humanize, 031 terse): fixed sections,
  // added last, so the cache boundary and the engine's own sections stay as they were.
  const styles = styleSections(options['humanize'] === true, options['terse'])
  if (styles.length > 0) {
    on('prompt.compose', async ($, e, next) => {
      const result = await next(e)
      const ids = new Set(styles.map(s => s.id))
      return { sections: [...result.sections.filter(s => !ids.has(s.id)), ...styles] }
    }).catch(($, e, next) => next(e))
  }

  on('session.start', async ($, e, next) => {
    isInteractive = e.isInteractive !== false
    surfaceSeen = e.surface
    gitNeedsRefresh = true
    roadmapCache.clear()
    disarmLiveProbe()
    statusTimer?.cancel()
    statusTimer = undefined
    pendingStatus = undefined
    statusWindowUntil = Number.NEGATIVE_INFINITY
    resumeTimer?.cancel()
    resumeTimer = undefined
    resumeAt = undefined
    cacheWarningTimer?.cancel()
    cacheWarningTimer = undefined
    footerTimer?.cancel()
    footerTimer = undefined
    gateScanTimer?.cancel()
    gateScanTimer = undefined
    liveReservation = {}
    gateSeenAt = undefined
    // Rows of a run that ended with the old module (a reload, a crash) are not live any more.
    await flushStats($, ({ liveGates: _gates, liveAgents: _agents, ...rest }) => rest)
    idlePollTimer?.cancel()
    idlePollTimer = undefined
    implementWaived.clear()
    remoteWeb = undefined
    // A reload starts the module over: the guess made earlier in the session is in $.state.
    const kept = (await $.state.get(SESSION)).value?.language
    if (kept === 'en' || kept === 'pt-BR' || kept === 'es' || kept === 'fr') guessedLang = kept
    focusMode = (await $.state.get(SESSION)).value?.focus === true
    const result = await next(e)
    // The governor's queue lives in $.state, so a reload keeps it: say it is still there (054 #18).
    const usageKept = (await $.state.get(USAGE)).value
    if (usageKept !== undefined && usageKept.queue.length > 0) {
      const since = usageKept.waitingSince === undefined ? undefined : clockOf(new Date(usageKept.waitingSince).toISOString())
      await showToast($, t(currentLang(), since === undefined ? 'governor.queueKept' : 'governor.queueKeptSince', { n: usageKept.queue.length, at: since ?? '' }))
    }
    if (usageKept !== undefined && (usageKept.queue.length > 0 || usageKept.paused)) {
      await armResume($, decisionOf(usageKept, await $.clock.now()))
    }
    try {
      await $.command.register({ name: 'astrolabe', description: 'Open the Astrolabe pane: every Spec Kit feature, the open tasks and the session' })
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
    // The first session after install says where to start, once (048 #73); the same value counts sessions (052 #46).
    try {
      const welcomed = await $.store.get(WELCOMED)
      if (welcomed === undefined) {
        await showToast($, t(currentLang(), 'toast.welcome'))
        sessionNumber = 1
      } else {
        const counted = /\|(\d+)$/.exec(String(welcomed))?.[1]
        // A value from before the count was written means at least one session came first.
        sessionNumber = (counted === undefined ? 1 : Number(counted)) + 1
      }
      await $.store.set(WELCOMED, `${VERSION}|${Math.min(sessionNumber, 99)}`)
    } catch {
      // A store that fails only skips the welcome and the help chip.
      sessionNumber = Number.POSITIVE_INFINITY
    }
    defaultsSeen = await defaults($).catch(() => ({}))
    // NO_COLOR (041 #9): no chip backgrounds, the thin separator. Read once, here.
    noColor = ((await $.env.get('NO_COLOR').catch(() => undefined)) ?? '') !== ''
    // A new session starts the chips' ages over (041 #5).
    chipAges.clear()
    touchedSpecsSeen.clear()
    planCheckedAt = undefined
    freshDeadline = undefined
    const fs = fsOf($)
    const now = await $.clock.now()
    live.dirs = { start: e.cwd, cwd: e.cwd }
    // Facts of an earlier session in this process must not reach the new session's footer.
    live.skills = []
    live.todo = undefined
    live.cache = undefined
    live.fast = undefined
    lastCacheModel = undefined
    const started = await guarded($, previous => reconcileStart(fs, e.cwd, previous, now))
    // Note the active feature's file times, so the first probe of a turn reads nothing.
    if (started !== undefined) await activeFilesChanged(fs, started).catch(() => undefined)
    await afterReconcile($, preset, started)
    await captureFeatureDurations($, started, now)
    await settleFooterOwner($)
    // Spec priorities for this project, and whether gstack's skills are there (051).
    try {
      const root = started?.state.root
      const saved = root === undefined ? undefined : await $.store.get(`priority:${root}`)
      const priorities = typeof saved === 'object' && saved !== null && !Array.isArray(saved) ? (saved as Record<string, Priority>) : undefined
      const gstack = (await gstackCheck($)) !== undefined
      if (priorities !== undefined || gstack) await flushStats($, st => ({ ...st, ...(priorities === undefined ? {} : { priorities }), ...(gstack ? { gstack } : {}) }))
    } catch {
      // No priorities, no gstack row.
    }
    // What the person set in the Setup model table (078 FR-079).
    try {
      const saved = await $.store.get('skillOverrides')
      if (typeof saved === 'object' && saved !== null && !Array.isArray(saved)) skillOverrides = saved as SkillOverrides
    } catch {
      // No overrides: the built-in table.
    }
    // The tab this project had last (043 #22).
    try {
      const root = started?.state.root
      const saved = root === undefined ? undefined : await $.store.get(`tab:${root}`)
      if (typeof saved === 'string') {
        // A tab an earlier version stored maps to its new tab (066 #21).
        const tab = legacyTab(saved)
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        const offset = (await savedScrolls($, root))[tab] ?? 0
        if (held.tab !== tab || offset > 0) await $.state.set(PANE_STATE, { ...held, tab, ...(offset > 0 ? { scroll: { tab, offset } } : {}) })
      }
    } catch {
      // No saved tab: Specs.
    }
    // The row this project had selected (078 FR-021).
    try {
      const root = started?.state.root
      const saved = root === undefined ? undefined : await $.store.get(`selection:${root}`)
      if (typeof saved === 'string') {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        await $.state.set(PANE_STATE, saved.startsWith('task-') ? { ...held, selectedTask: saved } : { ...held, selectedFeature: saved.slice('feature-'.length) })
      }
    } catch {
      // No selection kept: the active spec.
    }
    // The specs this project had open and folded (078 FR-010).
    try {
      const root = started?.state.root
      const saved = root === undefined ? undefined : await $.store.get(`folds:${root}`)
      if (typeof saved === 'object' && saved !== null && !Array.isArray(saved)) {
        const { opened, closed } = saved as { opened?: unknown; closed?: unknown }
        const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        await $.state.set(PANE_STATE, { ...held, opened: list(opened), closed: list(closed) })
      }
    } catch {
      // No saved folds: the active spec is open.
    }
    // A large project reads its other features in batches after the band draws (040).
    if (started?.state.features.some(f => f.warnings.includes('loading')) === true) $.clock.after(0, () => void loadDeferred($))
    // The baseline for the next turn's tasks diff, and the theme's lightness for the charts (024).
    turnTasks = started?.state.active === undefined || started.state.activeTasks === undefined ? undefined : { dir: started.state.active.dir, tasks: started.state.activeTasks }
    try {
      const option = imagesOption
      isImageTerminal =
        option === 'on' ||
        (option !== 'off' &&
          imagesFor(option, {
            KITTY_WINDOW_ID: await $.env.get('KITTY_WINDOW_ID'),
            TERM: await $.env.get('TERM'),
            TERM_PROGRAM: await $.env.get('TERM_PROGRAM'),
            TMUX: await $.env.get('TMUX'),
          }))
    } catch {
      isImageTerminal = false
    }
    try {
      const listed = await $.config.list()
      configRows = listed.filter(row => row.key.startsWith('astrolabe.'))
      const theme = listed.find(row => row.key === 'theme')
      isLightTheme = typeof theme?.value === 'string' && theme.value.startsWith('light')
    } catch {
      isLightTheme = false
    }
    if (preset.band) await suggestNext($, started)
    // Started on a timer so the session never waits for a process or the network.
    if (checksUpdates) $.clock.after(0, () => void checkUpdates($))
    // The footer statusline draws (070): nothing from an earlier session is shown as current.
    footerLastRefresh = Number.NEGATIVE_INFINITY
    footerFailures = 0
    footerBackoffUntil = 0
    footerGoodAt = undefined
    footerRetryArmed = false
    nodeState = undefined
    // This week's counts from earlier sessions (021), copied into the state the Dashboard reads.
    const stored = await $.store.get(HISTORY).catch(() => undefined)
    const week = typeof stored === 'object' && stored !== null ? (stored as Weeks)[weekKey(now)] : undefined
    await flushStats($, s => (week === undefined ? s : { ...s, week }))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) {
      // A subagent's run is over: its row leaves the live table (069 #43).
      const endedId = e.agentId
      await flushStats($, ({ liveAgents, ...s }) => {
        const left = (liveAgents ?? []).filter(a => a.engineId !== endedId)
        return left.length === 0 ? s : { ...s, liveAgents: left }
      })
    }
    if (e.agentId === undefined) {
      // The turn is over: the end-of-turn read below is the last word, the file probe stops.
      disarmLiveProbe()
      skillRunning = undefined
      const fs = fsOf($)
      const cwd = await $.session.cwd()
      live.dirs = { start: live.dirs?.start ?? (await $.state.get(SESSION)).value?.dirs?.start ?? cwd, cwd }
      const now = await $.clock.now()
      let before: Held | undefined
      const held = await guarded($, previous => {
        before = previous
        return reconcileTurn(fs, cwd, previous, now)
      })
      await afterReconcile($, preset, held)
      await captureFeatureDurations($, held, now)
      await noteProgress($, before, held, now, e.durationMs)
      await noteTasksDiff($, held?.state)
      if (preset.band) await suggestNext($, held, before)
      // Refresh git only after an initial read or a tool that could change files or HEAD (049 #84).
      const root = held?.state.root
      const branch = held?.memo.base?.branch
      const currentStats = (await $.state.get(SESSION)).value
      const shouldReadGit = gitNeedsRefresh
      if (shouldReadGit) gitNeedsRefresh = false
      const counted = shouldReadGit ? await readGit($, root, branch) : undefined
      if (shouldReadGit && root !== undefined && branch !== undefined && counted === undefined) gitNeedsRefresh = true
      const worktree = held?.memo.base?.worktree
      const cachedGit = currentStats?.git
      const fallback = branch === undefined
        ? cachedGit
        : { ...(cachedGit ?? { ahead: 0, behind: 0, changed: 0, conflicts: 0 }), branch, ...(worktree === undefined ? {} : { worktree }) }
      const git = counted === undefined || worktree === undefined ? counted : { ...counted, worktree }
      const turnGit = git ?? fallback
      await flushStats($, s => {
        const cached = s.prCache !== undefined && s.prCache.branch === turnGit?.branch ? s.prCache.pr : undefined
        const ci = s.prCache !== undefined && s.prCache.branch === turnGit?.branch ? s.prCache.ci : undefined
        const origin = s.git?.origin
        // The answer's first line for /astrolabe recap (054 #92), the last 20 turns, in $.state only.
        const line = recapLine(e.answer)
        const id = held?.state.active?.id
        const recap = line === '' ? s.recap : [...(s.recap ?? []), { at: now, ...(id === undefined ? {} : { id }), text: line }].slice(-20)
        // The turn log: the spec and task it ended on and the tokens it used (078 FR-052, FR-056).
        const u = e.usage
        const tokens = u === undefined ? undefined : u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
        const task = held?.state.currentTask?.id
        const turnLog = [...(s.turnLog ?? []), { at: now, ...(id === undefined ? {} : { id }), ...(task === undefined ? {} : { task }), ...(tokens === undefined ? {} : { tokens }), ...(line === '' ? {} : { text: line }) }].slice(-30)
        return { ...s, turns: s.turns + 1, turnLog, ...(turnGit === undefined ? {} : { git: { ...withPr(turnGit, cached), ...(ci === undefined ? {} : { ci }), ...(origin === undefined ? {} : { origin }) } }), ...(recap === undefined ? {} : { recap }) }
      })
      if (root !== undefined && turnGit?.branch !== undefined) {
        const repoRoot = root
        $.clock.after(0, () => void refreshWorktrees($, repoRoot))
      }
      if (pullRequests && root !== undefined && turnGit?.branch !== undefined) {
        const prBranch = turnGit.branch
        $.clock.after(0, () => void refreshPr($, root, prBranch))
      }
      if (held !== undefined) await showStatus($, held.state)
      if (preset.pane === 'auto' && isWide) await openUnasked($)
      $.clock.after(0, () => void checkDiskVersion($))
      if (((await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE).tab === 'prs') $.clock.after(0, () => void refreshPulls($))
      if (checksUpdates) $.clock.after(0, () => void checkUpdates($))
      armIdlePoll($)
      $.clock.after(0, () => void refreshStatusline($, true))
      cacheWarningTimer?.cancel()
      cacheWarningTimer = $.clock.after(CACHE_WARN_MS, async () => {
        cacheWarningTimer = undefined
        // Only when the next step is likely soon (054 #95): a skill running, or open tasks on the active feature.
        const speckit = (await $.state.get(SPECKIT)).value
        const activeFeature = speckit?.features.find(f => f.dir === speckit.active?.dir)
        const soon = speckit?.runningSkill !== undefined || (activeFeature !== undefined && activeFeature.phase === 'implement' && activeFeature.done < activeFeature.total)
        if (!soon) return
        await showToast($, t(currentLang(), 'toast.cache'), { kind: 'warn' })
      })
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    // An implement step on a spec with open questions is refused once (054 #57).
    // Only that skill reads the state here, so others keep their order against concurrent writes.
    if (/^speckit[-.]implement$/.test(e.skill)) {
      const speckit = (await $.state.get(SPECKIT)).value
      const refusal = implementRefusal(e.skill, speckit, implementWaived)
      if (refusal !== undefined) {
        implementWaived.add(speckit!.active!.dir)
        return { deny: refusal }
      }
    }
    // A subagent's skill may outlive the main turn, so only main-thread calls set a marker.
    if (e.agentId === undefined) {
      skillRunning = e.skill
      const skillName = typeof e.skill === 'string' ? plainText(e.skill, 40) : undefined
      if (skillName !== undefined && !live.skills.includes(skillName)) live.skills.push(skillName)
      const now = await $.clock.now()
      await guarded($, async previous => (previous === undefined ? undefined : applySkill(previous, e.skill, now)))
    }
    const result = await next(e)
    // A Spec Kit skill is reminded of the constitution's principles (026 #51).
    if (!claudeContext || !/^speckit[-.]/.test(e.skill) || result.deny !== undefined) return result
    const reminder = await constitutionReminder($)
    return reminder === undefined ? result : { ...result, context: [...(result.context ?? []), reminder] }
  }).catch(($, e, next) => next(e))

  // Usage governance (spec 008): readings arrive after each turn and when a window moves.
  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    $.clock.after(0, () => void refreshStatusline($, true))
    try {
      const now = await $.clock.now()
      const readings: UsageReading[] = e.rateLimits.map(r => ({
        kind: r.kind,
        percentUsed: r.percentUsed,
        ...(r.resetsAt === undefined ? {} : { resetsAt: r.resetsAt }),
      }))
      const top = Math.max(0, ...readings.map(r => r.percentUsed))
      const usage = await updateUsage($, ({ held: before, ...u }) => {
        const held = nextHeld(readings, before, now)
        return {
          ...u,
          readings,
          history: readings.length === 0 ? u.history : [...u.history, { at: now, percent: top }].slice(-HISTORY_POINTS),
          ...(held === undefined ? {} : { held }),
        }
      })
      const decision = decisionOf(usage, now)
      // The footer's context and the Dashboard's usage series (018).
      const percent = e.context.percent ?? (e.context.tokens === undefined || e.context.window === 0 ? undefined : (e.context.tokens * 100) / e.context.window)
      const binding = decision.highest
      await flushStats($, s => ({
        ...s,
        ...(percent === undefined
          ? {}
          : { context: { percent, ...(e.context.tokens === undefined ? {} : { tokens: e.context.tokens }), ...(e.context.window === undefined || e.context.window === 0 ? {} : { window: e.context.window }) } }),
        // A drop of 20 points or more is a compaction (054 #38): count it and what it freed.
        ...(percent !== undefined && s.context !== undefined && s.context.percent - percent >= 20
          ? { compactions: { n: (s.compactions?.n ?? 0) + 1, freed: (s.compactions?.freed ?? 0) + Math.round(s.context.percent - percent) } }
          : {}),
        ...(binding === undefined || binding.renewed === true ? {} : {
              series: [
                ...s.series,
                {
                  at: now,
                  percent: binding.percent,
                  ...((r => (r === undefined ? {} : { fiveHour: r.percentUsed }))(readings.find(r => r.kind === 'five_hour'))),
                  ...((r => (r === undefined ? {} : { sevenDay: r.percentUsed }))(readings.find(r => r.kind === 'seven_day'))),
                  ...(percent === undefined ? {} : { context: Math.round(percent) }),
                },
              ].slice(-SERIES_POINTS),
            }),
      }))
      await warnUsage($, percent)
      const speckit = (await $.state.get(SPECKIT)).value
      if (speckit !== undefined) await showStatus($, speckit)
      if (!governs) return result
      // An answer holds only while its band lasts (015).
      const asked = usage.asked?.kind
      if ((asked === 'hold' && decision.band !== 'hold') || (asked === 'pause' && !isPaused(decision))) {
        await updateUsage($, ({ asked: _gone, ...u }) => u)
      }
      // A pass the person granted at hold is not needed once the hold is gone (017).
      if (decision.band !== 'hold' && (usage.passes ?? []).length > 0) await updateUsage($, ({ passes: _gone, ...u }) => u)
      const isClear = decision.band === 'ok' || decision.band === 'throttle'
      if (isClear && (usage.queue.length > 0 || usage.paused)) await resume($, `${usageSegment(decision) ?? 'window'} now`)
      else if (!isClear) await armResume($, decision)
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
    return result
  })

  on('tool.call', gate).catch(($, e, next) => next(e))

  // The usage question's pane: Esc (or any close but our own) takes the default at once.
  on('ui.close', async ($, e, next) => {
    // Esc is layered (078 FR-018): it clears the filter, then drops the help overlay, then closes the pane.
    if (e.id === PANE_ID && e.origin.kind === 'person') {
      const held = (await $.state.get(PANE_STATE)).value
      const step = held === undefined ? 'close' : escapeStep(held)
      if (held !== undefined && step === 'help') {
        const { help: _off, ...rest } = held
        await $.state.set(PANE_STATE, rest)
        return { value: undefined }
      }
      if (held !== undefined && step === 'filter') {
        const { filter: _gone, ...rest } = held
        await $.state.set(PANE_STATE, rest)
        return { value: undefined }
      }
    }
    if (e.id === ASK_ID && e.origin.kind !== 'plugin') {
      const { value } = await $.state.get(ASK)
      if (value?.question !== undefined) pick?.(value.question.fallback)
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: ASK_ID }, async ($, e) => {
    const { value } = await $.state.get(ASK)
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const Select = 'Select' in elements ? elements.Select : undefined
    if (value?.question === undefined) return <Box key="astrolabe-usage-body" />
    const at = new Date(value.deadline ?? 0)
    const clock = [at.getHours(), at.getMinutes(), at.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
    return askTree({ Box, Text, Button, ...(Select === undefined ? {} : { Select }) }, value.question, clock, tokens, choice => pick?.(choice), currentLang())
  })

  // Bash and Agent change files the mod cannot see, so drift stays quiet for this window.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await guarded($, async previous => (previous === undefined ? undefined : applyShell(previous)))
    const command = String((e as { command?: unknown }).command ?? '')
    const watching = mayRunGate(command)
    if (watching) {
      gateCommands += 1
      armGateScan($, 2000)
    }
    let result: Awaited<ReturnType<typeof next>>
    try {
      result = await next(e)
    } finally {
      if (watching) {
        gateCommands = Math.max(0, gateCommands - 1)
        // One last read, so a gate that ended leaves the table at once.
        $.clock.after(0, () => void scanGates($).catch(() => undefined))
      }
    }
    // The command may have made a spec or switched the branch: the tabs follow now (053),
    // only for a command that can do so, so a plain `ls` costs no reads (054 #5).
    if (canTouchSpecs(command)) await syncNow($)
    else await probeNow($)
    const succeeded = (result as { isError?: boolean } | undefined)?.isError !== true
    // A commit or push that failed within a minute of a gate being seen: one toast (069 #44).
    if (!succeeded && gateSeenAt !== undefined && /\bgit\s+(?:-\S+\s+)*(?:commit|push)\b/.test(command) && (await $.clock.now()) - gateSeenAt < 60_000) {
      gateSeenAt = undefined
      await showToast($, t(currentLang(), 'toast.gateFailed'), { kind: 'warn' })
    }
    if (succeeded && (mayChangeGit(command) || mayWriteFiles(command))) gitNeedsRefresh = true
    if (succeeded && mayChangeGit(command)) {
      const state = (await $.state.get(SPECKIT)).value
      const branch = (await $.state.get(MEMO)).value?.base?.branch
      const root = state?.root ?? (await $.session.cwd())
      const git = await readGit($, root, branch, true)
      if (git !== undefined) {
        await flushStats($, stats => ({ ...stats, git: withPr(git, stats.git !== undefined && stats.git.branch === git.branch ? stats.git.pr : undefined) }))
        gitNeedsRefresh = false
      }
    }
    // A pull request opened here: offer gstack's /review on it (054 #97).
    const output = result as { result?: { text?: string }; isError?: boolean } | undefined
    const opened = output?.isError === true ? undefined : prOpened(command, output?.result?.text ?? '')
    if (opened !== undefined && (await $.state.get(SESSION)).value?.gstack === true) await showToast($, t(currentLang(), 'gstack.reviewPr', { n: opened }))
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    await guarded($, async previous => (previous === undefined ? undefined : applyShell(previous)))
    // The run is a row of the live table from its start to its end (069 #43).
    const input = e as unknown as { description?: string; prompt?: string; subagent_type?: string; model?: string }
    agentCounter += 1
    const startedAt = await $.clock.now()
    const agentId = `agent-${startedAt}-${agentCounter}`
    const brief = plainText(input.description ?? input.prompt ?? 'subagent', 60)
    await flushStats($, s => ({
      ...s,
      liveAgents: [
        ...(s.liveAgents ?? []),
        { id: agentId, brief, startedAt, ...(typeof input.subagent_type === 'string' ? { type: plainText(input.subagent_type, 24) } : {}), ...(typeof input.model === 'string' ? { model: input.model } : {}) },
      ].slice(-12),
    }))
    let result: Awaited<ReturnType<typeof next>>
    let background = false
    try {
      result = await next(e)
      // A backgrounded agent's call returns at once; its own turn ends the row.
      background = /backgrounded|running in background/i.test(JSON.stringify(result ?? ''))
    } finally {
      if (!background) {
        await flushStats($, ({ liveAgents, ...s }) => {
          const left = (liveAgents ?? []).filter(a => a.id !== agentId)
          return left.length === 0 ? s : { ...s, liveAgents: left }
        })
      }
    }
    gitNeedsRefresh = true
    // A subagent may have written specs or tasks: the tabs follow when it returns (053).
    await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  // The todo list's progress for the footer's todo chip (068 #46); no state write per call.
  on('tool.call', { tool: 'TodoWrite' } as never, async ($, e, next) => {
    const todos = (e as unknown as { todos?: ReadonlyArray<{ content?: string; status?: string }> }).todos
    if (Array.isArray(todos) && todos.length > 0) {
      const done = todos.filter(item => item.status === 'completed').length
      const current = todos.find(item => item.status === 'in_progress') ?? todos.find(item => item.status !== 'completed')
      live.todo = { title: plainText(typeof current?.content === 'string' ? current.content : '', 60), done, total: todos.length }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Before the read runs, so the narration shows while the file loads.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const now = await $.clock.now()
    await guarded($, async previous => (previous === undefined ? undefined : applyRead(previous, e.file_path, now)))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const result = await next(e)
    // The Edit's own strings say what it ticked, so a box ticked elsewhere is not blamed on it.
    const output = result as { isError?: boolean } | undefined
    if (output?.isError !== true) {
      gitNeedsRefresh = true
      // Lines changed this session (041 #7).
      if (typeof e.old_string === 'string' && typeof e.new_string === 'string') {
        const changed = linesChanged(e.old_string, e.new_string)
        live.linesAdded += changed.added
        live.linesRemoved += changed.removed
        // Which thread ticked the boxes, the main one or a subagent (054 #39).
        if (/(^|[\\/])(tasks|spec)\.md$/.test(e.file_path)) {
          const ticked = ticksIn(e.old_string, e.new_string)
          if ((e as { agentId?: string }).agentId === undefined) live.ticksMain += ticked
          else live.ticksSub += ticked
        }
      }
    }
    await touchFile($, preset, e.file_path, true, output?.isError === true ? undefined : { before: e.old_string, after: e.new_string })
    if (isUnderSpecify(e.file_path)) await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const result = await next(e)
    if ((result as { isError?: boolean } | undefined)?.isError !== true) {
      gitNeedsRefresh = true
      if (typeof e.content === 'string') live.linesAdded += linesChanged(undefined, e.content).added
    }
    await touchFile($, preset, e.file_path, true)
    if (isUnderSpecify(e.file_path)) await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const result = await next(e)
    if ((result as { isError?: boolean } | undefined)?.isError !== true) {
      gitNeedsRefresh = true
      if (typeof e.new_source === 'string') live.linesAdded += linesChanged(undefined, e.new_source).added
    }
    await touchFile($, preset, e.notebook_path, false)
    return result
  }).catch(($, e, next) => next(e))

  // `/astrolabe status` as a rich row (025 #42): the band above the text.
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (e.props.command !== 'astrolabe' || e.props.args.trim() !== 'status' || e.props.isErrored) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const segments = value === undefined ? [] : bandSegments(value, 100)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box key="astrolabe-status" flexDirection="column">
        {segments.length > 0 && bandRow({ Box, Text }, segments, tokens, [], false)}
        {await next(e)}
      </Box>
    )
  })

  // An Edit that ticks tasks names them under its row (025 #43).
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const input = e.props.input as { file_path?: unknown; old_string?: unknown; new_string?: unknown } | undefined
    if (e.props.tool !== 'Edit' || e.props.isErrored || typeof input?.file_path !== 'string' || !/(^|\/)(tasks|spec)\.md$/.test(input.file_path)) return next(e)
    const ticked = typeof input.old_string === 'string' && typeof input.new_string === 'string' ? tickedBy(input.old_string, input.new_string) : []
    if (ticked.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next(e)}
        <Box key="astrolabe-ticked">
          <Text color={tokens.done} wrap="truncate-end">{`  ↳ ${t(currentLang(), 'ticked', { tasks: ticked.join(', ') })}`}</Text>
        </Box>
      </Box>
    )
  })

  // Drawing reads only $.state (Principle XII); a reconcile's write redraws these sites.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    columnsSeen = e.viewport?.columns ?? columnsSeen
    isWide = e.viewport?.isFullscreen === true && e.viewport.columns >= 144
    if (!preset.band || e.props.hasSurvey) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const sessionStats = (await $.state.get(SESSION)).value
    const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
    const now = await $.clock.now()
    // The linked worktree this session runs in (054 #54), else the active feature's work in another one (042 #18).
    const elsewhere = sessionStats?.git?.worktree ?? sessionStats?.worktrees?.find(w => w.id === value?.active?.id)?.name
    // After 10 idle minutes the band dims to one line (042 #19) that keeps the deciding window (065 #20).
    const lastActivity = sessionStats?.series?.at(-1)?.at ?? sessionStats?.startedAt
    const idle = value?.runningSkill === undefined && lastActivity !== undefined && now - lastActivity > 600_000
    const updates = (await $.state.get(UPDATES)).value ?? { items: [] }
    const pr = idle ? undefined : bandPr(sessionStats?.git?.pr, e.props.bodyColumns, bandDensity)
    // One update button and the hide button at the right edge of the band row (065 #12, #19).
    const names = updates.items.map(item => (updates.running === item.id ? `${updateLabel(item, false)}…` : updateLabel(item, updates.confirming === item.id)))
    const updateText = bandUpdateLabel(names, e.props.bodyColumns)
    const only = updates.items.length === 1 ? updates.items[0] : undefined
    const edge: BandEdge = {
      // File links are drawn on the terminal only: a desktop takes https links alone.
      ...(value?.root === undefined || e.surface !== 'terminal' ? {} : { root: value.root }),
      ...(updateText === undefined
        ? {}
        : {
            update: { label: updateText, ...(e.props.bodyColumns <= 80 ? { plain: true as const } : {}), onPress: async () => (only === undefined || only.id === 'speckit-skills' ? openPane($) : runUpdate($, only.id)) },
            hide: { label: t(currentLang(), 'updates.hide'), onPress: () => hideUpdates($) },
          }),
      onLift: () => liftBand($),
      // The task in the band opens the pane with that task selected, under its spec (078 FR-013).
      ...(value?.currentTask?.id === undefined || value.active === undefined
        ? {}
        : {
            onTask: async () => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              const { tasksOnly: _off, help: _help, ...rest } = held
              await $.state.set(PANE_STATE, { ...rest, tab: 'specs', selectedTask: `task-${value.active!.dir}-${value.currentTask!.id}` })
              await openPane($)
            },
          }),
      ...(pr === undefined ? {} : { pr: { ...pr, ...(sessionStats?.git?.pr?.url === undefined ? {} : { href: sessionStats.git.pr.url }) } }),
      // `a` opens the pane once the band has the focus (025 #41); from 100 columns.
      ...(e.props.bodyColumns >= 100 ? { open: { label: t(currentLang(), 'next.paneShort'), onPress: () => openPane($) } } : {}),
    }
    const decision = decisionOf(usage, now)
    const governor = usage.readings.length === 0 ? undefined : { band: decision.band, ...(decision.highest?.resetsAt === undefined ? {} : { until: clockOf(decision.highest.resetsAt) ?? '?' }) }
    const ramp = decision.highest === undefined ? undefined : usageRamp(decision.highest.percent, governThresholds[decision.highest.kind])
    const decidingText = usageSegment(decision, currentLang(), decision.highest === undefined ? undefined : governThresholds[decision.highest.kind])
    const taskStart = value?.currentTask?.startedAt
    const base =
      value === undefined
        ? []
        : bandSegments(value, e.props.bodyColumns, {
            density: idle ? 'minimal' : bandDensity,
            reserved: edgeWidth(edge) + (edge.open === undefined && updateText === undefined ? 0 : 1),
            ...(elsewhere === undefined ? {} : { worktree: elsewhere }),
            ...(governor === undefined ? {} : { governor }),
            ...(idle && decidingText !== undefined && ramp !== undefined ? { deciding: { text: decidingText, role: ramp.role } } : {}),
            ...(taskStart === undefined ? {} : { taskElapsed: duration(now - taskStart) }),
            ...(sessionStats?.phaseBrightUntil !== undefined && sessionStats.phaseBrightUntil > now ? { bright: true } : {}),
          })
    // The usage sparkline (022 #25): the last readings of the binding window, on a wide band only.
    const series = sessionStats?.series ?? []
    const segments =
      base.length > 0 && series.length >= 3 && e.props.bodyColumns >= 70 && !idle && [...bandText(base)].length + 13 + edgeWidth(edge) <= e.props.bodyColumns
        ? [...base, { key: 'spark', text: ` ${sparkline(series.slice(-12).map(p => p.percent))}`, role: 'muted' as const }]
        : base
    // The live table (069): agents, gates, the cache and limits, from state only.
    const rowsLeft = Math.max(0, Math.min(10, ((e.viewport as { rows?: number } | undefined)?.rows ?? 40) - 14))
    const liveLayout = layoutLive({
      rows: liveRows({
        agents: sessionStats?.liveAgents ?? [],
        gates: sessionStats?.liveGates ?? [],
        cache: sessionStats?.cache,
        readings: usage.readings,
        thresholds: governThresholds,
        band: decision.band,
        now,
        option: liveRowsOption,
        lang: currentLang(),
      }),
      columns: e.props.bodyColumns,
      reservation: liveReservation,
      maxRows: rowsLeft,
    })
    liveReservation = liveLayout.reservation
    if (segments.length === 0 && updates.items.length === 0 && liveLayout.lines.length === 0) return next(e)
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const bandElements = { Box, Text, Button, ...('Client' in elements ? { Client: elements.Client } : {}), ...('Link' in elements ? { Link: elements.Link } : {}) }
    return (
      <Box flexDirection="column">
        {(segments.length > 0 || edge.update !== undefined) && bandRow(
          bandElements,
          segments,
          tokens,
          accessible ? [] : stepCards(value?.features ?? [], currentLang()),
          !accessible,
          accessible || value === undefined ? undefined : otherFeaturesCard(value, currentLang()),
          edge,
          idle,
        )}
        {liveLayout.lines.length === 0 ? null : liveTable({ Box, Text }, liveLayout, tokens, e.props.bodyColumns)}
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!preset.hint) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const ours = value === undefined ? undefined : hintTail(value, e.props.isDraft)
    if (ours === undefined) return next(e)
    const tail = e.props.tail === undefined ? ours : `${e.props.tail} · ${ours}`
    return next({ ...e, props: { ...e.props, tail } })
  })

  // Tasks done next to a turn's duration (021 #44), found by the duration turn.complete reported.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const ticks = (await $.state.get(SESSION)).value?.turnTicks?.find(tick => tick.ms === e.props.durationMs)
    if (ticks === undefined || !preset.spinner) return next(e)
    return next({ ...e, props: { ...e.props, word: `${e.props.word} · ${t(currentLang(), 'turn.tasks', { n: ticks.n })}` } })
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!preset.spinner || e.props.message !== null) return next(e)
    const { value } = await $.state.get(SPECKIT)
    if (value === undefined) return next(e)
    const suffix = spinnerSuffix(value, emptyMemo(), await $.clock.now(), e.viewport?.columns)
    return suffix === undefined ? next(e) : next({ ...e, props: { ...e.props, suffix } })
  })

  on('command.run', { command: 'astrolabe' }, async ($, e) => {
    const args = e.args.trim()
    if (args === 'help') return { text: helpText(currentLang(), optionsSeen, (await $.state.get(SESSION)).value?.health?.lines ?? []) }
    if (args.startsWith('root ')) {
      // Another Spec Kit root under this folder (020c #21): read it as the session's root.
      const cwd = await $.session.cwd()
      const target = joinPath(cwd, args.slice(5).trim())
      const fs = fsOf($)
      const now = await $.clock.now()
      if ((await findRoot(fs, target)) === undefined) return { text: t(currentLang(), 'root.none', { path: target }) }
      const held = await guarded($, () => reconcileStart(fs, target, undefined, now))
      if (held?.state.root === undefined) return { text: t(currentLang(), 'root.none', { path: target }) }
      await captureFeatureDurations($, held, now)
      return { text: t(currentLang(), 'root.switched', { root: held.state.root }) }
    }
    if (args === 'ask' || args.startsWith('ask ')) {
      const question = args.slice(3).trim()
      const state = (await $.state.get(SPECKIT)).value
      const feature = state?.features.find(f => f.dir === state.active?.dir)
      if (question === '' || feature === undefined) return { text: t(currentLang(), 'ask.usage') }
      // The fork outlives the command's budget: start it from a timer.
      const about = `${feature.id} ${feature.name}`
      $.clock.after(0, () => void askFork($, question, about))
      return { text: t(currentLang(), 'ask.asking', { feature: about }) }
    }
    if (args === 'footer' || args.startsWith('footer ')) {
      const wanted = parseFooterOwner(args.slice(6))
      if (wanted === undefined) return { text: t(currentLang(), 'footer.usage', { owner: footerOwner }) }
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'footer.onlyYou') }
      await $.store.set(FOOTER_OWNER, wanted)
      return { text: t(currentLang(), 'footer.set', { owner: wanted, reload: t(currentLang(), 'footer.reload') }) }
    }
    if (args === 'doctor') return { text: await doctor($) }
    // The last 5 turns of the active feature, or of the one named (054 #92).
    if (args === 'recap' || args.startsWith('recap ')) {
      const state = (await $.state.get(SPECKIT)).value
      const wanted = args.slice(5).trim()
      const id = wanted === '' ? state?.active?.id : wanted.padStart(3, '0')
      const lines = recapOf((await $.state.get(SESSION)).value?.recap ?? [], id)
      if (lines.length === 0) return { text: t(currentLang(), 'recap.none', { id: id ?? '—' }) }
      return { text: [t(currentLang(), 'recap.title', { id: id ?? '—' }), ...lines.map(r => `  ${clockOf(new Date(r.at).toISOString()) ?? ''}  ${r.text}`)].join('\n') }
    }
    // Focus mode (054 #88): only the person turns it on or off.
    if (args === 'focus' || args === 'focus on' || args === 'focus off') {
      if (args === 'focus') return { text: t(currentLang(), focusMode ? 'focus.isOn' : 'focus.isOff') }
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'focus.onlyYou') }
      focusMode = args === 'focus on'
      await flushStats($, s => ({ ...s, focus: focusMode }))
      return { text: t(currentLang(), focusMode ? 'focus.on' : 'focus.off') }
    }
    // The Dashboard's numbers as Markdown, to paste in a PR body (054 #99).
    if (args === 'kpis') return { text: (await kpisText($)) ?? t(currentLang(), 'kpis.none') }
    // The bundled statusline as Claude Code's own statusLine (070): the command, never written for the person.
    if (args === 'statusline') {
      const bundled = await bundledStatusline($)
      if (bundled === undefined) return { text: t(currentLang(), 'statusline.none') }
      const settings = JSON.stringify({ statusLine: { type: 'command', command: `node "${bundled.cli}"` } }, null, 2)
      return { text: t(currentLang(), 'statusline.command', { version: bundled.version, commit: bundled.commit, cli: bundled.cli, settings }) }
    }
    if (args === 'advisor' || args.startsWith('advisor ')) {
      // A whole turn with the advisor: only the person starts it (055).
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'advisor.onlyYou') }
      const state = (await $.state.get(SPECKIT)).value
      const wanted = args.slice(7).trim()
      const feature = wanted === '' ? state?.features.find(f => f.dir === state.active?.dir) : state?.features.find(f => f.id === wanted.padStart(3, '0'))
      if (feature === undefined) return { text: t(currentLang(), 'advisor.usage') }
      askAdvisor($, feature)
      return { text: t(currentLang(), 'advisor.started', { feature: `${feature.id} ${feature.name}` }) }
    }
    // Every worktree working on a feature, as text (054 #53).
    if (args === 'worktrees') {
      const list = (await $.state.get(SESSION)).value?.worktrees ?? []
      if (list.length === 0) return { text: t(currentLang(), 'worktrees.none') }
      return { text: list.map(w => `⎇ ${w.name}  ${w.id} ${w.featureName}  ${w.phase}${w.total === 0 ? '' : ` ${w.done}/${w.total}`}${w.branch === undefined ? '' : `  (${w.branch})`}${worktreeState(w)}`).join('\n') }
    }
    if (args === 'config reset') {
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'config.resetOnlyYou') }
      return { text: await resetConfig($) }
    }
    const priority = parsePriority(args)
    if (priority !== undefined) return { text: await setPriority($, priority.id, priority.level) }
    if (args === 'review' || args.startsWith('review ')) {
      // The deep review costs a stronger model's tokens: only the person starts it (051).
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'review.onlyYou') }
      const state = (await $.state.get(SPECKIT)).value
      const wanted = args.slice(6).trim()
      const feature = wanted === '' ? state?.features.find(f => f.dir === state.active?.dir) : state?.features.find(f => f.id === wanted.padStart(3, '0'))
      if (feature === undefined) return { text: t(currentLang(), 'review.usage') }
      $.clock.after(0, () => void deepReview($, feature))
      return { text: t(currentLang(), 'review.started', { feature: `${feature.id} ${feature.name}`, model: REVIEW_MODEL.model }) }
    }
    if (args === 'status') {
      const state = (await $.state.get(SPECKIT)).value
      if (state === undefined) return { text: t(currentLang(), 'status.none') }
      const [usage, stats] = await Promise.all([$.state.get(USAGE), $.state.get(SESSION)])
      return { text: statusText(state, footerText(await footerInput($, state, 200, { usage: usage.value ?? DEFAULT_USAGE, stats: stats.value })), currentLang()) }
    }
    if (args === 'next') {
      const command = (await $.state.get(SPECKIT)).value?.nextCommand
      if (command === undefined) return { text: t(currentLang(), 'next.none') }
      // A command does not run another from inside its own dispatch: start it from a timer.
      $.clock.after(0, () => void runNext($, command))
      return { text: t(currentLang(), 'next.running', { cmd: command }) }
    }
    // Runs one queued subagent now (047 #64): only from the composer, like the ceiling.
    const runMatch = /^run\s+(\S+)$/.exec(args)
    if (runMatch !== null) {
      if (e.origin?.kind !== 'composer') return { text: '🧭 only you can run a queued subagent: type the command yourself' }
      return { text: await runQueued($, runMatch[1]!) }
    }
    if (args !== '') {
      const parsed = parseAllow(args)
      if (parsed === undefined) return { text: `Unknown: /astrolabe ${args}. Type /astrolabe help for the commands.` }
      // Only the person at the terminal may move the ceiling (spec 008, FR-006).
      if (e.origin?.kind !== 'composer') return { text: '🧭 only you can change the usage ceiling: type the command yourself' }
      if ('revoke' in parsed) {
        return { text: await revokeUsageOverride($) }
      }
      return { text: await setUsageOverride($, parsed.allow.target, parsed.allow.ms) }
    }
    await openPane($)
    return { text: 'Astrolabe pane opened.' }
  })

  // What the Specs list's surface module posts (080): validated, then applied. A bad message is ignored.
  on('ui.message', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    if (e.element !== 'astrolabe-specs') return next(e)
    const op = parseClientOp(e.data)
    if (op !== undefined) await applyClientOp($, op)
    return {}
  })

  // The wheel and the arrow keys scroll the pane's body, not the whole pane, so the footer stays (038).
  on('ui.scroll', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (held.tab === 'specs' && e.by !== 0 && specSelectionRows.length > 0) {
      const next = moveSpecSelection(specSelectionRows, selectedSpecRow, e.by)
      const row = next === undefined ? undefined : specSelectionRows.find(item => item.key === next)
      if (row !== undefined) {
        const heldOffset = held.scroll?.tab === 'specs' ? held.scroll.offset : 0
        const offset = row.index < specSelectionWindow.start || row.index >= specSelectionWindow.end ? row.index : heldOffset
        // A task row of the tree is selected the same way a spec row is (078).
        const picked = row.key.startsWith('task-')
          ? { selectedTask: row.key }
          : { selectedFeature: row.key.slice('feature-'.length) }
        const { selectedTask: _prev, ...kept } = held
        await $.state.set(PANE_STATE, {
          ...kept,
          ...picked,
          ...(offset === heldOffset ? {} : { scroll: { tab: 'specs', offset } }),
        })
        // The selection is kept per project (078 FR-021).
        const root = (await $.state.get(SPECKIT)).value?.root
        if (root !== undefined) await $.store.set(`selection:${root}`, row.key).catch(() => undefined)
        if (specLinksEnabled) await $.ui.focus({ requestId: PANE_ID, key: `${row.key}-spec-link` })
      }
      return {}
    }
    // The arrow keys stand on an option in Setup and on a pull request in PRs (079).
    if ((held.tab === 'setup' || held.tab === 'prs') && held.help !== true && e.by !== 0 && listSelection !== undefined && listSelection.tab === held.tab && listSelection.rows.length > 0) {
      const current = listSelection.selected !== undefined && listSelection.rows.some(r => r.key === listSelection!.selected) ? listSelection.selected : listSelection.rows[0]!.key
      const nextKey = moveSpecSelection(listSelection.rows, current, e.by)
      const row = nextKey === undefined ? undefined : listSelection.rows.find(item => item.key === nextKey)
      if (row !== undefined) {
        const heldOffset = held.scroll?.tab === held.tab ? held.scroll.offset : 0
        const offset = row.index < listSelection.window.start || row.index >= listSelection.window.end ? row.index : heldOffset
        await $.state.set(PANE_STATE, {
          ...held,
          ...(held.tab === 'setup' ? { selectedOption: row.key } : { selectedPr: row.key }),
          ...(offset === heldOffset ? {} : { scroll: { tab: held.tab, offset } }),
        })
        return {}
      }
    }
    const at = viewOf(held)
    const from = held.scroll?.tab === at ? held.scroll.offset : 0
    const by = e.by === 0 ? 0 : Math.sign(e.by) * Math.max(1, Math.round(Math.abs(e.by)))
    const to = Math.max(0, Math.min(Math.max(0, (unitsShown[at] ?? 1) - 1), from + by))
    if (to !== from) {
      await $.state.set(PANE_STATE, { ...held, scroll: { tab: at, offset: to } })
      await rememberScroll($, at, to)
    }
    return {}
  })

  // Enter in a `#` jump field goes to the first id it completes to (067 #31): its block opens, the row is selected.
  on('ui.input', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (e.element !== 'astrolabe-filter' || e.kind !== 'submit' || pane.tab !== 'specs' || pane.help === true) return next(e)
    const query = jumpQuery(pane.filter)
    if (query === undefined) return next(e)
    const state = (await $.state.get(SPECKIT)).value
    const hit = state === undefined ? undefined : jumpMatches(state.features, query, 1)[0]
    const { filter: _gone, ...rest } = pane
    if (hit === undefined) {
      await $.state.set(PANE_STATE, rest)
      return e
    }
    const width = Math.max(3, ...state!.features.map(f => f.id.length))
    const open = new Set(pane.open ?? [])
    open.add(blockLabel(hit.id, width))
    // The jump names a block of the status grouping: other groupings have their own headings.
    await $.state.set(PANE_STATE, { ...rest, view: 'all', group: 'status', open: [...open], selectedFeature: hit.id })
    return e
  })

  // Enter in Setup changes the option the arrows stand on; in PRs it runs the pull request's first
  // action, asking twice as the buttons do (079).
  on('ui.input', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (e.element === 'astrolabe-filter' || e.kind !== 'submit' || pane.help === true || listSelection === undefined || listSelection.tab !== pane.tab) return next(e)
    if (pane.tab === 'setup') {
      const key = pane.selectedOption !== undefined && listSelection.rows.some(r => r.key === pane.selectedOption) ? pane.selectedOption : listSelection.rows[0]?.key
      const row = configRows.find(r => r.key === key)
      if (row === undefined) return next(e)
      const draft = pane.draft ?? {}
      const shown = row.key in draft ? draft[row.key]! : row.value
      const value = typeof shown === 'object' ? undefined : nextOptionValue({ kind: row.kind, options: row.options, isLocked: row.isLocked }, shown)
      if (value === undefined) return next(e)
      await $.state.set(PANE_STATE, { ...pane, selectedOption: row.key, draft: { ...draft, [row.key]: value } })
      return e
    }
    if (pane.tab === 'prs') {
      const key = pane.selectedPr !== undefined && listSelection.rows.some(r => r.key === pane.selectedPr) ? pane.selectedPr : listSelection.rows[0]?.key
      const n = key === undefined ? undefined : Number(key.slice('pr-'.length))
      const pr = (await $.state.get(SESSION)).value?.pulls?.rows.find(r => r.number === n)
      const action = pr === undefined ? undefined : primaryPullAction(pr)
      if (pr === undefined || action === undefined) return next(e)
      const confirm = `pr-${action}-${pr.number}`
      if (pane.confirm === confirm) {
        const { confirm: _gone, ...rest } = pane
        await $.state.set(PANE_STATE, rest)
        $.clock.after(0, () => void runPullAction($, action, pr.number, pr.head))
      } else {
        await $.state.set(PANE_STATE, { ...pane, selectedPr: key!, confirm })
      }
      return e
    }
    return next(e)
  })

  // Enter on the selected row of the Specs tree opens or folds it (078 FR-004). Making a spec the
  // active one is the `u` key; ticking a task is `x`, which hands the tick to Claude (spec 051).
  on('ui.input', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    if (e.element === 'astrolabe-filter' || e.kind !== 'submit' || pane.tab !== 'specs' || pane.help === true || specSelectionRows.length === 0) return next(e)
    const state = (await $.state.get(SPECKIT)).value
    if (state === undefined) return next(e)
    const key = selectedSpecRow
    if (key === undefined) return next(e)
    // A task row: its spec folds, the way ← does in a file tree.
    const taskMatch = /^task-(.+)-(?:T\d+|\d+)$/.exec(key)
    const dir = taskMatch !== null ? taskMatch[1] : state.features.find(f => `feature-${f.id}` === key)?.dir
    if (dir === undefined) return next(e)
    const fold = toggled(dir, state.active?.dir, { ...(pane.opened === undefined ? {} : { opened: pane.opened }), ...(pane.closed === undefined ? {} : { closed: pane.closed }) })
    const feature = state.features.find(f => f.dir === dir)
    const { selectedTask: _gone, ...kept } = pane
    await $.state.set(PANE_STATE, { ...kept, ...fold, ...(taskMatch !== null && feature !== undefined ? { selectedFeature: feature.id } : {}) })
    if (state.root !== undefined) await $.store.set(`folds:${state.root}`, fold).catch(() => undefined)
    return e
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const [speckitRead, sessionRead, usageRead, paneRead, updatesRead, footerRead] = await Promise.all([
      $.state.get(SPECKIT),
      $.state.get(SESSION),
      $.state.get(USAGE),
      $.state.get(PANE_STATE),
      $.state.get(UPDATES),
      $.state.get(FOOTER),
    ])
    const state = speckitRead.value ?? { present: false, constitution: 'missing' as const, features: [], isAnalyzed: false }
    const stats = sessionRead.value
    // The footer statusline drew (070): shown while it is current; the pane being drawn keeps its refresh going.
    const paneNow = await $.clock.now()
    lastPaneDrawAt = paneNow
    const footerNow = footerRead.value
    if (footerSource === 'statusline' && footerIn !== 'status') {
      if (footerNow?.render === undefined || paneNow - footerNow.render.at > FOOTER_TICK_MS) $.clock.after(0, () => void refreshStatusline($))
      if (footerTimer === undefined) armFooterTick($)
    }
    const statuslineRuns: FooterState['render'] | undefined =
      footerSource === 'statusline' && footerNow?.health?.source === 'statusline' && footerNow.render !== undefined && paneNow - footerNow.render.at <= FOOTER_STALE_MS ? footerNow.render : undefined
    const footerNotice: SourceReason | undefined =
      footerSource === 'statusline' && statuslineRuns === undefined && footerNow?.health?.source === 'native' && footerNow.health.reason !== undefined && footerNow.health.reason !== 'native-chosen'
        ? (footerNow.health.reason as SourceReason)
        : undefined
    const usage = usageRead.value ?? DEFAULT_USAGE
    const updates = updatesRead.value?.items ?? []
    const pane = paneRead.value ?? DEFAULT_PANE
    // The help overlay above the tab, or the tab itself (066 #21).
    const view = viewOf(pane)
    const columns = e.props.bodyColumns
    // `#05` is a jump to an id, not a filter of rows (067 #31).
    const jump = jumpQuery(pane.filter)
    const specFilter = jump === undefined ? pane.filter : undefined
    const needle = (specFilter ?? '').trim().toLowerCase()
    const keep = <R extends { key: string; text: string }>(list: R[]): R[] =>
      needle === '' ? list : list.filter(r => r.key === 'count' || r.text.toLowerCase().includes(needle))
    // The Specs tab is the tree of specs and their tasks (078); the 5h reset warning sits under the active spec.
    let keptSpecs = 0
    const rows: PaneRow[] =
      view === 'help'
        ? helpRows(helpText(currentLang(), optionsSeen, stats?.health?.lines ?? []), pane.filter, currentLang())
        : view === 'session'
          ? await sessionTabRows($, state, usage, stats, updates, updatesRead.value?.confirming, { columns, updatesOpen: pane.updatesOpen === true, logOpen: pane.logOpen === true, turnsOpen: pane.turnsOpen === true })
          : view === 'specs'
            ? await (async () => {
                const tree = await specsTreeRows($, e, state, stats, pane, specFilter, columns, await pastResetRows($, state, stats, usage))
                keptSpecs = tree.kept
                return tree.rows
              })()
            : []
    // A filter that keeps nothing says so (052 #7).
    const matchesNone =
      (needle !== '' || (view === 'specs' && (pane.status ?? 'all') !== 'all')) &&
      (view === 'specs' ? keptSpecs === 0 && state.features.length > 0 : view === 'help' && rows.length === 0)
    if (matchesNone && view === 'specs') rows.splice(0, rows.length, ...rows.filter(r => r.key !== 'empty'))
    if (matchesNone) rows.push({ key: 'no-match', text: t(currentLang(), 'pane.noMatch', { filter: pane.filter?.trim() ?? '' }), role: 'muted' })
    const { Box, Text, Button } = $.ui.resolve(e)
    const featureRowKeys = new Set(state.features.map(feature => `feature-${feature.id}`))
    // The tree's selectable rows: each spec and each task (078).
    specSelectionRows = view === 'specs'
      ? rows.flatMap((row, index) => ((featureRowKeys.has(row.key) || row.task !== undefined) && row.href !== undefined ? [{ key: row.key, index }] : []))
      : []
    const activeSpecFeature = state.features.find(feature => feature.dir === state.active?.dir)
    const preferredSelection =
      pane.selectedTask !== undefined && specSelectionRows.some(row => row.key === pane.selectedTask)
        ? pane.selectedTask
        : pane.selectedFeature === undefined
          ? activeSpecFeature === undefined ? undefined : `feature-${activeSpecFeature.id}`
          : `feature-${pane.selectedFeature}`
    selectedSpecRow = specSelectionRows.some(row => row.key === preferredSelection)
      ? preferredSelection
      : specSelectionRows[0]?.key
    if (selectedSpecRow !== undefined) {
      const selectedIndex = rows.findIndex(row => row.key === selectedSpecRow)
      if (selectedIndex >= 0) rows[selectedIndex] = { ...rows[selectedIndex]!, selected: true }
    }
    specLinksEnabled = e.surface === 'terminal' && 'Link' in $.ui.resolve(e)
    // Counts beside the tabs (043 #21) and the keys of the tab shown, one row above the footer (043 #25).
    const activeOpen = state.features.find(f => f.dir === state.active?.dir)
    const inProgress = state.features.filter(f => f.phase !== 'done' && f.phase !== 'abandoned').length
    const pullCount = stats?.pulls?.rows.length
    // The advisor review and gstack's skills that fit the selected spec's phase, under its row (051, 055, 061).
    const selectedTaskRow = rows.find(r => r.key === selectedSpecRow && r.task !== undefined)
    const reviewed = selectedTaskRow?.task === undefined
      ? state.features.find(f => `feature-${f.id}` === selectedSpecRow)
      : state.features.find(f => f.dir === selectedTaskRow.task!.dir)
    const reviewedNext = reviewed === undefined ? undefined : nextFor(reviewed, reviewed.dir === state.active?.dir, state.isAnalyzed === true)
    const taskRow = selectedTaskRow?.task
    const taskButtons: Array<{ key: string; label: string; hotkey?: string; onPress: () => void }> =
      view === 'specs' && reviewed !== undefined && taskRow !== undefined && 'Button' in $.ui.resolve(e)
        ? [
            // Astrolabe writes nothing to the project (spec 051): the tick goes to the prompt box for Claude.
            { key: 'task-tick', label: t(currentLang(), 'task.tick'), hotkey: 'x', onPress: () => void $.prompt.suggest({ text: tickSuggestion(reviewed, taskRow) }).catch(() => undefined) },
            { key: 'task-do', label: t(currentLang(), 'task.do'), onPress: () => void $.prompt.suggest({ text: doTaskSuggestion(reviewed, taskRow) }).catch(() => undefined) },
            ...(taskRow.id === undefined ? [] : [{ key: 'task-copy', label: `⧉ ${taskRow.id}`, onPress: () => void copyNext($, taskRow.id!, e.surface) }]),
          ]
        : []
    const rowButtons: Array<{ key: string; label: string; hotkey?: string; onPress: () => void }> =
      taskButtons.length > 0
        ? taskButtons
        : view === 'specs' && reviewed !== undefined && 'Button' in $.ui.resolve(e)
        ? [
            {
              key: 'advisor-review',
              label: pane.confirm === `advisor-${reviewed.id}` ? t(currentLang(), 'detail.confirmAdvisor') : t(currentLang(), 'advisor.button'),
              hotkey: 'a',
              onPress: () => void confirmPress($, `advisor-${reviewed.id}`, () => askAdvisor($, reviewed)),
            },
            ...(stats?.gstack === true
              ? skillsForPhase(reviewed.phase).map(skill => ({
                  key: `gstack-${skill}`,
                  label: skill,
                  onPress: () => void $.clock.after(0, () => void runSkill($, skill, `${reviewed.id} ${reviewed.name}`)),
                }))
              : []),
            ...(reviewedNext === undefined
              ? []
              : [{ key: 'copy-next', label: `⧉ ${reviewedNext}`, onPress: () => void copyNext($, reviewedNext, e.surface) }]),
            // Making this spec the active one asks twice, as before (044 #38, 078 FR-004).
            ...(reviewed.dir !== state.active?.dir && state.root !== undefined
              ? [{
                  key: 'use-spec',
                  label: pane.confirm === `use-${reviewed.id}` ? t(currentLang(), 'specs.confirmSelect', { id: reviewed.id }) : t(currentLang(), 'detail.use'),
                  hotkey: 'u',
                  onPress: () => void confirmPress($, `use-${reviewed.id}`, () => void (async () => {
                    await $.store.set(`feature:${state.root}`, reviewed.dir).catch(() => undefined)
                    await showToast($, t(currentLang(), 'specs.selected', { id: reviewed.id, name: reviewed.name }))
                  })()),
                }]
              : []),
            // The id copies on a press; the toast names what was copied (078 FR-023).
            { key: 'copy-id', label: `⧉ ${reviewed.id}`, onPress: () => void copyNext($, reviewed.id, e.surface) },
            { key: 'priority', label: t(currentLang(), 'detail.priority'), hotkey: 'p', onPress: () => void setPriority($, reviewed.id, nextPriority(stats?.priorities?.[reviewed.id])).catch(() => undefined) },
            // Ready to close (067 #32): the edit is Claude's, offered in the prompt box.
            ...(isReadyToClose(reviewed)
              ? [{ key: 'close-spec', label: t(currentLang(), 'detail.close'), onPress: () => void $.prompt.suggest({ text: closeSuggestion(reviewed) }).catch(() => undefined) }]
              : []),
          ]
        : []
    // The line above those buttons: what the spec needs, at a glance (061).
    const rowDetail =
      reviewed === undefined || view !== 'specs' || taskRow !== undefined
        ? undefined
        : specDetail(reviewed, {
            ...(stats?.priorities?.[reviewed.id] === undefined ? {} : { priority: stats.priorities[reviewed.id]! }),
            worktrees: worktreesById(stats?.worktrees)[reviewed.id] ?? [],
            ...(reviewedNext === undefined ? {} : { next: reviewedNext }),
            ...(reviewed.updatedAt === undefined ? {} : { age: ageOf(Date.parse(reviewed.updatedAt), await $.clock.now()) }),
            // What is left at the pace of the tasks done so far: two samples at least (078 FR-006).
            ...((samples => (samples.length >= 2 && reviewed.total > reviewed.done ? { estimate: duration(Math.round(samples.reduce((n, x) => n + x.ms, 0) / samples.length) * (reviewed.total - reviewed.done)) } : {}))((stats?.taskTimes ?? []).filter(x => x.dir === reviewed.dir && x.ms > 0))),
            lang: currentLang(),
          })
    // The selected spec's first line of summary, one dim row under its detail (board 3).
    const rowDescription =
      reviewed === undefined || view !== 'specs' || taskRow !== undefined || reviewed.dir !== state.active?.dir || state.activeSummary === undefined
        ? undefined
        : state.activeSummary.split('\n').map(l => l.replace(/^#+\s*/, '').trim()).find(l => l !== '' && !/^[-*>|`]/.test(l))
    // Under the tasks-only list: the open tasks as issues (050 #96). The [P] run is an action row in the tree.
    const taskActions: Array<{ key: string; label: string; onPress: () => void }> = []
    if (view === 'specs' && pane.tasksOnly === true && state.active !== undefined && 'Button' in $.ui.resolve(e)) {
      const open = (state.activeTasks ?? []).filter(task => !task.isDone)
      const feature = state.features.find(f => f.dir === state.active?.dir)
      if (feature !== undefined && open.length > 0) {
        const confirmKey = `issues-${feature.id}`
        const n = Math.min(open.length, 20)
        taskActions.push({
          key: 'tasks-to-issues',
          label: pane.confirm === confirmKey ? t(currentLang(), 'tasks.issuesConfirm', { n }) : t(currentLang(), 'tasks.issues', { n }),
          onPress: () => void confirmPress($, confirmKey, () => void $.clock.after(0, () => void runSkill($, 'speckit-taskstoissues', `${feature.id} ${feature.name}`))),
        })
      }
    }
    const extras = {
      rowButtons,
      taskActions,
      ...(rowDescription === undefined ? {} : { rowDescription }),
      ...(rowDetail === undefined ? {} : { rowDetail }),
      // What waits on the person (066 #23): never a total.
      badges: badgesOf({
        inProgress,
        openTasks: activeOpen === undefined ? 0 : activeOpen.total - activeOpen.done,
        pulls: pullCount,
        governor: decisionOf(usage, await $.clock.now()).band,
      }),
      help: pane.help === true,
      onHelp: async () => {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        const { help: _off, ...rest } = held
        await $.state.set(PANE_STATE, held.help === true ? rest : { ...rest, help: true })
        if (held.help !== true) $.clock.after(0, () => void refreshHealth($))
      },
      // What the tab is for, then its keys (048 #72).
      onClose: () => $.ui.close({ id: PANE_ID }).then(() => undefined),
      ...(view === 'specs' ? { onCloseReady: (dirs: string[]) => void $.prompt.suggest({ text: closeAllSuggestion(dirs) }).catch(() => undefined) } : {}),
      ...(view === 'specs' ? { onReconcile: (id: string) => void $.prompt.suggest({ text: reconcileSuggestion(id) }).catch(() => undefined) } : {}),
      columns,
      ...(view === 'session' && e.surface === 'terminal'
        ? {
            onRunQueued: async (id: string) => {
              const text = await runQueued($, id)
              // A stale button names an id that is no longer queued: a warning, not a success.
              await showToast($, text, /nothing queued as/.test(text) ? { kind: 'warn' } : undefined)
            },
          }
        : {}),
      ...(view === 'session' ? { onUpdate: async (id: string) => runUpdate($, id as UpdateId) } : {}),
      // The folded blocks of the Session tab: the updates and today's governor log (078).
      ...(view === 'session'
        ? {
            onFold: async (id: string) => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              const { updatesOpen: u, logOpen: l, turnsOpen: n, ...rest } = held
              const open = { updates: u === true, log: l === true, turns: n === true }
              open[id as keyof typeof open] = !open[id as keyof typeof open]
              await $.state.set(PANE_STATE, { ...rest, ...(open.updates ? { updatesOpen: true as const } : {}), ...(open.log ? { logOpen: true as const } : {}), ...(open.turns ? { turnsOpen: true as const } : {}) })
            },
            onFinding: (id: string) => {
              const [spec = '', ...rest] = id.split('\n')
              void $.prompt.suggest({ text: `Address this review finding of spec ${spec}: ${rest.join(' ')}` }).catch(() => undefined)
            },
          }
        : {}),
      ...(view === 'session'
        ? {
            onLiftBand: async () => {
              await liftBand($)
              await showToast($, t(currentLang(), 'session.box.lifted'))
            },
            onAllowUsage: async () => showToast($, await setUsageOverride($, 95, 2 * 3_600_000)),
            onRevokeUsage: async () => showToast($, await revokeUsageOverride($)),
          }
        : {}),
      colorblind: optionsSeen['flavor'] === 'colorblind',
      wrapLongNames: e.surface === 'desktop',
      // The accessible mode takes effect in the pane as soon as it is drafted (078 FR-080).
      marks: accessible || pane.draft?.['astrolabe.accessible'] === true ? ('words' as const) : iconsFor(iconsOption, e.surface) === 'ascii' ? ('ascii' as const) : ('unicode' as const),
      // s cycles the Specs tab's status filter (054 #21).
      ...(view === 'specs'
        ? {
            status: { label: t(currentLang(), `pane.status.${pane.status ?? 'all'}` as TextKey), onPress: async () => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              await $.state.set(PANE_STATE, { ...held, status: nextStatus(held.status) })
            } },
          }
        : {}),
      // file: links open only from the terminal; the desktop draws them as plain text, so none there.
      ...((el => ('Link' in el && e.surface === 'terminal' ? { Link: el.Link } : {}))($.ui.resolve(e))),
      // The Specs list is a surface module in the terminal, off in the accessible mode (080).
      ...((el => ('Client' in el && e.surface === 'terminal' && !accessible && view === 'specs' ? { Client: el.Client } : {}))($.ui.resolve(e))),
      onRefresh: () => refreshNow($).catch(() => undefined),
      // The Dashboard's numbers copied as Markdown (046 #59).
      ...(view === 'session'
        ? { onCopyKpis: async () => { const text = await kpisText($); if (text !== undefined) await copyNext($, text, e.surface) } }
        : {}),
      // Number keys show on the tab labels only while the pane has the keyboard (054 #65).
      showKeys: e.props.isFocused === true,
      // v toggles Focus and All, g cycles the grouping, a block header opens and folds (067 #31, #39).
      ...(view === 'specs'
        ? {
            ...(state.features.length > 12 || pane.view !== undefined ? { view: {
              label: t(currentLang(), pane.view === 'all' ? 'pane.view.all' : state.features.length > 12 || pane.view === 'focus' ? 'pane.view.focus' : 'pane.view.list'),
              onPress: async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                await $.state.set(PANE_STATE, { ...held, view: held.view === 'all' ? 'focus' : 'all' })
              },
            } } : {}),
            ...(pane.view === 'all'
              ? {
                  group: {
                    label: t(currentLang(), `pane.group.${pane.group ?? 'status'}` as TextKey),
                    onPress: async () => {
                      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                      await $.state.set(PANE_STATE, { ...held, group: nextGroup(held.group), open: [] })
                    },
                  },
                }
              : {}),
            onToggleBlock: async (key: string) => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              const open = new Set(held.open ?? [])
              if (open.has(key)) open.delete(key)
              else open.add(key)
              await $.state.set(PANE_STATE, { ...held, open: [...open] })
            },
          }
        : {}),
      // t shows only the active spec's tasks, e opens or folds every spec (078 FR-005, FR-009).
      ...(view === 'specs'
        ? {
            tasksOnly: {
              label: t(currentLang(), pane.tasksOnly === true ? 'tree.allSpecs' : 'tree.tasksOnly'),
              onPress: async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                const { tasksOnly: _was, ...rest } = held
                await $.state.set(PANE_STATE, held.tasksOnly === true ? rest : { ...rest, tasksOnly: true })
              },
            },
            openAll: {
              label: t(currentLang(), 'tree.openAll'),
              onPress: async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                const fold = allToggled(state.features.filter(f => f.total > 0).map(f => f.dir), state.active?.dir, { ...(held.opened === undefined ? {} : { opened: held.opened }), ...(held.closed === undefined ? {} : { closed: held.closed }) })
                await $.state.set(PANE_STATE, { ...held, ...fold })
                if (state.root !== undefined) await $.store.set(`folds:${state.root}`, fold).catch(() => undefined)
              },
            },
            onAsk: (id: string) => void $.prompt.suggest({ text: questionSuggestion(id) }).catch(() => undefined),
            onSpecify: (id: string) => void $.prompt.suggest({ text: `/speckit-specify ${id}` }).catch(() => undefined),
            // m cycles what the list shows: all, mine (the active spec), blocked, ready to close (078 FR-034).
            preset: {
              label: t(currentLang(), 'tree.preset', { name: t(currentLang(), `tree.preset.${PRESET_OF[(pane.filter ?? '').trim()] ?? 'all'}` as TextKey) }),
              onPress: async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                const at = (PRESET_FILTERS as readonly string[]).indexOf((held.filter ?? '').trim())
                const next = PRESET_FILTERS[(at + 1) % PRESET_FILTERS.length]!
                const { filter: _old, ...rest } = held
                await $.state.set(PANE_STATE, next === '' ? rest : { ...rest, filter: next })
              },
            },
            onParallel: (id: string) => {
              const [dir, ...ids] = id.split('\n')
              const feature = state.features.find(f => f.dir === dir)
              const picked = (dir === state.active?.dir ? state.activeTasks ?? [] : []).filter(task => task.id !== undefined && ids.includes(task.id))
              if (feature !== undefined && picked.length > 0) void $.clock.after(0, () => void $.prompt.submit({ text: parallelPrompt(feature, picked) }).catch(() => undefined))
            },
          }
        : {}),
      // c clears the filter box and the status filter; o cycles the order (061).
      ...(view === 'specs'
        ? {
            sort: {
              label: t(currentLang(), `pane.sort.${pane.sort ?? 'status'}` as TextKey),
              onPress: async () => {
                const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                await $.state.set(PANE_STATE, { ...held, sort: nextSort(held.sort) })
              },
            },
            ...(filterChips(pane.filter, pane.status).length === 0
              ? {}
              : {
                  onClear: async () => {
                    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
                    const { filter: _f, status: _s, ...rest } = held
                    await $.state.set(PANE_STATE, rest)
                  },
                }),
          }
        : {}),
      onCopy: (text: string) => copyNext($, text, e.surface),
      onFind: view === 'specs' || view === 'help' || view === 'setup' || view === 'prs' ? () => $.ui.focus({ requestId: PANE_ID, key: 'astrolabe-filter' }).then(() => undefined) : undefined,
      // What the tab is for, then its keys; a narrow pane keeps the keys whole (052 #3).
      // Nothing under the Tasks list but its actions: the key row names the keys (board 3, 075 FR-012).
      ...(view === 'specs' && pane.tasksOnly === true
        ? {}
        : {
            legend: ((about: string, keys: string) => ([...`${about} · ${keys}`].length <= columns ? `${about} · ${keys}` : keys))(
              t(currentLang(), ABOUT[view]),
              t(currentLang(), view === 'specs' ? 'legend.specs' : view === 'help' ? 'legend.filter' : view === 'setup' ? 'legend.config' : 'legend.default'),
            ) + (state.updatedAt === undefined || columns < 80 ? '' : ` · ${t(currentLang(), 'legend.updated', { at: clockOf(new Date(state.updatedAt).toISOString()) ?? '' })}`),
          }),
    }
    const select = async (tab: PaneTab) => {
      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
      // The offset this tab had last, kept across reloads (043 #30).
      const offset = (await savedScrolls($, state.root))[tab] ?? 0
      // A tab press closes the help overlay.
      const { help: _help, ...rest } = held
      await $.state.set(PANE_STATE, { ...rest, tab, ...(offset > 0 ? { scroll: { tab, offset } } : {}) })
      // The last tab, per project, for the next session (043 #22).
      if (state.root !== undefined) await $.store.set(`tab:${state.root}`, tab).catch(() => undefined)
      if (tab === 'prs') $.clock.after(0, () => void refreshPulls($))
      // The doctor's checks, at most once a minute, for the Session tab's health block (078 FR-058).
      if (tab === 'session') $.clock.after(0, () => void refreshHealth($))
    }
    // The footer under every tab (035), held at the bottom when the tab is shorter than the pane.
    const shortPaneRule = (e.props.scroll?.bodyRows ?? 24) < 12
    const footerFor = async (pad: number) => {
      if (footerIn === 'status') return undefined
      const input = await footerInput($, state, Math.max(20, columns - 4), { usage, stats })
      const set = iconsFor(iconsOption, e.surface)
      // statusline's colours (039); text only in the accessible mode and with ascii icons.
      const palette = CHIPS[flavorOf(optionsSeen, isLightTheme)]
      const grouped = accessible || set === 'ascii' || noColor ? undefined : footerLines === '3' ? footerChipLines(input) : [footerChips(input)]
      let anyFresh = false
      const chips = grouped?.map(row =>
        row.map(chip => {
          const plain = palette[chip.colour] ?? palette['surface1']!
          const bg = chip.name !== undefined && BRIGHTEN_CHIPS.has(chip.name) && freshChip(chip.key, chip.text, input.now) ? lighten(plain, FRESH_SHARE) : plain
          if (bg !== plain) anyFresh = true
          return { key: chip.key, text: chip.text, bg, fg: chipForeground(bg), ...(chip.full === undefined ? {} : { full: chip.full }), ...(chip.links === undefined || chip.links.length === 0 ? {} : { links: chip.links }), ...(chip.name === undefined ? {} : { explain: t(currentLang(), `chip.explain.${chip.name}` as TextKey) }) }
        }),
      )
      if (anyFresh) scheduleFresh($, input.now)
      // With statusline drawing, the native part is its lead: the Spec Kit chip, the deciding window, the advisor, help (070 R8).
      const LEAD = new Set<string>(['deciding', 'advisor', 'help', 'astrolabe'])
      const leadChips =
        statuslineRuns === undefined || chips === undefined
          ? undefined
          : [chips.flat().filter(chip => chip.key === 'speckit' || chip.key.startsWith('first-') || LEAD.has(chip.key))]
      const plainFooter = accessible || noColor
      const toHex = (c: string | undefined): string | undefined => (c === undefined ? undefined : c.startsWith('ansi:') ? ANSI_16[Number(c.slice(5))] : c)
      const runLines =
        statuslineRuns === undefined
          ? undefined
          : statuslineRuns.lines.slice(0, 3).map(line =>
              cutRuns(line, Math.max(1, columns - 4)).map(run => ({
                text: run.text,
                ...(plainFooter || toHex(run.fg) === undefined ? {} : { fg: toHex(run.fg)! }),
                ...(plainFooter || toHex(run.bg) === undefined ? {} : { bg: toHex(run.bg)! }),
                ...(run.bold === undefined ? {} : { bold: true as const }),
                ...(run.dim === undefined ? {} : { dim: true as const }),
                ...(run.underline === undefined ? {} : { underline: true as const }),
                ...(run.href === undefined ? {} : { href: run.href }),
              })),
            )
      return {
        text: footerText(input),
        columns,
        pad: Math.max(0, pad),
        ...(chips === undefined ? {} : { chips: leadChips ?? chips, separator: shortPaneRule ? 'none' : footerSeparator, arrow: set === 'nerd' ? '\ue0b0' : '' }),
        ...(runLines === undefined ? {} : { lines: runLines }),
        ...(footerNotice === undefined ? {} : { notice: t(currentLang(), `footer.fallback.${footerNotice}` as TextKey) }),
      }
    }
    // The rows the footer holds below the body: its rule, its chip rows, and one of slack (038, 041).
    // Under 12 rows the footer drops its rule (054 #46).
    const shortPane = (e.props.scroll?.bodyRows ?? 24) < 12
    const ruleRows = footerSeparator === 'none' || shortPane ? 0 : 1
    const statuslineRows = statuslineRuns === undefined ? 0 : Math.min(3, statuslineRuns.lines.length)
    const footerReserve = footerIn === 'status' ? 1 : ruleRows + (statuslineRows > 0 ? 1 + statuslineRows : footerLines === '3' ? 3 : 1) + (footerNotice === undefined ? 0 : 1) + 1
    // The body scrolls inside the pane and the footer stays on the last rows (038).
    const bodyRows = e.props.scroll?.bodyRows ?? 24
    const offset = pane.scroll?.tab === view ? pane.scroll.offset : 0
    const scrollBy = async (by: number) => {
      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
      const at = viewOf(held)
      const from = held.scroll?.tab === at ? held.scroll.offset : 0
      const to = Math.max(0, Math.min(Math.max(0, (unitsShown[at] ?? 1) - 1), from + by))
      if (to !== from) {
        await $.state.set(PANE_STATE, { ...held, scroll: { tab: at, offset: to } })
        await rememberScroll($, at, to)
      }
    }
    const navFor = (heights: readonly number[], room: number) => {
      const win = windowUnits(heights, offset, room)
      unitsShown[view] = heights.length
      if (view === 'specs') specSelectionWindow = win
      const step = Math.max(1, win.end - win.start - 1)
      const shownRows = heights.slice(win.start, win.end).reduce((a, b) => a + b, 0)
      const arrows = (win.start > 0 ? 1 : 0) + (win.end < heights.length ? 1 : 0)
      return {
        win,
        pad: room - shownRows - arrows,
        nav: { above: win.start, below: heights.length - win.end, up: () => scrollBy(-step), down: () => scrollBy(step), top: () => scrollBy(-heights.length), labels: { more: t(currentLang(), 'pane.scrollMore') } },
      }
    }
    if (view === 'prs') {
      const units = pullsBody($, e, pane, stats, state)
      // The filter box leads the table: `is:failing`, `is:draft`, `is:mine` (078 FR-070).
      const prsHeader = paneHeader($, e, pane, state, stats, undefined, await $.clock.now())
      const { win, pad, nav } = navFor(units.map(u => u.rows), bodyRows - 1 - footerReserve - prsHeader.length)
      listSelection = {
        tab: 'prs',
        rows: units.flatMap((u, index) => (u.select === undefined ? [] : [{ key: u.select, index }])),
        window: win,
        selected: pane.selectedPr,
      }
      const body = (
        <Box key="astrolabe-prs" flexDirection="column">
          {units.slice(win.start, win.end).map(u => u.node)}
        </Box>
      )
      return paneTree({ Box, Text, Button }, pane.tab, [], tokens, select, body, currentLang(), prsHeader, await footerFor(pad), nav, extras)
    }
    if (view === 'setup') {
      // Setup (066 #21): the options, then the model per skill.
      const { Text: SetupText } = $.ui.resolve(e)
      const setupUnits = [
        ...configBody($, e, pane, state),
        { rows: 1, node: <SetupText key="setup-footer-title" color={tokens.accent} bold>{t(currentLang(), 'footer.setup.title')}</SetupText> },
        ...footerSetupRows(footerNow, currentLang()).map((text, i) => ({
          rows: 1,
          node: <SetupText key={`setup-footer-${i}`} color={tokens.text} wrap="truncate-end">{text}</SetupText>,
        })),
        { rows: 1, node: <SetupText key="setup-footnote" color={tokens.faint} wrap="truncate-end">{t(currentLang(), 'config.footnote')}</SetupText> },
        { rows: 1, node: <SetupText key="setup-models" color={tokens.accent} bold>{`${t(currentLang(), 'setup.models')}  skillModels: ${skillModels}`}</SetupText> },
        ...modelSkillTabBody($, e, pane),
      ]
      const units = setupUnits
      const bar = configBar($, e, pane)
      const { win, pad, nav } = navFor(units.map(u => u.rows), bodyRows - 1 - footerReserve - 1 - bar.length)
      listSelection = {
        tab: 'setup',
        rows: units.flatMap((u, index) => {
          const key = (u as { select?: string }).select
          return key === undefined ? [] : [{ key, index }]
        }),
        window: win,
        selected: pane.selectedOption,
      }
      // The hover cards sit after the rows, absolute, each against the row it belongs to (079).
      const visible = units.slice(win.start, win.end)
      let offset = 0
      const cards: RenderNode[] = []
      for (const u of visible) {
        const card = (u as { card?: { scope: string; node: RenderNode } }).card
        if (card !== undefined) {
          cards.push(
            <Box key={`card-${card.scope}`} position="absolute" top={offset + 1} left={2} width={Math.max(20, columns - 4)} display="none" hover={{ scope: card.scope, display: 'flex' }}>
              {card.node}
            </Box>,
          )
        }
        offset += u.rows
      }
      const body = (
        <Box key="astrolabe-setup" flexDirection="column">
          {visible.map(u => u.node)}
          {cards}
        </Box>
      )
      const setupHeader = [...paneHeader($, e, pane, state, stats, undefined, await $.clock.now()), ...bar]
      return paneTree({ Box, Text, Button }, pane.tab, [], tokens, select, body, currentLang(), setupHeader, await footerFor(pad), nav, extras)
    }
    if (view !== 'session') {
      const filterCount =
        view === 'specs'
          ? { kept: keptSpecs, total: state.features.length }
          : view === 'help'
            ? {
                kept: rows.filter(row => row.key !== 'no-match').length,
                total: helpRows(helpText(currentLang(), optionsSeen, stats?.health?.lines ?? []), undefined, currentLang()).length,
              }
            : undefined
      const nowForHeader = await $.clock.now()
      const crumb =
        view !== 'specs' || reviewed === undefined
          ? undefined
          : breadcrumb({ spec: reviewed.id, ...(taskRow?.story === undefined ? {} : { story: taskRow.story }), ...(taskRow?.id === undefined ? {} : { task: taskRow.id }) })
      const header = paneHeader($, e, pane, state, stats, filterCount, nowForHeader, undefined, crumb)
      // Rows the header takes: the filter, the summary's lines and links, the diff's lines.
      const headerRows =
        ('Input' in $.ui.resolve(e) ? 1 + (filterCount === undefined ? 0 : 1) : 0) +
        (rowButtons.length > 0 ? 1 : 0) +
        (rowDetail === undefined ? 0 : 1) +
        (rowDescription === undefined ? 0 : 1) +
        (taskActions.length > 0 ? taskActions.length : 0) +
        (view === 'specs' && pane.tasksOnly === true && stats?.tasksDiff !== undefined && stats.tasksDiff.dir === state.active?.dir
          ? stats.tasksDiff.at !== undefined && nowForHeader - stats.tasksDiff.at > DIFF_FOLD_MS
            ? 1
            : wrappedRows(capDiff(stats.tasksDiff.text, currentLang()), columns - 2)
          : 0)
      const room = bodyRows - 1 - headerRows - footerReserve
      const { win, pad, nav } = navFor(rows.map(() => 1), room)
      const footer = await footerFor(pad)
      // A list longer than the pane says which rows are in view and draws a thumb (067 #35).
      const windowed = win.start > 0 || win.end < rows.length
      const shownHeader = windowed ? paneHeader($, e, pane, state, stats, filterCount, nowForHeader, { from: win.start + 1, to: win.end, total: rows.length }, crumb) : header
      const shown = windowed ? withThumb(rows.slice(win.start, win.end), win.start, rows.length, columns) : rows.slice(win.start, win.end)
      return paneTree({ Box, Text, Button }, pane.tab, shown, tokens, select, undefined, currentLang(), shownHeader, footer, nav, extras)
    }
    // The Dashboard (018): numbers from $.state only, charts sized to the pane.
    const elements = $.ui.resolve(e)
    const now = await $.clock.now()
    const binding = decisionOf(usage, now).highest
    const activeFeature = state.features.find(f => f.dir === state.active?.dir)
    const ascii = iconsFor(iconsOption, e.surface) === 'ascii'
    // A Raster and an Svg take RGB: with the theme flavor, the Catppuccin flavor for light or dark (024).
    const rgb = isThemeKeys(tokens) ? (isLightTheme ? FLAVORS.latte : FLAVORS.mocha) : tokens
    const chart = stats === undefined ? undefined : usageChart(stats.series, { width: Math.min(columns, 72), height: 7, ...(binding?.resetsAt === undefined ? {} : { resetsAt: binding.resetsAt }), now, tokens: rgb })
    const bars = phaseBars(state.features, Math.min(columns, 60), rgb, activeFeature?.phase)
    const pictures = isImageTerminal && e.surface === 'terminal' && !ascii && stats !== undefined && chart !== undefined
    // The picture is redrawn only when the readings, the size, the reset or the minute change.
    const pictureKey = pictures ? `${stats.series.length}:${stats.series.at(-1)?.at}:${chart.columns}x${chart.rows}:${binding?.resetsAt}:${Math.floor(now / 60_000)}:${rgb.accent}` : ''
    if (pictures && pictureCache?.key !== pictureKey) {
      const made = chartImage(stats.series, { columns: chart.columns, rows: chart.rows, now, ...(binding?.resetsAt === undefined ? {} : { resetsAt: binding.resetsAt }), tokens: rgb })
      pictureCache = made === undefined ? undefined : { key: pictureKey, picture: made }
    }
    const picture = pictures ? pictureCache?.picture : undefined
    const dash = {
      dial: dial(activeFeature?.phase, rgb),
      dialFrames: dialFrames(activeFeature?.phase, rgb),
      ...(activeFeature === undefined ? {} : { currentStep: t(currentLang(), 'dash.currentStep', { step: activeFeature.phase }) }),
      ...(picture === undefined || chart === undefined ? {} : { chartImage: { ...picture, columns: chart.columns, rows: chart.rows, alt: t(currentLang(), 'dash.chartImage') } }),
      ...(bars === undefined ? {} : { bars }),
      ...(chart === undefined ? {} : { chart }),
      chartNote: t(currentLang(), stats === undefined || stats.series.length === 0 ? 'dash.noReading' : columns < 30 ? 'dash.narrow' : 'dash.chartNote'),
      ...(activeFeature === undefined || activeFeature.total === 0 ? {} : { progress: t(currentLang(), 'dash.progress', { id: activeFeature.id, name: activeFeature.name, done: activeFeature.done, total: activeFeature.total }) }),
      kpis: stats === undefined ? [] : [
        ...kpiRows(stats, binding, now, currentLang()),
        ...trendRows(stats.series, currentLang()),
        ...historyRows(stats, activeFeature, state.root === undefined ? [] : featureDurationsByRoot.get(state.root) ?? [], currentLang()),
      ],
      chips: kpiChips(stats, activeFeature, currentLang(), binding, now),
      columns,
    }
    const sections = dashboardSections(
      {
        Box: elements.Box,
        Text: elements.Text,
        ...('Raster' in elements ? { Raster: elements.Raster } : {}),
        ...('Svg' in elements ? { Svg: elements.Svg } : {}),
        ...('Image' in elements ? { Image: elements.Image } : {}),
        ...('Client' in elements ? { Client: elements.Client } : {}),
      },
      dash,
      tokens,
      ascii,
      currentLang(),
      paneLabelWidth(currentLang()),
    )
    // The Session tab (066 #21): the session rows (usage, the governor, the project, the
    // activity, the updates), then the Dashboard (dial, phases, chart, numbers). One list of
    // units that scroll together, so a chart is never cut in half (038).
    const heights = [...rows.map(() => 1), ...sections.map(section => section.rows)]
    const { win, pad, nav } = navFor(heights, bodyRows - 1 - footerReserve)
    const shownRows = rows.slice(win.start, Math.min(win.end, rows.length))
    const shownSections = sections.slice(Math.max(0, win.start - rows.length), Math.max(0, win.end - rows.length))
    const body = dashboardTree({ Box: elements.Box, Text: elements.Text }, shownSections)
    return paneTree({ Box, Text, Button }, pane.tab, shownRows, tokens, select, body, currentLang(), [], await footerFor(pad), nav, extras)
  })
}
