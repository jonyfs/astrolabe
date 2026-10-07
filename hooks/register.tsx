// Wires engine events to the io layer, the core and the status surface. No business logic.
// The engine follows $ only into functions declared in this file, so every $ call lives here.
import type { EngineInterface, Register } from 'claude-code'

import { bandSegments } from './core/band'
import { hintTail } from './core/hint'
import { phaseToasts } from './core/phase-toast'
import { sessionRows, specsRows, taskRows } from './core/pane'
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
import { VERSION } from './core/version'
import { clockOf, decide, isPaused, isReadOnlyTool, parseAllow, refusal, resumePrompt, usageSegment, type Decision } from './core/governor'
import { themeOf } from './core/theme'
import { emptyMemo, type PaneState, type PaneTab, type UpdateId, type UpdateItem, type UpdatesState, type UsageState, type UsageReading } from './core/types'
import type { Preset } from './core/presets'
import type { Fs } from './io/fs-port'
import { applyFileTouch, applyShell, applySkill, type Held, reconcileStart, reconcileTurn } from './io/reconcile'
import { bandRow, updatesRow } from './surfaces/band'
import { paneTree } from './surfaces/pane'
import { statusText } from './surfaces/status'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const
// The session memo lives apart from what drawings read, so no redraw carries it (spec 009).
const MEMO = { plugin: 'astrolabe', key: 'memo' } as const
const PANE_STATE = { plugin: 'astrolabe', key: 'pane' } as const
const PANE_ID = 'astrolabe'
const PANE_TITLE = '🧭 Astrolabe'
const DEFAULT_PANE: PaneState = { tab: 'specs', autoOpened: false }
const UPDATES = { plugin: 'astrolabe', key: 'updates' } as const
const UPDATES_STORE = 'updates'
const RELEASES_URL = 'https://api.github.com/repos/jonyfs/astrolabe/releases/latest'
const UPDATES_HIDDEN = 'updates:hidden'
const SKILLS_REFRESH = ['specify', 'init', '--here', '--integration', 'claude', '--force']
const USAGE = { plugin: 'astrolabe', key: 'usage' } as const
const DEFAULT_USAGE: UsageState = { readings: [], history: [], inFlight: 0, queue: [], paused: false }
const HISTORY_POINTS = 10

