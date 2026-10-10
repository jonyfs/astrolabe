import { describe, expect, test } from 'claude-code/testing'

import { footerChips, rampOf } from '../../hooks/core/footer'
import { iconSet } from '../../hooks/core/icons'

// Spec 039: the pane footer in statusline's colours, as Powerline chips.
const NOW = Date.UTC(2026, 9, 7, 12, 0)

describe('statusline colours (039)', () => {
  test('the ramp: green below 60, yellow to 85 with ▵, red above with ▴', () => {
    expect(rampOf(41)).toEqual({ colour: 'green', mark: '' })
    expect(rampOf(72)).toEqual({ colour: 'yellow', mark: '▵' })
    expect(rampOf(94)).toEqual({ colour: 'red', mark: '▴' })
  })
  test('chips: Spec Kit mauve, windows ramped with their mark, model red, git lavender (no cost: 054)', () => {
    const chips = footerChips({
      speckit: () => '◆ 002 · implement 45%',
      readings: [{ kind: 'five_hour', percentUsed: 72, resetsAt: new Date(NOW + 3600_000).toISOString() }],
      context: { percent: 90 },
      model: 'claude-opus-5-5',
      git: { branch: 'main', ahead: 0, behind: 0, changed: 0, conflicts: 0 },
      now: NOW,
      icons: iconSet('emoji'),
      columns: 200,
    })
    expect(chips.map(c => c.colour)).toEqual(['mauve', 'yellow', 'red', 'red', 'lavender'])
    expect(chips[1]?.text.endsWith('▵')).toBe(true)
    // The context ramps in colour only, as statusline does.
    expect(chips[2]?.text.endsWith('▴')).toBe(false)
  })
  test('a Spec Kit chip cut to fit keeps its whole text for the hover (052 #45)', () => {
    const speckit = (columns?: number) => (columns === undefined ? '◆ 002 band-hint · implement 45%' : '◆ 002 band…')
    const input = { speckit, readings: [], git: { branch: 'main', ahead: 0, behind: 0, changed: 0, conflicts: 0 }, now: NOW, icons: iconSet('emoji') }
    const cut = footerChips({ ...input, columns: 30 }).find(c => c.key === 'speckit')
    expect(cut?.text).toBe('◆ 002 band…')
    expect(cut?.full).toBe('◆ 002 band-hint · implement 45%')
    const fits = footerChips({ ...input, columns: 200, speckit: () => '◆ 002 · implement' }).find(c => c.key === 'speckit')
    expect(fits?.full).toBeUndefined()
  })
  test('branch and PR links are retained on their git chip', () => {
    const chips = footerChips({
      speckit: () => '',
      readings: [],
      git: { branch: 'main', remote: 'https://github.com/o/r', ahead: 0, behind: 0, changed: 0, conflicts: 0, pr: { number: 31, checks: 'pass', url: 'https://github.com/o/r/pull/31' } },
      now: NOW,
      icons: iconSet('ascii'),
      columns: 200,
    })
    expect(chips[0]).toMatchObject({
      text: 'git:main PR#31 ok',
      links: [
        { text: 'main', href: 'https://github.com/o/r/tree/main' },
        { text: '#31', href: 'https://github.com/o/r/pull/31' },
      ],
    })
  })
})
