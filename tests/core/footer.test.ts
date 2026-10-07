import { describe, expect, test } from 'claude-code/testing'

import { footerText, shortModel } from '../../hooks/core/footer'
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
  cost: 1.2,
  startedAt: NOW - 65 * 60_000,
  now: NOW,
}

describe('the footer (018 FR-001, FR-002)', () => {
  test('every part in order, ascii icons', () => {
    const text = footerText({ ...full, icons: iconSet('ascii'), columns: 200 })
    expect(text).toBe(
      `◆ 002 · implement 45% · 7d 83% hold (${at(full.readings[1]!.resetsAt)}) · 5h 42% (${at(reset)}) · ctx 61% · opus 5.5 high · git:main ^2 v1 ~3 · $1.20 · t 1h05m`,
    )
  })

  test('nerd icons sit before their values', () => {
    const text = footerText({ ...full, icons: iconSet('nerd'), columns: 200 })
    expect(text).toContain(' main ↑2 ↓1  3')
    expect(text).toContain(' opus 5.5 high')
    expect(text).toContain(' 61%')
  })

  test('narrow: duration, then cost, then git, then model go first; Spec Kit and the binding window stay', () => {
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
    expect(shortModel('claude-sonnet-5-5[1m]')).toBe('sonnet 5.5')
    expect(shortModel('claude-haiku-4-5-20251001')).toBe('haiku 4.5')
    expect(shortModel('claude-fable-5-1')).toBe('fable 5.1')
    expect(shortModel('gpt-x')).toBe('gpt-x')
  })
})
