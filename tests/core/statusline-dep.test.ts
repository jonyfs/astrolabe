import { describe, expect, test } from 'claude-code/testing'

import {
  buildPayload,
  chooseSource,
  cutRuns,
  isFallback,
  parseAnsiLines,
  parseRunsOutput,
  plainOf,
  statuslineEnv,
  type Run,
} from '../../hooks/core/statusline-dep'
import { textWidth } from '../../hooks/core/footer'

const ESC = '\x1b'

describe('parseAnsiLines (070 FR-008)', () => {
  test('24-bit colour, bold and a reset make runs', () => {
    const out = `${ESC}[48;2;49;50;68m${ESC}[38;2;255;255;255m${ESC}[1m main ${ESC}[0m plain\n`
    const [line] = parseAnsiLines(out)
    expect(line).toEqual([
      { text: ' main ', fg: '#ffffff', bg: '#313244', bold: true },
      { text: ' plain' },
    ])
  })
  test('256 and 16 colour, dim, underline and 4:4', () => {
    const [line] = parseAnsiLines(`${ESC}[38;5;196mA${ESC}[0m${ESC}[91mB${ESC}[0m${ESC}[2mC${ESC}[22m${ESC}[4:4mD${ESC}[24m`)
    expect(line).toEqual([
      { text: 'A', fg: '#ff0000' },
      { text: 'B', fg: 'ansi:9' },
      { text: 'C', dim: true },
      { text: 'D', underline: true },
    ])
  })
  test('OSC 8 links end with BEL or ST and wrap text', () => {
    const out = `${ESC}]8;;https://github.com/o/r\x07repo${ESC}]8;;\x07 and ${ESC}]8;;https://x.test/p${ESC}\\pr${ESC}]8;;${ESC}\\\n`
    const [line] = parseAnsiLines(out)
    expect(line).toEqual([
      { text: 'repo', href: 'https://github.com/o/r' },
      { text: ' and ' },
      { text: 'pr', href: 'https://x.test/p' },
    ])
  })
  test('other sequences are dropped, an unterminated OSC eats nothing past the line', () => {
    const [a, b, c] = parseAnsiLines(`${ESC}[2Jhello${ESC}[?25l world\n${ESC}]8;;https://u.test no end\nnext\n`)
    expect(plainOf([a!])[0]).toBe('hello world')
    expect(plainOf([c!])[0]).toBe('next')
    // Nothing tells where it ends: the rest of the line goes, the next line is untouched.
    expect(plainOf([b!])[0]).toBe('')
  })
  test('control characters other than the newline are dropped, blank trailing lines too', () => {
    const lines = parseAnsiLines('a\x07b\x00c\n\n\n')
    expect(plainOf(lines)).toEqual(['abc'])
  })
  test('file and javascript links are kept only for http, https and file', () => {
    const [line] = parseAnsiLines(`${ESC}]8;;javascript:alert(1)\x07x${ESC}]8;;\x07${ESC}]8;;file:///a/b\x07y${ESC}]8;;\x07`)
    expect(line).toEqual([{ text: 'x' }, { text: 'y', href: 'file:///a/b' }])
  })
})

describe('isFallback (070 FR-008)', () => {
  test('the renderer prints its own failure line and exits 0', () => {
    expect(isFallback([' statusline unavailable '])).toBe(true)
    expect(isFallback([' ! statusline unavailable '])).toBe(true)
    expect(isFallback([' statusline needs Node 18+ '])).toBe(true)
    expect(isFallback(['main ⎇ 5h 42%'])).toBe(false)
    expect(isFallback([])).toBe(true)
    expect(isFallback(['', '  '])).toBe(true)
  })
})

