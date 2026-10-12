import { describe, expect, test } from 'claude-code/testing'

import { hotkeyOf, KEY_VERBS, QUEUE_HOTKEYS, verbOf } from '../../hooks/core/keys'

describe('one verb per key (064 #7)', () => {
  test('the table holds r q ? / c o p a space esc, once each', () => {
    expect(KEY_VERBS.map(k => k.key)).toEqual(['r', 'q', '?', '/', 'c', 'o', 'p', 'a', 'space', 'esc'])
    expect(new Set(KEY_VERBS.map(k => k.key)).size).toBe(KEY_VERBS.length)
  })

  test('each key says its verb', () => {
    const verbs = Object.fromEntries(KEY_VERBS.map(k => [k.key, k.verb]))
    expect(verbs).toMatchObject({ r: 'refresh', q: 'run queued', '?': 'help', '/': 'filter', c: 'clear', o: 'order', p: 'priority', a: 'advisor', space: 'page', esc: 'close' })
  })

  test('a Button takes one digit or lowercase letter, so ? and / name the letter that presses them', () => {
    expect(hotkeyOf('?')).toBe('h')
    expect(hotkeyOf('/')).toBe('f')
    expect(hotkeyOf('r')).toBe('r')
    for (const { key } of KEY_VERBS) {
      if (key === 'space' || key === 'esc') continue
      expect(/^[0-9a-z]$/.test(hotkeyOf(key))).toBe(true)
    }
  })

  test('h stays an alias of ?', () => {
    expect(verbOf('h')?.key).toBe('?')
    expect(verbOf('?')?.verb).toBe('help')
    expect(verbOf('f')?.key).toBe('/')
    expect(verbOf('zz')).toBeUndefined()
  })

  test('the first queued subagent runs on q; later ones take the next free letters', () => {
    expect(QUEUE_HOTKEYS[0]).toBe('q')
    expect(new Set(QUEUE_HOTKEYS).size).toBe(QUEUE_HOTKEYS.length)
    // The letters the pane's other buttons own are never handed to a queued run.
    for (const taken of ['h', 'f', 'r', 's', 'p', 'o', 'm', 'k', 'j', 'b', 'v', 'g']) expect(QUEUE_HOTKEYS).not.toContain(taken)
  })
})
