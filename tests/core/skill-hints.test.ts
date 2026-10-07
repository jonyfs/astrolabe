import { describe, expect, test } from 'claude-code/testing'

import { skillHint } from '../../hooks/core/skill-hints'

describe('skillHint: FR-017', () => {
  test('the six mapped skills give their step', () => {
    expect(skillHint('speckit-constitution')).toEqual({ step: 'constitution' })
    expect(skillHint('speckit-specify')).toEqual({ step: 'specify' })
    expect(skillHint('speckit-clarify')).toEqual({ step: 'clarify' })
    expect(skillHint('speckit-plan')).toEqual({ step: 'plan' })
    expect(skillHint('speckit-tasks')).toEqual({ step: 'tasks' })
    expect(skillHint('speckit-implement')).toEqual({ step: 'implement' })
  })
  test('speckit-analyze sets the analyze flag', () => {
    expect(skillHint('speckit-analyze')).toEqual({ analyze: true })
  })
  test('a plugin prefix or a leading slash still matches', () => {
    expect(skillHint('spec-kit:speckit-plan')).toEqual({ step: 'plan' })
    expect(skillHint('/speckit-tasks')).toEqual({ step: 'tasks' })
  })
  test('every other skill gives no hint', () => {
    for (const name of ['speckit-checklist', 'speckit-converge', 'speckit-taskstoissues', 'specjedi-plan', 'office-hours', '']) {
      expect(skillHint(name)).toBeUndefined()
    }
  })
})