describe('buildPayload (070 FR-007)', () => {
  test('rate limits convert to used_percentage and epoch seconds; context sends two fields', () => {
    const p = buildPayload({
      rateLimits: [
        { kind: 'five_hour', percentUsed: 42.4, resetsAt: '2026-10-12T14:00:00.000Z' },
        { kind: 'seven_day', percentUsed: 81, resetsAt: '2026-10-19T10:00:00.000Z' },
      ],
      context: { percent: 41, window: 200_000, tokens: 82_000 },
      sessionId: 's1',
      cwd: '/p',
      model: { id: 'claude-opus-5-5', displayName: 'Opus 5.5' },
      effort: 'high',
    })
    expect(p.rate_limits?.five_hour).toEqual({ used_percentage: 42.4, resets_at: Date.parse('2026-10-12T14:00:00.000Z') / 1000 })
    expect(p.rate_limits?.seven_day?.resets_at).toBe(Date.parse('2026-10-19T10:00:00.000Z') / 1000)
    expect(p.context_window).toEqual({ used_percentage: 41, context_window_size: 200_000 })
    expect(p.session_id).toBe('s1')
    expect(p.workspace).toEqual({ current_dir: '/p', project_dir: '/p' })
    expect(p.cwd).toBe('/p')
    expect(p.model).toEqual({ id: 'claude-opus-5-5', display_name: 'Opus 5.5' })
    expect(p.effort).toBe('high')
  })
  test('what the mod does not have is left out, never zero or made up', () => {
    const p = buildPayload({ rateLimits: [{ kind: 'five_hour', percentUsed: 10 }] })
    expect(p.rate_limits?.five_hour).toEqual({ used_percentage: 10 })
    expect(p.rate_limits?.seven_day).toBeUndefined()
    expect(p.context_window).toBeUndefined()
    expect(p.model).toBeUndefined()
    expect(p.session_id).toBeUndefined()
    expect(p.workspace).toBeUndefined()
    expect('transcript_path' in p).toBe(false)
  })
  test('an unparsable reset is left out; a transcript path is passed on when known', () => {
    const p = buildPayload({ rateLimits: [{ kind: 'five_hour', percentUsed: 10, resetsAt: 'soon' }], transcriptPath: '/t.jsonl' })
    expect(p.rate_limits?.five_hour).toEqual({ used_percentage: 10 })
    expect(p.transcript_path).toBe('/t.jsonl')
  })
  test('windows of the same kind keep the highest reading', () => {
    const p = buildPayload({ rateLimits: [{ kind: 'seven_day', percentUsed: 20 }, { kind: 'seven_day', percentUsed: 30 }] })
    expect(p.rate_limits?.seven_day?.used_percentage).toBe(30)
  })
})

describe('statuslineEnv (070 FR-006)', () => {
  test('width, height, colour depth and the switches the mod always sets', () => {
    const env = statuslineEnv({ columns: 96, lines: 2, flavor: 'mocha', ascii: false })
    expect(env).toEqual({
      COLUMNS: '96',
      LINES: '2',
      COLORTERM: 'truecolor',
      CLAUDE_STATUSLINE_UPDATES: 'off',
      CLAUDE_STATUSLINE_DEBUG: '0',
      CLAUDE_STATUSLINE_OUTPUT: 'runs',
      CLAUDE_STATUSLINE_FLAVOR: 'mocha',
    })
  })
  test('ascii adds the ASCII switch; the theme-following flavor sets none', () => {
    expect(statuslineEnv({ columns: 80, lines: 3, flavor: 'latte', ascii: true })['CLAUDE_STATUSLINE_ASCII']).toBe('1')
    expect('CLAUDE_STATUSLINE_FLAVOR' in statuslineEnv({ columns: 80, lines: 3, flavor: 'theme', ascii: false })).toBe(false)
  })
})

describe('chooseSource (070 FR-010)', () => {
  const ok = { choice: 'statusline', flavor: 'mocha', node: 'ok', copy: true, failing: false } as const
  test('statusline when everything is there', () => {
    expect(chooseSource(ok)).toEqual({ source: 'statusline' })
  })
  const cases: Array<[Parameters<typeof chooseSource>[0], string]> = [
    [{ ...ok, choice: 'native' as const }, 'native-chosen'],
    [{ ...ok, flavor: 'colorblind' }, 'colorblind'],
    [{ ...ok, node: 'missing' as const }, 'node-missing'],
    [{ ...ok, node: 'old' as const }, 'node-old'],
    [{ ...ok, copy: false }, 'no-copy'],
    [{ ...ok, failing: true }, 'renderer-failed'],
  ]
  for (const [input, reason] of cases) {
    test(`falls back with its reason: ${reason}`, () => {
      expect(chooseSource(input)).toEqual({ source: 'native', reason })
    })
  }
})

