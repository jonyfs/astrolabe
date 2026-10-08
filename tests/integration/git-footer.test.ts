import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'

// Spec 023: the pull request and its CI in the footer, opt-in, cached for five minutes.
const NOW = Date.UTC(2026, 9, 7, 12, 0)
const GIT = 'git status --porcelain=v2 --branch --show-stash'
const GH = 'gh pr view --json number,statusCheckRollup'
const tree = { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }

const setup = async ($: never, on: never) => {
  const session = installTree(on, tree, '/proj')
  installEngine(on)
  await session.clock.set(NOW)
  session.script.processes[GIT] = { stdout: '# branch.oid abc\n# branch.head main\n# stash 1\n' }
  session.script.processes[GH] = { stdout: JSON.stringify({ number: 31, statusCheckRollup: [{ conclusion: 'SUCCESS' }] }) }
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
})
