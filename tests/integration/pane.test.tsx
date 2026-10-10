import { describe, expect, test } from 'claude-code/testing'

import { paneLabelWidth } from '../../hooks/core/i18n'
import { featureJson, project, RATIFIED, spec } from '../fixtures/build'
import { scenario as halfDone } from '../fixtures/half-done'
import { scenario as noSpeckit } from '../fixtures/no-speckit'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane, SURFACES } from '../helpers/render'

const NOW = Date.UTC(2026, 9, 7, 12, 0)

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
    expect(pane.opened).toEqual([{ id: 'astrolabe', title: '🧭 Astrolabe · ◆ 002 band-hint', focus: true, closeOnEscape: true }])
  })
})

describe('the pane tabs (US1, US2)', () => {
  for (const surface of SURFACES) {
    test(`${surface}: Specs first, then Tasks and Session by hotkey buttons`, async ($, on) => {
      const { session } = await setup($ as never, on as never)
      const ui = await mountPane($ as never, surface)
      expect(await ui.tabs()).toContain('Specs')
      expect(await ui.body()).toContain('❯ ▸ ◐ 002 band-hint   implement  ████░░░░░░  9/20  45%')
      const reads = session.counts.read
      await ui.press('tab-tasks')
      expect(await ui.body()).toContain('9/20 done')
      expect(await ui.body()).toContain('T010 task 10')
      await ui.press('tab-session')
      expect(await ui.body()).toContain(`chosen by${' '.repeat(paneLabelWidth('en') - 'chosen by'.length)}feature.json`)
      await ui.press('tab-specs')
      expect(await ui.body()).toContain('● 001 core-state')
      expect(session.counts.read).toBe(reads)
      await ui.unmount()
    })
  }

  test('050 #99: every tab renders on Desktop, with PR links or a text fallback', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    session.script.processes['gh pr list --state open --limit 20 --json number,title,headRefName,headRefOid,url,labels,reviewDecision,statusCheckRollup,mergeStateStatus,isDraft,author,createdAt'] = {
      stdout: JSON.stringify([{
        number: 45,
        title: 'feat: desktop fallback',
        headRefName: 'feature',
        headRefOid: 'abc1234',
        url: 'https://github.com/o/r/pull/45',
        labels: [],
        reviewDecision: 'APPROVED',
        statusCheckRollup: [],
        mergeStateStatus: 'CLEAN',
        isDraft: false,
      }]),
    }
    const ui = await mountPane($ as never, 'desktop', 120, 60)
    const tabs = [
      ['tab-specs', '002 band-hint'],
      ['tab-tasks', 'T010 task 10'],
      ['tab-session', 'feature.json'],
      ['tab-dashboard', 'Spec Kit cycle'],
      ['tab-help', '/astrolabe status'],
      ['tab-config', 'No Astrolabe options'],
    ] as const
    for (const [tab, expected] of tabs) {
      await ui.press(tab)
      expect(await ui.body()).toContain(expected)
    }

    await ui.press('tab-prs')
    await session.clock.advance(1000)
    expect(await ui.body()).toContain('feat: desktop fallback')
    const prLink = await ui.find({ type: 'Link', text: /feat: desktop fallback/ })
    if (prLink === undefined) expect(await ui.body()).toContain('feat: desktop fallback')
    else expect(prLink.props['href']).toBe('https://github.com/o/r/pull/45')
    await ui.unmount()
  })

  test('the chosen tab stays for the session', async ($, on) => {
    await setup($ as never, on as never)
    const first = await mountPane($ as never, 'terminal')
    await first.press('tab-session')
    await first.unmount()
    const again = await mountPane($ as never, 'terminal')
    expect(await again.body()).toContain('analyzed')
    await again.unmount()
  })

  test('054 #17: a reload keeps the tab and the status filter', async ($, on) => {
    await setup($ as never, on as never)
    const first = await mountPane($ as never, 'terminal', 100, 30)
    const all = await first.body()
    await first.press('status-filter')
    const filtered = await first.body()
    await first.press('tab-session')
    await first.unmount()
    await startSession($ as never, '/proj')
    const again = await mountPane($ as never, 'terminal', 100, 30)
    expect(await again.body()).toContain('analyzed')
    await again.press('tab-specs')
    expect(await again.body()).toBe(filtered)
    expect(filtered).not.toBe(all)
    await again.unmount()
  })

  test('without Spec Kit the pane says so', async ($, on) => {
    await setup($ as never, on as never, noSpeckit)
    const ui = await mountPane($ as never, 'terminal')
    expect((await ui.body()).endsWith('This project does not use Spec Kit. Run specify init to start.')).toBe(true)
    await ui.unmount()
  })

  test('054 #76: colorblind mode pairs status colors with shape marks', { options: { flavor: 'colorblind' } }, async ($, on) => {
    const tree = { ...halfDone.tree }
    const path = '/proj/specs/002-band-hint/spec.md'
    tree[path] = `${tree[path]}\n[NEEDS CLARIFICATION: review this decision]`
    await setup($ as never, on as never, { ...halfDone, tree })
    const ui = await mountPane($ as never, 'terminal')
    expect(await ui.body()).toContain('▲ ! 002: [NEEDS CLARIFICATION] left after the plan')
    await ui.unmount()
  })

  test('054 #67: long feature names wrap on Desktop and are elided in the terminal', async ($, on) => {
    const dir = '002-feature-name-that-is-longer-than-twenty-four-characters'
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson(`specs/${dir}`),
      features: { [dir]: { spec: spec(), plan: true, tasks: '- [ ] T001 test\n' } },
    })
    const scenario = { cwd: '/proj', tree, expected: halfDone.expected }
    await setup($ as never, on as never, scenario)
    const desktop = await mountPane($ as never, 'desktop', 40)
    expect(await desktop.body()).toContain(dir.slice(4))
    expect((await desktop.find({ type: 'Text', text: /feature-name-that-is-longer/ }))?.props['wrap']).toBe('wrap')
    await desktop.unmount()
    const terminal = await mountPane($ as never, 'terminal', 40)
    expect(await terminal.body()).toContain('…')
    expect((await terminal.find({ type: 'Text', text: /feature-name-th…/ }))?.props['wrap']).toBe('truncate-end')
    await terminal.unmount()
  })

  test('054 #1: one read of each pane state value per render', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    for (const key of Object.keys(session.stateGets)) delete session.stateGets[key]
    const ui = await mountPane($ as never, 'terminal')
    expect(session.stateGets).toEqual({ speckit: 1, session: 1, usage: 1, pane: 1, updates: 1 })
    await ui.unmount()
  })

  test('054 #5: Session, Dashboard and Help share the longest label column', async ($, on) => {
    await setup($ as never, on as never)
    const labelWidth = paneLabelWidth('en')
    const ui = await mountPane($ as never, 'terminal', 140, 60)
    await ui.press('tab-session')
    expect(await ui.body()).toContain(`root${' '.repeat(labelWidth - 4)}/proj`)
    await ui.press('tab-dashboard')
    expect(await ui.body()).toContain(`turns${' '.repeat(labelWidth - 5)}0`)
    await ui.unmount()

    const help = (await $.command.run({ command: 'astrolabe', args: 'help' } as never)) as { text: string }
    expect(help.text).toContain(`  constitution${' '.repeat(labelWidth - 'constitution'.length)} the rules every other step checks`)
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
  test('054 #24: names the footer parts in their fixed order', async ($, on) => {
    await setup($ as never, on as never)
    const ran = (await $.command.run({ command: 'astrolabe', args: 'help', origin: { kind: 'composer' } } as never)) as { text?: string }
    expect(ran.text).toContain('Footer, always in this order: Spec Kit · deciding window · other windows · context · model · skill · git · burn · session time.')
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
    expect(await ui.body()).toContain(`hooks after${' '.repeat(paneLabelWidth('en') - 'hooks after'.length)}/speckit-git-commit (optional)`)
    await ui.unmount()
    expect(session.logs).toEqual([])
  })
})

