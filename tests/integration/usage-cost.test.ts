import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 022: cost budget, context warning, phone notice, prompt cache.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never, percent: number, usd: number, rate = 30) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: percent * 2000, percent },
    cost: { usd },
    rateLimits: [{ kind: 'five_hour', percentUsed: rate, resetsAt: new Date(NOW + 3600_000).toISOString() }],
    changed: ['rateLimits', 'context', 'cost'],
  } as never)
const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  return session
}

describe('usage and cost (022)', () => {
  test('054: no cost toast, even with a large spend', { options: { costBudget: 10 } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await measure($ as never, 10, 50)
    expect(session.toasts.filter(t => t.includes('$'))).toEqual([])
  })
  test('no budget, no cost toast', async ($, on) => {
    const session = await setup($ as never, on as never)
    await measure($ as never, 10, 50)
    expect(session.toasts.filter(t => t.includes('budget'))).toEqual([])
  })
  test('context: one warning when it passes 85%', async ($, on) => {
    const session = await setup($ as never, on as never)
    await measure($ as never, 80, 1)
    await measure($ as never, 86, 1)
    await measure($ as never, 90, 1)
    expect(session.toasts.filter(t => t.includes('context'))).toEqual(['🧭 The context window is 86% full: /compact before Claude Code compacts it for you'])
  })
  test('049 #86 prompt cache: a newer turn cancels the stale warning and starts a new 4.5-minute timer', async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($)
    await session.clock.advance(4 * 60_000)
    await completeTurn($)
    await session.clock.advance(4 * 60_000)
    expect(session.toasts.filter(t => t.includes('cache'))).toEqual([])
    await session.clock.advance(31_000)
    expect(session.toasts.filter(t => t.includes('cache'))).toEqual(['🧭 The prompt cache goes cold in about 30 s: the next prompt after that re-reads the whole context'])
  })
})
