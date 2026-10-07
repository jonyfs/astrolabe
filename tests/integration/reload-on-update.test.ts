import { describe, expect, test } from 'claude-code/testing'

import { VERSION } from '../../hooks/core/version'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 034: a new version on disk reloads the plugins once.
const manifest = (version: string) => JSON.stringify({ name: 'astrolabe', version })

// The plugin's own folder is the engine's; the first turn's reads name the manifest it looks for.
const setup = async ($: never, on: never, version: string) => {
  const tree: Record<string, string> = { ...halfDone.tree }
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  await startSession($, '/proj')
  await completeTurn($)
  await session.clock.advance(1000)
  const path = session.counts.reads.find(r => r.endsWith('/.claude-plugin/plugin.json'))
  expect(path).toBeDefined()
  tree[path!] = manifest(version)
  return { session }
}

describe('reload when a new version lands on disk (034)', () => {
  test('the same version: nothing happens', async ($, on) => {
    const { session } = await setup($ as never, on as never, VERSION)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.prompts).not.toContain('/reload-plugins')
  })
  test('a new version: one toast, one reload, never twice for it', async ($, on) => {
    const { session } = await setup($ as never, on as never, '99.0.0')
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.toasts).toContain(`🧭 Astrolabe 99.0.0 is on disk (running ${VERSION}): reloading the plugins`)
    expect(session.prompts.filter(p => p === '/reload-plugins').length).toBe(1)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.prompts.filter(p => p === '/reload-plugins').length).toBe(1)
  })
  test('autoReload off: the toast says what to run', { options: { autoReload: false } }, async ($, on) => {
    const { session } = await setup($ as never, on as never, '99.0.0')
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.prompts).not.toContain('/reload-plugins')
    expect(session.toasts).toContain(`🧭 Astrolabe 99.0.0 is on disk (running ${VERSION}): run /reload-plugins to load it`)
  })
})