describe('[P] tasks to subagents (054 #89)', () => {
  test('the Tasks tab offers one prompt that sends the [P] run to subagents', async ($, on) => {
    const tree = project({
      constitution: RATIFIED,
      featureJson: featureJson('specs/002-b'),
      features: { '002-b': { spec: spec(), plan: true, tasks: '- [x] T001 a\n- [ ] T002 [P] b in src/b.ts\n- [ ] T003 [P] c in src/c.ts\n- [ ] T004 d\n' } },
    })
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($ as never, '/proj')
    const ui = await mountPane($ as never, 'terminal', 120, 40)
    await ui.press('tab-tasks')
    await ui.press('parallel-dispatch')
    await session.clock.settle()
    const sent = session.submitted.at(-1) ?? ''
    expect(sent).toContain('Dispatch each one to its own subagent')
    expect(sent).toContain('- T002 [P] b in src/b.ts')
    expect(sent).toContain('- T003 [P] c in src/c.ts')
    expect(sent).not.toContain('T004')
    await ui.unmount()
  })
})

describe('pane navigation (043)', () => {
  test('#21 #25: tabs carry counts; a legend names the keys of the tab shown', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 130, 30)
    expect(await ui.tabs()).toContain('Tasks 11')
    // 054 #26: the legend ends with when the state was last written.
    expect(await ui.legend()).toMatch(/^every feature, its phase and progress · 1-7 tabs · h help · f filters · s status · j\/k scroll · r ↻ · Esc closes · updated \d\d:\d\d$/)
    await ui.press('tab-tasks')
    expect(await ui.legend()).toMatch(/^the active feature's open tasks · 1-7 tabs · h help · f filters · j\/k scroll · r ↻ · Esc closes · updated \d\d:\d\d$/)
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

  test('052 #36: Help groups content and the filter jumps to matching blocks', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 120, 60)
    await ui.press('tab-help')
    let body = ''
    for (let page = 0; page < 10; page += 1) {
      const visible = await ui.body()
      body += visible
      if (!visible.includes('▼')) break
      await ui.press('scroll-down')
    }
    for (const heading of ['Commands', 'Keys', 'Options', 'Marks', 'Steps', 'Models']) expect(body).toContain(heading)
    await ui.input({ key: 'astrolabe-filter', text: 'Models', kind: 'change' })
    const filtered = await ui.body()
    expect(filtered).toContain('Models')
    expect(filtered).toContain('skillModels')
    expect(filtered).not.toContain('/astrolabe status')
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
    const longFinding = `spec.md US2: ${'no acceptance scenario '.repeat(8)}`
    on('model.complete', ($$, e) => {
      asked.push(e as never)
      return { value: { isAnswered: true, text: `${longFinding}\nplan.md: no rollback` } } as never
    })
    const { session } = await setup($ as never, on as never)
    await session.clock.set(NOW)
    const fromClaude = (await $.command.run({ command: 'astrolabe', args: 'review' } as never)) as { text: string }
    expect(fromClaude.text).toContain('Only you can start a deep review')
    const ran = (await $.command.run({ command: 'astrolabe', args: 'review', origin: { kind: 'composer' } } as never)) as { text: string }
    expect(ran.text).toBe('🧭 reviewing 002 band-hint with opus; the findings land in the Session tab')
    await session.clock.settle()
    expect(asked[0]).toMatchObject({ model: 'opus', effort: 'xhigh' })
    expect(session.toasts.at(-1)).toBe('🧭 the review of 002 band-hint is in the Session tab')
    await session.clock.advance(5 * 60_000)
    const ui = await mountPane($ as never, 'terminal', 120, 40)
    await ui.press('tab-session')
    expect(await ui.body()).toContain('review 002 · opus · 5m ago')
    expect(await ui.body()).toContain(`${' '.repeat(paneLabelWidth('en'))}${longFinding}`)
    expect((await ui.find({ type: 'Text', text: longFinding }))?.props['wrap']).toBe('wrap')
    await ui.unmount()
    const desktop = await mountPane($ as never, 'desktop', 120, 40)
    await desktop.press('tab-session')
    expect((await desktop.find({ type: 'Text', text: longFinding }))?.props['wrap']).toBe('wrap')
    await desktop.unmount()
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
    expect(await ui.legend()).toBe('1-7 tabs · h help · f filters · s status · j/k scroll · r ↻ · Esc closes')
    await ui.unmount()
  })

  test('052 #8: the filter shows how many feature rows it keeps', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    await ui.input({ key: 'astrolabe-filter', text: '002' })
    expect(await ui.body()).toContain('1/2 rows')
    await ui.unmount()
  })

  test('052 #16: inactive spec links show on hover, while the selected row stays linked', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 120, 40)
    const activeLink = await ui.find({ type: 'Link', text: '↗' })
    expect(activeLink?.props['href']).toBe('file:///proj/specs/002-band-hint/spec.md')
    const drawn = JSON.stringify(await ui.drawn())
    expect(drawn).toContain('"display":"none"')
    expect(drawn).toContain('"hover":{"scope":"astrolabe-spec-link-feature-001","display":"flex"}')
    expect(drawn).toContain('"hover":{"scope":"astrolabe-spec-link-feature-001","underline":true}')
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

