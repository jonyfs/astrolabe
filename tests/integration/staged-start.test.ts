import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { freezeTree, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 040 FR-003: a large project reads its likely-active features first, the rest in batches.
const dirs = [...Array(220).keys()].map(i => `${String(i + 1).padStart(3, '0')}-feature-${i + 1}`)
const tree = () =>
  freezeTree(
    project({
      constitution: RATIFIED,
      featureJson: featureJson(`specs/${dirs[5]}`),
      features: Object.fromEntries(dirs.map((d, i) => [d, i === 5 ? { spec: spec(), plan: true, tasks: tasks(1, 3) } : { spec: spec(), plan: true, tasks: tasks(2, 0) }])),
    }),
  )

describe('a staged start (040)', () => {
  test('the active feature and the newest are read at once; the rest arrive in batches', { timeoutMs: 60_000 }, async ($, on) => {
    const session = installTree(on, tree(), '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect(session.last()).toBe('◆ 006 · implement 25%')
    const loading = () => (session.held()?.state.features ?? []).filter(f => f.warnings.includes('loading')).length
    // 220 features: the active one and the twenty newest now, 199 later.
    expect(loading()).toBe(199)
    await session.clock.advance(10)
    await session.clock.advance(10)
    expect(loading()).toBe(0)
    expect(session.held()?.state.features.filter(f => f.phase === 'done').length).toBe(219)
    expect(session.logs).toEqual([])
  })

  test('a normal project reads everything at start, as before', async ($, on) => {
    const small = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) }, '002-b': { spec: spec(), plan: true, tasks: tasks(1, 0) } } })
    const session = installTree(on, small, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect((session.held()?.state.features ?? []).some(f => f.warnings.includes('loading'))).toBe(false)
  })
})
