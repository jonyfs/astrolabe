import { describe, expect, test } from 'claude-code/testing'

import { detectDrift, namedPaths, newlyTicked, withEdit, withShell } from '../../hooks/core/drift'
import { emptyWindow } from '../../hooks/core/types'

describe('newlyTicked (FR-004)', () => {
  test('tasks open before and ticked after', () => {
    const before = '- [ ] T001 a\n- [ ] T002 b\n- [x] T003 c\n'
    const after = '- [x] T001 a\n- [ ] T002 b\n- [x] T003 c\n'
    expect(newlyTicked(before, after).map(t => t.id)).toEqual(['T001'])
  })
  test('unticking, reordering or no previous text tick nothing', () => {
    expect(newlyTicked('- [x] T001 a\n', '- [ ] T001 a\n')).toEqual([])
    expect(newlyTicked('- [ ] T001 a\n- [ ] T002 b\n', '- [ ] T002 b\n- [ ] T001 a\n')).toEqual([])
    expect(newlyTicked(undefined, '- [x] T001 a\n')).toEqual([])
  })
  test('tasks without ids are matched by text', () => {
    expect(newlyTicked('- [ ] tidy up\n', '- [X] tidy up\n').map(t => t.text)).toEqual(['tidy up'])
  })
})

describe('namedPaths', () => {
  test('backticked and bare paths with an extension or a slash', () => {
    expect(namedPaths('Write tests in `tests/core/x.test.ts` and update hooks/core/x.ts and README.md')).toEqual([
      'tests/core/x.test.ts',
      'hooks/core/x.ts',
      'README.md',
    ])
  })
  test('ignores markers, versions and prose', () => {
    expect(namedPaths('[P] [US1] Bump to 0.5.0, see FR-001. e.g. done')).toEqual([])
  })
})

describe('detectDrift (FR-005)', () => {
  const tick = { id: 'T014', text: 'Write the parser', isDone: true, line: 3 }
  test('no code edited since the last tick', () => {
    expect(detectDrift(tick, emptyWindow())).toBe('🧭 T014 was ticked with no code edited since the last tick')
  })
  test('a code edit in the window keeps quiet', () => {
    expect(detectDrift(tick, withEdit(emptyWindow(), 'src/x.ts'))).toBeUndefined()
  })
  test('named files: one of them must have been edited', () => {
    const named = { ...tick, text: 'Write `tests/core/x.test.ts` for hooks/core/x.ts' }
    expect(detectDrift(named, withEdit(emptyWindow(), 'src/y.ts'))).toBe(
      '🧭 T014 was ticked, but none of its files were edited: tests/core/x.test.ts, hooks/core/x.ts',
    )
    expect(detectDrift(named, withEdit(emptyWindow(), 'hooks/core/x.ts'))).toBeUndefined()
  })
  test('a Bash or Agent call in the window keeps quiet', () => {
    expect(detectDrift(tick, withShell(emptyWindow()))).toBeUndefined()
  })
  test('a task without an id is quoted', () => {
    expect(detectDrift({ text: 'tidy up the parser module before the release', isDone: true, line: 1 }, emptyWindow())).toBe(
      '🧭 "tidy up the parser module before the rel…" was ticked with no code edited since the last tick',
    )
  })
  test('withEdit keeps paths unique', () => {
    expect(withEdit(withEdit(emptyWindow(), 'a.ts'), 'a.ts').edits).toEqual(['a.ts'])
  })
})

describe('review fixes', () => {
  test('namedPaths ignores dotted identifiers, domains, emails and dot-names', () => {
    expect(namedPaths('Hook `ui.render` and fs.read, Node.js, JSON.parse, memo.window, github.com/jonyfs/astrolabe, jony@x.io, .git')).toEqual([])
    expect(namedPaths('Edit `hooks/register.tsx`, README.md and scripts/run.sh')).toEqual(['hooks/register.tsx', 'README.md', 'scripts/run.sh'])
  })
  test('one drift toast per window', () => {
    const tick = { id: 'T014', text: 'x', isDone: true, line: 1 }
    expect(detectDrift(tick, { ...emptyWindow(), alarmed: true })).toBeUndefined()
  })
  test('case folding on Windows roots', () => {
    const tick = { id: 'T014', text: 'Edit `src/x.ts`', isDone: true, line: 1 }
    expect(detectDrift(tick, withEdit(emptyWindow(), 'SRC/X.ts'), true)).toBeUndefined()
    expect(detectDrift(tick, withEdit(emptyWindow(), 'SRC/X.ts'), false)).toBeDefined()
  })
  test('the window keeps at most 200 paths', () => {
    let w = emptyWindow()
    for (let i = 0; i < 250; i += 1) w = withEdit(w, `f${i}.ts`)
    expect(w.edits.length).toBe(200)
  })
})
