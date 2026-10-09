import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, settleStatus, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 035: the footer moves into the pane, under every tab; the status entry keeps the lead.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const measure = ($: never) =>
  ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
    context: { window: 200_000, tokens: 122_000, percent: 61 },
    cost: { usd: 1.2 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 2 * 3600_000 + 1000).toISOString() }],
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
  await settleStatus(session)
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

describe('the footer like statusline (041)', () => {
  const setupGit = async ($: never, on: never) => {
    const session = installTree(on, { ...(halfDone.tree as Record<string, string>), '/proj/.git/HEAD': 'ref: refs/heads/main\n' }, '/proj')
    session.script.processes['git status --porcelain=v2 --branch --show-stash'] = {
      stdout: '# branch.oid abc123\n# branch.head main\n# branch.ab +2 -1\n1 .M N... 1\n',
    }
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await session.clock.set(NOW)
    await startSession($ as never, '/proj')
    await measure($ as never)
    await completeTurn($ as never)
    await settleStatus(session)
    return session
  }

  test('041 #1: footerLines 3 draws three chip rows in statusline order', { options: { footerLines: '3' } }, async ($, on) => {
    await setupGit($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect((await ui.find({ key: 'footer-chip-row-0' }))?.text).toContain('main')
    expect((await ui.find({ key: 'footer-chip-row-1' }))?.text).toContain('◆ 002')
    expect((await ui.find({ key: 'footer-chip-row-2' }))?.text).toContain('5h 42%')
    await ui.unmount()
  })

  test('041 #1: the default footerLines keeps one chip row', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.find({ key: 'footer-chip-row-1' })).toBeUndefined()
    expect((await ui.find({ key: 'footer-chip-row-0' }))?.text).toContain('◆ 002')
    await ui.unmount()
  })

  test('041 #8: footerSeparator thin draws the thin rule, none draws no rule', { options: { footerSeparator: 'thin' } }, async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).toContain('┄')
    expect(await ui.footer()).not.toContain('──')
    await ui.unmount()
  })

  test('041 #8: footerSeparator none drops the rule row', { options: { footerSeparator: 'none' } }, async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).not.toContain('─')
    await ui.unmount()
  })

  test('041 #7: a lines-changed chip for the session', async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Edit', tool_use_id: 'e1', file_path: '/proj/specs/002-band-hint/plan.md', old_string: 'line one\nline two', new_string: 'line one\nline two changed\nline three' } as never)
    await completeTurn($ as never)
    await settleStatus(session)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    expect(await ui.footer()).toContain('±3')
    await ui.unmount()
  })

  test('041 #5: a chip that just changed draws a shade lighter, then settles', async ($, on) => {
    const session = await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    const contextChip = () => ui.find({ type: 'Text', text: /6[15]%/ })
    expect((await contextChip())?.props['backgroundColor']).toBe('#f9e2af')
    await session.clock.advance(1000)
    await ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
      context: { window: 200_000, tokens: 130_000, percent: 65 },
      cost: { usd: 1.2 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 42, resetsAt: new Date(NOW + 2 * 3600_000 + 1000).toISOString() }],
      changed: ['rateLimits', 'context', 'cost'],
    } as never)
    await session.clock.settle()
    expect((await contextChip())?.props['backgroundColor']).toBe('#fbe9c3')
    await session.clock.advance(6000)
    await session.clock.settle()
    expect((await contextChip())?.props['backgroundColor']).toBe('#f9e2af')
    await ui.unmount()
  })
})
