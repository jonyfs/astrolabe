import { describe, expect, test } from 'claude-code/testing'

import { textWidth } from '../../hooks/core/footer'
import { EMOJI_WIDE, STATE_GLYPHS } from '../../hooks/core/glyphs'
import { ICON_KEYS, iconSet, markText } from '../../hooks/core/icons'

describe('state glyphs are one cell wide (064 #3)', () => {
  test('paused, elapsed and warning measure 1 with the one width measure', () => {
    expect(STATE_GLYPHS).toEqual({ paused: '‖', elapsed: '◷', warning: '▲' })
    for (const glyph of Object.values(STATE_GLYPHS)) expect(textWidth(glyph)).toBe(1)
  })

  test('the old wide state glyphs are not state glyphs', () => {
    for (const old of ['⏸', '⏱', '⚠']) expect(Object.values(STATE_GLYPHS)).not.toContain(old)
  })

  test('every nerd icon is one cell', () => {
    for (const key of ICON_KEYS) expect({ key, width: textWidth(iconSet('nerd')[key]) }).toEqual({ key, width: 1 })
  })

  test('the ascii set is printable ASCII, so every character is one cell', () => {
    for (const key of ICON_KEYS) {
      const glyph = iconSet('ascii')[key]
      expect(/^[\x20-\x7e]*$/.test(glyph)).toBe(true)
      expect(textWidth(glyph)).toBe([...glyph].length)
    }
  })

  test('the emoji set is wide only where it declares it', () => {
    const wideBelowPictographs = new Set<string>()
    for (const key of ICON_KEYS) {
      for (const ch of iconSet('emoji')[key]) {
        if (textWidth(ch) === 2 && (ch.codePointAt(0) ?? 0) < 0x1f000) wideBelowPictographs.add(ch)
      }
    }
    expect([...wideBelowPictographs].every(ch => EMOJI_WIDE.includes(ch))).toBe(true)
    // Every declared entry is one the emoji set really carries.
    const carried = ICON_KEYS.flatMap(key => [...iconSet('emoji')[key]])
    for (const ch of EMOJI_WIDE) expect(carried).toContain(ch)
  })

  test('the pane marks map the narrow state glyphs to ASCII and words', () => {
    expect(markText('◷ 4m', 'ascii')).toBe('t 4m')
    expect(markText('◷ 4m', 'words')).toContain('running for')
    expect(markText('‖ paused', 'ascii')).toBe('|| paused')
    expect(markText('▲ late', 'ascii')).toBe('! late')
  })
})
