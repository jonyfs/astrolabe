import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { freezeTree, treeFs } from '../helpers/fake-fs'
import { readSnapshot } from '../../hooks/io/snapshot'
import { deriveSpeckitState } from '../../hooks/core/speckit'
import { emptyMemo } from '../../hooks/core/types'
import { specsRows, taskRows } from '../../hooks/core/pane'

const dirs = [...Array(500).keys()].map(i => `${String(i + 1).padStart(3, '0')}-feature-${i + 1}`)

describe('500 features without the engine (027 #55, #60)', () => {
  test('reading and deriving stay far inside the hook budget', async () => {
    const tree = freezeTree(project({ constitution: RATIFIED, featureJson: featureJson(`specs/${dirs[499]}`), features: Object.fromEntries(dirs.map(d => [d, { spec: spec(), plan: true, tasks: tasks(10, 0) }])) }))
    const { fs, counts } = treeFs(tree)
    const t0 = performance.now()
    const snap = await readSnapshot(fs, '/proj', 'full')
    const t1 = performance.now()
    deriveSpeckitState(snap, emptyMemo(), 0)
    const t2 = performance.now()
    // A benchmark with room for slow CI runners: the budget is the engine's 10 s per hook.
    expect(t1 - t0).toBeLessThan(2000)
    expect(t2 - t1).toBeLessThan(500)
    // Three file calls per feature (its listing, spec.md, tasks.md) plus the root's own (040).
    expect(counts.read + counts.list + counts.exists + counts.stat).toBeLessThanOrEqual(3 * 500 + 10)
  })
})

describe('the pane on 100 features (049 #81)', () => {
  test('the Specs and Tasks rows take under 30 ms', async () => {
    const hundred = dirs.slice(0, 100)
    const tree = freezeTree(project({ constitution: RATIFIED, featureJson: featureJson(`specs/${hundred[99]}`), features: Object.fromEntries(hundred.map(d => [d, { spec: spec(), plan: true, tasks: tasks(10, 3) }])) }))
    const { fs } = treeFs(tree)
    const { state } = deriveSpeckitState(await readSnapshot(fs, '/proj', 'full'), emptyMemo(), 0)
    // Warm once, then time the rows a render draws.
    specsRows(state, 100)
    // The best of five runs: one sample on a busy CI runner measures the runner, not the code.
    let best = Number.POSITIVE_INFINITY
    let rows = specsRows(state, 100)
    for (let i = 0; i < 5; i += 1) {
      const t0 = performance.now()
      rows = specsRows(state, 100)
      taskRows(state, emptyMemo(), 1000, 100, 'en', 0)
      best = Math.min(best, performance.now() - t0)
    }
    expect(best).toBeLessThan(30)
    expect(rows.filter(r => r.key.startsWith('feature-')).length).toBe(100)
  })
})

describe('1,000 tasks in one tasks.md (054 #10)', () => {
  test('deriving and the Tasks rows take under 30 ms', async () => {
    const tree = freezeTree(project({ constitution: RATIFIED, featureJson: featureJson('specs/001-big'), features: { '001-big': { spec: spec(), plan: true, tasks: tasks(400, 600) } } }))
    const { fs } = treeFs(tree)
    const snap = await readSnapshot(fs, '/proj', 'full')
    const { state } = deriveSpeckitState(snap, emptyMemo(), 0)
    taskRows(state, emptyMemo(), 1000, 100, 'en', 0)
    // The best of five runs, as above.
    let best = Number.POSITIVE_INFINITY
    let rows = taskRows(state, emptyMemo(), 1000, 100, 'en', 0)
    for (let i = 0; i < 5; i += 1) {
      const t0 = performance.now()
      rows = taskRows(state, emptyMemo(), 1000, 100, 'en', 0)
      best = Math.min(best, performance.now() - t0)
    }
    expect(best).toBeLessThan(30)
    expect(state.features[0]?.total).toBe(1000)
    expect(rows.some(r => r.text.includes('T401'))).toBe(true)
  })
})
