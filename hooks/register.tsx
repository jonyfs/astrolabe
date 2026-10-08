// Wires engine events to the io layer, the core and the status surface. No business logic.
// The engine follows $ only into functions declared in this file, so every $ call lives here.
import type { ConfigRow, EngineInterface, Hook, Register, RenderNode } from 'claude-code'

import { bandSegments, nextReason, stepCards, type BandDensity } from './core/band'
import { hintTail } from './core/hint'
import { phaseToasts } from './core/phase-toast'
import { filterFeatures, nextStatus, sessionRows, specsRows, taskRows, windowUnits } from './core/pane'
import { presetOf } from './core/presets'
import { spinnerSuffix } from './core/spinner'
import {
  astrolabeUpdate,
  firstLine,
  isDue,
  isStoredUpdates,
  localDay,
  parseCliVersion,
  parseGstackCheck,
  parseSelfCheck,
  skillsUpdate,
  updateLabel,
} from './core/updates'
import { fileUrl, joinPath } from './core/paths'
import { configMark, GSTACK_SKILLS, nextPriority, optionDefaults, parsePriority, REVIEW_MODEL, reviewPrompt, withPriority, type Priority } from './core/spec-actions'
import { CHANGES, VERSION } from './core/version'
import {
  ASK_MS,
  clockOf,
  decide,
  dropped,
  EXTEND_MS,
  HOLD_LIFT_MS,
  holdQuestion,
  nextHeld,
  isPaused,
  isReadOnlyTool,
  parseAllow,
  pauseQuestion,
  RAISE_MS,
  refusal,
  resumePrompt,
  runPrompt,
  usageRows,
  usageSegment,
  type Decision,
  type Question,
} from './core/governor'
import { CHIPS, FLAVORS, flavorOf, isThemeKeys, themeOf, type ThemeRole } from './core/theme'
import { capDiff, tasksDiff } from './core/summary'
import { styleSections } from './core/style'
import { parsePullList, pullAction, PR_LIST_FIELDS } from './core/pulls'
import { SKILL_MODELS, skillModelFor } from './core/skill-models'
import { featureDirFor, parseWorktrees, worktreeName } from './core/worktrees'
import { readFeature } from './io/snapshot'
import { deriveFeature } from './core/phase'
import { parseTasks } from './core/tasks-parser'
import { chartImage, dialFrames, imagesFor } from './core/pixels'
import { emptyMemo, type PaneState, type PaneTab, type UpdateId, type UpdateItem, type UpdatesState, type UsageState, type UsageReading, type QueuedAgent, type SessionStats, type GitState, type PullRequest, type SpeckitState } from './core/types'
import type { Preset } from './core/presets'
import type { Fs } from './io/fs-port'
import { findRoot } from './io/root'
import { applyFileTouch, applyRead, applyShell, applySkill, type Held, reconcileDeferred, reconcileNow, reconcileStart, reconcileTurn } from './io/reconcile'
import { bandRow, nextRow, updatesRow } from './surfaces/band'
import { askTree } from './surfaces/ask'
import { dashboardSections, dashboardTree } from './surfaces/dashboard'
import { burnRate, dial, kpiChips, kpiRows, phaseBars, sparkline, trendRows, usageChart } from './core/dashboard'
import { addDay, addWeek, dayKey, estimateLeft, pastReset, slowest, weekKey, weekdays, type Days, type Weeks } from './core/history'
import { footerChips, footerText, type FooterInput } from './core/footer'
import { parseGitStatus, parsePullRequest } from './core/git-status'
import { iconSet, iconsFor } from './core/icons'
import { guessLang, langOf, t, type Lang, type TextKey } from './core/i18n'
import { paneTree } from './surfaces/pane'
import { formatStatus } from './core/status-text'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const
// The session memo lives apart from what drawings read, so no redraw carries it (spec 009).
const MEMO = { plugin: 'astrolabe', key: 'memo' } as const
const PANE_STATE = { plugin: 'astrolabe', key: 'pane' } as const
const PANE_ID = 'astrolabe'
const PANE_TITLE = '🧭 Astrolabe'
const ASK_ID = 'astrolabe-usage'
/** `/astrolabe doctor` (048 #79): what Astrolabe needs, each line with the fix when it is missing. */
async function doctor($: EngineInterface): Promise<string> {
  const probe = (argv: string[]) =>
    $.process.run(argv, { timeoutMs: 3000 }).catch(() => ({ exitCode: 127, stdout: '', stderr: 'not found' }))
  const [git, gh, specify] = await Promise.all([probe(['git', '--version']), probe(['gh', '--version']), probe(['specify', 'version'])])
  const auth = gh.exitCode === 0 ? await probe(['gh', 'auth', 'status']) : undefined
  const state = (await $.state.get(SPECKIT)).value
  const lines = ['🧭 Astrolabe doctor']
  const check = (isOk: boolean, text: string, fix: string) => lines.push(isOk ? `  ✓ ${text}` : `  ✗ ${text}: ${fix}`)
  check(git.exitCode === 0, git.exitCode === 0 ? firstLine(git.stdout) : 'git not found', 'install git from https://git-scm.com')
  check(gh.exitCode === 0, gh.exitCode === 0 ? firstLine(gh.stdout) : 'gh not found', 'install the GitHub CLI from https://cli.github.com for the PRs tab and the pullRequest option')
  if (auth !== undefined) check(auth.exitCode === 0, auth.exitCode === 0 ? 'gh signed in' : 'gh not signed in', 'run gh auth login')
  check(specify.exitCode === 0, specify.exitCode === 0 ? `specify ${firstLine(specify.stdout)}` : 'specify not found', 'install Spec Kit: uv tool install specify-cli --from git+https://github.com/github/spec-kit.git')
  check(state?.present === true, state?.present === true ? `Spec Kit project at ${state.root ?? '?'}` : 'no Spec Kit project here', 'run specify init --here')
  const icons = iconsFor(iconsOption, 'terminal')
  lines.push(`  · icons: ${icons}${icons === 'nerd' ? ' (needs a Nerd Font in the terminal; set icons to emoji or ascii if glyphs show as boxes)' : ''}`)
  const set = Object.entries(optionsSeen).filter(([, v]) => v !== undefined)
  lines.push(`  · options: ${set.length === 0 ? 'all defaults' : set.map(([k, v]) => `${k}=${String(v)}`).join(', ')} (change them in /config or the Config tab)`)
  return lines.join('\n')
}

// /astrolabe help (025, roadmap #39): the commands, the pane's tabs and their keys, in the
// person's language (019).
const buildHelp = (lang: Lang): string =>
  [
    t(lang, 'help.title'),
    // What this version changed (048 #80).
    t(lang, 'help.changes', { version: VERSION, changes: CHANGES }),
    `  /astrolabe                  ${t(lang, 'help.open')}`,
    `  /astrolabe help             ${t(lang, 'help.help')}`,
    `  /astrolabe next             ${t(lang, 'help.next')}`,
    `  /astrolabe status           ${t(lang, 'help.status')}`,
    `  /astrolabe ask <question>   ${t(lang, 'help.ask')}`,
    `  /astrolabe root <folder>    ${t(lang, 'help.root')}`,
    `  /astrolabe allow <90-99> <30m-12h>   ${t(lang, 'help.allow')}`,
    `  /astrolabe revoke           ${t(lang, 'help.revoke')}`,
    `  /astrolabe run <id>         ${t(lang, 'help.run')}`,
    `  /astrolabe doctor           ${t(lang, 'help.doctor')}`,
    `  /astrolabe priority <id> <high|normal|low>   ${t(lang, 'help.priority')}`,
    `  /astrolabe review [id]      ${t(lang, 'help.review')}`,
    `  /astrolabe advisor [id]     ${t(lang, 'help.advisor')}`,
    `  /astrolabe config reset     ${t(lang, 'help.configReset')}`,
    // Each option with its value now (048 #75).
    `${t(lang, 'help.options')}: ${OPTION_NAMES.map(name => `${name}=${optionsSeen[name] === undefined ? 'default' : String(optionsSeen[name])}`).join(', ')}.`,
    t(lang, 'help.tabs'),
    `  1 ${t(lang, 'tab.specs').padEnd(10)} ${t(lang, 'help.specs')}`,
    `  2 ${t(lang, 'tab.tasks').padEnd(10)} ${t(lang, 'help.tasksTab')}`,
    `  3 ${t(lang, 'tab.session').padEnd(10)} ${t(lang, 'help.sessionTab')}`,
    `  4 ${t(lang, 'tab.dashboard').padEnd(10)} ${t(lang, 'help.dashboardTab')}`,
    `  5 ${t(lang, 'tab.help').padEnd(10)} ${t(lang, 'help.helpTab')}`,
    `  6 ${t(lang, 'tab.config').padEnd(10)} ${t(lang, 'help.configTab')}`,
    `  7 ${t(lang, 'tab.prs').padEnd(10)} ${t(lang, 'help.prsTab')}`,
    t(lang, 'help.keys'),
    t(lang, 'help.models'),
    ...Object.entries(SKILL_MODELS).map(([skill, m]) => `  ${skill.padEnd(22)} ${m.model.replace(/^claude-/, '').padEnd(12)} ${m.effort.padEnd(7)} ${m.why}`),
    t(lang, 'help.marks'),
    ...t(lang, 'help.marksList').split('\n').map(line => `  ${line}`),
    t(lang, 'help.glossary'),
    ...(['constitution', 'specify', 'clarify', 'plan', 'tasks', 'implement'] as const).map(step => `  ${step.padEnd(13)} ${t(lang, `card.${step}`)}`),
  ].join('\n')
