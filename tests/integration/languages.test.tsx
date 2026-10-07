import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 019: the person-facing texts follow the person's language.
const setup = async ($: never, on: never) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  installPaneEngine(on)
  await startSession($, '/proj')
  return session
}
const type = ($: never, text: string, kind = 'composer') =>
  ($ as unknown as { prompt: { submit: (e: never) => Promise<unknown> } }).prompt.submit({ text, origin: { kind }, wait: false } as never)
const help = async ($: never) =>
  ((await ($ as unknown as { command: { run: (e: never) => Promise<{ text?: string }> } }).command.run({ command: 'astrolabe', args: 'help', origin: { kind: 'composer' } } as never)).text ?? '')

describe('languages (019)', () => {
  test('English until the person writes; then their language', async ($, on) => {
    await setup($ as never, on as never)
    expect(await help($ as never)).toContain('Astrolabe commands:')
    await type($ as never, 'crie uma aba no astrolabe que mostre os prs abertos e faça o merge')
    expect(await help($ as never)).toContain('Comandos do Astrolabe:')
    const ui = await mountPane($ as never, 'terminal')
    expect(await ui.tabs()).toContain('Tarefas')
    await ui.press('tab-tasks')
    expect(await ui.body()).toContain('9/20 feitas')
    await ui.unmount()
  })

  test('a short or unclear prompt keeps the language', async ($, on) => {
    await setup($ as never, on as never)
    await type($ as never, 'crea una pestaña que muestre los pull requests abiertos, por favor')
    await type($ as never, '/astrolabe')
    await type($ as never, 'ok')
    expect(await help($ as never)).toContain('Comandos de Astrolabe:')
  })

  test('a prompt a plugin sends is not the person writing', async ($, on) => {
    await setup($ as never, on as never)
    await type($ as never, "ajoute un onglet avec les pull requests ouvertes et je veux aussi le statut", 'plugin')
    expect(await help($ as never)).toContain('Astrolabe commands:')
  })

  test('the option wins over the guess', { options: { language: 'fr' } }, async ($, on) => {
    await setup($ as never, on as never)
    await type($ as never, 'add a tab that shows the open pull requests and their CI status')
    expect(await help($ as never)).toContain("Commandes d'Astrolabe :")
  })
})
