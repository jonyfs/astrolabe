import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 035: the footer moves into the pane, under every tab; the status entry keeps the lead.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 122_000, percent: 61 },
    cost: { usd: 1.2 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 2 * 3600_000).toISOString() }],
    changed: ['rateLimits', 'context', 'cost'],
  } as never)

const setup = async ($: never, on: never, env: Record<string, string> = {}) => {
  const session = installTree(on, halfDone.tree, '/proj')
  Object.assign(session.script.env, env)
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  await measure($)
  await completeTurn($ as never)
  return session
}

describe('the footer in the pane (035)', () => {
  test('default: the status entry keeps the Spec Kit part and the deciding window', { options: { icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.last()).toMatch(/^◆ 002 · implement 45% · 5h 42% \(\d+h\d\dm\)$/)
  })
  for (const tab of ['specs', 'tasks', 'session', 'dashboard', 'help', 'config', 'prs']) {
    test(`default: the ${tab} tab ends with the footer`, { options: { icons: 'ascii' } }, async ($, on) => {
      await setup($ as never, on as never)
      const ui = await mountPane($ as never, 'terminal', 100, 80)
      await ui.press(`tab-${tab}`)
      const footer = await ui.footer()
      expect(footer).toContain('ctx 61%')
      expect(footer).not.toContain('$')
      await ui.unmount()
    })
  }
  test('041 #9: NO_COLOR draws the footer as text with the thin separator', async ($, on) => {
    await setup($ as never, on as never, { NO_COLOR: '1' })
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).toMatch(/5h 42% \(2h00m\) · /)
    await ui.unmount()
  })
  test('041 #9: without NO_COLOR the footer is chips', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).not.toMatch(/5h 42% \(2h00m\) · /)
    await ui.unmount()
  })
  test('footerIn status: the old status entry, no pane footer', { options: { icons: 'ascii', footerIn: 'status' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.last()).toContain('ctx 61%')
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).toBe('')
    await ui.unmount()
  })
  test('footerIn both: both places', { options: { icons: 'ascii', footerIn: 'both' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.last()).toContain('ctx 61%')
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).toContain('ctx 61%')
    await ui.unmount()
  })
})
