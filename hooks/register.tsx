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
import { themeOf } from './core/theme'
import { emptyMemo, type PaneState, type PaneTab, type Phase, type UpdateId, type UpdateItem, type UpdatesState } from './core/types'
import type { Preset } from './core/presets'
import type { Fs } from './io/fs-port'
import { applyFileTouch, applyShell, applySkill, type Held, reconcileStart, reconcileTurn } from './io/reconcile'
import { bandRow, updatesRow } from './surfaces/band'
import { paneTree } from './surfaces/pane'
import { statusText } from './surfaces/status'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const
const PANE_STATE = { plugin: 'astrolabe', key: 'pane' } as const
const PANE_ID = 'astrolabe'
const PANE_TITLE = '🧭 Astrolabe'
const DEFAULT_PANE: PaneState = { tab: 'specs', autoOpened: false }
const UPDATES = { plugin: 'astrolabe', key: 'updates' } as const
const UPDATES_STORE = 'updates'
const RELEASES_URL = 'https://api.github.com/repos/jonyfs/astrolabe/releases/latest'
const GSTACK_CHECK = ['sh', '-c', '"$HOME/.claude/skills/gstack/bin/gstack-update-check"']
const SKILLS_REFRESH = ['specify', 'init', '--here', '--integration', 'claude', '--force']

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
      const { value, version } = await $.state.get(SPECKIT)
      const next = await work(value)
      if (next === undefined) return undefined
      const { isSet } = await $.state.set(SPECKIT, next, { ifVersion: version })
      if (isSet) {
        $.ui.status(statusText(next.state))
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

const isPhaseRecord = (value: unknown): value is Record<string, Phase> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(v => typeof v === 'string')

/**
 * After a reconcile with `toasts: all`: compare phases with the stored baseline and toast
 * moves forward (005). Writes the store only when the baseline changed, and the memo only
 * on the first reconcile of a session or after a toast.
 */
async function afterReconcile($: EngineInterface, preset: Preset, held: Held | undefined): Promise<void> {
  const root = held?.state.root
  if (preset.toasts !== 'all' || held === undefined || root === undefined) return
  try {
    const key = `baseline:${root}`
    const stored = await $.store.get(key)
    const baseline = isPhaseRecord(stored) ? stored : {}
    const active = held.state.active
    const nextOf = active !== undefined && held.state.nextCommand !== undefined ? { [active.dir]: held.state.nextCommand } : {}
    const toasted = held.memo.toasted ?? []
    const out = phaseToasts(held.state.features, baseline, toasted, held.memo.baselined === true, nextOf)
    if (JSON.stringify(out.baseline) !== JSON.stringify(baseline)) await $.store.set(key, out.baseline)
    for (const toast of out.toasts) $.ui.toast(toast.text)
    if (held.memo.baselined !== true || out.toasted.length !== toasted.length) {
      await guarded($, async previous =>
        previous === undefined ? undefined : { ...previous, memo: { ...previous.memo, baselined: true, toasted: out.toasted } },
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

/** Spec 007: once per local day, ask each tool whether it has an update. Never throws. */
async function checkUpdates($: EngineInterface): Promise<void> {
  try {
    const today = localDay(await $.clock.now())
    const stored = await $.store.get(UPDATES_STORE)
    const known = isStoredUpdates(stored) ? stored : undefined
    if (known !== undefined) await setUpdates($, held => ({ ...held, items: known.items }))
    if (!isDue(known, today)) return
    await $.store.set(UPDATES_STORE, { checkedOn: today, items: known?.items ?? [] })
    const items: UpdateItem[] = []
    const gstack = await stdoutOf($, GSTACK_CHECK)
    const gstackItem = gstack === undefined ? undefined : parseGstackCheck(gstack)
    if (gstackItem !== undefined) items.push(gstackItem)
    const self = await stdoutOf($, ['specify', 'self', 'check'])
    const selfItem = self === undefined ? undefined : parseSelfCheck(self)
    if (selfItem !== undefined) items.push(selfItem)
    const root = (await $.state.get(SPECKIT)).value?.state.root
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
    await setUpdates($, held => ({ ...held, items }))
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
      const root = (await $.state.get(SPECKIT)).value?.state.root
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
    const segments = value === undefined ? [] : bandSegments(value.state, e.props.bodyColumns)
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
        {buttons.length > 0 && updatesRow({ Box, Text, Button }, buttons, tokens, press)}
        {await next(e)}
      </Box>
    )
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!preset.hint) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const ours = value === undefined ? undefined : hintTail(value.state, e.props.isDraft)
    if (ours === undefined) return next(e)
    const tail = e.props.tail === undefined ? ours : `${e.props.tail} · ${ours}`
    return next({ ...e, props: { ...e.props, tail } })
  })

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!preset.spinner || e.props.message !== null) return next(e)
    const { value } = await $.state.get(SPECKIT)
    if (value === undefined) return next(e)
    const suffix = spinnerSuffix(value.state, value.memo, await $.clock.now(), e.viewport?.columns)
    return suffix === undefined ? next(e) : next({ ...e, props: { ...e.props, suffix } })
  })

  on('command.run', { command: 'astrolabe' }, async $ => {
    await $.ui.open({ id: PANE_ID, title: PANE_TITLE })
    return { text: 'Astrolabe pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e) => {
    const { value } = await $.state.get(SPECKIT)
    const pane = (await $.state.get(PANE_STATE)).value ?? DEFAULT_PANE
    const state = value?.state ?? { present: false, constitution: 'missing' as const, features: [], isAnalyzed: false }
    const columns = e.props.bodyColumns
    const rows =
      pane.tab === 'tasks'
        ? taskRows(state, value?.memo ?? emptyMemo(), Math.max(3, (e.viewport?.rows ?? 24) - 4), columns)
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
