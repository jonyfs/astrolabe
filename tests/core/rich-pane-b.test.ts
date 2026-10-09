import { describe, expect, test } from 'claude-code/testing'

import { dial } from '../../hooks/core/dashboard'
import { chartImage, dialFrames, imagesFor, spansOf } from '../../hooks/core/pixels'
import { stepCards } from '../../hooks/core/band'
import { FLAVORS } from '../../hooks/core/theme'

const NOW = Date.UTC(2026, 9, 7, 12, 0)
const tokens = FLAVORS.mocha

describe('pictures where the terminal draws them (024 #5)', () => {
  test('auto: kitty and Ghostty, never under tmux', () => {
    expect(imagesFor('auto', { KITTY_WINDOW_ID: '3' })).toBe(true)
    expect(imagesFor('auto', { TERM: 'xterm-kitty' })).toBe(true)
    expect(imagesFor('auto', { TERM_PROGRAM: 'ghostty' })).toBe(true)
    expect(imagesFor('auto', { KITTY_WINDOW_ID: '3', TMUX: '/tmp/tmux-1/default,1,0' })).toBe(false)
    expect(imagesFor('auto', { TERM_PROGRAM: 'Apple_Terminal' })).toBe(false)
    expect(imagesFor(undefined, {})).toBe(false)
    expect(imagesFor('on', {})).toBe(true)
    expect(imagesFor('off', { KITTY_WINDOW_ID: '3' })).toBe(false)
  })
  test('the usage chart as RGBA pixels, 8 by 16 per cell', () => {
    const series = [{ at: NOW - 3_600_000, percent: 20 }, { at: NOW - 1_800_000, percent: 40 }, { at: NOW, percent: 60 }]
    const image = chartImage(series, { columns: 40, rows: 7, now: NOW, resetsAt: new Date(NOW + 3_600_000).toISOString(), tokens })
    expect([image?.width, image?.height]).toEqual([320, 112])
    const bytes = Uint8Array.from(atob(image?.rgba ?? ''), c => c.charCodeAt(0))
    expect(bytes.length).toBe(320 * 112 * 4)
    // Some pixel carries the accent color, fully opaque.
    const accent = [0xcb, 0xa6, 0xf7]
    let found = false
    for (let i = 0; i < bytes.length && !found; i += 4) found = bytes[i] === accent[0] && bytes[i + 1] === accent[1] && bytes[i + 2] === accent[2] && bytes[i + 3] === 255
    expect(found).toBe(true)
    expect(chartImage([], { columns: 40, rows: 7, now: NOW, tokens })).toBeUndefined()
  })
})

describe('the animated dial (024 #6)', () => {
  test('one frame per step up to the active one, the last the still dial', () => {
    const frames = dialFrames('plan', tokens)
    expect(frames.length).toBe(3)
    expect(frames.at(-1)).toEqual(spansOf(dial('plan', tokens)))
    expect(dialFrames('plan', tokens)).toBe(frames)
    expect(dialFrames('implement', tokens)).not.toBe(frames)
    expect(dialFrames(undefined, tokens).length).toBe(1)
  })
  test('spans join cells of one color', () => {
    const rows = spansOf(dial('specify', tokens))
    expect(rows.length).toBe(7)
    expect(rows.every(row => row.every(span => span.text.length > 0))).toBe(true)
  })
})

describe('hover cards on the rail (024 #10)', () => {
  test("one card per step: what it is for and the features in it", () => {
    const cards = stepCards([{ id: '001', name: 'a', dir: '001-a', phase: 'plan', done: 0, total: 0, warnings: [] }, { id: '002', name: 'b', dir: '002-b', phase: 'plan', done: 0, total: 0, warnings: [] }])
    expect(cards.find(c => c.step === 'plan')?.text).toBe('plan: the technical plan, research and data model · 2 features here')
    expect(cards.find(c => c.step === 'tasks')?.text).toBe('tasks: the ordered task list by user story · none here')
    expect(cards.length).toBe(6)
  })
})
