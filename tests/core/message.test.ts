import { describe, expect, test } from 'claude-code/testing'

import { message, withoutPrefix } from '../../hooks/core/message'
import { formatToast } from '../../hooks/core/toasts'

describe('one message prefix (064 #8)', () => {
  test('a new version reads astrolabe ⬆ (board 5), and the prefix is stripped again', () => {
    expect(message('update', '0.124.0 on disk · reloading plugins')).toBe('astrolabe ⬆ 0.124.0 on disk · reloading plugins')
    expect(message('ok', 'astrolabe ⬆ x')).toBe('astrolabe ✓ x')
  })
  test('success reads astrolabe ✓ and a warning astrolabe ▲', () => {
    expect(message('ok', '002 tasks done · next /speckit-implement')).toBe('astrolabe ✓ 002 tasks done · next /speckit-implement')
    expect(message('warn', 'T010 ticked, no code edited this turn')).toBe('astrolabe ▲ T010 ticked, no code edited this turn')
  })

  test('an old prefix is replaced, never doubled', () => {
    expect(withoutPrefix('astrolabe ✓ Saved')).toBe('Saved')
    expect(withoutPrefix('astrolabe: Saved')).toBe('Saved')
    expect(withoutPrefix('astrolabe ✓ Saved')).toBe('Saved')
    expect(withoutPrefix('astrolabe ▲ Saved')).toBe('Saved')
    expect(message('ok', 'astrolabe ✓ Saved')).toBe('astrolabe ✓ Saved')
  })
})

describe('toasts carry the prefix (064 #8)', () => {
  test('a toast is one astrolabe ✓ line, a warning astrolabe ▲', () => {
    expect(formatToast('Saved', 'details')).toEqual({ text: 'astrolabe ✓ Saved' })
    expect(formatToast('astrolabe ✓ Saved', 'details')).toEqual({ text: 'astrolabe ✓ Saved' })
    expect(formatToast('Merge is waiting for checks', 'details', 'warn')).toEqual({ text: 'astrolabe ▲ Merge is waiting for checks' })
  })

  test('no toast uses the astrolabe: variant or the compass', () => {
    for (const text of ['Saved', 'astrolabe ✓ Saved', 'astrolabe: Saved']) {
      const out = formatToast(text, 'details').text
      expect(out.startsWith('astrolabe ✓ ')).toBe(true)
      expect(out).not.toContain('🧭')
      expect(out).not.toContain('astrolabe:')
    }
  })

  test('a long message is cut below 120 characters and the full text is kept', () => {
    const body = 'very long details '.repeat(12).trim()
    const result = formatToast(body, 'full text in /astrolabe → Session')
    expect(result.text.startsWith('astrolabe ✓ ')).toBe(true)
    expect(result.text.length < 120).toBe(true)
    expect(result.text).toContain('full text in /astrolabe → Session')
    expect(result.full).toBe(`astrolabe ✓ ${body}`)
  })
})
