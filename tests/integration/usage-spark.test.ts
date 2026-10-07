import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installRenderEngine } from '../helpers/render'

// Spec 022 #25: the band shows the binding window's last readings as a sparkline.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never, rate: number) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 2000, percent: 1 },
    rateLimits: [{ kind: 'five_hour', percentUsed: rate, resetsAt: new Date(NOW + 3600_000).toISOString() }],
    changed: ['rateLimits'],
  } as never)

describe('the band sparkline (022 #25)', () => {
  test('three readings or more draw one block each on a wide band', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    await session.clock.set(NOW)
    await startSession($, '/proj')
    for (const rate of [0, 50, 100]) await measure($ as never, rate)
    expect((await drawBand($ as never, 'terminal', 120)).text).toContain('▁▅█')
    expect((await drawBand($ as never, 'terminal', 60)).text).not.toContain('▁▅█')
  })
})
