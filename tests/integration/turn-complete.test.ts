import { describe, expect, test } from 'claude-code/testing'

import { scenario as forty } from '../fixtures/forty-features'
import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, settleStatus, startSession } from '../helpers/fake-fs'

const edit = (file_path: string) => ({ tool: 'Edit', tool_use_id: 'e1', file_path, old_string: 'a', new_string: 'b' }) as never

describe('turn.complete reconciles with the disk (US2)', () => {
  test('(a) a box ticked outside any tool call shows after the turn', async ($, on) => {
    const tree = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/002-band-hint/tasks.md'] = tasks(10, 10)
    expect(session.last()).toBe('◆ 002 · implement 45%')
    await completeTurn($)
    await settleStatus(session)
    expect(session.last()).toBe('◆ 002 · implement 50%')
  })

  test('(b) a running skill shows until the next reconcile, which keeps the disk phase', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-plan' } as never)
    await settleStatus(session)
    expect(session.last()).toBe('◆ 001 · plan · plan…')
    await completeTurn($)
    await settleStatus(session)
    expect(session.last()).toBe('◆ 001 · plan')
  })

  test('(c) speckit-analyze at 0 done turns the next command into implement', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/001-a'),
      features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 3) } },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.held()?.state.nextCommand).toBe('/speckit-analyze')
    await $.tool.call({ tool: 'Skill', tool_use_id: 's2', skill: 'speckit-analyze' } as never)
    expect(session.held()?.state.nextCommand).toBe('/speckit-implement')
    await completeTurn($)
    expect(session.held()?.state.nextCommand).toBe('/speckit-implement')
  })

  test('(d) an Edit of the active tasks.md re-reads it when the call completes', async ($, on) => {
    const tree = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/002-band-hint/tasks.md'] = tasks(20, 0)
    await $.tool.call(edit('/proj/specs/002-band-hint/tasks.md'))
    await settleStatus(session)
    expect(session.last()).toBe('◆ 002 · done 100%')
  })

  test('054 #13: a tasks.md over 2 MiB is summarized and reused for checkbox edits', async ($, on) => {
    const tree = { ...halfDone.tree }
    const path = '/proj/specs/002-band-hint/tasks.md'
    tree[path] = `${'#'.repeat(2 * 1024 * 1024 + 1)}\n- [ ] T001 first\n- [ ] T002 second\n`
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const reads = () => session.counts.reads.filter(file => file === path).length
    const expectOneRead = (stage: string) => expect(`${stage}:${reads()}`).toBe(`${stage}:1`)
    expectOneRead('start')
    expect(session.held()?.memo.files['002-band-hint']?.tasks?.length).toBeLessThan(100)

    tree[path] = tree[path]!.replace('- [ ] T001 first', '- [x] T001 first')
    await $.tool.call({ tool: 'Edit', tool_use_id: 'large-1', file_path: path, old_string: '- [ ] T001 first', new_string: '- [x] T001 first' } as never)
    expectOneRead('first edit')
    expect(session.held()?.state.activeTasks?.find(task => task.id === 'T001')?.isDone).toBe(true)
    await completeTurn($)
    expectOneRead('first complete')

    tree[path] = tree[path]!.replace('- [ ] T002 second', '- [x] T002 second')
    await $.tool.call({ tool: 'Edit', tool_use_id: 'large-2', file_path: path, old_string: '- [ ] T002 second', new_string: '- [x] T002 second' } as never)
    await completeTurn($)
    expectOneRead('second complete')
    expect(session.held()?.state.activeTasks?.every(task => task.isDone)).toBe(true)
  })

  test('(e) an Edit under another feature makes the next turn re-read that feature', async ($, on) => {
    const tree = { ...forty.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/007-feature-7/tasks.md'] = tasks(1, 1)
    await $.tool.call(edit('/proj/specs/007-feature-7/contracts/x.md'))
    await completeTurn($)
    const f7 = session.held()?.state.features.find(f => f.dir === '007-feature-7')
    expect([f7?.phase, f7?.done, f7?.total]).toEqual(['implement', 1, 2])
  })

  test('(f) the current task keeps its start time until its id changes', async ($, on) => {
    const tree = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const first = session.held()?.state.currentTask
    await session.clock.advance(5000)
    await completeTurn($)
    expect(session.held()?.state.currentTask).toEqual(first)
    tree['/proj/specs/002-band-hint/tasks.md'] = tasks(10, 10)
    await session.clock.advance(5000)
    await completeTurn($)
    const second = session.held()?.state.currentTask
    expect(second?.id).toBe('T011')
    expect((second?.startedAt ?? 0) - (first?.startedAt ?? 0)).toBe(10000)
  })

  test('a subagent turn does not reconcile', async ($, on) => {
    const tree = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    tree['/proj/specs/002-band-hint/tasks.md'] = tasks(20, 0)
    await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 'sub', reason: 'answer', agentId: 'a1' } as never)
    expect(session.last()).toBe('◆ 002 · implement 45%')
  })

  const budget = async (
    $: Parameters<typeof completeTurn>[0] & Parameters<typeof startSession>[0],
    session: ReturnType<typeof installTree>,
  ) => {
    await startSession($, '/proj')
    const reads = session.counts.reads.length
    const exists = session.counts.exists
    const lists = session.counts.list
    await completeTurn($)
    return {
      reads: session.counts.reads.slice(reads).sort(),
      exists: session.counts.exists - exists,
      lists: session.counts.list - lists,
    }
  }

  test('performance: one turn on 40 features reads exactly the active feature (SC-005)', async ($, on) => {
    const session = installTree(on, forty.tree, '/proj')
    installEngine(on)
    expect(await budget($, session)).toEqual({
      reads: [
        '/proj/.specify/feature.json',
        '/proj/.specify/memory/constitution.md',
        '/proj/specs/040-feature-40/spec.md',
        '/proj/specs/040-feature-40/tasks.md',
      ],
      // .specify/ still there and the .git walk up to /; plan.md comes from the folder listing (040)
      exists: 3,
      // the specs/ listing and the active feature's own folder (040); no checklists/ to list
      lists: 2,
    })
    expect(session.logs).toEqual([])
  })

  test('performance: with a git checkout the turn adds the HEAD read', async ($, on) => {
    const session = installTree(on, { ...forty.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }, '/proj')
    installEngine(on)
    const used = await budget($, session)
    expect(used.reads).toEqual([
      '/proj/.git',
      '/proj/.git/HEAD',
      '/proj/.specify/feature.json',
      '/proj/.specify/memory/constitution.md',
      '/proj/specs/040-feature-40/spec.md',
      '/proj/specs/040-feature-40/tasks.md',
    ])
    expect([used.exists, used.lists]).toEqual([2, 2])
  })

})

