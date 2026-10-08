import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { helpRows } from '../../hooks/core/pane'

// 054 #81: the Help tab links the Spec Kit and gstack docs.
describe('docs links in Help (054 #81)', () => {
  test('a help line that ends with an https link opens it', () => {
    const rows = helpRows('Astrolabe\nDocs:\n  Spec Kit      https://github.github.com/spec-kit/\n  plain line')
    expect(rows[1]).toMatchObject({ role: 'accent' })
    expect(rows[1]!.href).toBeUndefined()
    expect(rows[2]).toMatchObject({ href: 'https://github.github.com/spec-kit/', role: 'text' })
    expect(rows[3]!.href).toBeUndefined()
  })

  test('/astrolabe help lists the docs and the kpis and focus commands', async ($, on) => {
    installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    await startSession($, '/proj')
    const ran = (await $.command.run({ command: 'astrolabe', args: 'help', origin: { kind: 'composer' } } as never)) as { text: string }
    for (const part of ['Docs:', 'https://github.github.com/spec-kit/', 'https://github.com/garrytan/gstack', '/astrolabe kpis', '/astrolabe focus [on|off]']) expect(ran.text).toContain(part)
  })
})
