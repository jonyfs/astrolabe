import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

describe('Spec Kit appearing or disappearing mid-session', () => {
  test('a project that gains .specify/ shows it after the next turn', async ($, on) => {
    const tree: Record<string, string> = { '/proj/README.md': '# x\n' }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.last()).toBe('◆ no Spec Kit')
    Object.assign(tree, project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } }))
    await completeTurn($)
    expect(session.last()).toBe('◆ 001 · plan')
  })

  test('a project that loses .specify/ says so after the next turn', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.last()).toBe('◆ 001 · plan')
    for (const key of Object.keys(tree)) if (key.startsWith('/proj/.specify')) delete tree[key]
    await completeTurn($)
    expect(session.last()).toBe('◆ no Spec Kit')
  })
})
