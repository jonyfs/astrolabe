import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 053: the tabs follow what Claude does during a turn, not only when the turn ends.
const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, halfDone.cwd)
  installEngine(on)
  await startSession($, halfDone.cwd)
  return session
}

describe('live sync (053)', () => {
  test('a Write of .specify/feature.json switches the active feature at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.held()?.state.active?.id).toBe('002')
    const tree = halfDone.tree as Record<string, string>
    tree['/proj/.specify/feature.json'] = '{ "feature_directory": "specs/001-core-state" }'
    await $.tool.call({ tool: 'Write', tool_use_id: 'w', file_path: '/proj/.specify/feature.json', content: tree['/proj/.specify/feature.json'] } as never)
    expect(session.held()?.state.active?.id).toBe('001')
  })
  test('a Bash command that makes a new spec shows it at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    const tree = halfDone.tree as Record<string, string>
    tree['/proj/specs/004-new-thing/spec.md'] = '# Feature Specification: New thing\n'
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'bash .specify/scripts/bash/create-new-feature.sh "new thing"' } as never)
    expect(session.held()?.state.features.map(f => f.id)).toContain('004')
  })
})
