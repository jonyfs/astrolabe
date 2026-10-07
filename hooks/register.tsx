// Wires engine events to the io layer, the core and the status surface. No business logic.
// The engine follows $ only into functions declared in this file, so every $ call lives here.
import type { EngineInterface, Register } from 'claude-code'

import { bandSegments } from './core/band'
import { hintTail } from './core/hint'
import { presetOf } from './core/presets'
import { spinnerSuffix } from './core/spinner'
import { themeOf } from './core/theme'
import type { Fs } from './io/fs-port'
import { applyFileTouch, applySkill, type Held, reconcileStart, reconcileTurn } from './io/reconcile'
import { bandRow } from './surfaces/band'
import { statusText } from './surfaces/status'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const

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
async function guarded($: EngineInterface, work: (previous: Held | undefined) => Promise<Held | undefined>): Promise<void> {
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const { value, version } = await $.state.get(SPECKIT)
      const next = await work(value)
      if (next === undefined) return
      const { isSet } = await $.state.set(SPECKIT, next, { ifVersion: version })
      if (isSet) {
        $.ui.status(statusText(next.state))
        return
      }
    }
    $.ui.log(`astrolabe: gave up after ${MAX_ATTEMPTS} conflicting updates`, { to: 'debug' })
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

async function touchFile($: EngineInterface, path: string, isWrite: boolean): Promise<void> {
  const fs = fsOf($)
  const now = await $.clock.now()
  await guarded($, async previous => (previous === undefined ? undefined : applyFileTouch(fs, previous, path, isWrite, now)))
}

export const register: Register = (on, options) => {
  const preset = presetOf(options)
  const tokens = themeOf(options)

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const fs = fsOf($)
    const now = await $.clock.now()
    await guarded($, previous => reconcileStart(fs, e.cwd, previous, now))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      const fs = fsOf($)
      const cwd = await $.session.cwd()
      const now = await $.clock.now()
      await guarded($, previous => reconcileTurn(fs, cwd, previous, now))
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

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.file_path, true)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.file_path, true)
    return result
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.notebook_path, false)
    return result
  }).catch(($, e, next) => next(e))

  // Drawing reads only $.state (Principle XII); a reconcile's write redraws these sites.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!preset.band || e.props.hasSurvey) return next(e)
    const { value } = await $.state.get(SPECKIT)
    const segments = value === undefined ? [] : bandSegments(value.state, e.props.bodyColumns)
    if (segments.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {bandRow({ Box, Text }, segments, tokens)}
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
}
