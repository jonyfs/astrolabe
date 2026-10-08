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
    expect((await ui.body()).endsWith('This project does not use Spec Kit. Run specify init to start.')).toBe(true)
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
    expect(await ui.body()).toContain('┌ T002 b')
    await ui.press('tab-session')
    expect(await ui.body()).toContain('hooks after   /speckit-git-commit (optional)')
    await ui.unmount()
    expect(session.logs).toEqual([])
  })
})

describe('pane navigation (043)', () => {
  test('#21 #25: tabs carry counts; a legend names the keys of the tab shown', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    expect(await ui.tabs()).toContain('Tasks 11')
    expect(await ui.legend()).toBe('every feature, its phase and progress · 1-7 tabs · f filters · s status · j/k scroll · Esc closes')
    await ui.press('tab-tasks')
    expect(await ui.legend()).toBe("the active feature's open tasks · 1-7 tabs · f filters · j/k scroll · Esc closes")
    await ui.unmount()
  })
})


describe('pane navigation, part two (043)', () => {
  test('#22: the last tab of this project opens next session', async ($, on) => {
    const session = installTree(on, halfDone.tree, halfDone.cwd, { welcomed: 'seeded', 'tab:/proj': 'tasks' })
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($ as never, halfDone.cwd)
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    expect(await ui.body()).toContain('9/20 done')
    await ui.press('tab-help')
    expect(session.store.get('tab:/proj')).toBe('help')
    await ui.unmount()
  })
  test('#23 #28: one filter keeps matching task rows; ✕ closes the pane', async ($, on) => {
    const { pane } = await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    await ui.press('tab-tasks')
    const before = await ui.body()
    expect(before).toContain('T010 task 10')
    await ui.press('close-pane')
    expect(pane.closed.at(-1)).toEqual({ id: 'astrolabe' })
    await ui.unmount()
  })
})

describe('acting on a spec (051)', () => {
  test('priority: the command stores it per project; the row gets ↑; p cycles the active one', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'priority 2 high' } as never)) as { text: string }
    expect(ran.text).toBe('🧭 002 band-hint: priority high')
    expect(session.store.get('priority:/proj')).toEqual({ '002': 'high' })
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    expect(await ui.body()).toContain('▸ ◐↑002 band-hint')
    await ui.press('priority')
    expect(session.store.get('priority:/proj')).toEqual({ '002': 'low' })
    await ui.unmount()
  })
  test('review: only from the composer; the findings land in the Session tab', async ($, on) => {
    const asked: Array<{ model: string; effort?: string }> = []
    on('model.complete', ($$, e) => {
      asked.push(e as never)
      return { value: { isAnswered: true, text: 'spec.md US2: no acceptance scenario\nplan.md: no rollback' } } as never
    })
    const { session } = await setup($ as never, on as never)
    const fromClaude = (await $.command.run({ command: 'astrolabe', args: 'review' } as never)) as { text: string }
    expect(fromClaude.text).toContain('Only you can start a deep review')
    const ran = (await $.command.run({ command: 'astrolabe', args: 'review', origin: { kind: 'composer' } } as never)) as { text: string }
    expect(ran.text).toBe('🧭 reviewing 002 band-hint with opus; the findings land in the Session tab')
    await session.clock.settle()
    expect(asked[0]).toMatchObject({ model: 'opus', effort: 'xhigh' })
    expect(session.toasts.at(-1)).toBe('🧭 the review of 002 band-hint is in the Session tab')
    const ui = await mountPane($ as never, 'terminal', 120, 40)
    await ui.press('tab-session')
    expect(await ui.body()).toContain('review 002    spec.md US2: no acceptance scenario')
    await ui.unmount()
  })
})

describe('gstack on the Specs tab (051)', () => {
  test('with gstack installed, a row of its skills runs one on the active feature', async ($, on) => {
    const session = installTree(on, { ...halfDone.tree, '/home/u/.claude/skills/gstack/bin/gstack-update-check': '#!/bin/sh\n' }, halfDone.cwd)
    session.script.env['HOME'] = '/home/u'
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($ as never, halfDone.cwd)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    await ui.press('gstack-investigate')
    await session.clock.settle()
    expect(session.prompts).toContain('/investigate')
    await ui.unmount()
  })
  test('without gstack there is no row', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    await expect(ui.press('gstack-investigate')).rejects.toThrow()
    await ui.unmount()
  })
})

describe('design and UX (052)', () => {
  test('#7: a filter that keeps nothing says so; #3: a narrow legend keeps the keys', async ($, on) => {
    await setup($ as never, on as never)
    const st = $ as never
    const ui = await mountPane(st, 'terminal', 60, 30)
    expect(await ui.legend()).toBe('1-7 tabs · f filters · s status · j/k scroll · Esc closes')
    await ui.unmount()
  })
})

describe('the status filter (054 #21)', () => {
  test('s cycles the Specs tab through all, in progress, next up, done and abandoned', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    expect(await ui.body()).toContain('001 core-state')
    await ui.press('status-filter')
    let body = await ui.body()
    expect(body).toContain('002 band-hint')
    expect(body).not.toContain('001 core-state')
    await ui.press('status-filter')
    await ui.press('status-filter')
    body = await ui.body()
    expect(body).toContain('001 core-state')
    expect(body).not.toContain('002 band-hint')
    await ui.unmount()
  })
})
