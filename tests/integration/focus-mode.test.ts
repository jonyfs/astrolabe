import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { focusNote, taskFiles } from '../../hooks/core/spec-actions'

// 054 #88: focus mode tells Claude to change only the files the current task names.
const submit = ($: never, text: string) =>
  ($ as unknown as { prompt: { submit: (e: never) => Promise<unknown> } }).prompt.submit({ text, origin: { kind: 'composer' } } as never)
const run = ($: never, args: string, kind = 'composer') =>
  ($ as unknown as { command: { run: (e: never) => Promise<{ text: string }> } }).command.run({ command: 'astrolabe', args, origin: { kind } } as never)

describe('focus mode (054 #88)', () => {
  test('the files a task names', () => {
    expect(taskFiles('T010 [P] Add `hooks/core/pane.ts` and tests/unit/pane.test.ts, then README.md')).toEqual(['hooks/core/pane.ts', 'tests/unit/pane.test.ts', 'README.md'])
    expect(taskFiles('Bump to 0.110.0 and say so')).toEqual([])
    expect(focusNote({ id: 'T010', text: 'Edit `hooks/register.tsx`' })).toBe('focus mode is on: change only hooks/register.tsx')
    expect(focusNote({ id: 'T010', text: 'task 10' })).toBe('focus mode is on: change only what task T010 needs and no other file')
  })

  test('on, the context line carries the clause; off, it goes away; only the person switches it', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect((await run($ as never, 'focus on', 'sdk')).text).toBe('Only you can turn focus mode on or off: type the command yourself.')
    expect((await run($ as never, 'focus on')).text).toContain('Focus mode is on')
    expect((await run($ as never, 'focus')).text).toBe('Focus mode is on.')
    await submit($ as never, 'go on')
    const told = session.contexts.flat().filter(t => t.startsWith('Astrolabe:'))
    expect(told.at(-1)).toContain('; focus mode is on: change only what task T010 needs and no other file.')
    await run($ as never, 'focus off')
    await submit($ as never, 'go on')
    expect(session.contexts.flat().filter(t => t.startsWith('Astrolabe:')).at(-1)).not.toContain('focus mode')
  })
})
