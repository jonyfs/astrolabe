import { describe, expect, test } from 'claude-code/testing'

import { chipForeground, CHIPS, COLORBLIND_MARKS, FLAVORS, flavorOf, isThemeKeys, lighten, ROLES, STATUS_ROLE, themeOf } from '../../hooks/core/theme'

describe('theme tokens (FR-009)', () => {
  test('flavors, each with every role as #rrggbb', () => {
    expect(Object.keys(FLAVORS).sort()).toEqual(['colorblind', 'frappe', 'latte', 'macchiato', 'mocha'])
    for (const tokens of Object.values(FLAVORS)) {
      for (const role of ROLES) expect(/^#[0-9a-f]{6}$/.test(tokens[role])).toBe(true)
    }
  })
  test('mocha is the default and an unknown flavor falls back to it', () => {
    expect(themeOf({})).toBe(FLAVORS.mocha)
    expect(themeOf({ flavor: 'dracula' })).toBe(FLAVORS.mocha)
  })
  test('latte (light) differs from mocha (dark) in every role', () => {
    for (const role of ROLES) expect(FLAVORS.latte[role] === FLAVORS.mocha[role]).toBe(false)
  })
  test('known Catppuccin values', () => {
    expect([FLAVORS.mocha.done, FLAVORS.mocha.current, FLAVORS.latte.done]).toEqual(['#a6e3a1', '#fab387', '#2a7a1c'])
  })
  test('theme flavor uses Claude Code theme keys across native theme variants', () => {
    const tokens = themeOf({ flavor: 'theme', theme: 'dark-daltonized' })
    expect(tokens).toEqual({
      accent: 'claude',
      text: 'text',
      muted: 'subtle',
      done: 'success',
      current: 'warning',
      pending: 'inactive',
      barFill: 'suggestion',
      barEmpty: 'subtle',
      blocked: 'error',
    })
    expect(isThemeKeys(tokens)).toBe(true)
    expect(flavorOf({ flavor: 'theme' }, false)).toBe('mocha')
    expect(flavorOf({ flavor: 'theme' }, true)).toBe('latte')
  })
})

describe('contrast (052 #48, 054 #74)', () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi! + 0.05) / (lo! + 0.05)
  }
  const BASE = { mocha: '#1e1e2e', frappe: '#303446', macchiato: '#24273a', latte: '#eff1f5', colorblind: '#151515' } as const
  test('every text role reads at 4.5:1 or more on its flavor', () => {
    for (const [flavor, base] of Object.entries(BASE)) {
      const tokens = FLAVORS[flavor as keyof typeof BASE]
      for (const role of ['text', 'muted', 'accent', 'done', 'current', 'blocked', 'barFill'] as const) {
        expect({ flavor, role, ok: ratio(tokens[role], base) >= 4.5 }).toEqual({ flavor, role, ok: true })
      }
    }
  })

  describe('colorblind palette (054 #76)', () => {
    test('uses color-independent status shapes and distinct status colors', () => {
      expect(COLORBLIND_MARKS).toEqual({ done: '✓', current: '▲', pending: '○', blocked: '✖' })
      expect(new Set([FLAVORS.colorblind.done, FLAVORS.colorblind.current, FLAVORS.colorblind.blocked]).size).toBe(3)
    })
  })

  test('lighten mixes a colour toward white, staying #rrggbb (041 #5)', () => {
    expect(lighten('#45475a', 0.25)).toBe('#747583')
    expect(lighten(CHIPS.mocha.sapphire!, 0.25)).toBe('#97d5f1')
    expect(lighten(CHIPS.mocha.yellow!, 0.25)).toBe('#fbe9c3')
    expect(lighten(CHIPS.latte.red!, 0.25)).toBe('#dd4b6b')
    expect(lighten('#ffffff', 0.25)).toBe('#ffffff')
    expect(lighten('theme', 0.25)).toBe('theme')
  })

  test('footer chip text chooses the stronger contrast in every flavor (054 #75)', () => {
    const foregrounds = ['#11111b', '#eff1f5'] as const
    for (const palette of Object.values(CHIPS)) {
      for (const background of Object.values(palette)) {
        const contrast = (foreground: string) => ratio(background, foreground)
        const chosen = chipForeground(background)
        const other = foregrounds.find(foreground => foreground !== chosen)!
        expect(contrast(chosen)).toBeGreaterThanOrEqual(contrast(other))
      }
    }
  })
})

describe('STATUS_ROLE (054 #72)', () => {
  test('warnings peach, errors red, success green', () => {
    expect(STATUS_ROLE).toEqual({ warning: 'current', error: 'blocked', success: 'done' })
  })
})
