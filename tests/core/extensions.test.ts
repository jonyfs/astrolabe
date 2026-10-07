import { describe, expect, test } from 'claude-code/testing'

import { hooksFor, parallelTasks, parseExtensions } from '../../hooks/core/extensions'

const YAML = `installed:
- agent-context
- git
hooks:
  before_plan:
  - extension: git
    command: speckit.git.commit
    enabled: true
    optional: false
  after_plan:
  - extension: agent-context
    command: speckit.agent-context.update
    enabled: true
    optional: true
  - extension: off
    command: speckit.off.thing
    enabled: false
  after_implement:
  - extension: git
    command: "speckit.git.push"
`

describe('Spec Kit extensions (020c #22)', () => {
  test('hooks by event, disabled ones left out', () => {
    const hooks = parseExtensions(YAML)
    expect(hooks).toEqual([
      { event: 'before_plan', command: 'speckit.git.commit', optional: false },
      { event: 'after_plan', command: 'speckit.agent-context.update', optional: true },
      { event: 'after_implement', command: 'speckit.git.push', optional: true },
    ])
  })
  test('the hooks around a next command', () => {
    expect(hooksFor(parseExtensions(YAML), '/speckit-plan')).toEqual({ before: ['/speckit-git-commit'], after: ['/speckit-agent-context-update (optional)'] })
    expect(hooksFor(parseExtensions(YAML), '/speckit-tasks')).toEqual({ before: [], after: [] })
  })
  test('anything else is no hooks, never an error', () => {
    expect(parseExtensions('')).toEqual([])
    expect(parseExtensions(': not yaml : [')).toEqual([])
  })
})

describe('[P] tasks (020c #19)', () => {
  const t = (id: string, text: string, isDone = false) => ({ id, text, isDone, line: 1 })
  test('the parallel run at the head of the open tasks', () => {
    const tasks = [t('T001', 'done', true), t('T002', '[P] a'), t('T003', '[P] [US1] b'), t('T004', 'c'), t('T005', '[P] d')]
    expect(parallelTasks(tasks)).toEqual(['T002', 'T003'])
  })
  test('one [P] task alone is not a parallel run', () => {
    expect(parallelTasks([t('T002', '[P] a'), t('T003', 'b')])).toEqual([])
  })
})
