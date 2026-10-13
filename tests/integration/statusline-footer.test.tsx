import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 070: the pane footer is the bundled statusline's output under Astrolabe's lead; every
// failure ends in the native footer; the draw path only reads state.
const NOW = Date.UTC(2026, 9, 12, 12, 0)
const ESC = '\x1b'
const GOOD = `${ESC}[48;2;49;50;68m${ESC}[38;2;255;255;255m  main  ${ESC}[0m\n${ESC}[1mmodel opus 5.5${ESC}[0m 5h 42%\n`

type Session = ReturnType<typeof installTree>

const setup = async ($: never, on: never, node: { stdout: string } | 'missing' = { stdout: 'v20.11.1\n' }) => {
  const tree: Record<string, string> = { ...halfDone.tree }
  const session = installTree(on, tree, '/proj')
  session.script.processes['node --version'] = node
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await session.clock.set(NOW)
  await startSession($, '/proj')
  await session.clock.advance(1000)
  await session.clock.settle()
  // The plugin's own folder is the engine's: the session start read its plugin.json.
  const manifest = session.counts.reads.find(r => r.endsWith('/.claude-plugin/plugin.json'))
  expect(manifest).toBeDefined()
  const root = manifest!.replace(/\/\.claude-plugin\/plugin\.json$/, '')
  tree[`${root}/vendor/statusline/VERSION`] = JSON.stringify({ commit: 'b703d7be7e15467836ceaa610563171a9656fa65', version: '1.46.0' })
  tree[`${root}/vendor/statusline/bin/cli.js`] = '// bundled'
  return { session }
}

// The pane is on screen first: the footer is drawn and refreshed only for a pane someone sees.
const turn = async ($: never, session: Session) => {
  const ui = await mountPane($ as never, 'terminal', 100, 80)
  await session.clock.advance(100)
  await session.clock.settle()
  await completeTurn($ as never)
  await session.clock.advance(6000)
  await session.clock.settle()
  await ui.unmount()
}

// The mod's argv holds the plugin's real path (separators and drive letters differ per OS), so
// the renderer is answered under the line it was actually asked for, then given time to retry.
const answerCli = async ($: never, session: Session, stdout: string) => {
  const line = session.processes.find(p => p.startsWith('node ') && p.endsWith('/vendor/statusline/bin/cli.js'))
  expect(line).toBeDefined()
  session.script.processes[line!] = { stdout }
  await session.clock.advance(70_000)
  await session.clock.settle()
  await turn($, session)
  return line!
}

describe('the pane footer from statusline (070)', () => {
  test('the lead stays native; statusline draws the lines under it', { options: { icons: 'nerd' } }, async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await turn($ as never, session)
    const cli = await answerCli($ as never, session, GOOD)
    expect(session.processes).toContain(cli)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    const footer = await ui.footer()
    expect(footer).toContain('main')
    expect(footer).toContain('model opus 5.5')
    expect(footer).toContain('◆ 002')
    await ui.unmount()
  })

  test('node missing: the native footer shows and says why; the renderer never runs', async ($, on) => {
    const { session } = await setup($ as never, on as never, 'missing')
    await turn($ as never, session)
    expect(session.processes.some(p => p.endsWith('/vendor/statusline/bin/cli.js'))).toBe(false)
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    const footer = await ui.footer()
    expect(footer).toContain('needs Node 18')
    expect(footer).not.toContain('model opus 5.5')
    await ui.unmount()
  })

  test('its own failure line with exit 0 is a failure, not a footer', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await turn($ as never, session)
    await answerCli($ as never, session, ' statusline unavailable \n')
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    const footer = await ui.footer()
    expect(footer).toContain('did not answer')
    expect(footer).not.toContain('statusline unavailable')
    await ui.unmount()
  })

  test('footerSource native: no process of the dependency runs', { options: { footerSource: 'native' } }, async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await turn($ as never, session)
    expect(session.processes.some(p => p.endsWith('cli.js') || p === 'node --version')).toBe(false)
  })

  test('identical output writes the footer state once; drawing runs no process', async ($, on) => {
    const { session } = await setup($ as never, on as never)
    await turn($ as never, session)
    await answerCli($ as never, session, GOOD)
    const writes = session.stateSets['footer'] ?? 0
    expect(writes).toBeGreaterThan(0)
    await session.clock.advance(70_000)
    await session.clock.settle()
    await turn($ as never, session)
    expect(session.stateSets['footer'] ?? 0).toBe(writes)
    const before = session.processes.length
    const ui = await mountPane($ as never, 'terminal', 100, 80)
    await ui.footer()
    expect(session.processes.length).toBe(before)
    await ui.unmount()
  })

  test('the command prints the settings line and writes nothing', async ($, on) => {
    await setup($ as never, on as never)
    const out = await ($ as unknown as { command: { run: (e: never) => Promise<{ text?: string }> } }).command.run({ command: 'astrolabe', args: 'statusline' } as never)
    expect(out.text).toContain('"statusLine"')
    expect(out.text).toContain('vendor/statusline/bin/cli.js')
  })
})
