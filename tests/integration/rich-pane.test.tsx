import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine } from '../helpers/render'

// Spec 024: the pane's Specs tab shows the active spec's summary and links, a filter, and the
// Tasks tab the last turn's tasks.md change as a diff.
const SPEC = '# Quick spec: Band\n\nA band above the prompt.\n'
const tree = () =>
  project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/002-band'),
    features: { '001-core-state': { spec: spec('status: done'), plan: true, tasks: tasks(2, 0) }, '002-band': { spec: SPEC, plan: true, tasks: tasks(1, 3) } },
  })

const mount = async ($: never) => {
  const ui = await ($ as unknown as { ui: { mount: (t: never) => Promise<{
    find: (q: { key?: string; type?: string }) => Promise<{ text: string; props: Record<string, unknown> } | undefined>
    press: (q: { key: string }) => Promise<unknown>
    input: (q: { key: string; text: string; kind?: string }) => Promise<unknown>
    unmount: () => Promise<void>
  }> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'astrolabe',
    props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { bodyRows: 30, top: 0 } },
    viewport: { columns: 104, rows: 34, isFullscreen: true },
  } as never)
  return ui
}

const setup = async ($: never, on: never, files = tree()) => {
  const session = installTree(on, files, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await startSession($ as never, '/proj')
  return session
}

describe('the rich pane (024)', () => {
  test("Specs: the active spec's summary and links to its files", async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mount($ as never)
    const summary = await ui.find({ key: 'astrolabe-summary' })
    expect(summary?.props['text']).toBe('**Band**\n\nA band above the prompt.\n\n[spec.md](file:///proj/specs/002-band/spec.md) · [plan.md](file:///proj/specs/002-band/plan.md) · [tasks.md](file:///proj/specs/002-band/tasks.md)')
    await ui.unmount()
  })

  test('052 #9: the summary starts with two blocks and expands on press', async ($, on) => {
    const files = tree()
    files['/proj/specs/002-band/spec.md'] = '# Quick spec: Band\n\nA band above the prompt.\n\n### User Story 1 - First story\n\n### User Story 2 - Second story\n'
    await setup($ as never, on as never, files)
    const ui = await mount($ as never)
    const summary = () => ui.find({ key: 'astrolabe-summary' })
    expect((await summary())?.props['text']).not.toContain('First story')
    await ui.press({ key: 'summary-toggle' })
    expect((await summary())?.props['text']).toContain('- First story\n- Second story')
    await ui.press({ key: 'summary-toggle' })
    expect((await summary())?.props['text']).not.toContain('First story')
    await ui.unmount()
  })

  test('052 #7: a filter that keeps nothing says so, on Specs and on Tasks', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mount($ as never)
    await ui.input({ key: 'astrolabe-filter', text: 'zzz', kind: 'change' })
    const body = (await ui.find({ key: 'astrolabe-pane-body' }))?.text ?? ''
    expect(body).toContain('No rows hold "zzz"; empty the filter to see them all.')
    expect(body).not.toContain('No features yet')
    await ui.press({ key: 'tab-tasks' })
    expect((await ui.find({ key: 'astrolabe-pane-body' }))?.text).toContain('No rows hold "zzz"')
    await ui.unmount()
  })

  test('Specs: the filter keeps the features whose id or name match', async ($, on) => {
    await setup($ as never, on as never)
    const ui = await mount($ as never)
    await ui.input({ key: 'astrolabe-filter', text: 'core', kind: 'change' })
    const body = (await ui.find({ key: 'astrolabe-pane-body' }))?.text ?? ''
    expect(body).toContain('001 core-state')
    expect(body).not.toContain('002 band')
    await ui.input({ key: 'astrolabe-filter', text: '', kind: 'change' })
    expect((await ui.find({ key: 'astrolabe-pane-body' }))?.text).toContain('002 band')
    await ui.unmount()
  })

  test("Tasks: the last turn's ticks as a diff", async ($, on) => {
    const files = tree()
    await setup($ as never, on as never, files)
    files['/proj/specs/002-band/tasks.md'] = tasks(2, 2)
    await completeTurn($)
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-tasks' })
    const diff = await ui.find({ type: 'Code' })
    expect(diff?.props['source']).toBe('@@ -4,1 +4,1 @@\n-- [ ] T002 task 2\n+- [x] T002 task 2\n')
    expect(diff?.props['format']).toBe('diff')
    await ui.unmount()
  })
})
