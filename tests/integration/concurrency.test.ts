import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as forty } from '../fixtures/forty-features'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

const edit = (id: string, file_path: string) => ({ tool: 'Edit', tool_use_id: id, file_path, old_string: 'a', new_string: 'b' }) as never

describe('concurrent tool calls never lose an update of $.state', () => {
  test('two concurrent Edits under different features both reach the next turn', { timeoutMs: 20_000 }, async ($, on) => {
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

describe('lean writes (009 FR-002, FR-003)', () => {
  test('a second Bash call in the same turn writes nothing', async ($, on) => {
    const session = installTree(on, forty.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'ls' } as never)
    const after = { ...session.stateSets }
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b2', command: 'ls' } as never)
    await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/proj/src/a.ts', old_string: 'a', new_string: 'b' } as never)
    const afterEdit = { ...session.stateSets }
    await $.tool.call({ tool: 'Edit', tool_use_id: 'e2', file_path: '/proj/src/a.ts', old_string: 'b', new_string: 'c' } as never)
    expect(session.stateSets).toEqual(afterEdit)
    expect(afterEdit.memo).toBe((after.memo ?? 0) + 1)
  })

  test('concurrent tasks.md edits leave the drawn state as new as the memo', { timeoutMs: 20_000 }, async ($, on) => {
    const tree = { ...forty.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/005-feature-5/tasks.md'] = tasks(1, 1)
    tree['/proj/specs/007-feature-7/tasks.md'] = tasks(1, 1)
    const tick = (id: string, dir: string) =>
      ({ tool: 'Edit', tool_use_id: id, file_path: `/proj/specs/${dir}/tasks.md`, old_string: 'x', new_string: 'y' }) as never
    await Promise.all([$.tool.call(tick('t5', '005-feature-5')), $.tool.call(tick('t7', '007-feature-7'))])
    const totals = ['005-feature-5', '007-feature-7'].map(d => session.held()?.state.features.find(f => f.dir === d)?.total)
    expect(totals).toEqual([2, 2])
  })
})
