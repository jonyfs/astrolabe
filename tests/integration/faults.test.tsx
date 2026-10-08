import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 049 #89: every file read and every process fails; nothing throws, every tab still draws.
describe('fault injection (049 #89)', () => {
  test('all reads and processes fail: the session starts, a turn ends, every tab draws', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    for (const path of Object.keys(halfDone.tree)) session.denied.add(path)
    // Processes are unscripted, so every one is refused (ENOENT).
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    for (const tab of ['specs', 'tasks', 'session', 'dashboard', 'help', 'config', 'prs']) {
      await ui.press(`tab-${tab}`)
      expect(typeof (await ui.body())).toBe('string')
    }
    await ui.unmount()
    const status = (await $.command.run({ command: 'astrolabe', args: 'status' } as never)) as { text?: string }
    expect(typeof status.text).toBe('string')
    const doctor = (await $.command.run({ command: 'astrolabe', args: 'doctor' } as never)) as { text?: string }
    expect(doctor.text).toContain('✗ git not found')
  })
})
