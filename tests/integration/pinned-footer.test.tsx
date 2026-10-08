import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine } from '../helpers/render'
import { windowUnits } from '../../hooks/core/pane'

// Spec 038: the footer stays on the pane's last rows; the body scrolls inside, with arrows.
type Ui = { find: (q: { key?: string }) => Promise<{ text: string } | undefined>; press: (q: { key: string }) => Promise<unknown>; unmount: () => Promise<void> }
const mount = async ($: never, bodyRows: number) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<Ui> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'astrolabe',
    props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { bodyRows, top: 0 } },
    viewport: { columns: 104, rows: bodyRows + 4, isFullscreen: true },
  } as never))

describe('the pinned footer (038)', () => {
  test('windowUnits keeps a row for each arrow and never shows nothing', () => {
    expect(windowUnits([1, 1, 1], 0, 5)).toEqual({ start: 0, end: 3 })
    expect(windowUnits(Array(10).fill(1), 0, 5)).toEqual({ start: 0, end: 4 })
    expect(windowUnits(Array(10).fill(1), 4, 5)).toEqual({ start: 4, end: 7 })
    expect(windowUnits(Array(10).fill(1), 8, 5)).toEqual({ start: 8, end: 10 })
    expect(windowUnits([9, 1], 0, 5)).toEqual({ start: 0, end: 1 })
  })

  test('a long Tasks tab scrolls with arrows and k/j; the footer stays', async ($, on) => {
    const tree = project({ constitution: RATIFIED, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 40) } } })
    installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($, '/proj')
    const ui = await mount($ as never, 20)
    await ui.press({ key: 'tab-tasks' })
    const body = () => ui.find({ key: 'astrolabe-pane-body' }).then(f => f?.text ?? '')
    expect(await body()).toContain('T001 task 1')
    expect(await body()).not.toContain('T030 task 30')
    expect(await body()).toMatch(/▼ \d+ more \(j\)/)
    expect(await ui.find({ key: 'astrolabe-pane-footer' })).toBeDefined()
    await ui.press({ key: 'scroll-down' })
    expect(await body()).toMatch(/▲ \d+ more \(k\)/)
    expect(await body()).not.toContain('T001 task 1')
    expect(await ui.find({ key: 'astrolabe-pane-footer' })).toBeDefined()
    await ui.press({ key: 'scroll-up' })
    expect(await body()).toContain('T001 task 1')
    await ui.unmount()
  })
})