const OPTION_NAMES = ['preset', 'flavor', 'icons', 'language', 'bandDensity', 'checkUpdates', 'governUsage', 'askOnLimit', 'pullRequest', 'images', 'autoReload', 'footerIn', 'accessible', 'claudeContext', 'featureSummary', 'humanize', 'terse', 'skillModels'] as const
const WELCOMED = 'welcomed'
const ABOUT: Readonly<Record<PaneTab, TextKey>> = {
  specs: 'help.specs',
  tasks: 'help.tasksTab',
  session: 'help.sessionTab',
  dashboard: 'help.dashboardTab',
  help: 'help.helpTab',
  config: 'help.configTab',
  prs: 'help.prsTab',
}
// The help text built once per language and option set, not on every render (054 #2).
let helpCache: { key: string; text: string } | undefined
const helpText = (lang: Lang): string => {
  const key = `${lang}|${JSON.stringify(optionsSeen)}`
  if (helpCache?.key !== key) helpCache = { key, text: buildHelp(lang) }
  return helpCache.text
}
const ASK = { plugin: 'astrolabe', key: 'ask' } as const
const DEFAULT_PANE: PaneState = { tab: 'specs', autoOpened: false }
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
const SERIES_POINTS = 60
const HISTORY = 'history'
const DAYS = 'days'
// The disk version the plugins were last reloaded for (034).
const RELOADED = 'reloaded'
const GIT_STATUS = ['git', 'status', '--porcelain=v2', '--branch', '--show-stash']
// The branch's pull request and its checks (023), opt-in, at most once per five minutes per branch.
const GH_PR = ['gh', 'pr', 'view', '--json', 'number,statusCheckRollup']
const PR_TTL_MS = 300_000

// The session's numbers between writes (018): a tool call costs no state write; they are
// written at the end of each main turn and at each measure. A reload loses one turn's counts.
const live = { toolCalls: 0, drifts: 0, agentsRun: 0, agentsQueued: 0, model: undefined as string | undefined, effort: undefined as string | undefined }
// The footer's room: the last width a drawing saw, less the "⚠ astrolabe: " the terminal adds.
let columnsSeen = 120
let surfaceSeen: string | null = 'terminal'
let iconsOption: unknown = 'auto'
// The person's language (019): the `language` option, or the guess from their prompts.
let languageOption: unknown = 'auto'
let guessedLang: Lang | undefined
const currentLang = (): Lang => langOf(languageOption, guessedLang)

const decisionOf = (usage: UsageState, now: number): Decision =>
  decide(usage.readings, usage.history, usage.override, now, usage.holdLift, usage.held)

/** The window an override is given for: the one binding now (016); none known, every window. */
const kindOf = (usage: UsageState, now: number): { kind?: string } => {
  const kind = decisionOf(usage, now).highest?.kind
  return kind === undefined ? {} : { kind }
}

/** The status entry: the footer of spec 018, the Spec Kit part first (008, 018). */
async function showStatus($: EngineInterface, state: Held['state']): Promise<void> {
  // With the footer in the pane (035), the status entry keeps only what is never dropped.
  $.ui.status(footerText({ ...(await footerInput($, state, Math.max(20, columnsSeen - 14))), lead: footerIn === 'pane' }))
}

/** What the footer shows, for the status entry and the pane alike (018, 035). */
async function footerInput($: EngineInterface, state: Held['state'], width: number): Promise<FooterInput> {
  const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
  const stats = (await $.state.get(SESSION)).value
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
      ...(stats === undefined ? {} : { startedAt: stats.startedAt }),
      ...((rate => (rate === undefined ? {} : { burn: rate }))(stats === undefined ? undefined : burnRate(stats.series))),
      ...(state.runningSkill === undefined
        ? {}
        : { skill: { name: state.runningSkill.name, ...((m => (m === undefined ? {} : { model: m }))(skillModels === 'auto' ? skillModelFor(state.runningSkill.name)?.model : undefined)) } }),
      now,
      icons: iconSet(iconsFor(iconsOption, surfaceSeen as never)),
      columns: width,
  }
}

// Where the footer goes (035): the pane (the status entry keeps the lead), the status entry, or both.
let footerIn: 'pane' | 'status' | 'both' = 'pane'
let noColor = false
// The options' defaults from plugin.json, read once at session start (052 #39).
let defaultsSeen: Record<string, string | number | boolean> = {}
let bandDensity: BandDensity = 'full'

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
      agentsRun: before.agentsRun + live.agentsRun,
      agentsQueued: before.agentsQueued + live.agentsQueued,
      ...(live.model === undefined ? {} : { model: live.model }),
      ...(live.effort === undefined ? {} : { effort: live.effort }),
    }
    const next = change(counted)
    if (value !== undefined && JSON.stringify(next) === JSON.stringify(value)) return
    if ((await $.state.set(SESSION, next, { ifVersion: version })).isSet) {
      live.toolCalls = 0
      live.drifts = 0
      live.agentsRun = 0
      live.agentsQueued = 0
      return
    }
  }
}

/** One `git status` at the end of a main turn (018 FR-003): no shell, 2 s at most. */
async function readGit($: EngineInterface, root: string | undefined, branch: string | undefined): Promise<SessionStats['git'] | undefined> {
  // A branch read from the repository files says there is a repository: no extra check.
  if (root === undefined || branch === undefined) return undefined
  try {
    const run = await $.process.run(GIT_STATUS, { cwd: root, timeoutMs: 2000 })
    return run.exitCode === 0 ? parseGitStatus(run.stdout) : undefined
  } catch {
    return undefined
  }
}

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
    if (pending.length > batch.length) $.clock.after(0, () => void loadDeferred($))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

// skillModels (030): off, or auto to send a skill's requests with the model and effort it does best with.
let skillModels: unknown = 'off'
// The skill the main thread last started this turn, cleared when the turn ends (030).
let skillRunning: string | undefined

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
    await flushStats($, s => ({ ...s, pulls: { at, rows } }))
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
      $.ui.toast(t(lang, checks === 'pending' ? 'prs.mergePending' : 'prs.mergeFailing', { n }))
      return
    }
    const root = (await $.state.get(SPECKIT)).value?.root ?? (await $.session.cwd())
    const run = await $.process.run(pullAction(action, n, head), { cwd: root, timeoutMs: 30_000 })
    $.ui.toast(run.exitCode === 0 ? t(lang, `prs.done.${action}`, { n }) : t(lang, 'prs.failed', { n, error: (run.stderr || run.stdout).trim().split('\n')[0] ?? '', fix: pullAction(action, n).join(' ') }))
    await refreshPulls($, true)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

/** The PRs tab's rows (032): a link per pull request, its state, and the buttons GitHub allows. */
function pullsBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
  stats: SessionStats | undefined,
): Array<{ node: RenderNode; rows: number }> {
  const elements = $.ui.resolve(e)
  const { Box, Text, Button } = elements
  const Link = 'Link' in elements ? elements.Link : undefined
  const lang = currentLang()
  const rows = stats?.pulls?.rows
  if (rows === undefined) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'prs.loading')}</Text> }]
  if (stats?.pulls?.error !== undefined && rows.length === 0) return [{ rows: 1, node: <Text color={tokens0.current}>{t(lang, 'prs.listFailed', { error: stats.pulls.error })}</Text> }]
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
  const mark = (c: string) => (c === 'pass' ? '✓' : c === 'fail' ? '✗' : c === 'pending' ? '…' : '·')
  const colour = (c: string) => (c === 'pass' ? tokens0.done : c === 'fail' ? tokens0.accent : c === 'pending' ? tokens0.current : tokens0.muted)
  return rows.flatMap(pr => {
    const title = `${mark(pr.checks)} #${pr.number} ${pr.isDraft ? `[${t(lang, 'prs.draft')}] ` : ''}${pr.title}`
    const facts = [t(lang, `prs.review.${pr.review}`), ...pr.labels.map(l => `#${l}`), pr.branch].filter(s => s !== '').join('  ')
    const buttons: RenderNode[] = []
    const add = (action: 'approve' | 'update' | 'merge') => {
      const key = `pr-${action}-${pr.number}`
      buttons.push(<Button key={key} label={pane.confirm === key ? t(lang, 'prs.confirmAction', { action: t(lang, `prs.${action}`).toLowerCase(), n: pr.number }) : t(lang, `prs.${action}`)} onPress={press(key, () => void runPullAction($, action, pr.number, pr.head))} />, <Text> </Text>)
    }
    if (pr.review !== 'approved' && !pr.isDraft) add('approve')
    if (pr.merge === 'BEHIND') add('update')
    if (pr.merge === 'CLEAN' && !pr.isDraft) add('merge')
    return [
      {
        rows: 1,
        node: Link !== undefined && pr.url !== '' ? <Link href={pr.url} label={title} /> : <Text color={colour(pr.checks)}>{title}</Text>,
      },
      {
        rows: 1,
        node: (
          <Box flexDirection="row">
            <Text color={tokens0.muted}>{`   ${facts}  `}</Text>
            {buttons}
          </Box>
        ),
      },
    ]
  })
}

