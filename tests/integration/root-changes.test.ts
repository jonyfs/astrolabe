import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { completeTurn, installEngine, installTree, settleStatus, startSession } from '../helpers/fake-fs'

describe('Spec Kit appearing or disappearing mid-session', () => {
  test('a project that gains .specify/ shows it after the next turn', async ($, on) => {
    const tree: Record<string, string> = { '/proj/README.md': '# x\n' }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.last()).toBe('◆ no Spec Kit')
    Object.assign(tree, project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } }))
    await completeTurn($)
    await settleStatus(session)
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
    await settleStatus(session)
    expect(session.last()).toBe('◆ no Spec Kit')
  })
})

describe('several Spec Kit roots (020c #21)', () => {
  test('roots under the folder are listed; /astrolabe root switches to one', async ($, on) => {
    const tree = {
      '/mono/README.md': 'x',
      '/mono/web/.specify/': '',
      '/mono/web/specs/001-ui/spec.md': '# Spec\n',
      '/mono/api/.specify/': '',
      '/mono/api/specs/001-auth/spec.md': '# Spec\n',
      '/mono/api/specs/001-auth/plan.md': '# Plan\n',
      '/mono/docs/x.md': 'x',
    }
    const session = installTree(on, tree, '/mono')
    installEngine(on)
    await startSession($, '/mono')
    expect(session.held()?.state.present).toBe(false)
    expect(session.held()?.state.otherRoots).toEqual(['api', 'web'])
    const ran = (await $.command.run({ command: 'astrolabe', args: 'root api', origin: { kind: 'composer' } } as never)) as { text?: string }
    expect(ran.text).toContain('/mono/api')
    expect(session.held()?.state.root).toBe('/mono/api')
    await settleStatus(session)
    expect(session.last()).toContain('001 · tasks')
    const bad = (await $.command.run({ command: 'astrolabe', args: 'root nope', origin: { kind: 'composer' } } as never)) as { text?: string }
    expect(bad.text).toContain('No .specify/')
  })
})
