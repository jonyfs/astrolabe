import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { recapLine, recapOf } from '../../hooks/core/summary'

// 054 #92: /astrolabe recap lists the last 5 turns on the feature.
describe('/astrolabe recap (054 #92)', () => {
  test('one line per answer, no control characters, at most 140 cells', () => {
    expect(recapLine('\n\n## Done: T010 ticked\nmore text')).toBe('Done: T010 ticked')
    expect(recapLine('a\u001b[31mb')).toBe('a[31mb')
    expect(recapLine('x'.repeat(300))).toHaveLength(140)
    expect(recapOf([{ id: '001', text: 'a' }, { id: '002', text: 'b' }], '002')).toEqual([{ id: '002', text: 'b' }])
  })

  test('the last answers on the active feature, oldest first', async ($, on) => {
    installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    for (let i = 1; i <= 6; i += 1) await $.turn.complete({ answer: `Turn ${i}: worked on T010\nmore`, durationMs: 1, isAborted: false, turnId: `r${i}`, reason: 'answer' } as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'recap' } as never)) as { text: string }
    const lines = ran.text.split('\n')
    expect(lines[0]).toBe('Recent turns on 002:')
    expect(lines).toHaveLength(6)
    expect(lines[1]).toContain('Turn 2: worked on T010')
    expect(lines[5]).toContain('Turn 6: worked on T010')
  })
})
