import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { kpisMarkdown } from '../../hooks/core/dashboard'

// 054 #99: /astrolabe kpis prints the Dashboard's numbers as Markdown for a PR body.
describe('/astrolabe kpis (054 #99)', () => {
  test('a two-column table, pipes escaped and control characters dropped', () => {
    expect(kpisMarkdown('Session numbers for 002 x', [['turns', '3'], ['a|b', 'c\u001b[31m']])).toBe(
      ['### Session numbers for 002 x', '', '| | |', '|---|---|', '| turns | 3 |', '| a\\|b | c[31m |'].join('\n'),
    )
  })

  test('the command lists the active feature tasks and the session turns', async ($, on) => {
    installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 'r1', reason: 'answer' } as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'kpis' } as never)) as { text: string }
    const lines = ran.text.split('\n')
    expect(lines[0]).toMatch(/^### Session numbers for 002 /)
    expect(lines).toContain('|---|---|')
    expect(lines.some(l => /^\| tasks \| \d+\/\d+ \|$/.test(l))).toBe(true)
    expect(lines.some(l => /^\| turns \| \d+ \|$/.test(l))).toBe(true)
  })
})
