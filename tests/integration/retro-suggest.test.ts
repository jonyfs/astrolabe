import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { justFinished } from '../../hooks/core/next-command'

// 054 #90: when a feature is done, the prompt box proposes a retrospective.
describe('retro suggestion (054 #90)', () => {
  test('only a feature that moved to done counts', () => {
    expect(justFinished([{ dir: 'a', phase: 'implement' }], [{ dir: 'a', phase: 'done' }])).toEqual({ dir: 'a', phase: 'done' })
    expect(justFinished([{ dir: 'a', phase: 'done' }], [{ dir: 'a', phase: 'done' }])).toBeUndefined()
    expect(justFinished([], [{ dir: 'a', phase: 'done' }])).toBeUndefined()
  })

  test('gstack /retro without a Spec Kit retro skill; /speckit-retro with one', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/001-a/tasks.md'] = tasks(2, 0)
    await completeTurn($)
    expect(session.suggested.at(-1)).toBe('/retro')
  })

  test('the project has speckit-retro', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) } } })
    tree['/proj/.claude/skills/speckit-retro/SKILL.md'] = '# retro\n'
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/001-a/tasks.md'] = tasks(2, 0)
    await completeTurn($)
    expect(session.suggested.at(-1)).toBe('/speckit-retro')
  })
})
