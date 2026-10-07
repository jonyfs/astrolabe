import { describe, expect, test } from 'claude-code/testing'

import { compactConstitution, compactSpec, compactTasks } from '../../hooks/core/compact'
import { deriveSpeckitState, snapshotFromMemo } from '../../hooks/core/speckit'
import { emptyMemo } from '../../hooks/core/types'
import { findRoot } from '../../hooks/io/root'
import { readSnapshot } from '../../hooks/io/snapshot'
import type { Scenario } from '../fixtures/build'
import { scenario as clarifyPending } from '../fixtures/clarify-pending'
import { scenario as frontMatterDone } from '../fixtures/front-matter-done'
import { scenario as frontMatterQuick } from '../fixtures/front-matter-quick'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as malformedCheckbox } from '../fixtures/malformed-checkbox'
import { scenario as templateConstitution } from '../fixtures/template-constitution'
import { treeFs } from '../helpers/fake-fs'

describe('compaction keeps what derivation needs (009 FR-001)', () => {
  test('spec: front matter and the clarification flag only', () => {
    const spec = '---\nstatus: done\ntrack: full\n---\n# Spec\n' + 'x'.repeat(5000) + '\n[NEEDS CLARIFICATION: y]\n'
    expect(compactSpec(spec)).toBe('---\nstatus: done\ntrack: full\n---\n[NEEDS CLARIFICATION]\n')
    expect(compactSpec('# Spec\nplain\n')).toBe('')
  })
  test('tasks: the task lines only, fenced ones dropped', () => {
    expect(compactTasks('# Tasks\n\nprose\n- [X] T001 a\n```\n- [ ] T999 x\n```\n  - [ ] T002 `b`\n')).toBe('- [x] T001 a\n- [ ] T002 `b`\n')
  })
  test('constitution: a stand-in that classifies the same', () => {
    expect(compactConstitution(undefined)).toBeUndefined()
    expect(compactConstitution('# [PROJECT_NAME]\n')).toBe('[TEMPLATE]')
    expect(compactConstitution('# Ratified\n' + 'y'.repeat(9000))).toBe('')
  })

  const all: Record<string, Scenario> = { clarifyPending, frontMatterDone, frontMatterQuick, halfDone, malformedCheckbox, templateConstitution }
  for (const [name, s] of Object.entries(all)) {
    test(`${name}: re-deriving from the stored memo gives the same state`, async () => {
      const { fs } = treeFs(s.tree)
      const root = (await findRoot(fs, s.cwd)) as string
      const first = deriveSpeckitState(await readSnapshot(fs, root, 'full'), emptyMemo(), 0)
      const again = deriveSpeckitState(snapshotFromMemo(first.memo)!, first.memo, 0)
      expect(again.state).toEqual(first.state)
    })
  }

  test('the stored memo is small', async () => {
    const big = { ...halfDone.tree, '/proj/specs/002-band-hint/spec.md': '# Spec\n' + 'z'.repeat(50_000) }
    const { fs } = treeFs(big)
    const { memo } = deriveSpeckitState(await readSnapshot(fs, '/proj', 'full'), emptyMemo(), 0)
    expect(JSON.stringify(memo).length < 4000).toBe(true)
  })
})
