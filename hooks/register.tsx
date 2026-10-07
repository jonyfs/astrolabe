// Wires engine events to the io layer, the core and the status surface. No business logic.
// The engine follows $ only into functions declared in this file, so every $ call lives here.
import type { EngineInterface, Register } from 'claude-code'

import type { Fs } from './io/fs-port'
import { applyFileTouch, applySkill, type Held, reconcileStart, reconcileTurn } from './io/reconcile'
import { statusText } from './surfaces/status'

const SPECKIT = { plugin: 'astrolabe', key: 'speckit' } as const

function fsOf($: EngineInterface): Fs {
  return {
    read: path => $.fs.read(path) as Promise<string>,
    list: path => $.fs.list(path),
    exists: path => $.fs.exists(path),
  }
}

async function held($: EngineInterface): Promise<Held | undefined> {
  return (await $.state.get(SPECKIT)).value
}

/** Runs one update; a failure is logged to the debug log and never breaks the session. */
async function guarded($: EngineInterface, work: () => Promise<Held | undefined>): Promise<void> {
  try {
    const next = await work()
    if (next === undefined) return
    await $.state.set(SPECKIT, next)
    $.ui.status(statusText(next.state))
  } catch (error) {
    $.ui.log(`astrolabe: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' })
  }
}

async function touchFile($: EngineInterface, path: string, isWrite: boolean): Promise<void> {
  await guarded($, async () => {
    const previous = await held($)
    return previous === undefined ? undefined : applyFileTouch(fsOf($), previous, path, isWrite, await $.clock.now())
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await guarded($, async () => reconcileStart(fsOf($), e.cwd, await held($), await $.clock.now()))
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      await guarded($, async () => reconcileTurn(fsOf($), await $.session.cwd(), await held($), await $.clock.now()))
    }
    return result
  })

  on('tool.call', { tool: 'Skill' }, async ($, e, next) => {
    await guarded($, async () => {
      const previous = await held($)
      return previous === undefined ? undefined : applySkill(previous, e.skill, await $.clock.now())
    })
    return next(e)
  })

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.file_path, true)
    return result
  })

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.file_path, true)
    return result
  })

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const result = await next(e)
    await touchFile($, e.notebook_path, false)
    return result
  })
}
