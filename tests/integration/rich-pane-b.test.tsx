import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installPaneEngine, installRenderEngine } from '../helpers/render'

// Spec 024, part two: pictures on kitty and Ghostty, the animated dial, hover cards.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never, percentUsed: number) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 2000, percent: 1 },
    rateLimits: [{ kind: 'five_hour', percentUsed, resetsAt: new Date(NOW + 2 * 3600_000).toISOString() }],
    changed: ['rateLimits'],
  } as never)

type Found = { text: string; props: Record<string, unknown> } | undefined
const mount = async ($: never) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<{ find: (q: { key?: string; type?: string }) => Promise<Found>; press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'astrolabe',
    props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { bodyRows: 60, top: 0 } },
    viewport: { columns: 84, rows: 64, isFullscreen: true },
  } as never))

const setup = async ($: never, on: never, env: Record<string, string> = {}) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  Object.assign(session.script.env, env)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  for (const p of [40, 45, 50]) {
    await session.clock.advance(6 * 60_000)
    await measure($, p)
    await completeTurn($ as never)
  }
  return session
}

describe('the rich pane, part two (024)', () => {
  test('kitty: the usage chart is a picture', async ($, on) => {
    const session = await setup($ as never, on as never, { KITTY_WINDOW_ID: '1' })
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-dashboard' })
    const image = await ui.find({ type: 'Image' })
    expect(image?.props['alt']).toContain('usage')
    expect(await ui.find({ key: 'astrolabe-usage-chart', type: 'Raster' })).toBeUndefined()
    expect(session.forbidden).toEqual([])
    await ui.unmount()
  })
  test('another terminal keeps the Raster; images off never reads the environment', { options: { images: 'off' } }, async ($, on) => {
    const session = await setup($ as never, on as never, { KITTY_WINDOW_ID: '1' })
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-dashboard' })
    expect(await ui.find({ type: 'Image' })).toBeUndefined()
    expect(await ui.find({ key: 'astrolabe-usage-chart' })).toBeDefined()
    await ui.unmount()
    expect(session.forbidden).toEqual([])
  })
  test('the dial is a Client that sweeps to the active step', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-dashboard' })
    const client = await ui.find({ type: 'Client' })
    expect(client).toBeDefined()
    const props = client?.props['props'] as { frames: unknown[] } | undefined
    // half-done is in implement: specify, clarify, plan, tasks, implement.
    expect(props?.frames.length).toBe(5)
    await ui.unmount()
  })
  test('the rail carries a hover card per step', async ($, on) => {
    await setup($ as never, on as never)
    const band = await drawBand($ as never, 'terminal', 140)
    const tree = JSON.stringify(band.tree)
    expect(tree).toContain('astrolabe-step-plan')
    expect(tree).toContain('plan: the technical plan, research and data model')
  })
})
