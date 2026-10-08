import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { freezeTree, treeFs } from '../helpers/fake-fs'
import { readSnapshot } from '../../hooks/io/snapshot'
import { deriveSpeckitState } from '../../hooks/core/speckit'
import { emptyMemo } from '../../hooks/core/types'

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
    // At most four file calls per feature plus the root's own; spec 040 brings this down.
    expect(counts.read + counts.list + counts.exists + counts.stat).toBeLessThanOrEqual(4 * 500 + 10)
  })
})
