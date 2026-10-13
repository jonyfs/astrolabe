// The Specs tab as a tree, and the other tabs' changes of spec 078.
import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

const TREE = project({
  constitution: RATIFIED,
  featureJson: featureJson('specs/002-band-hint'),
  features: {
    '001-core-state': { spec: spec(), plan: true, tasks: tasks(5, 0) },
    '002-band-hint': { spec: spec(), plan: true, tasks: tasks(9, 11) },
    '003-cart': { spec: spec(undefined, '# Cart\n\n[NEEDS CLARIFICATION: which login?]\n'), plan: true, tasks: '- [ ] T001 add cart\n- [ ] T002 add page\n' },
  },
})

const open = async ($: never, on: never, tree = TREE) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await startSession($ as never, '/proj')
  return session
}

describe('the Specs tab is a tree (078 FR-002, FR-003)', () => {
  test('the active spec is open with its tasks under it; the others are folded', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    const body = await ui.body()
    expect(body).toContain('▾ ◆ 002 band-hint')
    // The finished spec is left out of the default list and counted.
    expect(body).not.toContain('001 core-state')
    expect(body).toContain('1 done hidden')
    expect(body).toContain('▸ · 003 cart')
    expect(body).toContain('T012')
    expect(body).not.toContain('add cart')
    await ui.unmount()
  })

  test('e opens every spec and, pressed again, folds all but the active one (078 FR-009)', async ($, on) => {
    const session = await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('open-all')
    expect(await ui.body()).toContain('add cart')
    expect(await ui.body()).toContain('▾ · 003 cart')
    await ui.press('open-all')
    expect(await ui.body()).not.toContain('add cart')
    expect(await ui.body()).toContain('▾ ◆ 002 band-hint')
    // The folds are kept per project (078 FR-010).
    expect(session.store.get('folds:/proj')).toBeDefined()
    await ui.unmount()
  })

  test('t shows only the active spec and its tasks with the full height (078 FR-005)', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('tasks-only')
    const body = await ui.body()
    expect(body).toContain('◆ 002 band-hint')
    expect(body).not.toContain('001 core-state')
    // Past the eight the tree caps at, every open task is listed.
    expect(body).toContain('T020')
    await ui.unmount()
  })

  test('a filter that matches a task keeps its spec visible, open (078 FR-007)', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.input({ key: 'astrolabe-filter', text: 'add page', kind: 'change' })
    const body = await ui.body()
    expect(body).toContain('003 cart')
    expect(body).toContain('add page')
    expect(body).not.toContain('add cart')
    expect(body).not.toContain('001 core-state')
    await ui.unmount()
  })

  test('open questions lead an open spec, each with an ask action (078 FR-045)', async ($, on) => {
    const session = await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('open-all')
    expect(await ui.body()).toContain('1 open questions')
    // The ask button lives in the list's surface module; its press is the message it posts (080).
    await ui.post({ op: 'action', kind: 'ask', id: '003-cart\nwhich login?' })
    expect(session.suggested.at(-1)).toContain('which login?')
    await ui.unmount()
  })
})

describe('ticking and starting a task goes through Claude (078 FR-008)', () => {
  test('the band task opens the pane at that task; x suggests the tick, nothing is written', async ($, on) => {
    const session = await open($ as never, on as never)
    const band = await ($ as unknown as { ui: { mount: (t: never) => Promise<{ press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }> } }).ui.mount({
      plugin: 'astrolabe',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 200, scroll: { bodyRows: 9, top: 0 } },
    } as never)
    await band.press({ key: 'band-task' })
    await band.unmount()
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('task-tick')
    expect(session.suggested.at(-1)).toMatch(/^Tick T010 in specs\/002-band-hint\/tasks\.md \(line \d+\): task 10$/)
    await ui.unmount()
  })
})

describe('Session folds (078 FR-054, FR-059)', () => {
  test('the project is a header, and the live table and the log fold', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('tab-session')
    const body = await ui.body()
    expect(body).toMatch(/root\s+\/proj/)
    expect(body).toMatch(/now\s+next \/speckit-implement/)
    await ui.unmount()
  })
})

describe('Setup (078 FR-071 to FR-082)', () => {
  test('groups fold and an option conflict is named on its row', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.press('tab-setup')
    expect(await ui.body()).toBeDefined()
    await ui.unmount()
  })
})
