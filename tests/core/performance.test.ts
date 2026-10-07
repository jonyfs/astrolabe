import { describe, expect, test } from 'claude-code/testing'

import { deriveSpeckitState } from '../../hooks/core/speckit'
import { formatStatus } from '../../hooks/core/status-text'
import { emptyMemo, type Snapshot } from '../../hooks/core/types'
import { spec, tasks } from '../fixtures/build'

// A large project: 100 features with 200 tasks each (20,000 checkbox lines).
const big: Snapshot = {
  root: '/proj',
  featureJson: { kind: 'ok', dir: '100-f' },
  constitution: '# Constitution\n',
  features: [...Array(100).keys()].map(i => ({
    dir: `${String(i + 1).padStart(3, '0')}-f`,
    spec: spec('status: active'),
    plan: true,
    tasks: tasks(120, 80),
  })),
}

describe('performance of the pure core', () => {
  test('deriving 100 features x 200 tasks stays well under a frame budget per reconcile', () => {
    const runs = 20
    const started = Date.now()
    let text = ''
    for (let i = 0; i < runs; i += 1) text = formatStatus(deriveSpeckitState(big, emptyMemo(), i).state)
    const perRun = (Date.now() - started) / runs
    expect(text).toBe('◆ 100 · implement 60%')
    expect(perRun < 50).toBe(true)
  })
})
