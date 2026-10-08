import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane, SURFACES } from '../helpers/render'

const setup = async ($: never, on: never, s = halfDone) => {
  const session = installTree(on, s.tree, s.cwd)
  const engine = installEngine(on)
  installRenderEngine(on)
  const pane = installPaneEngine(on)
  await startSession($ as never, s.cwd)
  return { session, pane, engine }
}

describe('the /astrolabe command (US1)', () => {
  test('registers at session start and opens the pane', async ($, on) => {
    const { pane, engine } = await setup($ as never, on as never)
    expect(engine.commands).toEqual(['astrolabe'])
    const ran = await $.command.run({ command: 'astrolabe', args: '' } as never)
    expect((ran as { text?: string }).text).toBe('Astrolabe pane opened.')
    // Typed by the person: focused, so 1, 2 and 3 work at once, and Esc closes it.
    expect(pane.opened).toEqual([{ id: 'astrolabe', title: '🧭 Astrolabe', focus: true, closeOnEscape: true }])
  })
})

describe('the pane tabs (US1, US2)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: Specs first, then Tasks and Session by hotkey buttons`, async ($, on) => {
      const { session } = await setup($ as never, on as never)
      const ui = await mountPane($ as never, surface)
      expect(await ui.tabs()).toContain('Specs')
      expect(await ui.body()).toContain('▸ ◐ 002 band-hint   implement  ████░░░░░░  9/20  45%')
      const reads = session.counts.read
      await ui.press('tab-tasks')
      expect(await ui.body()).toContain('9/20 done')
      expect(await ui.body()).toContain('T010 task 10')
      await ui.press('tab-session')
      expect(await ui.body()).toContain('chosen by     feature.json')
      await ui.press('tab-specs')
      expect(await ui.body()).toContain('● 001 core-state')
      expect(session.counts.read).toBe(reads)
      await ui.unmount()
    })
  }

  test('the chosen tab stays for the session', async ($, on) => {
    await setup($ as never, on as never)
    const first = await mountPane($ as never, 'terminal')
    await first.press('tab-session')
    await first.unmount()
    const again = await mountPane($ as never, 'terminal')
    expect(await again.body()).toContain('analyzed')
    await again.unmount()
  })

  test('without Spec Kit the pane says so', async ($, on) => {
    await setup($ as never, on as never, noSpeckit)
    const ui = await mountPane($ as never, 'terminal')
    expect((await ui.body()).endsWith('This project does not use Spec Kit.')).toBe(true)
    await ui.unmount()
  })
})

import { completeTurn } from '../helpers/fake-fs'
import { drawBand } from '../helpers/render'

describe('the pane opens by itself only with full on a wide fullscreen terminal (US3)', () => {
  const wide = { columns: 150, rows: 40, isFullscreen: true }
  test('full, 150 fullscreen columns: opens once after the turn', { options: { preset: 'full' } }, async ($, on) => {
    const { pane } = await setup($ as never, on as never)
    await drawBand($ as never, 'terminal', 145, {}, wide)
    expect(pane.opened).toEqual([])
    await completeTurn($ as never)
    expect(pane.opened).toEqual([{ id: 'astrolabe', title: '🧭 Astrolabe' }])
    await drawBand($ as never, 'terminal', 145, {}, wide)
    await completeTurn($ as never)
    expect(pane.opened.length).toBe(1)
  })
  test('full at 143 columns, or not fullscreen: stays closed', { options: { preset: 'full' } }, async ($, on) => {
    const { pane } = await setup($ as never, on as never)
    await drawBand($ as never, 'terminal', 138, {}, { columns: 143, rows: 40, isFullscreen: true })
    await completeTurn($ as never)
    await drawBand($ as never, 'terminal', 195, {}, { columns: 200, rows: 40, isFullscreen: false })
    await completeTurn($ as never)
    expect(pane.opened).toEqual([])
  })
  test('compact never opens it unasked', async ($, on) => {
    const { pane } = await setup($ as never, on as never)
    await drawBand($ as never, 'terminal', 145, {}, wide)
    await completeTurn($ as never)
    expect(pane.opened).toEqual([])
  })
})

describe('/astrolabe help (025 #39)', () => {
  test('lists the commands, the tabs and their keys', async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'help', origin: { kind: 'composer' } } as never)) as { text?: string }
    const text = ran.text ?? ''
    for (const part of ['/astrolabe', '/astrolabe allow', '/astrolabe revoke', '/astrolabe help', '1 Specs', '2 Tasks', '3 Session', '4 Dashboard', 'Esc']) {
      expect(text).toContain(part)
    }
  })
  test('an unknown argument points at help', async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'bogus', origin: { kind: 'composer' } } as never)) as { text?: string }
    expect(ran.text).toContain('/astrolabe help')
  })
})

describe('extensions and parallel tasks (020c)', () => {
  test('the Session tab names the hooks around the next command; Tasks names the [P] run', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/002-b'),
      features: { '002-b': { spec: spec(), plan: true, tasks: '- [x] T001 a\n- [ ] T002 [P] b\n- [ ] T003 [P] c\n- [ ] T004 d\n' } },
      extra: { '.specify/extensions.yml': 'hooks:\n  after_implement:\n  - extension: git\n    command: speckit.git.commit\n    enabled: true\n    optional: true\n' },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($ as never, '/proj')
    const ui = await mountPane($ as never, 'terminal')
    await ui.press('tab-tasks')
    expect(await ui.body()).toContain('⇉ T002, T003 can run in parallel as subagents')
    await ui.press('tab-session')
    expect(await ui.body()).toContain('hooks after   /speckit-git-commit (optional)')
    await ui.unmount()
    expect(session.logs).toEqual([])
  })
})
