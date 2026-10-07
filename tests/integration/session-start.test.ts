import { describe, expect, test } from 'claude-code/testing'

import { scenario as dangling } from '../fixtures/feature-json-dangling'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

describe('session.start draws the status entry from disk', () => {
  test('half-done project', async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    await startSession($, halfDone.cwd)
    expect(session.logs).toEqual([])
    expect(session.last()).toBe('◆ 002 · implement 45%')
  })
  test('no Spec Kit anywhere up the tree', async ($, on) => {
    const session = installTree(on, noSpeckit.tree, noSpeckit.cwd)
    installEngine(on)
    await startSession($, noSpeckit.cwd)
    expect(session.last()).toBe('◆ no Spec Kit')
  })
  test('the derived state is published in $.state for later surfaces', async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd)
    installEngine(on)
    await startSession($, halfDone.cwd)
    const value = session.held()
    expect(value?.state.active?.dir).toBe('002-band-hint')
    expect(value?.state.nextCommand).toBe('/speckit-implement')
  })
  test('a project whose every read fails still shows an entry', async ($, on) => {
    const tree = { ...halfDone.tree }
    for (const key of Object.keys(tree)) if (!key.endsWith('/')) delete tree[key]
    const session = installTree(on, tree, halfDone.cwd)
    installEngine(on)
    await startSession($, halfDone.cwd)
    expect(session.last()).toBe('◆ 002 · specify')
  })
  test('a dangling feature.json marks the guessed feature with ~', async ($, on) => {
    const session = installTree(on, dangling.tree, dangling.cwd)
    installEngine(on)
    await startSession($, dangling.cwd)
    expect(session.last()).toBe('◆ ~003 · implement 25%')
  })
})
