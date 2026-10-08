import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// 054 #59: the analyze gate holds only for the tasks.md analyze ran on.
const analyze = { tool: 'Skill', tool_use_id: 's', skill: 'speckit-analyze' } as never
const tree = () => project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 3) } } })

describe('analyze gate (054 #59)', () => {
  test('ticking a task keeps the feature analyzed', async ($, on) => {
    const t = tree()
    const session = installTree(on, t, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call(analyze)
    expect(session.held()?.state.isAnalyzed).toBe(true)
    t['/proj/specs/001-a/tasks.md'] = tasks(1, 2)
    await completeTurn($)
    expect(session.held()?.state.isAnalyzed).toBe(true)
  })

  test('a task added after analyze clears the flag until analyze runs again', async ($, on) => {
    const t = tree()
    const session = installTree(on, t, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call(analyze)
    t['/proj/specs/001-a/tasks.md'] = tasks(0, 4)
    await completeTurn($)
    expect(session.held()?.state.isAnalyzed).toBe(false)
    expect(session.held()?.state.nextCommand).toBe('/speckit-analyze')
    await $.tool.call({ tool: 'Skill', tool_use_id: 's2', skill: 'speckit-analyze' } as never)
    expect(session.held()?.state.isAnalyzed).toBe(true)
  })
})