// Astrolabe's own /config rows (028), read at session start and after a save.
let configRows: ConfigRow[] = []

/** The Config tab's rows (028): one per option, its control, and Save / Cancel. */
function configBody(
  $: Parameters<Hook<'ui.render'>>[0],
  e: Parameters<Hook<'ui.render'>>[1],
  pane: PaneState,
): Array<{ node: RenderNode; rows: number }> {
  const elements = $.ui.resolve(e)
  const { Box, Text, Button } = elements
  const Select = 'Select' in elements ? elements.Select : undefined
  const Input = 'Input' in elements ? elements.Input : undefined
  const lang = currentLang()
  const draft = pane.draft ?? {}
  const setDraft = async (key: string, value: string | number | boolean) => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    await $.state.set(PANE_STATE, { ...held, draft: { ...(held.draft ?? {}), [key]: value } })
  }
  const rows: Array<{ node: RenderNode; rows: number }> = []
  if (configRows.length === 0) return [{ rows: 1, node: <Text color={tokens0.muted}>{t(lang, 'config.none')}</Text> }]
  for (const row of configRows) {
    const shown = row.key in draft ? draft[row.key] : row.value
    const changed = row.key in draft && draft[row.key] !== row.value
    // ● a change not saved yet; • a saved value that differs from the option's default (052 #39).
    const label = `${configMark(changed, row.value, defaultsSeen, row.key)}${row.label}`.padEnd(30)
    const key = `config-${row.key}`
    let control: RenderNode
    if (row.isLocked) control = <Text color={tokens0.muted}>{`${String(shown)} (${t(lang, 'config.locked')})`}</Text>
    else if (row.kind === 'boolean') control = <Button key={key} label={shown === true ? '[x] on' : '[ ] off'} onPress={() => setDraft(row.key, shown !== true)} />
    else if (row.kind === 'choice' && row.options !== undefined && Select !== undefined)
      control = <Select key={key} options={row.options.map(value => ({ value }))} value={String(shown)} onSelect={(value: string) => setDraft(row.key, value)} />
    else if (row.kind === 'choice' && row.options !== undefined) {
      const options = row.options
      const next = options[(options.indexOf(String(shown)) + 1) % options.length] ?? String(shown)
      control = <Button key={key} label={`${String(shown)} ▸`} onPress={() => setDraft(row.key, next)} />
    } else if (Input !== undefined) {
      const save = (value: string) => setDraft(row.key, row.kind === 'number' ? Number(value) : value)
      control = <Input key={key} value={String(shown)} onInput={save} onSubmit={save} />
    } else control = <Text>{String(shown)}</Text>
    rows.push({
      rows: 1,
      node: (
        <Box flexDirection="row">
          <Text color={changed ? tokens0.current : tokens0.text}>{label}</Text>
          {control}
        </Box>
      ),
    })
  }
  const pending = Object.keys(draft).filter(k => draft[k] !== configRows.find(r => r.key === k)?.value)
  rows.push({
    rows: 1,
    node: (
      <Box flexDirection="row">
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
      </Box>
    ),
  })
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
  $.ui.toast(refused.length === 0 ? t(lang, 'config.applied', { n: saved }) : t(lang, 'config.refused', { list: refused.join('; ') }))
}

// The options as loaded, for drawings that need more than one (039).
let optionsSeen: Readonly<Record<string, unknown>> = {}

/** Whether a colour is light enough to carry dark text (039), by its relative luminance. */
const isLight = (hex: string): boolean => {
  const n = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.3
}

// How many units each pane tab drew last (038), to clamp a scroll that arrives between draws.
const unitsShown: Partial<Record<string, number>> = {}

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
    $.ui.toast(t(currentLang(), 'summary.ready', { feature: `${feature.id} ${feature.name}` }))
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
    for (const wt of list.slice(1, 9)) {
      const specRoot = `${norm(wt.path)}${rel}`
      if (norm(specRoot) === norm(root)) continue
      const dirs = (await fs.list(`${specRoot}/specs`).catch(() => [])).filter(d => d.kind === 'dir').map(d => d.name)
      const dir = featureDirFor(wt.branch, dirs)
      if (dir === undefined) continue
      const feature = deriveFeature(await readFeature(fs, specRoot, dir))
      found.push({ name: worktreeName(wt.path), ...(wt.branch === undefined ? {} : { branch: wt.branch }), dir, id: feature.id, featureName: feature.name, phase: feature.phase, done: feature.done, total: feature.total })
    }
    await flushStats($, ({ worktrees: _old, ...s }) => (found.length === 0 ? s : { ...s, worktrees: found }))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    worktreesRunning = false
  }
}

// Whether Claude is told of the Spec Kit work (026), and what it was last told.
let claudeContext = true
let lastTold: string | undefined

/** One line on the active feature for Claude (026 #50); undefined without one. */
const featureContext = (state: SpeckitState): string | undefined => {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  if (!state.present || feature === undefined) return undefined
  const parts = [
    `the active Spec Kit feature is ${feature.id} ${feature.name}, phase ${feature.phase}${feature.total === 0 ? '' : `, ${feature.done} of ${feature.total} tasks done`}`,
    ...(state.currentTask === undefined ? [] : [`the current task is ${state.currentTask.id === undefined ? '' : `${state.currentTask.id} `}${state.currentTask.text}`]),
    ...(state.nextCommand === undefined ? [] : [`the next command is ${state.nextCommand}`]),
    // What still blocks the feature (054 #84, #86): open questions, open checklist items, analyze not run.
    ...((feature.clarifications ?? 0) > 0 || feature.warnings.includes('clarification-after-plan') ? ['the spec still has [NEEDS CLARIFICATION] markers'] : []),
    ...((feature.checklist?.open ?? 0) > 0 ? [`${feature.checklist!.open} checklist items are open`] : []),
    ...(feature.phase === 'implement' && !state.isAnalyzed && feature.done === 0 ? ['/speckit-analyze has not run on these tasks'] : []),
  ]
  return `Astrolabe: ${parts.join('; ')}.`
}

/** The constitution's Core Principles, by heading, as a reminder (026 #51). */
async function constitutionReminder($: EngineInterface): Promise<string | undefined> {
  const root = (await $.state.get(SPECKIT)).value?.root
  if (root === undefined) return undefined
  const text = await fsOf($).read(`${root}/.specify/memory/constitution.md`).catch(() => undefined)
  const principles = text === undefined ? [] : principlesOf(text)
  return principles.length === 0 ? undefined : `Astrolabe: check this step against the constitution (.specify/memory/constitution.md): ${principles.join('; ')}.`
}

