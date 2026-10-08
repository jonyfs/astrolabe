import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 025, T004 to T008.
type Found = { text: string; props: Record<string, unknown> } | undefined
type Mounted = { find: (q: { key?: string; type?: string }) => Promise<Found>; drawn: () => Promise<unknown>; press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }
const mount = ($: never, component: string, props: unknown) =>
  ($ as unknown as { ui: { mount: (t: never) => Promise<Mounted> } }).ui.mount({ plugin: 'astrolabe', surface: 'terminal', component, props } as never)

const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  const pane = installPaneEngine(on)
  await startSession($, '/proj')
  return { session, pane }
}

describe('help, part two (025)', () => {
  test('T004: hotkeys on the band: a opens the pane, n runs the next command, c copies it', async ($, on) => {
    const { pane } = await setup($ as never, on as never)
    const band = JSON.stringify((await drawBand($ as never, 'terminal', 120)).tree)
    for (const key of ['a', 'n', 'c']) expect(band).toContain(`"hotkey":"${key}"`)
    const ui = await mount($ as never, 'AbovePrompt', { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { bodyRows: 9, top: 0 } })
    await ui.press({ key: 'open-pane' })
    expect(pane.opened.at(-1)).toEqual({ id: 'astrolabe', title: '🧭 Astrolabe · 002 band-hint', focus: true, closeOnEscape: true })
    await ui.unmount()
  })

  test('T005: /astrolabe status answers in text, and draws as a rich row', async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'status' } as never)) as { text?: string }
    expect(ran.text).toContain('◆ 002 band-hint: implement, 9/20 tasks (45%)')
    expect(ran.text).toContain('next: /speckit-implement')
    const ui = await mount($ as never, 'CommandOutput', { command: 'astrolabe', args: 'status', text: ran.text ?? '', isErrored: false })
    expect(await ui.find({ key: 'astrolabe-status' })).toBeDefined()
    await ui.unmount()
  })

  test('T006: an Edit that ticks a task names it under its row', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mount($ as never, 'ToolUse', {
      tool_use_id: 'e1',
      tool: 'Edit',
      input: { file_path: '/proj/specs/002-band-hint/tasks.md', old_string: '- [ ] T010 task 10', new_string: '- [x] T010 task 10' },
      isRunning: false,
      isErrored: false,
      isInterrupted: false,
    })
    expect((await ui.find({ key: 'astrolabe-ticked' }))?.text).toBe('  ↳ ticked T010 task 10')
    await ui.unmount()
  })

  test('036: no welcome card; the Help tab lists the commands, keys and options', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    expect(await ui.tabs()).toContain('Help')
    expect(await ui.body()).not.toContain('Welcome')
    await ui.press('tab-help')
    const first = await ui.body()
    // Help is longer than the pane: the rest is one scroll away.
    await ui.press('scroll-down')
    const body = `${first}${await ui.body()}`
    expect(body).toContain('/astrolabe status')
    expect(body).toContain('n runs the next command')
    expect(body).toContain('footerIn')
    await ui.unmount()
  })

  test('048 #71 #74: /astrolabe help lists the marks and the Spec Kit steps', async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'help' } as never)) as { text: string }
    expect(ran.text).toContain('Marks:')
    expect(ran.text).toContain('? blocked by clarifications')
    expect(ran.text).toContain('Spec Kit steps:')
    expect(ran.text).toContain('  specify       what to build and why, by user story')
    expect(ran.text).toContain('/astrolabe doctor')
  })

  test('048 #79: /astrolabe doctor names what is missing and how to fix it', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    session.script.processes['git --version'] = { stdout: 'git version 2.50.0\n' }
    session.script.processes['gh --version'] = { stdout: 'gh version 2.80.0\n' }
    session.script.processes['gh auth status'] = { exitCode: 1, stderr: 'not logged in' }
    const ran = (await $.command.run({ command: 'astrolabe', args: 'doctor' } as never)) as { text: string }
    expect(ran.text).toContain('  ✓ git version 2.50.0')
    expect(ran.text).toContain('  ✗ gh not signed in: run gh auth login')
    expect(ran.text).toContain('  ✗ specify not found: install Spec Kit')
    expect(ran.text).toContain('  ✓ Spec Kit project at /proj')
  })

  test('048 #73: the first session after install toasts once where to start', async ($, on) => {
    const session = installTree(on as never, halfDone.tree, '/proj', {})
    installEngine(on as never)
    await startSession($ as never, '/proj')
    expect(session.toasts).toEqual(['🧭 Astrolabe is on: /astrolabe opens the pane, /astrolabe help lists the commands'])
    expect(session.store.has('welcomed')).toBe(true)
  })

  test('048 #75 #80: help names what changed and each option with its value', { options: { footerIn: 'both' } }, async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'help' } as never)) as { text: string }
    expect(ran.text).toMatch(/New in \d+\.\d+\.\d+: /)
    expect(ran.text).toContain('footerIn=both')
  })

  test('T008: accessible mode draws text only', { options: { accessible: true } }, async ($, on) => {
    await setup($ as never, on as never)
    const band = JSON.stringify((await drawBand($ as never, 'terminal', 120)).tree)
    expect(band).not.toContain('astrolabe-step-')
    const ui = await mountPane($ as never, 'terminal', 100, 60)
    await ui.press('tab-dashboard')
    expect(await ui.body()).toContain('* implement')
    await ui.unmount()
  })
})
