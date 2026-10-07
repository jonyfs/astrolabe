// Runs a fixture scenario through the io layer and the core, as session.start does.
import { expect } from 'claude-code/testing'

import { formatStatus } from '../../hooks/core/status-text'
import { deriveSpeckitState } from '../../hooks/core/speckit'
import { emptyMemo } from '../../hooks/core/types'
import { findRoot } from '../../hooks/io/root'
import { readSnapshot } from '../../hooks/io/snapshot'
import type { Scenario } from '../fixtures/build'
import { treeFs } from './fake-fs'

export const derive = async (s: Scenario, now = 1000) => {
  const { fs } = treeFs(s.tree)
  const root = await findRoot(fs, s.cwd)
  const snapshot = root === undefined ? { featureJson: { kind: 'missing' as const }, features: [] } : await readSnapshot(fs, root, 'full')
  return deriveSpeckitState(snapshot, emptyMemo(), now)
}

export const checkScenario = async (name: string, s: Scenario) => {
  const { state } = await derive(s)
  const e = s.expected
  expect({ name, present: state.present, constitution: state.constitution }).toEqual({
    name,
    present: e.present,
    constitution: e.constitution,
  })
  expect({ name, active: state.active && { id: state.active.id, source: state.active.source } }).toEqual({ name, active: e.active })
  expect({ name, warning: state.activeWarning }).toEqual({ name, warning: e.warning })
  expect({ name, phases: Object.fromEntries(state.features.map(f => [f.dir, f.phase])) }).toEqual({ name, phases: e.phases })
  if (e.counts) {
    const counts = Object.fromEntries(state.features.filter(f => f.dir in e.counts!).map(f => [f.dir, [f.done, f.total]]))
    expect({ name, counts }).toEqual({ name, counts: e.counts })
  }
  expect({ name, next: state.nextCommand }).toEqual({ name, next: e.next })
  expect({ name, status: formatStatus(state) }).toEqual({ name, status: e.status })
}

