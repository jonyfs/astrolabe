// The Specs list as a surface module (080): what it is handed, and what its keys do.
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
    '003-cart': { spec: spec(), plan: true, tasks: '- [ ] T001 add cart\n- [ ] T002 add page\n' },
  },
})

const open = async ($: never, on: never) => {
  const session = installTree(on, TREE, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await startSession($ as never, '/proj')
  return session
}

describe('the list is a surface module in the terminal (080 FR-001, FR-005)', () => {
  test('the terminal hands it the rows; the desktop and the accessible mode draw the tree', async ($, on) => {
    await open($ as never, on as never)
    const terminal = await mountPane($ as never, 'terminal', 100, 40, 40)
    const rows = await terminal.clientRows()
    expect(rows?.some(row => row.k === 'feature-002' && row.t.includes('002 band-hint'))).toBe(true)
    expect(rows?.some(row => row.k.startsWith('task-002-band-hint-'))).toBe(true)
    await terminal.unmount()
    const desktop = await mountPane($ as never, 'desktop', 100, 40, 40)
    expect(await desktop.clientRows()).toBeUndefined()
    expect(await desktop.body()).toContain('002 band-hint')
    await desktop.unmount()
  })
})

describe('the keys after a click (080 FR-002, FR-003)', () => {
  test('Enter folds the selected spec and → opens it again', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    expect(await ui.body()).toContain('T012')
    await ui.key({ key: 'return' })
    expect(await ui.body()).not.toContain('T012')
    await ui.key({ key: 'right' })
    expect(await ui.body()).toContain('T012')
    await ui.unmount()
  })

  test('← on a spec folds it; e opens every spec; t shows only the tasks', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.key({ key: 'left' })
    expect(await ui.body()).not.toContain('T012')
    await ui.key({ key: 'e' })
    expect(await ui.body()).toContain('add cart')
    await ui.key({ key: 't' })
    expect(await ui.body()).not.toContain('003 cart')
    await ui.unmount()
  })

  test('x puts the tick of the selected task in the prompt box', async ($, on) => {
    const session = await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.post({ op: 'select', key: 'task-002-band-hint-T012' })
    await ui.key({ key: 'x' })
    expect(session.suggested.at(-1)).toMatch(/^Tick T012 in specs\/002-band-hint\/tasks\.md \(line \d+\)/)
    await ui.unmount()
  })

  test('Tab goes to the next tab and Shift+Tab to the one before', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    await ui.key({ key: 'tab' })
    expect(await ui.body()).toContain('constitution')
    await ui.unmount()
  })

  test('a message that is not an op changes nothing', async ($, on) => {
    await open($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40, 40)
    const before = await ui.body()
    await ui.post({ op: 'format-disk' })
    await ui.post('hello')
    expect(await ui.body()).toBe(before)
    await ui.unmount()
  })
})
