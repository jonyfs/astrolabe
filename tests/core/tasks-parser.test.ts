import { describe, expect, test } from 'claude-code/testing'

import { currentTaskOf, parseTasks } from '../../hooks/core/tasks-parser'

describe('parseTasks', () => {
  test('counts unticked, lowercase and uppercase ticks', () => {
    const tasks = parseTasks('- [ ] T001 one\n- [x] T002 two\n- [X] T003 three\n')
    expect(tasks.map(t => t.isDone)).toEqual([false, true, true])
    expect(tasks.map(t => t.id)).toEqual(['T001', 'T002', 'T003'])
  })
  test('accepts * bullets and indented checkboxes', () => {
    const tasks = parseTasks('* [ ] a\n    - [x] b\n\t- [ ] c\n')
    expect(tasks.length).toBe(3)
    expect(tasks[1]?.isDone).toBe(true)
  })
  test('rejects malformed checkboxes without throwing', () => {
    const tasks = parseTasks('- [] a\n- [ x] b\n-[ ] c\n- [ ]no-space\n- [y] d\n[ ] e\n')
    expect(tasks).toEqual([])
  })
  test('keeps only lines with an id once any task has one', () => {
    const tasks = parseTasks('- [ ] T001 real\n- [x] stray checklist item\n- [ ] T002 real too\n')
    expect(tasks.map(t => t.id)).toEqual(['T001', 'T002'])
  })
  test('counts every checkbox when none has an id', () => {
    expect(parseTasks('- [ ] a\n- [x] b\n').length).toBe(2)
  })
  test('text drops the id, keeps the rest trimmed; line is 1-based', () => {
    const [task] = parseTasks('# Tasks\n\n- [ ] T014 [P] [US1] write the parser   \n')
    expect(task).toEqual({ id: 'T014', text: '[P] [US1] write the parser', isDone: false, line: 3 })
  })
  test('an id is only the first token, not a mention later in the line', () => {
    const [task] = parseTasks('- [ ] fix the bug found in T009\n')
    expect(task?.id).toBeUndefined()
  })
  test('accepts a bold id', () => {
    expect(parseTasks('- [ ] **T007** bold\n')[0]?.id).toBe('T007')
  })
  test('ignores checkboxes inside fenced code blocks', () => {
    const tasks = parseTasks('- [ ] T001 a\n```text\n- [ ] T999 example\n```\n- [x] T002 b\n')
    expect(tasks.map(t => t.id)).toEqual(['T001', 'T002'])
  })
  test('handles CRLF line endings', () => {
    expect(parseTasks('- [ ] T001 a\r\n- [X] T002 b\r\n').map(t => [t.id, t.text])).toEqual([
      ['T001', 'a'],
      ['T002', 'b'],
    ])
  })
  test('empty input has no tasks', () => {
    expect(parseTasks('')).toEqual([])
  })
})

describe('currentTaskOf', () => {
  test('is the first unticked task in file order', () => {
    const tasks = parseTasks('- [x] T001 a\n- [ ] T002 b\n- [ ] T003 c\n')
    expect(currentTaskOf(tasks)).toEqual({ id: 'T002', text: 'b' })
  })
  test('is undefined when everything is ticked', () => {
    expect(currentTaskOf(parseTasks('- [x] T001 a\n'))).toBeUndefined()
  })
})

describe('parseTasks: hand-edited files', () => {
  test('an id followed by a colon or a period is still an id', () => {
    const tasks = parseTasks('- [ ] T001: a\n- [ ] T002. b\n- [ ] T003 c\n')
    expect(tasks.map(t => [t.id, t.text])).toEqual([
      ['T001', 'a'],
      ['T002', 'b'],
      ['T003', 'c'],
    ])
  })
  test('a fence closes only with its own marker', () => {
    const tasks = parseTasks('- [ ] T001 a\n```md\n~~~\n- [ ] T998 still inside\n```\n- [ ] T002 b\n')
    expect(tasks.map(t => t.id)).toEqual(['T001', 'T002'])
  })
})
