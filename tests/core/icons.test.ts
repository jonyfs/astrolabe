import { describe, expect, test } from 'claude-code/testing'

import { ICON_KEYS, iconSet, iconsFor, markText } from '../../hooks/core/icons'

describe('icon sets (018 FR-004)', () => {
  test('auto is Nerd Font in the terminal and emoji elsewhere', () => {
    expect(iconsFor('auto', 'terminal')).toBe('nerd')
    for (const surface of ['desktop', 'vscode', 'mobile', null] as const) expect(iconsFor('auto', surface)).toBe('emoji')
    expect(iconsFor('ascii', 'terminal')).toBe('ascii')
    expect(iconsFor('nerd', 'desktop')).toBe('nerd')
    expect(iconsFor('bogus', 'terminal')).toBe('nerd')
  })

  test('every set has every icon, and ascii is printable ASCII', () => {
    for (const name of ['nerd', 'emoji', 'ascii'] as const) {
      const set = iconSet(name)
      for (const key of ICON_KEYS) expect(typeof set[key]).toBe('string')
    }
    for (const key of ICON_KEYS) expect(/^[\x20-\x7e]*$/.test(iconSet('ascii')[key])).toBe(true)
  })

  test('nerd glyphs are single code points in the Private Use Area or plain arrows', () => {
    for (const key of ICON_KEYS) {
      const glyph = iconSet('nerd')[key]
      expect([...glyph].length).toBe(1)
    }
  })
})

describe('the pane marks (052 #47, #49)', () => {
  test('ascii and words', () => {
    expect(markText('▸ ◐↑002 b  ⟳ x', 'unicode')).toBe('▸ ◐↑002 b  ⟳ x')
    expect(markText('▸ ◐↑002 b  ⟳ x', 'ascii')).toBe('> *^002 b  ~ x')
    expect(markText('┌ T002 b', 'ascii')).toBe('/ T002 b')
    expect(markText('↑ 002', 'words')).toBe('priority high: 002')
  })
})
