import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 050 T001 (#97): one toast asks who owns the footer; the pick persists and is never asked again.
const run = ($: never, args: string, kind = 'composer') =>
  ($ as unknown as { command: { run: (e: never) => Promise<{ text: string }> } }).command.run({ command: 'astrolabe', args, origin: { kind } } as never)
const withSettings = (settings: unknown) => ({
  ...halfDone.tree,
  '/home/me/.claude/settings.json': JSON.stringify(settings),
})
const ASKED = 'astrolabe ✓ statusline also draws a footer: run /astrolabe footer astrolabe or /astrolabe footer statusline'

describe('who owns the footer (050 #97)', () => {
  test('statusline configured: one toast at the first session, none at the next', async ($, on) => {
    const session = installTree(on, withSettings({ statusLine: { type: 'command', command: 'bash ~/.claude/statusline/statusline.sh' } }), '/proj')
    session.script.env.HOME = '/home/me'
    installEngine(on)
    await startSession($, '/proj')
    expect(session.toasts.filter(t => t === ASKED).length).toBe(1)
    await startSession($, '/proj')
    expect(session.toasts.filter(t => t === ASKED).length).toBe(1)
  })

  test('no statusLine command: no toast', async ($, on) => {
    const session = installTree(on, withSettings({}), '/proj')
    session.script.env.HOME = '/home/me'
    installEngine(on)
    await startSession($, '/proj')
    expect(session.toasts).not.toContain(ASKED)
  })

  test('the command shows, sets and guards the pick', async ($, on) => {
    installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    expect((await run($ as never, 'footer')).text).toBe('Usage: /astrolabe footer <astrolabe|statusline>. Now: astrolabe.')
    expect((await run($ as never, 'footer statusline', 'sdk')).text).toBe('Only you can change who owns the footer.')
    expect((await run($ as never, 'footer statusline')).text).toBe('The footer belongs to statusline. Takes effect at the next session.')
  })
})
