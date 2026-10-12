import { describe, expect, test } from 'claude-code/testing'

import { groupOpenTasks } from '../../hooks/core/task-groups'
import { parseTasks } from '../../hooks/core/tasks-parser'

// 054 #27: the Tasks tab groups open tasks by where they stand.
const open = (text: string) => parseTasks(text).filter(t => !t.isDone)
const groups = (text: string, current?: string) => groupOpenTasks(open(text), current).map(g => g.group)

describe('groupOpenTasks', () => {
  test('current, then the next one, then the rest', () => {
    const text = '- [ ] T001 a\n- [ ] T002 b\n- [ ] T003 c\n'
    expect(groups(text, 'T001')).toEqual(['current', 'next', 'later'])
  })
  test('a task that depends on an earlier open one is blocked', () => {
    const text = '- [ ] T001 a\n- [ ] T002 b depends on T001\n- [ ] T003 c\n'
    expect(groups(text)).toEqual(['next', 'blocked', 'later'])
  })
  test('a dependency already done does not block', () => {
    const text = '- [x] T001 a\n- [ ] T002 b depends on T001\n- [ ] T003 c\n'
    expect(groups(text)).toEqual(['next', 'later'])
  })
  test('a [P] run opened by the next task stays in next', () => {
    const text = '- [ ] T001 [P] a\n- [ ] T002 [P] b\n- [ ] T003 c\n'
    expect(groups(text)).toEqual(['next', 'next', 'later'])
  })
})
