import { describe, expect, test } from 'claude-code/testing'

import { scenario as forty } from '../fixtures/forty-features'
import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

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
    expect(session.last()).toBe('◆ 002 · implement 50%')
  })

  test('(b) a running skill shows until the next reconcile, which keeps the disk phase', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } } })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.tool.call({ tool: 'Skill', tool_use_id: 's1', skill: 'speckit-plan' } as never)
    expect(session.last()).toBe('◆ 001 · plan · plan…')
    await completeTurn($)
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
    expect(session.last()).toBe('◆ 002 · done 100%')
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

  test('performance: one turn on 40 features stays within the read budget (SC-005)', async ($, on) => {
    const session = installTree(on, forty.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const before = { ...session.counts, reads: [...session.counts.reads] }
    await completeTurn($)
    const reads = session.counts.read - before.read
    const lists = session.counts.list - before.list
    // feature.json + constitution + the active feature's spec.md and tasks.md (+ at most two for git HEAD)
    expect(reads <= 6).toBe(true)
    expect(lists).toBe(1)
    expect(session.logs).toEqual([])
  })
})
