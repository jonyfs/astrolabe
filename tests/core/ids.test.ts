import { describe, expect, test } from 'claude-code/testing'

import { idWidth, padId } from '../../hooks/core/ids'
import { specsRows } from '../../hooks/core/pane'
import { parseTasks } from '../../hooks/core/tasks-parser'
import { emptyMemo, type Feature, type SpeckitState } from '../../hooks/core/types'

const feature = (id: string, name = 'cart'): Feature => ({
  id,
  name,
  dir: `specs/${id}-${name}`,
  phase: 'implement',
  done: 2,
  total: 8,
  warnings: [],
}) as Feature

const state = (features: Feature[]): SpeckitState =>
  ({
    present: true,
    constitution: 'ratified',
    features,
    active: features[0] === undefined ? undefined : { dir: features[0].dir, id: features[0].id, name: features[0].name },
    worktrees: [],
  }) as unknown as SpeckitState

describe('ids are whole and aligned (064 #4)', () => {
  test('idWidth is the widest id, at least 3', () => {
    expect(idWidth([])).toBe(3)
    expect(idWidth(['001', '064'])).toBe(3)
    expect(idWidth(['001', '1000'])).toBe(4)
    expect(idWidth(['7'])).toBe(3)
  })

  test('padId pads to the width and never cuts', () => {
    expect(padId('064', 4)).toBe('064 ')
    expect(padId('1000', 4)).toBe('1000')
    expect(padId('12345', 4)).toBe('12345')
  })

  test('a task id is kept exactly as written in tasks.md', () => {
    const parsed = parseTasks('- [ ] T011 [P] write it\n- [x] T9 old style\n')
    expect(parsed.map(t => t.id)).toEqual(['T011', 'T9'])
  })

  test('feature ids line up to the widest and are whole at 80 columns', () => {
    const rows = specsRows(state([feature('064'), feature('1000', 'long')]), 80).filter(r => r.key.startsWith('feature-'))
    const heads = rows.map(r => /(\d{3,4}) +\S/.exec(r.text)?.[1])
    expect(heads).toEqual(['064', '1000'])
    // Names start in one column: both ids occupy four cells.
    const nameAt = rows.map(r => r.text.search(/ (cart|long)\b/))
    expect(new Set(nameAt).size).toBe(1)
  })

  test('on a narrow pane the name is cut before the id', () => {
    const rows = specsRows(state([feature('1000', 'a-very-long-feature-name-indeed')]), 30).filter(r => r.key.startsWith('feature-'))
    expect(rows[0]?.text).toContain('1000')
  })
})
