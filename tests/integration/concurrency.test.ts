import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as forty } from '../fixtures/forty-features'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

const edit = (id: string, file_path: string) => ({ tool: 'Edit', tool_use_id: id, file_path, old_string: 'a', new_string: 'b' }) as never

describe('concurrent tool calls never lose an update of $.state', () => {
  test('two concurrent Edits under different features both reach the next turn', async ($, on) => {
    const tree = { ...forty.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/005-feature-5/tasks.md'] = tasks(1, 1)
    tree['/proj/specs/007-feature-7/tasks.md'] = tasks(1, 1)
    await Promise.all([
      $.tool.call(edit('e5', '/proj/specs/005-feature-5/contracts/x.md')),
      $.tool.call(edit('e7', '/proj/specs/007-feature-7/contracts/x.md')),
    ])
    expect([...(session.held()?.memo.touched ?? [])].sort()).toEqual(['005-feature-5', '007-feature-7'])
    await completeTurn($)
    const totals = ['005-feature-5', '007-feature-7'].map(d => session.held()?.state.features.find(f => f.dir === d)?.total)
    expect(totals).toEqual([2, 2])
  })

  test('a concurrent Edit does not drop the analyzed flag', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/001-a'),
      features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 3) }, '002-b': { spec: spec() } },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await Promise.all([
      $.tool.call({ tool: 'Skill', tool_use_id: 's', skill: 'speckit-analyze' } as never),
      $.tool.call(edit('e', '/proj/specs/002-b/notes.md')),
    ])
    expect(session.held()?.memo.analyzed).toEqual(['001-a'])
    expect(session.held()?.state.nextCommand).toBe('/speckit-implement')
  })
})