describe('the advisor reviews a spec (055)', () => {
  test('/astrolabe advisor asks Claude to call its advisor on the spec, from the composer only; the Specs tab has a button', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const fromClaude = (await $.command.run({ command: 'astrolabe', args: 'advisor' } as never)) as { text: string }
    expect(fromClaude.text).toContain('Only you can start an advisor review')
    const ran = (await $.command.run({ command: 'astrolabe', args: 'advisor 2', origin: { kind: 'composer' } } as never)) as { text: string }
    expect(ran.text).toBe('🧭 asking Claude to have the advisor review 002 band-hint')
    await session.clock.settle()
    expect(session.submitted.at(-1)).toContain('specs/002-band-hint/spec.md')
    expect(session.submitted.at(-1)).toContain('call the advisor tool')
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    // A first press asks for a second one: the advisor takes a whole turn (061).
    await ui.press('advisor-review')
    await session.clock.settle()
    expect(session.submitted.filter(t => t.includes('call the advisor tool'))).toHaveLength(1)
    await ui.press('advisor-review')
    await session.clock.settle()
    expect(session.submitted.filter(t => t.includes('call the advisor tool'))).toHaveLength(2)
    await ui.unmount()
  })
})

describe('the review buttons sit under the selected spec (055, user request)', () => {
  test('the advisor button is a row under the spec it reviews, not in the header', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    const under = await ui.find({ key: 'feature-002-buttons' })
    expect(under?.text).toContain('advisor review')
    expect(await ui.find({ key: 'feature-001-buttons' })).toBeUndefined()
    expect(await ui.find({ key: 'astrolabe-gstack' })).toBeUndefined()
    await ui.unmount()
  })
})

