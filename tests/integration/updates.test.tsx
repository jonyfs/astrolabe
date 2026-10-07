import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession, type Session } from '../helpers/fake-fs'
import { drawBand, installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

const GSTACK = 'sh -c "$HOME/.claude/skills/gstack/bin/gstack-update-check"'
const RELEASES = 'https://api.github.com/repos/jonyfs/astrolabe/releases/latest'
const MANIFEST = '/proj/.specify/integrations/speckit.manifest.json'
const NOON = new Date(2026, 9, 7, 12).getTime()

const allBehind = (session: Session) => {
  session.script.processes[GSTACK] = { stdout: 'UPGRADE_AVAILABLE 1.91.32.0 1.91.33.0\n' }
  session.script.processes['specify self check'] = { stdout: 'Update available: 1.1.1 -> 1.2.0\n' }
  session.script.processes['specify version'] = { stdout: '│  CLI Version    1.2.0  │\n' }
  session.script.http[RELEASES] = { status: 200, text: '{"tag_name":"v0.8.0"}' }
}
const allCurrent = (session: Session) => {
  session.script.processes[GSTACK] = { stdout: '' }
  session.script.processes['specify self check'] = { stdout: 'Up to date: 1.1.1\n' }
  session.script.processes['specify version'] = { stdout: '│  CLI Version    1.1.1  │\n' }
  session.script.http[RELEASES] = { status: 200, text: '{"tag_name":"v0.7.0"}' }
}

const start = async ($: never, on: never, seed: Record<string, unknown> = {}) => {
  const session = installTree(on, { ...halfDone.tree, [MANIFEST]: '{ "version": "1.1.1" }' }, '/proj', seed)
  const engine = installEngine(on)
  installRenderEngine(on)
  const pane = installPaneEngine(on)
  await session.clock.set(NOON)
  return { session, engine, pane, go: async () => {
    await startSession($ as never, '/proj')
    await session.clock.advance(1000)
    await session.clock.settle()
  } }
}

describe('update checks (US1)', () => {
  test('once a day: every item behind shows in the band row and the pane', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    expect(session.processes.sort()).toEqual([GSTACK, 'specify self check', 'specify version'].sort())
    expect(session.fetches).toEqual([RELEASES])
    expect((await drawBand($ as never, 'terminal', 160)).text).toContain('◆ 002')
    const band = await drawBand($ as never, 'terminal', 160)
    expect(JSON.stringify(band.tree)).toContain('gstack 1.91.33.0')
    expect(JSON.stringify(band.tree)).toContain('specify 1.2.0')
    expect(JSON.stringify(band.tree)).toContain('Spec Kit skills 1.2.0')
    expect(JSON.stringify(band.tree)).toContain('astrolabe 0.8.0')
    const stored = session.store.get('updates') as { checkedOn: string; items: unknown[] }
    expect(stored.items.length).toBe(4)
    await startSession($ as never, '/proj')
    await session.clock.advance(1000)
    expect(session.fetches.length).toBe(1)
  })

  test('all current: no row', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allCurrent(session)
    await go()
    expect(JSON.stringify((await drawBand($ as never, 'terminal', 160)).tree)).not.toContain('updates:')
  })

  test('a missing tool or an offline network is left out without errors', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    session.script.processes[GSTACK] = 'missing'
    delete session.script.http[RELEASES]
    await go()
    const tree = JSON.stringify((await drawBand($ as never, 'terminal', 160)).tree)
    expect(tree).not.toContain('gstack')
    expect(tree).toContain('specify 1.2.0')
    expect(session.logs).toEqual([])
  })

  test('checkUpdates off: no process and no network', { options: { checkUpdates: false } }, async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    expect([session.processes, session.fetches]).toEqual([[], []])
  })

  test('minimal still lists updates in the pane', { options: { preset: 'minimal' } }, async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    const ui = await mountPane($ as never, 'terminal')
    await ui.press('tab-session')
    expect(await ui.body()).toContain('update        gstack 1.91.33.0 (installed 1.91.32.0)')
    await ui.unmount()
  })
})

describe('one click installs (US2)', () => {
  const press = async ($: never, key: string) => {
    const ui = await ($ as unknown as { ui: { mount: (t: never) => Promise<{ press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }> } }).ui.mount({
      plugin: 'astrolabe',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160, scroll: { bodyRows: 9, top: 0 } },
    } as never)
    await ui.press({ key })
    await ui.unmount()
  }

  test('gstack runs /gstack-upgrade', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    await press($ as never, 'update-gstack')
    expect([session.prompts, session.toasts, session.logs]).toEqual([['/gstack-upgrade'], [], []])
  })

  test('specify upgrades, toasts, and drops the item; a failure says how to retry', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    session.script.processes['specify self upgrade'] = { exitCode: 1, stderr: 'network down\nmore' }
    await press($ as never, 'update-specify')
    expect(session.toasts).toEqual(['🧭 specify upgrade failed: network down; run specify self upgrade'])
    session.script.processes['specify self upgrade'] = { stdout: 'ok' }
    await press($ as never, 'update-specify')
    expect(session.toasts[1]).toBe('🧭 specify updated to 1.2.0')
    expect(JSON.stringify((await drawBand($ as never, 'terminal', 160)).tree)).not.toContain('specify 1.2.0')
  })

  test('Spec Kit skills ask for a second click before rewriting', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    session.script.processes['specify init --here --integration claude --force'] = { stdout: 'done' }
    await press($ as never, 'update-speckit-skills')
    expect(session.processes).not.toContain('specify init --here --integration claude --force')
    expect(JSON.stringify((await drawBand($ as never, 'terminal', 160)).tree)).toContain('confirm: rewrite .claude/skills/speckit-*')
    await press($ as never, 'update-speckit-skills')
    expect(session.processes).toContain('specify init --here --integration claude --force')
    expect(session.toasts).toContain('🧭 Spec Kit skills refreshed to 1.2.0')
  })

  test('astrolabe updates through claude plugin update', async ($, on) => {
    const { session, go } = await start($ as never, on as never)
    allBehind(session)
    await go()
    session.script.processes['claude plugin update astrolabe'] = { stdout: 'updated' }
    await press($ as never, 'update-astrolabe')
    expect(session.toasts).toEqual(['🧭 Astrolabe updated to 0.8.0; run /reload-plugins'])
  })
})