/** The status entry: the Spec Kit part, then the highest usage window (spec 008). */
async function showStatus($: EngineInterface, state: Held['state']): Promise<void> {
  const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
  const segment = usageSegment(decide(usage.readings, usage.history, usage.override, await $.clock.now()))
  const speckit = statusText(state)
  $.ui.status(segment === undefined ? speckit : `${speckit} · ${segment}`)
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

async function decisionNow($: EngineInterface): Promise<{ usage: UsageState; decision: Decision }> {
  const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
  return { usage, decision: decide(usage.readings, usage.history, usage.override, await $.clock.now()) }
}

/** Submits one resume prompt for what the pause or the hold left waiting, then clears it. */
async function resume($: EngineInterface, why: string): Promise<void> {
  try {
    const usage = (await $.state.get(USAGE)).value ?? DEFAULT_USAGE
    if (usage.queue.length === 0 && !usage.paused) return
    await updateUsage($, u => ({ ...u, queue: [], paused: false }))
    await $.prompt.submit({ text: resumePrompt(usage.queue, why) })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

// One resume timer at a time. A reload drops timers and this variable together, and the
// next reading or refusal arms a new one.
let resumeAt: number | undefined

async function armResume($: EngineInterface, decision: Decision): Promise<void> {
  const reset = decision.highest?.resetsAt === undefined ? Number.NaN : Date.parse(decision.highest.resetsAt)
  if (Number.isNaN(reset) || resumeAt === reset) return
  resumeAt = reset
  const wait = Math.max(0, reset - (await $.clock.now())) + 1000
  const why = `${decision.highest?.kind === 'seven_day' ? '7d' : '5h'} reset`
  $.clock.after(wait, () => {
    resumeAt = undefined
    void resume($, why)
  })
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
    const touched = await applyFileTouch(fs, previous, path, isWrite, now, change)
    drift = touched.drift
    return touched.held
  })
  if (held !== undefined && drift !== undefined && preset.toasts !== 'none') $.ui.toast(drift)
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
    const out = phaseToasts(held.state.features, baseline, toasted, held.memo.baselined === true, nextOf)
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
        failure = '🧭 could not start /gstack-upgrade'
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
              : `🧭 Spec Kit skills refresh failed: ${line}`
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

export const register: Register = (on, options) => {
  const preset = presetOf(options)
  const tokens = themeOf(options)
  // Whether the last band draw saw a fullscreen terminal of 144 columns or more. The pane
  // never opens unasked below that (Principle VII); session.start reports no width.
  let isWide = false
  const checksUpdates = options['checkUpdates'] !== false
  const governs = options['governUsage'] !== false

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    try {
      await $.command.register({ name: 'astrolabe', description: 'Open the Astrolabe pane: every Spec Kit feature, the open tasks and the session' })
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
    const fs = fsOf($)
    const now = await $.clock.now()
    await afterReconcile($, preset, await guarded($, previous => reconcileStart(fs, e.cwd, previous, now)))
    // Started on a timer so the session never waits for a process or the network.
    if (checksUpdates) $.clock.after(0, () => void checkUpdates($))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      const fs = fsOf($)
      const cwd = await $.session.cwd()
      const now = await $.clock.now()
      await afterReconcile($, preset, await guarded($, previous => reconcileTurn(fs, cwd, previous, now)))
      if (preset.pane === 'auto' && isWide) await openUnasked($)
      if (checksUpdates) $.clock.after(0, () => void checkUpdates($))
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    // A subagent's skill may outlive the main turn, so only main-thread calls set a marker.
    if (e.agentId === undefined) {
      const now = await $.clock.now()
      await guarded($, async previous => (previous === undefined ? undefined : applySkill(previous, e.skill, now)))
    }
    return next(e)
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
      const usage = await updateUsage($, u => ({
        ...u,
        readings,
        history: readings.length === 0 ? u.history : [...u.history, { at: now, percent: top }].slice(-HISTORY_POINTS),
      }))
      const decision = decide(usage.readings, usage.history, usage.override, now)
      const speckit = (await $.state.get(SPECKIT)).value
      if (speckit !== undefined) await showStatus($, speckit)
      if (!governs) return result
      const isClear = decision.band === 'ok' || decision.band === 'throttle'
      if (isClear && (usage.queue.length > 0 || usage.paused)) await resume($, `${usageSegment(decision) ?? 'window'} now`)
      else if (!isClear && usage.queue.length > 0) await armResume($, decision)
    } catch (error) {
      $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
    }
    return result
  })

  // Gates every tool call while usage is high. A failure here never refuses: it passes.
  on('tool.call', async ($, e, next) => {
    if (!governs) return next(e)
    const { usage, decision } = await decisionNow($)
    if (decision.highest === undefined) return next(e)
    const resetClock = clockOf(decision.highest.resetsAt)
    if (e.tool === 'Agent') {
      const isOverCap = decision.band === 'throttle' && usage.inFlight >= decision.cap
      if (decision.cap === 0 || isOverCap) {
        const input = e as unknown as { description?: string; prompt?: string; subagent_type?: string }
        let queuedAs = ''
        await updateUsage($, u => {
          queuedAs = `q${u.queue.length + 1}`
          return {
            ...u,
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
        return { deny: refusal(decision, { queuedAs, inFlight: usage.inFlight, ...(resetClock === undefined ? {} : { resetClock }) }) }
      }
      await updateUsage($, u => ({ ...u, inFlight: u.inFlight + 1 }))
      try {
        return await next(e)
      } finally {
        await updateUsage($, u => ({ ...u, inFlight: Math.max(0, u.inFlight - 1) }))
      }
    }
    // A running subagent is never stopped (SC-001): only the main thread pauses. Its own
    // requests for more subagents are still gated above.
    const isSubagentCall = (e as { agentId?: string }).agentId !== undefined
    if (isPaused(decision) && !isSubagentCall && !isReadOnlyTool(String(e.tool))) {
      await updateUsage($, u => (u.paused ? u : { ...u, paused: true }))
      await armResume($, decision)
      return { deny: refusal(decision, resetClock === undefined ? {} : { resetClock }) }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // Bash and Agent change files the mod cannot see, so drift stays quiet for this window.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    await guarded($, async previous => (previous === undefined ? undefined : applyShell(previous)))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    await guarded($, async previous => (previous === undefined ? undefined : applyShell(previous)))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const result = await next(e)
    // The Edit's own strings say what it ticked, so a box ticked elsewhere is not blamed on it.
    await touchFile($, preset, e.file_path, true, { before: e.old_string, after: e.new_string })
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, preset, e.file_path, true)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, preset, e.notebook_path, false)
    return result
  }).catch(($, e, next) => next(e))

  // Drawing reads only $.state (Principle XII); a reconcile's write redraws these sites.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isWide = e.viewport?.isFullscreen === true && e.viewport.columns >= 144
    if (!preset.band || e.props.hasSurvey) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const segments = value === undefined ? [] : bandSegments(value, e.props.bodyColumns)
    const updates = (await $.state.get(UPDATES)).value ?? { items: [] }
    if (segments.length === 0 && updates.items.length === 0) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const buttons = updates.items.map(item => ({
      key: `update-${item.id}`,
      label: updates.running === item.id ? `${updateLabel(item, false)}…` : updateLabel(item, updates.confirming === item.id),
    }))
    const press = (key: string) => runUpdate($, key.replace(/^update-/, '') as UpdateId)
    return (
      <Box flexDirection="column">
        {segments.length > 0 && bandRow({ Box, Text }, segments, tokens)}
        {buttons.length > 0 && updatesRow({ Box, Text, Button }, buttons, tokens, press, e.props.bodyColumns, () => hideUpdates($))}
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

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!preset.spinner || e.props.message !== null) return next(e)
    const { value } = await $.state.get(SPECKIT)
    if (value === undefined) return next(e)
    const suffix = spinnerSuffix(value, emptyMemo(), await $.clock.now(), e.viewport?.columns)
    return suffix === undefined ? next(e) : next({ ...e, props: { ...e.props, suffix } })
  })

  on('command.run', { command: 'astrolabe' }, async ($, e) => {
    const args = e.args.trim()
    if (args !== '') {
      const parsed = parseAllow(args)
      if (parsed === undefined) return { text: 'Usage: /astrolabe, /astrolabe allow <90-99> <30m-12h>, /astrolabe revoke' }
      // Only the person at the terminal may move the ceiling (spec 008, FR-006).
      if (e.origin?.kind !== 'composer') return { text: '🧭 only you can change the usage ceiling: type the command yourself' }
      const now = await $.clock.now()
      if ('revoke' in parsed) {
        await updateUsage($, ({ override: _gone, ...u }) => u)
        return { text: '🧭 usage override revoked: stop at 88%, ceiling at 90%' }
      }
      await updateUsage($, u => ({ ...u, override: { target: parsed.allow.target, until: now + parsed.allow.ms } }))
      const speckit = (await $.state.get(SPECKIT)).value
      if (speckit !== undefined) await showStatus($, speckit)
      return { text: `🧭 stop and ceiling raised to ${parsed.allow.target}% until ${clockOf(new Date(now + parsed.allow.ms).toISOString())}; new subagents still wait from 80%` }
    }
    // Opened on request: it takes the keys (1, 2, 3 at once) and Esc closes it. An unasked
    // open never takes focus (Principle VII).
    await $.ui.open({ id: PANE_ID, title: PANE_TITLE, focus: true, closeOnEscape: true })
    return { text: 'Astrolabe pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { value } = await $.state.get(SPECKIT)
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    const state = value ?? { present: false, constitution: 'missing' as const, features: [], isAnalyzed: false }
    const columns = e.props.bodyColumns
    const rows =
      pane.tab === 'tasks'
        ? taskRows(state, emptyMemo(), Math.max(3, (e.viewport?.rows ?? 24) - 4), columns)
        : pane.tab === 'session'
          ? [
              ...sessionRows(state, await $.clock.now()),
              ...((await $.state.get(UPDATES)).value?.items ?? []).map(item => ({
                key: `update-${item.id}`,
                text: `${'update'.padEnd(14)}${updateLabel(item, false)} (installed ${item.installed})`,
                role: 'current' as const,
              })),
            ]
          : specsRows(state, columns)
    const { Box, Text, Button } = $.ui.resolve(e)
    const select = async (tab: PaneTab) => {
      const held = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
      await $.state.set(PANE_STATE, { ...held, tab })
    }
    return paneTree({ Box, Text, Button }, pane.tab, rows, tokens, select)
  })
}