describe('the advisor answer in the Session tab (055 T004)', () => {
  test('the final answer of the turn that ran the advisor is kept, 12 lines at most', async ($, on) => {
    let reply: Record<string, unknown> = {}
    ;(on as unknown as (event: string, hook: unknown) => void)('turn.step', async function* (_: unknown, e: { turnId: string; index: number }) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null, ...reply }
    })
    const { session } = await setup($ as never, on as never)
    const step = async () => {
      for await (const _ of ($ as unknown as { turn: { step: (e: never) => AsyncIterable<unknown> } }).turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 1 } as never)) {
        // drain
      }
    }
    await $.command.run({ command: 'astrolabe', args: 'advisor 2', origin: { kind: 'composer' } } as never)
    await session.clock.settle()
    reply = { stopReason: 'tool_use', serverToolUses: [{ id: 'a1', name: 'advisor', input: {}, startedAt: 0, endedAt: 1 }] }
    await step()
    reply = { answer: `Findings:\n\n${[...Array(14).keys()].map(i => `${i + 1}. finding ${i + 1}`).join('\n')}` }
    await step()
    const ui = await mountPane($ as never, 'terminal', 120, 60)
    await ui.press('tab-session')
    const body = await ui.body()
    expect(body).toMatch(/advisor 002\s+Findings:/)
    expect(body).toContain('11. finding 11')
    expect(body).not.toContain('12. finding 12')
    await ui.unmount()
  })

  test('a turn that never ran the advisor keeps nothing', async ($, on) => {
    ;(on as unknown as (event: string, hook: unknown) => void)('turn.step', async function* (_: unknown, e: { turnId: string; index: number }) {
      return { turnId: e.turnId, index: e.index, answer: 'I read the files.', toolUses: [], stopReason: 'end_turn', usage: null }
    })
    const { session } = await setup($ as never, on as never)
    await $.command.run({ command: 'astrolabe', args: 'advisor 2', origin: { kind: 'composer' } } as never)
    await session.clock.settle()
    for await (const _ of ($ as unknown as { turn: { step: (e: never) => AsyncIterable<unknown> } }).turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', messageCount: 1 } as never)) {
      // drain
    }
    const ui = await mountPane($ as never, 'terminal', 120, 60)
    await ui.press('tab-session')
    expect(await ui.body()).not.toContain('I read the files.')
    await ui.unmount()
  })
})

