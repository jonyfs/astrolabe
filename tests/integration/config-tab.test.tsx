import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine } from '../helpers/render'

// Spec 028: the Config tab edits every Astrolabe option and saves through $.config.set.
const ROWS = [
  { key: 'theme', label: 'Theme', kind: 'choice', value: 'dark', options: ['dark', 'light'], provider: { kind: 'engine' }, isLocked: false },
  { key: 'astrolabe.preset', label: 'Preset', kind: 'choice', value: 'compact', options: ['minimal', 'compact', 'full'], provider: { kind: 'plugin', name: 'astrolabe' }, isLocked: false },
  { key: 'astrolabe.checkUpdates', label: 'Check for updates', kind: 'boolean', value: true, provider: { kind: 'plugin', name: 'astrolabe' }, isLocked: false },
]

type Ui = {
  find: (q: { key?: string }) => Promise<{ text: string } | undefined>
  press: (q: { key: string }) => Promise<unknown>
  select: (q: { key: string; value: string }) => Promise<unknown>
  unmount: () => Promise<void>
}
const mount = async ($: never) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<Ui> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'astrolabe',
    props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { bodyRows: 30, top: 0 } },
    viewport: { columns: 104, rows: 34, isFullscreen: true },
  } as never))

describe('the Config tab (028)', () => {
  test('lists Astrolabe rows only; a pick and a toggle save through $.config.set', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    const set: Array<{ key: string; value: unknown }> = []
    on('config.list', () => ({ value: ROWS }) as never)
    on('config.set', ($, e) => {
      set.push({ key: e.key, value: e.value })
      return { value: e.value } as never
    })
    await startSession($ as never, '/proj')
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-config' })
    const body = () => ui.find({ key: 'astrolabe-pane-body' }).then(f => f?.text ?? '')
    expect(await body()).toContain('Preset')
    expect(await body()).not.toContain('Theme')
    await ui.select({ key: 'config-astrolabe.preset', value: 'full' })
    await ui.press({ key: 'config-astrolabe.checkUpdates' })
    expect(await body()).toContain('Save 2 changes')
    await ui.press({ key: 'config-save' })
    expect(set).toEqual([
      { key: 'astrolabe.preset', value: 'full' },
      { key: 'astrolabe.checkUpdates', value: false },
    ])
    expect(session.toasts.at(-1)).toBe('🧭 2 options saved; Astrolabe reloads with them')
    await ui.unmount()
  })

  test('054 #63: Reset to defaults drafts the defaults; /astrolabe config reset applies them, from the composer only', async ($, on) => {
    const tree: Record<string, string> = { ...halfDone.tree }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    const set: Array<{ key: string; value: unknown }> = []
    on('config.list', () => ({ value: ROWS }) as never)
    on('config.set', ($$, e) => {
      set.push({ key: e.key, value: e.value })
      return { value: e.value } as never
    })
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    await session.clock.advance(1000)
    const manifest = session.counts.reads.find(r => r.endsWith('/.claude-plugin/plugin.json'))
    expect(manifest).toBeDefined()
    tree[manifest!] = JSON.stringify({ version: '0.0.0', userConfig: { preset: { default: 'full' }, checkUpdates: { default: true } } })
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-config' })
    await ui.press({ key: 'config-reset' })
    expect((await ui.find({ key: 'astrolabe-pane-body' }))?.text).toContain('Save 1 change')
    await ui.unmount()
    const fromClaude = (await $.command.run({ command: 'astrolabe', args: 'config reset' } as never)) as { text: string }
    expect(fromClaude.text).toContain('Only you can reset the options')
    const ran = (await $.command.run({ command: 'astrolabe', args: 'config reset', origin: { kind: 'composer' } } as never)) as { text: string }
    expect(set).toEqual([{ key: 'astrolabe.preset', value: 'full' }])
    expect(ran.text).toBe('🧭 back to defaults: preset')
  })
})
