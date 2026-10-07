import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

const planOnly = () =>
  project({ constitution: RATIFIED, featureJson: featureJson('specs/002-b'), features: { '002-b': { spec: spec() } } })
const implementing = (taskText: string) =>
  project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/002-b'),
    features: { '002-b': { spec: spec(), plan: true, tasks: `- [x] T001 done\n- [ ] T014 ${taskText}\n- [ ] T015 later\n` } },
  })
const edit = (id: string, file_path: string) => ({ tool: 'Edit', tool_use_id: id, file_path, old_string: 'a', new_string: 'b' }) as never
const tickT014 = (tree: Record<string, string>) => {
  tree['/proj/specs/002-b/tasks.md'] = tree['/proj/specs/002-b/tasks.md']!.replace('- [ ] T014', '- [X] T014')
}

describe('phase toasts (US1)', () => {
  test('full: a later phase confirmed by the disk toasts once', { options: { preset: 'full' } }, async ($, on) => {
    const tree = planOnly()
    const session = installTree(on, tree, '/proj', { 'baseline:/proj': { '002-b': 'plan' } })
    installEngine(on)
    await startSession($, '/proj')
    expect(session.toasts).toEqual([])
    tree['/proj/specs/002-b/plan.md'] = '# Plan\n'
    await completeTurn($)
    expect(session.toasts).toEqual(['🧭 002 b moved to tasks · next: /speckit-tasks'])
    await completeTurn($)
    expect(session.toasts.length).toBe(1)
    expect(session.store.get('baseline:/proj')).toEqual({ '002-b': 'tasks' })
  })

  test('full: a skill hint alone never toasts', { options: { preset: 'full' } }, async ($, on) => {
    const session = installTree(on, planOnly(), '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Skill', tool_use_id: 's', skill: 'speckit-tasks' } as never)
    await completeTurn($)
    expect(session.toasts).toEqual([])
  })

  for (const preset of ['compact', 'minimal'] as const) {
    test(`${preset}: no phase toast`, { options: { preset } }, async ($, on) => {
      const tree = planOnly()
      const session = installTree(on, tree, '/proj', { 'baseline:/proj': { '002-b': 'plan' } })
      installEngine(on)
      await startSession($, '/proj')
      tree['/proj/specs/002-b/plan.md'] = '# Plan\n'
      await completeTurn($)
      expect(session.toasts).toEqual([])
    })
  }
})

describe('the drift alarm (US2)', () => {
  test('a tick with no code edited toasts', async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tickT014(tree)
    await $.tool.call(edit('e1', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual(['🧭 T014 was ticked with no code edited since the last tick'])
  })

  test('a code edit before the tick keeps quiet, and the window resets after it', async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call(edit('e1', '/proj/src/parser.ts'))
    tickT014(tree)
    await $.tool.call(edit('e2', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual([])
    tree['/proj/specs/002-b/tasks.md'] = tree['/proj/specs/002-b/tasks.md']!.replace('- [ ] T015', '- [x] T015')
    await $.tool.call(edit('e3', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual(['🧭 T015 was ticked with no code edited since the last tick'])
  })

  test('a named file that was not edited is named', async ($, on) => {
    const tree = implementing('Write `tests/core/parser.test.ts`')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call(edit('e1', '/proj/src/other.ts'))
    tickT014(tree)
    await $.tool.call(edit('e2', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual(['🧭 T014 was ticked, but none of its files were edited: tests/core/parser.test.ts'])
  })

  test('a Bash call in the window keeps quiet', async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'npm test' } as never)
    tickT014(tree)
    await $.tool.call(edit('e', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual([])
  })

  test('an Agent call in the window keeps quiet', async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Agent', tool_use_id: 'a', description: 'x', prompt: 'y', subagent_type: 'general-purpose' } as never)
    tickT014(tree)
    await $.tool.call(edit('e', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual([])
  })

  test('a tick made outside Claude Code never toasts', async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tickT014(tree)
    await completeTurn($)
    expect(session.toasts).toEqual([])
  })

  test('minimal: no drift toast', { options: { preset: 'minimal' } }, async ($, on) => {
    const tree = implementing('Write the parser')
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tickT014(tree)
    await $.tool.call(edit('e', '/proj/specs/002-b/tasks.md'))
    expect(session.toasts).toEqual([])
  })
})
