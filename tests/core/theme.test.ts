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
    expect([FLAVORS.mocha.done, FLAVORS.mocha.current, FLAVORS.latte.done]).toEqual(['#a6e3a1', '#fab387', '#40a02b'])
  })
})
