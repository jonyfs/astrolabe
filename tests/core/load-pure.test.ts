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
    const t0 = performance.now()
    const rows = specsRows(state, 100)
    taskRows(state, emptyMemo(), 1000, 100, 'en', 0)
    expect(performance.now() - t0).toBeLessThan(30)
    expect(rows.filter(r => r.key.startsWith('feature-')).length).toBe(100)
  })
})
