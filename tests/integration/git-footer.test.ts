import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine } from '../helpers/render'

// Spec 023: the pull request and its CI in the footer, opt-in, cached for five minutes.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const GIT = 'git status --porcelain=v2 --branch --show-stash'
const GH = 'gh pr view --json number,url,statusCheckRollup'
const tree = { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }

const setup = async ($: never, on: never) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  await session.clock.set(NOW)
  session.script.processes[GIT] = { stdout: '# branch.oid abc\n# branch.head main\n# stash 1\n' }
  session.script.processes[GH] = { stdout: JSON.stringify({ number: 31, url: 'https://github.com/example/repo/pull/31', statusCheckRollup: [{ conclusion: 'SUCCESS' }] }) }
  await startSession($, '/proj')
  return session
}

describe('the pull request in the footer (023)', () => {
  test('off by default: gh never runs', { options: { footerIn: 'status', icons: 'ascii' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.processes).not.toContain(GH)
    expect(session.last()).toContain('git:main stash:1')
  })
  test('on: one gh call, the footer shows it, cached for five minutes', { options: { footerIn: 'status', icons: 'ascii', pullRequest: true } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.processes.filter(p => p === GH).length).toBe(1)
    await completeTurn($)
    expect(session.last()).toContain('PR#31 ok')
    await session.clock.advance(60_000)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.processes.filter(p => p === GH).length).toBe(1)
    await session.clock.advance(5 * 60_000)
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.processes.filter(p => p === GH).length).toBe(2)
  })
  test('no pull request (gh exits 1): nothing shows, no error', { options: { footerIn: 'status', icons: 'ascii', pullRequest: true } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    session.script.processes[GH] = { exitCode: 1, stderr: 'no pull requests found' }
    await completeTurn($)
    await session.clock.advance(1000)
    await completeTurn($)
    expect(session.last()).not.toContain('PR#')
    expect(session.logs).toEqual([])
  })
  test('the pane footer links the PR number to its HTTPS page', { options: { footerIn: 'pane', pullRequest: true } }, async ($, on) => {
    const session = installTree(on as never, tree, '/proj')
    installEngine(on as never)
    installPaneEngine(on as never)
    installRenderEngine(on as never)
    await session.clock.set(NOW)
    session.script.processes[GIT] = { stdout: '# branch.oid abc\n# branch.head main\n' }
    session.script.processes[GH] = { stdout: JSON.stringify({ number: 31, url: 'https://github.com/example/repo/pull/31', statusCheckRollup: [] }) }
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    await session.clock.advance(1000)
    const ui = await ($ as unknown as { ui: { mount: (target: never) => Promise<{ find: (query: { type?: string; text?: string | RegExp }) => Promise<{ props: Record<string, unknown> } | undefined>; unmount: () => Promise<void> }> } }).ui.mount({
      plugin: 'astrolabe',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'astrolabe',
      props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { bodyRows: 30, top: 0 } },
      viewport: { columns: 84, rows: 34, isFullscreen: true },
    } as never)
    const link = await ui.find({ type: 'Link', text: '#31' })
    expect(link?.props['href']).toBe('https://github.com/example/repo/pull/31')
    await ui.unmount()
  })

  test('041 #6: the pane footer links branch and PR chips to their HTTPS pages', { options: { footerIn: 'pane', pullRequest: true } }, async ($, on) => {
    const session = installTree(on as never, tree, '/proj')
    installEngine(on as never)
    installPaneEngine(on as never)
    installRenderEngine(on as never)
    await session.clock.set(NOW)
    session.script.processes[GIT] = { stdout: '# branch.oid abc\n# branch.head main\n' }
    session.script.processes['git remote get-url origin'] = { stdout: 'git@github.com:example/repo.git\n' }
    session.script.processes[GH] = { stdout: JSON.stringify({ number: 31, url: 'https://github.com/example/repo/pull/31', statusCheckRollup: [] }) }
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    await session.clock.advance(1000)
    const ui = await ($ as unknown as { ui: { mount: (target: never) => Promise<{ find: (query: { type?: string; text?: string | RegExp }) => Promise<{ props: Record<string, unknown> } | undefined>; unmount: () => Promise<void> }> } }).ui.mount({
      plugin: 'astrolabe',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'astrolabe',
      props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 100, placement: 'dock', scroll: { bodyRows: 30, top: 0 } },
      viewport: { columns: 104, rows: 34, isFullscreen: true },
    } as never)
    expect((await ui.find({ type: 'Link', text: 'main' }))?.props['href']).toBe('https://github.com/example/repo/tree/main')
    expect((await ui.find({ type: 'Link', text: '#31' }))?.props['href']).toBe('https://github.com/example/repo/pull/31')
    await ui.unmount()
  })
})