/** The `###` headings under `## Core Principles`, at most 22. */
const principlesOf = (text: string): string[] => {
  const lines = text.split(/\r?\n/)
  const start = lines.findIndex(l => /^##\s+Core Principles\s*$/i.test(l.trim()))
  if (start < 0) return []
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l.trim()))
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter(l => /^###\s/.test(l.trim()))
    .map(l => l.trim().replace(/^###\s+/, ''))
    .slice(0, 22)
}

/** `/astrolabe ask` (026 #54): one question over the session's own transcript, answered in a toast. */
/** Runs one of gstack's skills on a feature (051), from a timer: a command does not run inside a render. */
async function runSkill($: EngineInterface, skill: string, about: string): Promise<void> {
  await $.command.run({ command: skill, args: `Spec Kit feature ${about}` }).catch((error: unknown) => {
    $.ui.toast(t(currentLang(), 'gstack.failed', { skill }))
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
    await flushStats($, st => ({ ...st, lastReview: { id: feature.id, text: text.split('\n').slice(0, 12).join('\n'), at: Date.now() } }))
    $.ui.toast(t(currentLang(), 'review.ready', { feature: `${feature.id} ${feature.name}` }), { timeoutMs: 15_000 })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

async function askFork($: EngineInterface, question: string, about: string): Promise<void> {
  try {
    const reply = await $.model.fork({ prompt: `About the Spec Kit feature ${about}, answer in at most three sentences, plain text: ${question}` })
    const text = reply.isAnswered ? reply.text.trim() : t(currentLang(), 'ask.failed', { reason: reply.reason })
    $.ui.toast(`🧭 ${text.length > 280 ? `${text.slice(0, 279)}…` : text}`, { timeoutMs: 15_000 })
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
  // The title names the active feature (052 #4).
  const active = (await $.state.get(SPECKIT)).value?.active
  const title = active === undefined ? PANE_TITLE : `${PANE_TITLE} · ${active.id} ${active.name}`
  await $.ui.open({ id: PANE_ID, title, focus: true, closeOnEscape: true })
}

/** `/astrolabe status` (025 #42): the active feature, the next command and the footer, as text. */
/** The tasks an edit ticks: unticked in the old text, ticked in the new (025 #43). */
const tickedBy = (before: string, after: string): string[] => {
  const was = new Map(parseTasks(before).map(task => [task.id ?? task.text, task.isDone]))
  return parseTasks(after)
    .filter(task => task.isDone && was.get(task.id ?? task.text) === false)
    .map(task => `${task.id === undefined ? '' : `${task.id} `}${task.text}`)
}

const statusText = (state: SpeckitState, footer: string, lang: Lang): string => {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  const lines = [
    feature === undefined
      ? t(lang, 'status.noActive')
      : `◆ ${feature.id} ${feature.name}: ${feature.phase}${feature.total === 0 ? '' : `, ${feature.done}/${feature.total} tasks (${Math.floor((feature.done * 100) / feature.total)}%)`}`,
    ...(state.nextCommand === undefined ? [] : [`${t(lang, 'status.next')}: ${state.nextCommand}`]),
    footer,
  ]
  return lines.join('\n\n')
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
      $.ui.toast(t(lang, 'toast.onDisk', { version, running: VERSION }))
      return
    }
    $.ui.toast(t(lang, 'toast.reloading', { version, running: VERSION }))
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

/** Keeps the features whose id or name holds the filter (024 #49). */
const filtered = (state: SpeckitState, filter: string | undefined, status: PaneState['status'] = 'all'): SpeckitState =>
  (filter ?? '').trim() === '' && status === 'all' ? state : { ...state, features: filterFeatures(state.features, filter, state.active?.dir, status) }


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
): RenderNode[] {
  const elements = $.ui.resolve(e)
  const Input = 'Input' in elements ? elements.Input : undefined
  const Markdown = 'Markdown' in elements ? elements.Markdown : undefined
  const Code = 'Code' in elements ? elements.Code : undefined
  const active = state.active
  // One filter for Specs, Tasks and Help (043 #23).
  if (pane.tab === 'specs' || pane.tab === 'tasks' || pane.tab === 'help') {
    const out: RenderNode[] = []
    if (Input !== undefined) {
      // Each keystroke filters; Enter keeps the text the same way.
      const setFilter = async (value: string) => {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        await $.state.set(PANE_STATE, { ...held, filter: value })
      }
      out.push(
        <Input key="astrolabe-filter" placeholder={t(currentLang(), pane.tab === 'specs' ? 'pane.filter' : 'pane.filterRows')} value={pane.filter ?? ''} onInput={setFilter} onSubmit={setFilter} />,
      )
    }
    if (pane.tab === 'tasks' && Code !== undefined && stats?.tasksDiff !== undefined && stats.tasksDiff.dir === active?.dir) {
      out.push(<Code source={capDiff(stats.tasksDiff.text, currentLang())} format="diff" path={stats.tasksDiff.file} />)
    }
    // gstack's skills on the active feature, when gstack is installed (051).
    const Button = 'Button' in elements ? elements.Button : undefined
    // The active feature's actions (051, 055): the advisor's review, and gstack's skills when installed.
    if (pane.tab === 'specs' && active !== undefined && Button !== undefined) {
      const about = `${active.id} ${active.name}`
      const feature = state.features.find(f => f.dir === active.dir)
      out.push(
        <elements.Box key="astrolabe-gstack" flexDirection="row">
          {feature !== undefined && <Button key="advisor-review" label={t(currentLang(), 'advisor.button')} plain onPress={() => void $.clock.after(0, () => void $.prompt.submit({ text: advisorPrompt(feature) }).catch(() => undefined))} />}
          {stats?.gstack === true &&
            GSTACK_SKILLS.map(skill => <Button key={`gstack-${skill}`} label={skill} plain onPress={() => void $.clock.after(0, () => void runSkill($, skill, about))} />)}
        </elements.Box>,
      )
    }
    if (pane.tab === 'specs' && Markdown !== undefined && active !== undefined && state.activeSummary !== undefined && state.root !== undefined) {
      const links = (state.activeDocs ?? []).map(file => `[${file}](${fileUrl(`${state.root}/specs/${active.dir}/${file}`)})`).join(' · ')
      out.push(<Markdown key="astrolabe-summary" text={links === '' ? state.activeSummary : `${state.activeSummary}\n\n${links}`} />)
    }
    return out
  }
  return []
}

/** Notes the turn's change to the active tasks as diff hunks for the Tasks tab (024 #8). */
async function noteTasksDiff($: EngineInterface, state: SpeckitState | undefined): Promise<void> {
  const dir = state?.active?.dir
  const tasks = state?.activeTasks
  const before = turnTasks
  turnTasks = dir === undefined || tasks === undefined ? undefined : { dir, tasks }
  if (before === undefined || dir === undefined || tasks === undefined || before.dir !== dir) return
  const text = tasksDiff(before.tasks, tasks)
  if (text === undefined) return
  const file = state?.activeDocs?.includes('tasks.md') === true ? 'tasks.md' : 'spec.md'
  await flushStats($, s => ({ ...s, tasksDiff: { dir, file, text } }))
}

/** Asks `gh` for the branch's pull request when the cached answer is older than five minutes (023). */
async function refreshPr($: EngineInterface, root: string, branch: string): Promise<void> {
  if (prRunning) return
  prRunning = true
  try {
    const now = await $.clock.now()
    const cached = (await $.state.get(SESSION)).value?.prCache
    if (cached !== undefined && cached.branch === branch && now - cached.at < PR_TTL_MS) return
    // gh missing, signed out or no pull request: no part, no error; the next try is in five minutes.
    const run = await $.process.run(GH_PR, { cwd: root, timeoutMs: 5000 }).catch(() => undefined)
    const pr = run?.exitCode === 0 ? parsePullRequest(run.stdout) : undefined
    await flushStats($, s => {
      const git = s.git?.branch === branch ? withPr(s.git, pr) : s.git
      return { ...s, prCache: { branch, at: now, ...(pr === undefined ? {} : { pr }) }, ...(git === undefined ? {} : { git }) }
    })
    const speckit = (await $.state.get(SPECKIT)).value
    if (speckit !== undefined) await showStatus($, speckit)
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  } finally {
    prRunning = false
  }
}

const withPr = (git: GitState, pr: PullRequest | undefined): GitState => {
  const { pr: _old, ...rest } = git
  return pr === undefined ? rest : { ...rest, pr }
}

/** Notes the model and effort of each main-thread request (018), leaving the request untouched. */
async function* noteModel($: Parameters<Hook<'turn.step'>>[0], e: Parameters<Hook<'turn.step'>>[1], next: Parameters<Hook<'turn.step'>>[2]) {
  // skillModels auto (030): while a skill with an entry runs, its model and effort.
  const pick = skillModels === 'auto' && e.agentId === undefined ? skillModelFor(skillRunning) : undefined
  const step = pick === undefined ? e : { ...e, model: pick.model, effort: pick.effort }
  if (e.agentId === undefined) {
    live.model = step.model
    live.effort = step.effort === undefined ? undefined : String(step.effort)
  }
  const result = yield* next(step)
  // The advisor is a server tool the API runs inside the request (055): count each run.
  const advised = ((result as { serverToolUses?: ReadonlyArray<{ name: string }> } | undefined)?.serverToolUses ?? []).filter(use => use.name === 'advisor').length
  if (advised > 0 && e.agentId === undefined) {
    const at = await $.clock.now()
    await flushStats($, st => ({ ...st, advisor: { runs: (st.advisor?.runs ?? 0) + advised, at } }))
  }
  return result
}

/** The prompt that asks Claude to have the advisor review a spec (055); the advisor is Claude's own tool. */
const advisorPrompt = (feature: { id: string; name: string; dir: string }): string =>
  [
    `Review the Spec Kit feature ${feature.id} ${feature.name} with the advisor.`,
    `Read specs/${feature.dir}/spec.md, and plan.md and tasks.md if they exist, then call the advisor tool.`,
    'Report what it finds that is missing, ambiguous, inconsistent between the files, untestable or risky, most serious first.',
    'Do not edit any file; end by proposing the changes for me to approve.',
  ].join(' ')

/** Read-modify-write of astrolabe.usage with ifVersion, retried like `guarded`. */
async function updateUsage($: EngineInterface, change: (usage: UsageState) => UsageState): Promise<UsageState> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { value, version } = await $.state.get(USAGE)
    const next = change(value ?? DEFAULT_USAGE)
    if ((await $.state.set(USAGE, next, { ifVersion: version })).isSet) return next
  }
  return (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
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
  for (const text of toasts) $.ui.toast(text)
}

// The images option (024): auto, on or off.
let imagesOption: unknown
// Whether the footer asks gh for the branch's pull request (023), off by default.
let pullRequests = false
// When the last main turn ended; the prompt cache timer fires only if no turn came after it (022 #34).
let lastTurnAt = 0
const CACHE_WARN_MS = 270_000

// One resume timer at a time. A reload drops timers and this variable together, and the
// next reading or refusal arms a new one.
let resumeAt: number | undefined

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
  resumeAt = reset
  const wait = Math.max(0, reset - (await $.clock.now())) + 1000
  const why = `${decision.highest?.kind === 'seven_day' ? '7d' : '5h'} reset`
  $.clock.after(wait, () => {
    resumeAt = undefined
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
        ? ({ asked: _gone, ...u }) => ({ ...u, override: { target, until: now + (value === 'extend' ? EXTEND_MS : RAISE_MS), ...kindOf(u, now) } })
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
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const { value: memo, version } = await $.state.get(MEMO)
      const { value: state } = await $.state.get(SPECKIT)
      const previous = memo === undefined || state === undefined ? undefined : { state, memo }
      const next = await work(previous)
      if (next === undefined) return undefined
      // Nothing changed: no write, no redraw (spec 009, FR-003).
      if (previous !== undefined && next.memo === previous.memo && next.state === previous.state) return previous
      const written = await $.state.set(MEMO, next.memo, { ifVersion: version })
      if (written.isSet) {
        // Two writers can finish out of order: the state carries its memo version, and an
        // older one never replaces a newer one, so the drawing never lags the memo.
        const state = { ...next.state, memoVersion: written.version }
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

/** A shell command that can make a spec, move feature.json or switch the branch (054 #5). */
export const canTouchSpecs = (command: string): boolean =>
  /\b(git|mv|cp|rm|mkdir|touch|specify|tee|sed|python3?|node|bun|sh|bash|zsh)\b|\.specify|specs\/|>/.test(command)

/**
 * The Session tab in four blocks (052 #24, 054 #22): Project, Governor, Activity, Updates, each
 * under a heading and only when it has rows. Each state is read once (054 #1). The governor's
 * state row takes the band's colour (052 #25).
 */
async function sessionTabRows($: EngineInterface, state: SpeckitState): Promise<Array<{ key: string; text: string; role: ThemeRole; dim?: boolean; bold?: boolean }>> {
  const lang = currentLang()
  const now = await $.clock.now()
  const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
  const stats = (await $.state.get(SESSION)).value
  const updates = (await $.state.get(UPDATES)).value?.items ?? []
  const label = (text: string) => text.padEnd(14)
  const band = decisionOf(usage, now).band
  const bandRole: ThemeRole = band === 'ok' ? 'done' : band === 'stop' || band === 'ceiling' ? 'blocked' : 'current'
  const project = sessionRows(state, now, lang)
  const governor = [
    ...usageRows(usage, now).map(([name, text]) => ({ key: `usage-${name}`, text: `${label(name)}${text}`, role: (name === 'state' ? bandRole : 'text') as ThemeRole })),
    ...(usage.log ?? []).slice(-3).map((entry, i) => ({ key: `governor-log-${i}`, text: `${label(i === 0 ? t(lang, 'session.governor') : '')}${clockOf(new Date(entry.at).toISOString()) ?? ''} ${entry.text}`, role: 'muted' as ThemeRole })),
  ]
  const summary = stats?.lastSummary
  const review = stats?.lastReview
  const advisor = stats?.advisor
  const activity = [
    ...(summary === undefined ? [] : summary.text.split('\n').map((line, i) => ({ key: `summary-${i}`, text: `${label(i === 0 ? `${t(lang, 'session.summary')} ${summary.dir}` : '')}${line}`, role: 'muted' as ThemeRole }))),
    ...(advisor === undefined ? [] : [{ key: 'advisor', text: `${label(t(lang, 'session.advisor'))}${t(lang, 'advisor.runs', { n: advisor.runs, at: clockOf(new Date(advisor.at).toISOString()) ?? '' })}`, role: 'text' as ThemeRole }]),
    ...(review === undefined ? [] : review.text.split('\n').map((line, i) => ({ key: `review-${i}`, text: `${label(i === 0 ? `${t(lang, 'session.review')} ${review.id}` : '')}${line}`, role: 'text' as ThemeRole }))),
  ]
  const updateRows = updates.map(item => ({ key: `update-${item.id}`, text: `${label('update')}${updateLabel(item, false)} (installed ${item.installed})`, role: 'current' as ThemeRole }))
  // Without Spec Kit the project rows say so on their own; no headings then.
  if (!state.present) return [...project, ...governor, ...activity, ...updateRows]
  const block = (key: string, rows: Array<{ key: string; text: string; role: ThemeRole; dim?: boolean; bold?: boolean }>) =>
    rows.length === 0 ? [] : [{ key: `block-${key}`, text: t(lang, `session.block.${key}` as TextKey), role: 'accent' as ThemeRole, bold: true }, ...rows]
  return [...block('project', project), ...block('governor', governor), ...block('activity', activity), ...block('updates', updateRows)]
}

/** Feature id to the worktrees working on it (054 #49). */
const worktreesById = (list: SessionStats['worktrees']): Record<string, string[]> => {
  const out: Record<string, string[]> = {}
  for (const w of list ?? []) (out[w.id] ??= []).push(w.name)
  return out
}

/** A path under a `.specify/` folder: feature.json, the constitution, extensions.yml (053). */
const isUnderSpecify = (path: string): boolean => /(^|[\\/])\.specify[\\/]/.test(path)

/** Brings the Spec Kit state up to date mid-turn (053); writes only when something moved. */
async function syncNow($: EngineInterface): Promise<void> {
  const fs = fsOf($)
  const now = await $.clock.now()
  await guarded($, async previous => (previous === undefined ? undefined : reconcileNow(fs, previous, now)))
}

async function touchFile(
  $: EngineInterface,
  preset: Preset,
  path: string,
  isWrite: boolean,
  change?: { before: string; after: string },
): Promise<void> {
  const fs = fsOf($)
  const now = await $.clock.now()
  let drift: string | undefined
  const held = await guarded($, async previous => {
    if (previous === undefined) return undefined
    const touched = await applyFileTouch(fs, previous, path, isWrite, now, change, currentLang())
    drift = touched.drift
    return touched.held
  })
  if (held !== undefined && drift !== undefined && preset.toasts !== 'none') {
    live.drifts += 1
    $.ui.toast(drift)
  }
}

/**
 * After a reconcile with `toasts: all`: compare phases with this session's baseline and
 * toast moves forward (005). The baseline lives in the session memo (013), so two sessions
 * on one project never hide each other's toasts. Writes the memo only when it changed.
 */
async function afterReconcile($: EngineInterface, preset: Preset, held: Held | undefined): Promise<void> {
  if (preset.toasts !== 'all' || held === undefined || held.state.root === undefined) return
  try {
    const baseline = held.memo.baseline ?? {}
    const active = held.state.active
    const nextOf = active !== undefined && held.state.nextCommand !== undefined ? { [active.dir]: held.state.nextCommand } : {}
    const toasted = held.memo.toasted ?? []
    const out = phaseToasts(held.state.features, baseline, toasted, held.memo.baselined === true, nextOf, currentLang())
    for (const toast of out.toasts) $.ui.toast(toast.text)
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

async function copyNext($: EngineInterface, command: string, surface: string): Promise<void> {
  const copied = await $.ui.copy({ text: command, surface: surface as never }).catch(() => ({ isCopied: false }))
  if (copied.isCopied) $.ui.toast(t(currentLang(), 'next.copied', { cmd: command }))
}

// The last next command proposed in the prompt box (020a): each new one is proposed once.
let lastSuggested: string | undefined

async function suggestNext($: EngineInterface, held: Held | undefined): Promise<void> {
  const command = held?.state.nextCommand
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
      if (spinning && presetOf(optionsSeen).toasts !== 'none') $.ui.toast(t(currentLang(), 'toast.spin', { id: current }))
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
      await flushStats($, s => ({ ...s, ...(week === undefined ? {} : { week }), weekdays: weekdays(days, now) }))
    }
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

const minutes = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

/** The Dashboard's rows from 021: the slowest task, the estimate for the open tasks, this week. */
function historyRows(stats: SessionStats, feature: { dir: string; done: number; total: number } | undefined): Array<[string, string]> {
  const lang = currentLang()
  const rows: Array<[string, string]> = []
  const times = stats.taskTimes ?? []
  if (feature !== undefined) {
    const slow = slowest(times, feature.dir, 1)[0]
    if (slow !== undefined) rows.push([t(lang, 'kpi.slowest'), `${slow.id} · ${minutes(slow.ms)}`])
    const open = feature.total - feature.done
    const left = estimateLeft(times, feature.dir, open)
    if (left !== undefined) rows.push([t(lang, 'kpi.estimate'), t(lang, 'kpi.estimateValue', { time: minutes(left), n: open })])
  }
  if (stats.week !== undefined) rows.push([t(lang, 'kpi.week'), t(lang, 'kpi.weekValue', { tasks: stats.week.tasks, features: stats.week.features })])
  // Tasks per weekday this week (046 #54): one block a day, Monday first, scaled to the busiest.
  if (stats.weekdays !== undefined && stats.weekdays.some(n => n > 0)) {
    const top = Math.max(...stats.weekdays)
    rows.push([t(lang, 'kpi.weekdays'), `${sparkline(stats.weekdays.map(n => (n * 100) / top))}  M T W T F S S`])
  }
  return rows
}

/** A warning when the open tasks, at this feature's pace, run past the 5h reset (045 #50). */
async function pastResetRows($: EngineInterface, state: Held['state']): Promise<Array<{ key: string; text: string; role: 'current' }>> {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  const stats = (await $.state.get(SESSION)).value
  const window = ((await $.state.get(USAGE)).value ?? DEFAULT_USAGE).readings.find(r => r.kind === 'five_hour')
  if (feature === undefined || stats === undefined || window?.resetsAt === undefined) return []
  const left = pastReset(stats.taskTimes ?? [], feature.dir, feature.total - feature.done, window.resetsAt, await $.clock.now())
  if (left === undefined) return []
  return [{ key: 'past-reset', text: t(currentLang(), 'tasks.pastReset', { time: minutes(left), n: feature.total - feature.done, at: clockOf(window.resetsAt) ?? '' }), role: 'current' }]
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
      $.ui.toast(failure)
      await setUpdates($, h => ({ items: h.items }))
      return
    }
    await dropUpdate($, id)
    if (id === 'specify') $.ui.toast(`🧭 specify updated to ${item.latest}`)
    if (id === 'speckit-skills') $.ui.toast(`🧭 Spec Kit skills refreshed to ${item.latest}`)
    if (id === 'astrolabe') $.ui.toast(`🧭 Astrolabe updated to ${item.latest}; run /reload-plugins`)
  } catch (error) {
    logError($, error)
    await setUpdates($, h => ({ items: h.items })).catch(() => undefined)
  }
}

// Read by the gate, set from the plugin's options when it registers (spec 008, 015).
let governs = true
let asks = true

// Gates every tool call while usage is high. A failure here never refuses: it passes. A
// call whose answer does not settle it (another call's "run", a lift) goes through again.
type GateArgs = Parameters<Hook<'tool.call'>>

async function gate($: GateArgs[0], e: GateArgs[1], next: GateArgs[2]): Promise<Awaited<ReturnType<Hook<'tool.call'>>>> {
  live.toolCalls += 1
  if (e.tool === 'Agent' && !governs) live.agentsRun += 1
  if (!governs) return next(e)
  const { usage, decision } = await decisionNow($)
  if (decision.highest === undefined) return next(e)
  const resetClock = clockOf(decision.highest.resetsAt)
  // A running subagent is never stopped (SC-001) and never asks: only the main thread does.
  const isSubagentCall = (e as { agentId?: string }).agentId !== undefined
  // Counted before it runs; `isCounted` when the cap check already counted it.
  const runAgent = async (isCounted = false) => {
    live.agentsRun += 1
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
      const isAsked = asks && isInteractive && decision.band === 'hold' && !isSubagentCall
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
    const isAsked = asks && isInteractive && usage.asked?.kind !== 'pause'
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
  governs = options['governUsage'] !== false
  asks = governs && options['askOnLimit'] !== false
  pullRequests = options['pullRequest'] === true
  accessible = options['accessible'] === true
  claudeContext = options['claudeContext'] !== false
  skillModels = options['skillModels']
  featureSummary = options['featureSummary'] === true
  iconsOption = accessible ? 'ascii' : options['icons']
  footerIn = options['footerIn'] === 'status' || options['footerIn'] === 'both' ? options['footerIn'] : 'pane'
  bandDensity = options['bandDensity'] === 'compact' || options['bandDensity'] === 'minimal' ? options['bandDensity'] : 'full'
  autoReload = options['autoReload'] !== false
  imagesOption = options['images']
  languageOption = options['language']

  // The person's language (019): guessed from what they type, kept for the session.
  on('prompt.submit', async ($, e, next) => {
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
        const told = state === undefined ? undefined : featureContext(state)
        if (told !== undefined && told !== lastTold) {
          lastTold = told
          return next({ ...e, context: [...(e.context ?? []), told] })
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
    // A reload starts the module over: the guess made earlier in the session is in $.state.
    const kept = (await $.state.get(SESSION)).value?.language
    if (kept === 'en' || kept === 'pt-BR' || kept === 'es' || kept === 'fr') guessedLang = kept
    const result = await next(e)
    try {
      await $.command.register({ name: 'astrolabe', description: 'Open the Astrolabe pane: every Spec Kit feature, the open tasks and the session' })
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
    // The first session after install says where to start, once (048 #73).
    try {
      if ((await $.store.get(WELCOMED)) === undefined) {
        $.ui.toast(t(currentLang(), 'toast.welcome'))
        await $.store.set(WELCOMED, VERSION)
      }
    } catch {
      // A store that fails only skips the welcome.
    }
    defaultsSeen = await defaults($).catch(() => ({}))
    // NO_COLOR (041 #9): no chip backgrounds, the thin separator. Read once, here.
    noColor = ((await $.env.get('NO_COLOR').catch(() => undefined)) ?? '') !== ''
    const fs = fsOf($)
    const now = await $.clock.now()
    const started = await guarded($, previous => reconcileStart(fs, e.cwd, previous, now))
    await afterReconcile($, preset, started)
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
    // The tab this project had last (043 #22).
    try {
      const root = started?.state.root
      const saved = root === undefined ? undefined : await $.store.get(`tab:${root}`)
      if (typeof saved === 'string' && ['specs', 'tasks', 'session', 'dashboard', 'help', 'config', 'prs'].includes(saved)) {
        const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
        if (held.tab !== saved) await $.state.set(PANE_STATE, { ...held, tab: saved as PaneTab })
      }
    } catch {
      // No saved tab: Specs.
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
    // This week's counts from earlier sessions (021), copied into the state the Dashboard reads.
    const stored = await $.store.get(HISTORY).catch(() => undefined)
    const week = typeof stored === 'object' && stored !== null ? (stored as Weeks)[weekKey(now)] : undefined
    await flushStats($, s => (week === undefined ? s : { ...s, week }))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      skillRunning = undefined
      const fs = fsOf($)
      const cwd = await $.session.cwd()
      const now = await $.clock.now()
      let before: Held | undefined
      const held = await guarded($, previous => {
        before = previous
        return reconcileTurn(fs, cwd, previous, now)
      })
      await afterReconcile($, preset, held)
      await noteProgress($, before, held, now, e.durationMs)
      await noteTasksDiff($, held?.state)
      if (preset.band) await suggestNext($, held)
      // The footer's git part (018): counts from git, else the branch from the repository files.
      const root = held?.state.root
      const branch = held?.memo.base?.branch
      const counted = await readGit($, root, branch)
      const found = counted ?? (branch === undefined ? undefined : { branch, ahead: 0, behind: 0, changed: 0, conflicts: 0 })
      const worktree = held?.memo.base?.worktree
      const git = found === undefined || worktree === undefined ? found : { ...found, worktree }
      await flushStats($, ({ git: _old, ...s }) => {
        const cached = s.prCache !== undefined && s.prCache.branch === git?.branch ? s.prCache.pr : undefined
        return { ...s, turns: s.turns + 1, ...(git === undefined ? {} : { git: withPr(git, cached) }) }
      })
      if (root !== undefined && git?.branch !== undefined) {
        const repoRoot = root
        $.clock.after(0, () => void refreshWorktrees($, repoRoot))
      }
      if (pullRequests && root !== undefined && git?.branch !== undefined) {
        const prBranch = git.branch
        $.clock.after(0, () => void refreshPr($, root, prBranch))
      }
      if (held !== undefined) await showStatus($, held.state)
      if (preset.pane === 'auto' && isWide) await openUnasked($)
      $.clock.after(0, () => void checkDiskVersion($))
      if (((await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE).tab === 'prs') $.clock.after(0, () => void refreshPulls($))
      if (checksUpdates) $.clock.after(0, () => void checkUpdates($))
      const ended = now
      lastTurnAt = ended
      $.clock.after(CACHE_WARN_MS, () => {
        if (lastTurnAt === ended) $.ui.toast(t(currentLang(), 'toast.cache'))
      })
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    // A subagent's skill may outlive the main turn, so only main-thread calls set a marker.
    if (e.agentId === undefined) {
      skillRunning = e.skill
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
        ...(percent === undefined ? {} : { context: { percent } }),
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
    const result = await next(e)
    // The command may have made a spec or switched the branch: the tabs follow now (053),
    // only for a command that can do so, so a plain `ls` costs no reads (054 #5).
    if (canTouchSpecs(String((e as { command?: unknown }).command ?? ''))) await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    await guarded($, async previous => (previous === undefined ? undefined : applyShell(previous)))
    const result = await next(e)
    // A subagent may have written specs or tasks: the tabs follow when it returns (053).
    await syncNow($)
    return result
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
    await touchFile($, preset, e.file_path, true, { before: e.old_string, after: e.new_string })
    if (isUnderSpecify(e.file_path)) await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, preset, e.file_path, true)
    if (isUnderSpecify(e.file_path)) await syncNow($)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const result = await next(e)
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
    // The active feature's work in another worktree (042 #18).
    const elsewhere = sessionStats?.worktrees?.find(w => w.id === value?.active?.id)?.name
    const base = value === undefined ? [] : bandSegments(value, e.props.bodyColumns, { density: bandDensity, ...(elsewhere === undefined ? {} : { worktree: elsewhere }) })
    // The usage sparkline (022 #25): the last readings of the binding window, on a wide band only.
    const series = sessionStats?.series ?? []
    const segments =
      base.length > 0 && series.length >= 3 && e.props.bodyColumns >= 70
        ? [...base, { key: 'spark', text: sparkline(series.slice(-12).map(p => p.percent)), role: 'muted' as const }]
        : base
    const updates = (await $.state.get(UPDATES)).value ?? { items: [] }
    const command = value?.nextCommand
    if (segments.length === 0 && updates.items.length === 0 && command === undefined) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const buttons = updates.items.map(item => ({
      key: `update-${item.id}`,
      label: updates.running === item.id ? `${updateLabel(item, false)}…` : updateLabel(item, updates.confirming === item.id),
    }))
    const press = (key: string) => runUpdate($, key.replace(/^update-/, '') as UpdateId)
    return (
      <Box flexDirection="column">
        {segments.length > 0 && bandRow({ Box, Text }, segments, tokens, accessible ? [] : stepCards(value?.features ?? [], currentLang()), !accessible)}
        {command !== undefined &&
          nextRow(
            { Box, Text, Button },
            command,
            tokens,
            () => runNext($, command),
            surface => copyNext($, command, surface),
            e.props.bodyColumns,
            { next: t(currentLang(), 'status.next'), copy: t(currentLang(), 'next.copy'), pane: t(currentLang(), 'next.pane') },
            () => openPane($),
            accessible || value === undefined ? undefined : nextReason(value, currentLang()),
          )}
        {buttons.length > 0 && updatesRow({ Box, Text, Button }, buttons, tokens, press, e.props.bodyColumns, () => hideUpdates($), t(currentLang(), 'updates.hide'))}
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
    if (args === 'help') return { text: helpText(currentLang()) }
    if (args.startsWith('root ')) {
      // Another Spec Kit root under this folder (020c #21): read it as the session's root.
      const cwd = await $.session.cwd()
      const target = joinPath(cwd, args.slice(5).trim())
      const fs = fsOf($)
      const now = await $.clock.now()
      if ((await findRoot(fs, target)) === undefined) return { text: t(currentLang(), 'root.none', { path: target }) }
      const held = await guarded($, () => reconcileStart(fs, target, undefined, now))
      if (held?.state.root === undefined) return { text: t(currentLang(), 'root.none', { path: target }) }
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
    if (args === 'doctor') return { text: await doctor($) }
    if (args === 'advisor' || args.startsWith('advisor ')) {
      // A whole turn with the advisor: only the person starts it (055).
      if (e.origin?.kind !== 'composer') return { text: t(currentLang(), 'advisor.onlyYou') }
      const state = (await $.state.get(SPECKIT)).value
      const wanted = args.slice(7).trim()
      const feature = wanted === '' ? state?.features.find(f => f.dir === state.active?.dir) : state?.features.find(f => f.id === wanted.padStart(3, '0'))
      if (feature === undefined) return { text: t(currentLang(), 'advisor.usage') }
      $.clock.after(0, () => void $.prompt.submit({ text: advisorPrompt(feature) }).catch(() => undefined))
      return { text: t(currentLang(), 'advisor.started', { feature: `${feature.id} ${feature.name}` }) }
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
      return { text: statusText(state, footerText(await footerInput($, state, 200)), currentLang()) }
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
      const item = ((await $.state.get(USAGE)).value ?? DEFAULT_USAGE).queue.find(q => q.id === runMatch[1])
      if (item === undefined) return { text: `🧭 nothing queued as ${runMatch[1]}` }
      await updateUsage($, u => ({ ...u, queue: u.queue.filter(q => q.id !== item.id), passes: [...(u.passes ?? []), item.prompt].slice(-QUEUE_MAX) }))
      await logGovernor($, `→ run ${item.id} now`)
      $.clock.after(0, () => void $.prompt.submit({ text: runPrompt(item) }).catch(() => undefined))
      return { text: `🧭 running ${item.id} now: ${item.description}` }
    }
    if (args !== '') {
      const parsed = parseAllow(args)
      if (parsed === undefined) return { text: `Unknown: /astrolabe ${args}. Type /astrolabe help for the commands.` }
      // Only the person at the terminal may move the ceiling (spec 008, FR-006).
      if (e.origin?.kind !== 'composer') return { text: '🧭 only you can change the usage ceiling: type the command yourself' }
      const now = await $.clock.now()
      if ('revoke' in parsed) {
        await updateUsage($, ({ override: _gone, ...u }) => u)
        return { text: '🧭 usage override revoked: stop at 88%, ceiling at 90%' }
      }
      await updateUsage($, u => ({ ...u, override: { target: parsed.allow.target, until: now + parsed.allow.ms, ...kindOf(u, now) } }))
      const speckit = (await $.state.get(SPECKIT)).value
      if (speckit !== undefined) await showStatus($, speckit)
      return { text: `🧭 stop and ceiling raised to ${parsed.allow.target}% until ${clockOf(new Date(now + parsed.allow.ms).toISOString())}; new subagents still wait from 80%` }
    }
    await openPane($)
    return { text: 'Astrolabe pane opened.' }
  })

  // The wheel and the arrow keys scroll the pane's body, not the whole pane, so the footer stays (038).
  on('ui.scroll', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    const from = held.scroll?.tab === held.tab ? held.scroll.offset : 0
    const by = e.by === 0 ? 0 : Math.sign(e.by) * Math.max(1, Math.round(Math.abs(e.by)))
    const to = Math.max(0, Math.min(Math.max(0, (unitsShown[held.tab] ?? 1) - 1), from + by))
    if (to !== from) await $.state.set(PANE_STATE, { ...held, scroll: { tab: held.tab, offset: to } })
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { value } = await $.state.get(SPECKIT)
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    const state = value ?? { present: false, constitution: 'missing' as const, features: [], isAnalyzed: false }
    const columns = e.props.bodyColumns
    const needle = (pane.filter ?? '').trim().toLowerCase()
    const keep = <R extends { key: string; text: string }>(list: R[]): R[] =>
      needle === '' ? list : list.filter(r => r.key === 'count' || r.text.toLowerCase().includes(needle))
    const rows =
      pane.tab === 'help'
        ? keep(
            helpText(currentLang())
              .split('\n')
              .map((text, i) => ({ key: `help-${i}`, text, role: (i === 0 || !text.startsWith(' ') ? 'accent' : 'text') as 'accent' | 'text' })),
          )
        : pane.tab === 'tasks'
        ? [...keep(taskRows(state, emptyMemo(), 1000, columns, currentLang(), await $.clock.now())), ...(await pastResetRows($, state))]
        : pane.tab === 'session'
          ? await sessionTabRows($, state)
          : [
              ...((stats => specsRows(filtered(state, pane.filter, pane.status), columns, currentLang(), stats?.priorities ?? {}, worktreesById(stats?.worktrees), (pane.filter ?? '').trim() === '' && (pane.status ?? 'all') === 'all'))((await $.state.get(SESSION)).value)),
              // Features other worktrees of this repository work on (037).
              ...((await $.state.get(SESSION)).value?.worktrees ?? []).map(w => ({
                key: `worktree-${w.name}`,
                text: `⑂ ${w.name}  ${w.phase === 'done' ? '●' : '◐'} ${w.id} ${w.featureName}  ${w.phase}${w.total === 0 ? '' : ` ${w.done}/${w.total}`}`,
                role: 'current' as const,
              })),
            ]
    // A filter that keeps nothing says so (052 #7).
    const matchesNone =
      (needle !== '' || (pane.tab === 'specs' && (pane.status ?? 'all') !== 'all')) &&
      (pane.tab === 'specs' ? filtered(state, pane.filter, pane.status).features.length === 0 && state.features.length > 0 : (pane.tab === 'tasks' || pane.tab === 'help') && rows.every(r => r.key === 'count'))
    if (matchesNone && pane.tab === 'specs') rows.splice(0, rows.length, ...rows.filter(r => r.key !== 'empty'))
    if (matchesNone) rows.push({ key: 'no-match', text: t(currentLang(), 'pane.noMatch', { filter: pane.filter?.trim() ?? '' }), role: 'muted' } as never)
    const { Box, Text, Button } = $.ui.resolve(e)
    // Counts beside the tabs (043 #21) and the keys of the tab shown, one row above the footer (043 #25).
    const activeOpen = state.features.find(f => f.dir === state.active?.dir)
    const inProgress = state.features.filter(f => f.phase !== 'done' && f.phase !== 'abandoned').length
    const pullCount = (await $.state.get(SESSION)).value?.pulls?.rows.length
    const extras = {
      badges: {
        ...(inProgress === 0 ? {} : { specs: String(inProgress) }),
        ...(activeOpen === undefined || activeOpen.total - activeOpen.done <= 0 ? {} : { tasks: String(activeOpen.total - activeOpen.done) }),
        ...(pullCount === undefined || pullCount === 0 ? {} : { prs: String(pullCount) }),
      },
      // What the tab is for, then its keys (048 #72).
      onClose: () => $.ui.close({ id: PANE_ID }).then(() => undefined),
      columns,
      marks: accessible ? ('words' as const) : iconsFor(iconsOption, e.surface) === 'ascii' ? ('ascii' as const) : ('unicode' as const),
      // s cycles the Specs tab's status filter (054 #21).
      ...(pane.tab === 'specs'
        ? {
            status: { label: t(currentLang(), `pane.status.${pane.status ?? 'all'}` as TextKey), onPress: async () => {
              const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
              await $.state.set(PANE_STATE, { ...held, status: nextStatus(held.status) })
            } },
          }
        : {}),
      ...(pane.tab === 'specs' && state.active !== undefined
        ? {
            onPriority: async () => {
              const id = state.active!.id
              await setPriority($, id, nextPriority((await $.state.get(SESSION)).value?.priorities?.[id]))
            },
          }
        : {}),
      // file: links open only from the terminal; the desktop draws them as plain text, so none there.
      ...((el => ('Link' in el && e.surface === 'terminal' ? { Link: el.Link } : {}))($.ui.resolve(e))),
      onFind: pane.tab === 'specs' || pane.tab === 'tasks' || pane.tab === 'help' ? () => $.ui.focus({ requestId: PANE_ID, key: 'astrolabe-filter' }).then(() => undefined) : undefined,
      // What the tab is for, then its keys; a narrow pane keeps the keys whole (052 #3).
      legend: ((about: string, keys: string) => ([...`${about} · ${keys}`].length <= columns ? `${about} · ${keys}` : keys))(
        t(currentLang(), ABOUT[pane.tab]),
        t(currentLang(), pane.tab === 'specs' ? 'legend.specs' : pane.tab === 'tasks' || pane.tab === 'help' ? 'legend.filter' : pane.tab === 'config' ? 'legend.config' : 'legend.default'),
      ),
    }
    const select = async (tab: PaneTab) => {
      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
      await $.state.set(PANE_STATE, { ...held, tab })
      // The last tab, per project, for the next session (043 #22).
      if (state.root !== undefined) await $.store.set(`tab:${state.root}`, tab).catch(() => undefined)
      if (tab === 'prs') $.clock.after(0, () => void refreshPulls($))
    }
    // The footer under every tab (035), held at the bottom when the tab is shorter than the pane.
    const footerFor = async (pad: number) => {
      if (footerIn === 'status') return undefined
      const input = await footerInput($, state, Math.max(20, columns - 4))
      const set = iconsFor(iconsOption, e.surface)
      // statusline's colours (039); text only in the accessible mode and with ascii icons.
      const palette = CHIPS[flavorOf(optionsSeen, isLightTheme)]
      const chips =
        accessible || set === 'ascii' || noColor
          ? undefined
          : footerChips(input).map(chip => {
              const bg = palette[chip.colour] ?? palette['surface1']!
              return { key: chip.key, text: chip.text, bg, fg: isLight(bg) ? '#11111b' : '#eff1f5' }
            })
      return { text: footerText(input), columns, pad: Math.max(0, pad), ...(chips === undefined ? {} : { chips, arrow: set === 'nerd' ? '\ue0b0' : '' }) }
    }
    // The body scrolls inside the pane and the footer stays on the last rows (038).
    const bodyRows = e.props.scroll?.bodyRows ?? 24
    const offset = pane.scroll?.tab === pane.tab ? pane.scroll.offset : 0
    const scrollBy = async (by: number) => {
      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
      const from = held.scroll?.tab === held.tab ? held.scroll.offset : 0
      const to = Math.max(0, Math.min(Math.max(0, (unitsShown[held.tab] ?? 1) - 1), from + by))
      if (to !== from) await $.state.set(PANE_STATE, { ...held, scroll: { tab: held.tab, offset: to } })
    }
    const navFor = (heights: readonly number[], room: number) => {
      const win = windowUnits(heights, offset, room)
      unitsShown[pane.tab] = heights.length
      const step = Math.max(1, win.end - win.start - 1)
      const shownRows = heights.slice(win.start, win.end).reduce((a, b) => a + b, 0)
      const arrows = (win.start > 0 ? 1 : 0) + (win.end < heights.length ? 1 : 0)
      return {
        win,
        pad: room - shownRows - arrows,
        nav: { above: win.start, below: heights.length - win.end, up: () => scrollBy(-step), down: () => scrollBy(step), labels: { more: t(currentLang(), 'pane.scrollMore') } },
      }
    }
    if (pane.tab === 'prs') {
      const units = pullsBody($, e, pane, (await $.state.get(SESSION)).value)
      const { win, pad, nav } = navFor(units.map(u => u.rows), bodyRows - 1 - (footerIn === 'status' ? 1 : 3))
      const body = (
        <Box key="astrolabe-prs" flexDirection="column">
          {units.slice(win.start, win.end).map(u => u.node)}
        </Box>
      )
      return paneTree({ Box, Text, Button }, pane.tab, rows, tokens, select, body, currentLang(), [], await footerFor(pad), nav, extras)
    }
    if (pane.tab === 'config') {
      const units = configBody($, e, pane)
      const { win, pad, nav } = navFor(units.map(u => u.rows), bodyRows - 1 - (footerIn === 'status' ? 1 : 3))
      const body = (
        <Box key="astrolabe-config" flexDirection="column">
          {units.slice(win.start, win.end).map(u => u.node)}
        </Box>
      )
      return paneTree({ Box, Text, Button }, pane.tab, rows, tokens, select, body, currentLang(), [], await footerFor(pad), nav, extras)
    }
    if (pane.tab !== 'dashboard') {
      const stats = (await $.state.get(SESSION)).value
      const header = paneHeader($, e, pane, state, stats)
      // Rows the header takes: the filter, the summary's lines and links, the diff's lines.
      const headerRows =
        ('Input' in $.ui.resolve(e) && pane.tab !== 'session' ? 1 : 0) +
        (pane.tab === 'specs' && state.active !== undefined && 'Button' in $.ui.resolve(e) ? 1 : 0) +
        (pane.tab === 'specs'
          ? state.activeSummary === undefined ? 0 : state.activeSummary.split('\n').length + 2
          : pane.tab === 'tasks' && stats?.tasksDiff !== undefined && stats.tasksDiff.dir === state.active?.dir
            ? capDiff(stats.tasksDiff.text, currentLang()).split('\n').length
            : 0)
      const room = bodyRows - 1 - headerRows - (footerIn === 'status' ? 1 : 3)
      const { win, pad, nav } = navFor(rows.map(() => 1), room)
      const footer = await footerFor(pad)
      return paneTree({ Box, Text, Button }, pane.tab, rows.slice(win.start, win.end), tokens, select, undefined, currentLang(), header, footer, nav, extras)
    }
    // The Dashboard (018): numbers from $.state only, charts sized to the pane.
    const elements = $.ui.resolve(e)
    const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
    const stats = (await $.state.get(SESSION)).value
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
    const view = {
      dial: dial(activeFeature?.phase, rgb),
      dialFrames: dialFrames(activeFeature?.phase, rgb),
      ...(picture === undefined || chart === undefined ? {} : { chartImage: { ...picture, columns: chart.columns, rows: chart.rows, alt: t(currentLang(), 'dash.chartImage') } }),
      ...(bars === undefined ? {} : { bars }),
      ...(chart === undefined ? {} : { chart }),
      chartNote: t(currentLang(), stats === undefined || stats.series.length === 0 ? 'dash.noReading' : columns < 30 ? 'dash.narrow' : 'dash.chartNote'),
      ...(activeFeature === undefined || activeFeature.total === 0 ? {} : { progress: t(currentLang(), 'dash.progress', { id: activeFeature.id, name: activeFeature.name, done: activeFeature.done, total: activeFeature.total }) }),
      kpis: stats === undefined ? [] : [...kpiRows(stats, binding, now, currentLang()), ...trendRows(stats.series, currentLang()), ...historyRows(stats, activeFeature)],
      chips: kpiChips(stats, activeFeature, currentLang(), binding, now),
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
      view,
      tokens,
      ascii,
      currentLang(),
    )
    // The Dashboard scrolls by section, so a chart is never cut in half (038).
    const { win, pad, nav } = navFor(sections.map(section => section.rows), bodyRows - 1 - (footerIn === 'status' ? 1 : 3))
    const body = dashboardTree({ Box: elements.Box, Text: elements.Text }, sections.slice(win.start, win.end))
    return paneTree({ Box, Text, Button }, pane.tab, rows, tokens, select, body, currentLang(), [], await footerFor(pad), nav, extras)
  })
}
