import { describe, expect, test } from 'claude-code/testing'

import { FLAVORS, ROLES, themeOf } from '../../hooks/core/theme'

describe('theme tokens (FR-009)', () => {
  test('four flavors, each with every role as #rrggbb', () => {
    expect(Object.keys(FLAVORS).sort()).toEqual(['frappe', 'latte', 'macchiato', 'mocha'])
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
  const BASE = { mocha: '#1e1e2e', frappe: '#303446', macchiato: '#24273a', latte: '#eff1f5' } as const
  test('every text role reads at 4.5:1 or more on its flavor', () => {
    for (const [flavor, base] of Object.entries(BASE)) {
      const tokens = FLAVORS[flavor as keyof typeof BASE]
      for (const role of ['text', 'muted', 'accent', 'done', 'current', 'blocked', 'barFill'] as const) {
        expect({ flavor, role, ok: ratio(tokens[role], base) >= 4.5 }).toEqual({ flavor, role, ok: true })
      }
    }
  })
})
