import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 053: the tabs follow what Claude does during a turn, not only when the turn ends.
// Each test gets its own copy of the tree: they write into it, and the fixture is shared.
let tree: Record<string, string> = {}
const setup = async ($: never, on: never) => {
  tree = { ...(halfDone.tree as Record<string, string>) }
  const session = installTree(on, tree, halfDone.cwd)
  installEngine(on)
  await startSession($, halfDone.cwd)
  return session
}

describe('live sync (053)', () => {
  test('a Write of .specify/feature.json switches the active feature at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.held()?.state.active?.id).toBe('002')
    tree['/proj/.specify/feature.json'] = '{ "feature_directory": "specs/001-core-state" }'
    await $.tool.call({ tool: 'Write', tool_use_id: 'w', file_path: '/proj/.specify/feature.json', content: tree['/proj/.specify/feature.json'] } as never)
    expect(session.held()?.state.active?.id).toBe('001')
  })
  test('a Bash command that makes a new spec shows it at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    tree['/proj/specs/004-new-thing/spec.md'] = '# Feature Specification: New thing\n'
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'bash .specify/scripts/bash/create-new-feature.sh "new thing"' } as never)
    expect(session.held()?.state.features.map(f => f.id)).toContain('004')
  })
})

describe('live sync costs nothing for a plain command (054 #5)', () => {
  test('ls reads nothing; git checkout reads again', async ($, on) => {
    const session = await setup($ as never, on as never)
    const before = session.counts.read + session.counts.list
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'ls -la' } as never)
    expect(session.counts.read + session.counts.list).toBe(before)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b2', command: 'git checkout 001-core-state' } as never)
    expect(session.counts.read + session.counts.list).toBeGreaterThan(before)
  })
})

describe('Claude spinning on a task (054 #85)', () => {
  test('three turns on the same task without a tick toast once', async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($ as never)
    await completeTurn($ as never)
    expect(session.toasts.some(t => t.includes('three turns'))).toBe(false)
    await completeTurn($ as never)
    await completeTurn($ as never)
    expect(session.toasts.filter(t => t.includes('three turns on T010'))).toHaveLength(1)
  })
})
