import { describe, expect, test } from 'claude-code/testing'

import { parsePullList, pullAction } from '../../hooks/core/pulls'
import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine } from '../helpers/render'

// Spec 032: the PRs tab.
const LIST = JSON.stringify([
  { number: 45, title: 'feat: style', headRefName: '029-style', headRefOid: 'abc1234def', url: 'https://github.com/o/r/pull/45', labels: [{ name: 'feature' }], reviewDecision: 'APPROVED', statusCheckRollup: [{ conclusion: 'SUCCESS' }], mergeStateStatus: 'CLEAN', isDraft: false },
  { number: 46, title: 'fix: old', headRefName: 'fix-old', url: 'https://github.com/o/r/pull/46', labels: [], reviewDecision: 'REVIEW_REQUIRED', statusCheckRollup: [{ status: 'IN_PROGRESS', conclusion: '' }], mergeStateStatus: 'BEHIND', isDraft: false },
])
const GH_LIST = 'gh pr list --state open --limit 20 --json number,title,headRefName,headRefOid,url,labels,reviewDecision,statusCheckRollup,mergeStateStatus,isDraft'

type Ui = { find: (q: { key?: string }) => Promise<{ text: string } | undefined>; press: (q: { key: string }) => Promise<unknown>; drawn: () => Promise<unknown>; unmount: () => Promise<void> }
const mount = async ($: never) =>
  (await ($ as unknown as { ui: { mount: (t: never) => Promise<Ui> } }).ui.mount({
    plugin: 'astrolabe', surface: 'terminal', component: 'Pane', requestId: 'astrolabe',
    props: { title: '🧭 Astrolabe', isFocused: true, bodyColumns: 110, placement: 'dock', scroll: { bodyRows: 30, top: 0 } },
    viewport: { columns: 114, rows: 34, isFullscreen: true },
  } as never))

describe('the PRs tab (032)', () => {
  test('parses gh pr list: checks, review, labels, merge state', () => {
    const rows = parsePullList(LIST)
    expect(rows.map(r => [r.number, r.checks, r.review, r.merge])).toEqual([[45, 'pass', 'approved', 'CLEAN'], [46, 'pending', 'required', 'BEHIND']])
    expect(rows[0]?.labels).toEqual(['feature'])
    expect(parsePullList('nope')).toEqual([])
    expect(pullAction('merge', 45)).toEqual(['gh', 'pr', 'merge', '45', '--merge'])
    expect(pullAction('merge', 45, 'abc1234def')).toEqual(['gh', 'pr', 'merge', '45', '--merge', '--match-head-commit', 'abc1234def'])
    expect(parsePullList(LIST)[0]?.head).toBe('abc1234def')
  })

  test('lists the pull requests with links; merge runs after a second press', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[GH_LIST] = { stdout: LIST }
    session.script.processes['gh pr merge 45 --merge --match-head-commit abc1234def'] = { stdout: 'merged' }
    await startSession($ as never, '/proj')
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-prs' })
    await session.clock.advance(1000)
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('https://github.com/o/r/pull/45')
    expect(tree).toContain('✓ #45 feat: style')
    expect(tree).toContain('pr-update-46')
    expect(tree).not.toContain('pr-merge-46')
    await ui.press({ key: 'pr-merge-45' })
    await session.clock.advance(100)
    expect(session.processes).not.toContain('gh pr merge 45 --merge --match-head-commit abc1234def')
    expect(JSON.stringify(await ui.drawn())).toContain('Press again to merge #45')
    await ui.press({ key: 'pr-merge-45' })
    await session.clock.advance(100)
    expect(session.processes).toContain('gh pr merge 45 --merge --match-head-commit abc1234def')
    expect(session.toasts).toContain('🧭 #45 merged')
    await ui.unmount()
  })

  test('052 #41: a first press waits 10 s for the second, then asks again', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[GH_LIST] = { stdout: LIST }
    await startSession($ as never, '/proj')
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-prs' })
    await session.clock.advance(1000)
    await ui.press({ key: 'pr-merge-45' })
    await session.clock.advance(10_500)
    expect(JSON.stringify(await ui.drawn())).not.toContain('Press again to merge #45')
    await ui.press({ key: 'pr-merge-45' })
    await session.clock.advance(100)
    expect(session.processes.some(p => p.startsWith('gh pr merge 45'))).toBe(false)
    await ui.unmount()
  })

  test('054 #14: a failing gh says so with the fix, instead of reading forever', async ($, on) => {
    const session = installTree(on, halfDone.tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[GH_LIST] = { exitCode: 1, stderr: 'not logged into any GitHub hosts' }
    await startSession($ as never, '/proj')
    const ui = await mount($ as never)
    await ui.press({ key: 'tab-prs' })
    await session.clock.advance(1000)
    expect(JSON.stringify(await ui.drawn())).toContain('gh pr list failed: not logged into any GitHub hosts; run gh auth status')
    await ui.unmount()
  })
})
