import { describe, expect, test } from 'claude-code/testing'

import { footerChips, footerText, resetOf, shortModel } from '../../hooks/core/footer'
import { iconSet } from '../../hooks/core/icons'

const NOW = Date.UTC(2026, 9, 7, 12, 0)
const reset = new Date(NOW + 2 * 3600_000).toISOString()
const at = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const full = {
  speckit: () => '◆ 002 · implement 45%',
  readings: [
    { kind: 'five_hour', percentUsed: 42, resetsAt: reset },
    { kind: 'seven_day', percentUsed: 83, resetsAt: new Date(NOW + 5 * 86_400_000).toISOString() },
  ],
  context: { percent: 61 },
  model: 'claude-opus-5-5',
  effort: 'high',
  git: { branch: 'main', ahead: 2, behind: 1, changed: 3, conflicts: 0 },
  startedAt: NOW - 65 * 60_000,
  now: NOW,
}

describe('the footer (018 FR-001, FR-002)', () => {
  test('every part in order, ascii icons', () => {
    const text = footerText({ ...full, icons: iconSet('ascii'), columns: 200 })
    expect(text).toBe(
      `◆ 002 · implement 45% · 7d 83% hold (${resetOf(full.readings[1]!.resetsAt, full.now)}) · 5h 42% (${resetOf(reset, full.now)}) · ctx 61% · opus 5.5 high · git:main ^2 v1 ~3 · t 1h05m`,
    )
  })

  test('resets: a countdown within a day, a weekday and clock beyond it (041 #2)', () => {
    const now = Date.parse('2026-10-07T10:00:00Z')
    expect(resetOf(new Date(now + 2 * 3_600_000 + 13 * 60_000).toISOString(), now)).toBe('2h13m')
    expect(resetOf(new Date(now + 45 * 60_000).toISOString(), now)).toBe('45m')
    const later = new Date(now + 3 * 86_400_000)
    expect(resetOf(later.toISOString(), now)).toMatch(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d\d:\d\d$/)
    expect(resetOf(new Date(now - 1000).toISOString(), now)).toBeUndefined()
  })

  test('paused: the first chip, in red, says until when (047 #65)', () => {
    const chips = footerChips({ ...full, readings: [{ kind: 'five_hour', percentUsed: 92, resetsAt: reset }], icons: iconSet('nerd'), columns: 200 })
    expect(chips[0]?.colour).toBe('red')
    expect(chips[0]?.text).toMatch(/^5h 92% ceiling · paused until \d\d:\d\d$/)
    expect(chips[1]?.key).toBe('speckit')
  })

  test('at or past 100% a window reads full (041 #3)', () => {
    const text = footerText({ ...full, readings: [{ kind: 'five_hour', percentUsed: 30, resetsAt: reset }, { kind: 'seven_day', percentUsed: 100, resetsAt: new Date(NOW + 5 * 86_400_000).toISOString() }], icons: iconSet('ascii'), columns: 200 })
    expect(text).toContain('7d full ceiling')
  })
  test('a burn chip: points an hour and where the window lands at the reset (041 #4)', () => {
    const text = footerText({ ...full, burn: 10, icons: iconSet('ascii'), columns: 200 })
    // 7d decides at 83% (hold); its reset is 5 days out, so it lands at 100%.
    expect(text).toContain('burn 10/h → 100%')
    expect(footerText({ ...full, burn: 0, icons: iconSet('ascii'), columns: 200 })).not.toContain('/h')
  })
  test('past 85% the context chip says to compact (054 #43)', () => {
    expect(footerText({ ...full, context: { percent: 86 }, icons: iconSet('ascii'), columns: 200 })).toContain('ctx 86% compact soon')
    expect(footerText({ ...full, context: { percent: 84 }, icons: iconSet('ascii'), columns: 200 })).not.toContain('compact soon')
  })

  test('nerd icons sit before their values', () => {
    const text = footerText({ ...full, icons: iconSet('nerd'), columns: 200 })
    expect(text).toContain(' main ↑2 ↓1  3')
    expect(text).toContain(' opus 5.5 high')
    expect(text).toContain(' 61%')
  })

  test('narrow: duration, then git, then model go first; Spec Kit and the binding window stay', () => {
    const widths = [200, 110, 90, 70, 50, 30]
    const texts = widths.map(columns => footerText({ ...full, icons: iconSet('ascii'), columns }))
    for (const [i, text] of texts.entries()) {
      expect([...text].length <= widths[i]! || i === texts.length - 1).toBe(true)
      expect(text.startsWith('◆ 002')).toBe(true)
    }
    expect(texts[1]).not.toContain('1h05m')
    expect(texts.at(-1)).toContain('7d 83% hold')
  })

  test('missing data is left out, never shown empty', () => {
    const text = footerText({ speckit: () => '◆ no Spec Kit', readings: [], now: NOW, icons: iconSet('ascii'), columns: 120 })
    expect(text).toBe('◆ no Spec Kit')
  })

  test('a renewed window says so', () => {
    const past = new Date(NOW - 60_000).toISOString()
    const text = footerText({ speckit: () => '◆ 002', readings: [{ kind: 'five_hour', percentUsed: 95, resetsAt: past }], now: NOW, icons: iconSet('ascii'), columns: 120 })
    expect(text).toBe('◆ 002 · 5h renewed')
  })

  test('model names', () => {
    expect(shortModel('claude-opus-5-5')).toBe('opus 5.5')
    expect(shortModel('claude-sonnet-5-5[1m]')).toBe('sonnet 5.5 1M')
    expect(shortModel('claude-haiku-4-5-20251001')).toBe('haiku 4.5')
    expect(shortModel('claude-fable-5-1')).toBe('fable 5.1')
    expect(shortModel('gpt-x')).toBe('gpt-x')
  })
})
