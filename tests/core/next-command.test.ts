import { describe, expect, test } from 'claude-code/testing'

import { nextCommand, type NextCommandInput } from '../../hooks/core/next-command'
import type { Feature, Phase } from '../../hooks/core/types'

const feature = (phase: Phase, done = 0, total = 0): Feature => ({
  id: '002',
  name: 'x',
  dir: '002-x',
  phase,
  done,
  total,
  warnings: [],
})

const base: NextCommandInput = { present: true, constitution: 'ratified', isAnalyzed: false }

describe('nextCommand: the FR-021 table', () => {
  test('nothing without Spec Kit', () => {
    expect(nextCommand({ ...base, present: false })).toBeUndefined()
  })
  test('constitution first when missing or still a template', () => {
    expect(nextCommand({ ...base, constitution: 'missing', active: feature('implement', 1, 2) })).toBe('/speckit-constitution')
    expect(nextCommand({ ...base, constitution: 'template' })).toBe('/speckit-constitution')
  })
  test('specify when nothing is active, or the active feature is done or abandoned', () => {
    expect(nextCommand(base)).toBe('/speckit-specify')
    expect(nextCommand({ ...base, active: feature('done') })).toBe('/speckit-specify')
    expect(nextCommand({ ...base, active: feature('abandoned') })).toBe('/speckit-specify')
  })
  test('one command per phase', () => {
    expect(nextCommand({ ...base, active: feature('specify') })).toBe('/speckit-specify')
    expect(nextCommand({ ...base, active: feature('clarify') })).toBe('/speckit-clarify')
    expect(nextCommand({ ...base, active: feature('plan') })).toBe('/speckit-plan')
    expect(nextCommand({ ...base, active: feature('tasks') })).toBe('/speckit-tasks')
  })
  test('analyze before the first task, unless it already ran this session', () => {
    expect(nextCommand({ ...base, active: feature('implement', 0, 5) })).toBe('/speckit-analyze')
    expect(nextCommand({ ...base, active: feature('implement', 0, 5), isAnalyzed: true })).toBe('/speckit-implement')
    expect(nextCommand({ ...base, active: feature('implement', 1, 5) })).toBe('/speckit-implement')
  })
})