describe('a file that cannot be read (013)', () => {
  test('keeps the phase and progress last read, and the pane names the file', async ($, on) => {
    const tree = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.last()).toBe('◆ 002 · implement 45%')
    session.denied.add('/proj/specs/002-band-hint/tasks.md')
    session.denied.add('/proj/specs/002-band-hint/spec.md')
    await completeTurn($)
    expect(session.last()).toBe('◆ 002 · implement 45%')
    const feature = session.held()?.state.features.find(f => f.dir === '002-band-hint')
    expect(feature?.warnings).toEqual(['unreadable-spec', 'unreadable-tasks'])
    session.denied.clear()
    await completeTurn($)
    expect(session.held()?.state.features.find(f => f.dir === '002-band-hint')?.warnings).toEqual([])
  })

  test('a feature that is not active is read again each turn until the read works', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/002-b'),
      features: { '001-a': { spec: spec(), plan: true, tasks: tasks(2, 0) }, '002-b': { spec: spec() } },
    })
    const session = installTree(on, tree, '/proj')
    session.denied.add('/proj/specs/001-a/spec.md')
    installEngine(on)
    await startSession($, '/proj')
    const first = () => session.held()?.state.features.find(f => f.dir === '001-a')
    expect(first()?.warnings).toEqual(['unreadable-spec'])
    await completeTurn($)
    expect(first()?.warnings).toEqual(['unreadable-spec'])
    session.denied.clear()
    await completeTurn($)
    expect(first()?.warnings).toEqual([])
    expect(first()?.phase).toBe('done')
  })
})