describe('cutRuns (070 R6)', () => {
  const runs: Run[] = [{ text: 'abc', fg: '#111111' }, { text: 'def', href: 'https://x.test' }, { text: 'ghi' }]
  test('whole characters, runs keep their style, links stay on the cut run', () => {
    expect(cutRuns(runs, 5)).toEqual([{ text: 'abc', fg: '#111111' }, { text: 'de', href: 'https://x.test' }])
    expect(cutRuns(runs, 9)).toEqual(runs)
    expect(cutRuns(runs, 0)).toEqual([])
  })
  test('a double-width character is never split', () => {
    const wide: Run[] = [{ text: 'a🧭b' }]
    const cut = cutRuns(wide, 2)
    expect(textWidth(cut.map(r => r.text).join(''))).toBeLessThanOrEqual(2)
    expect(cut.map(r => r.text).join('')).toBe('a')
  })
  test('Nerd Font glyphs count one cell', () => {
    const nerd: Run[] = [{ text: '\u{F00E8}abc' }]
    expect(cutRuns(nerd, 3)).toEqual([{ text: '\u{F00E8}a' }])
  })
})

describe('parseRunsOutput (076, statusline spec 056 FR-001 and FR-003)', () => {
  const obj = (v: unknown) => JSON.stringify(v)
  test('a runs object gives lines of runs; unknown fields and empty text are dropped', () => {
    const out = parseRunsOutput(obj({ contract: 1, lines: [[{ text: ' app ', fg: '#CDD6F4', bg: '#313244', bold: true, extra: 1 }, { text: '' }, { text: 'main', href: 'https://x.test/a' }]] }))
    expect(out).toEqual({
      kind: 'runs',
      contract: 1,
      lines: [[{ text: ' app ', fg: '#cdd6f4', bg: '#313244', bold: true }, { text: 'main', href: 'https://x.test/a' }]],
    })
  })
  test('a link outside http, https and file keeps its text and loses the link; control characters go', () => {
    const out = parseRunsOutput(obj({ contract: 1, lines: [[{ text: 'a\u001b[31mb', href: 'javascript:alert(1)' }]] }))
    expect(out).toEqual({ kind: 'runs', contract: 1, lines: [[{ text: 'a[31mb' }]] })
  })
  test('a colour that is not #rrggbb is left out; a style that is not true is off', () => {
    const out = parseRunsOutput(obj({ contract: 1, lines: [[{ text: 'x', fg: 'red', bg: '#12', bold: 'yes', dim: false }]] }))
    expect(out).toEqual({ kind: 'runs', contract: 1, lines: [[{ text: 'x' }]] })
  })
  test('empty status is no lines, and trailing blank lines are dropped', () => {
    expect(parseRunsOutput(obj({ contract: 1, lines: [] }))).toEqual({ kind: 'runs', contract: 1, lines: [] })
    expect(parseRunsOutput(obj({ contract: 1, lines: [[{ text: 'a' }], [{ text: '  ' }]] }))).toMatchObject({ lines: [[{ text: 'a' }]] })
  })
  test('an error object names the code; a missing code is internal', () => {
    expect(parseRunsOutput(obj({ contract: 1, error: { code: 'bad-payload', message: 'not an object' } }))).toEqual({ kind: 'error', contract: 1, code: 'bad-payload', message: 'not an object' })
    expect(parseRunsOutput(obj({ contract: 1, error: {} }))).toMatchObject({ kind: 'error', code: 'internal' })
  })
  test('a newer contract is not read', () => {
    expect(parseRunsOutput(obj({ contract: 2, lines: [[{ text: 'a' }]] }))).toEqual({ kind: 'newer', contract: 2 })
  })
  test('ANSI text, other JSON and broken JSON are the ANSI path', () => {
    expect(parseRunsOutput('\u001b[1mmain\u001b[0m\n')).toEqual({ kind: 'ansi' })
    expect(parseRunsOutput('{"hello":1}')).toEqual({ kind: 'ansi' })
    expect(parseRunsOutput('{"contract":1,')).toEqual({ kind: 'ansi' })
    expect(parseRunsOutput('')).toEqual({ kind: 'ansi' })
  })
  test('a newer contract picks the native footer with its reason', () => {
    expect(chooseSource({ choice: 'statusline', flavor: 'mocha', node: 'ok', copy: true, failing: false, contractNewer: true })).toEqual({ source: 'native', reason: 'contract-newer' })
  })
})