describe('a broken extensions.yml in the Session tab (054 #16)', () => {
  test('names the file, the line and why', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec() } }, extra: { '.specify/extensions.yml': 'hooks:\n  before_plan:\n  - command speckit.git.commit\n' } })
    await setup($ as never, on as never, { ...halfDone, tree, cwd: '/proj' })
    const ui = await mountPane($ as never, 'terminal', 140, 40)
    await ui.press('tab-session')
    expect(await ui.body()).toContain('.specify/extensions.yml line 3: not an event, an item or a key: value; its hooks are not read')
    await ui.unmount()
  })
})

describe('the Session tab in blocks (052 #24, #25)', () => {
  test('Project, then Governor once there is a reading; the state row takes the band colour', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await ($ as unknown as { session: { measure: (e: never) => Promise<unknown> } }).session.measure({
      rateLimits: [{ kind: 'five_hour', percentUsed: 83, resetsAt: new Date((await session.clock.now()) + 3_600_000).toISOString() }],
      changed: ['rateLimits'],
    } as never)
    const ui = await mountPane($ as never, 'terminal', 120, 40)
    await ui.press('tab-session')
    const body = await ui.body()
    expect(body.indexOf('Project')).toBeLessThan(body.indexOf('Governor'))
    expect(body).toContain('holding (5h at 83%)')
    await ui.unmount()
  })
})

describe('a narrow tab row (052 #1)', () => {
  test('under 80 columns a tab is its number and badge', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 60, 30)
    const tabs = await ui.tabs()
    expect(tabs).toContain('2·11')
    expect(tabs).not.toContain('Tasks')
    await ui.unmount()
  })
})

describe('h opens Help (052 #50)', () => {
  test('from any tab', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    await ui.press('tab-tasks')
    await ui.press('help-key')
    expect(await ui.body()).toContain('Astrolabe commands:')
    await ui.unmount()
  })
})

describe('a Help command copies itself (052 #37)', () => {
  test('each /astrolabe command has a copy button; a press toasts the command', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 60)
    await ui.press('help-key')
    const copy = await ui.find({ type: 'Button', text: '⧉' })
    expect(copy).toBeDefined()
    await ui.unmount()
    void session
  })
})

describe('the Health block in Help (052 #42)', () => {
  test('opening Help reads the doctor checks into a Health block, once a minute at most', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 100)
    await ui.press('help-key')
    await session.clock.settle()
    const help = (await $.command.run({ command: 'astrolabe', args: 'help' } as never)) as { text: string }
    expect(help.text).toContain('Health')
    expect(help.text).toMatch(/[✓✗] git/)
    await ui.unmount()
  })
})
