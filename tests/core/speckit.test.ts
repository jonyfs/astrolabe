import { describe, expect, test } from 'claude-code/testing'

import { deriveSpeckitState } from '../../hooks/core/speckit'
import { emptyMemo } from '../../hooks/core/types'
import { findRoot } from '../../hooks/io/root'
import { readSnapshot } from '../../hooks/io/snapshot'
import type { Scenario } from '../fixtures/build'
import { checkScenario, derive } from '../helpers/scenario'
import { scenario as allDone } from '../fixtures/all-done'
import { scenario as clarifyPending } from '../fixtures/clarify-pending'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as malformedCheckbox } from '../fixtures/malformed-checkbox'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { scenario as planWithoutTasks } from '../fixtures/plan-without-tasks'
import { scenario as specOnly } from '../fixtures/spec-only'
import { scenario as templateConstitution } from '../fixtures/template-constitution'
import { scenario as uppercaseX } from '../fixtures/uppercase-x'
import { scenario as frontMatterAbandoned } from '../fixtures/front-matter-abandoned'
import { scenario as frontMatterDone } from '../fixtures/front-matter-done'
import { scenario as frontMatterQuick } from '../fixtures/front-matter-quick'
import { treeFs } from '../helpers/fake-fs'

describe('deriveSpeckitState over the US1 fixtures', () => {
  const all: Record<string, Scenario> = {
    noSpeckit,
    templateConstitution,
    specOnly,
    clarifyPending,
    planWithoutTasks,
    halfDone,
    allDone,
    malformedCheckbox,
    uppercaseX,
  }
  for (const [name, s] of Object.entries(all)) {
    test(name, () => checkScenario(name, s))
  }
})

describe('front matter overrides inference (US5)', () => {
  const all: Record<string, Scenario> = { frontMatterDone, frontMatterQuick, frontMatterAbandoned }
  for (const [name, s] of Object.entries(all)) test(name, () => checkScenario(name, s))
})

describe('deriveSpeckitState: session memo', () => {
  test('the current task carries the time its id first appeared', async () => {
    const { state, memo } = await derive(halfDone, 1000)
    expect(state.currentTask).toEqual({ id: 'T010', text: 'task 10', startedAt: 1000 })
    expect(memo.currentTask).toEqual({ dir: '002-band-hint', id: 'T010', startedAt: 1000 })
  })
  test('the memo caches the files it was derived from', async () => {
    const { memo } = await derive(halfDone)
    expect(Object.keys(memo.files).sort()).toEqual(['001-core-state', '002-band-hint'])
  })
  test('the analyzed flag and running skill come from the memo', async () => {
    const { fs } = treeFs(halfDone.tree)
    const snapshot = await readSnapshot(fs, '/proj', 'full')
    const memo = { ...emptyMemo(), analyzed: ['002-band-hint'], runningSkill: { name: 'speckit-implement', step: 'implement' as const } }
    const { state } = deriveSpeckitState(snapshot, memo, 0)
    expect([state.isAnalyzed, state.runningSkill?.step]).toEqual([true, 'implement'])
  })
})
