import { describe, expect, test } from 'claude-code/testing'

import { footerText } from '../../hooks/core/footer'
import { checkRunsOf, plainText, safeHttpsUrl, parseGitStatus, parsePullRequest } from '../../hooks/core/git-status'
import { iconSet } from '../../hooks/core/icons'
import { readHead } from '../../hooks/io/git-branch'
import { treeFs } from '../helpers/fake-fs'

const NOW = Date.UTC(2026, 9, 7, 12, 0)
const base = { speckit: () => '◆ 023', readings: [], now: NOW, columns: 200 }

describe('stash count (023 #37)', () => {
  test('the stash header line counts', () => {
    expect(parseGitStatus('# branch.head main\n# stash 3\n').stashes).toBe(3)
    expect(parseGitStatus('# branch.head main\n').stashes).toBeUndefined()
  })
  test('the footer shows it after the branch', () => {
    const text = footerText({ ...base, icons: iconSet('ascii'), git: { branch: 'main', ahead: 0, behind: 0, changed: 0, conflicts: 0, stashes: 2 } })
    expect(text).toContain('git:main stash:2')
  })
})

describe('worktree (023 #36)', () => {
  test('a .git file pointing into worktrees/ names the worktree', async () => {
    const { fs } = treeFs({ '/w/a/.git': 'gitdir: ../main/.git/worktrees/a\n', '/w/main/.git/worktrees/a/HEAD': 'ref: refs/heads/002-x\n' })
    expect(await readHead(fs, '/w/a')).toEqual({ branch: '002-x', worktree: 'a' })
  })
  test('a normal checkout and a submodule are no worktree', async () => {
    const plain = treeFs({ '/p/.git/HEAD': 'ref: refs/heads/main\n' })
    expect(await readHead(plain.fs, '/p')).toEqual({ branch: 'main' })
    const sub = treeFs({ '/m/s/.git': 'gitdir: ../.git/modules/s\n', '/m/.git/modules/s/HEAD': 'ref: refs/heads/main\n' })
    expect(await readHead(sub.fs, '/m/s')).toEqual({ branch: 'main' })
  })
  test('the footer marks it', () => {
    const text = footerText({ ...base, icons: iconSet('ascii'), git: { branch: 'x', ahead: 0, behind: 0, changed: 0, conflicts: 0, worktree: 'a' } })
    expect(text).toContain('git:x wt:a')
  })
})

describe('pull request and CI (023 #35)', () => {
  test('gh pr view JSON reads as number and checks', () => {
    const json = (rollup: unknown[]) => JSON.stringify({ number: 31, statusCheckRollup: rollup })
    expect(parsePullRequest(json([{ conclusion: 'SUCCESS', status: 'COMPLETED' }]))).toEqual({ number: 31, checks: 'pass' })
    expect(parsePullRequest(json([{ conclusion: 'SUCCESS' }, { conclusion: 'FAILURE' }]))).toEqual({ number: 31, checks: 'fail' })
    expect(parsePullRequest(json([{ conclusion: 'SUCCESS' }, { status: 'IN_PROGRESS', conclusion: '' }]))).toEqual({ number: 31, checks: 'pending' })
    expect(parsePullRequest(json([{ state: 'SUCCESS' }]))).toEqual({ number: 31, checks: 'pass' })
    expect(parsePullRequest(json([]))).toEqual({ number: 31, checks: 'none' })
    expect(parsePullRequest('not json')).toBeUndefined()
  })
  test('the footer shows the number and the checks', () => {
    const git = { branch: 'x', ahead: 0, behind: 0, changed: 0, conflicts: 0 }
    expect(footerText({ ...base, icons: iconSet('ascii'), git: { ...git, pr: { number: 31, checks: 'pass' } } })).toContain('git:x PR#31 ok')
    expect(footerText({ ...base, icons: iconSet('emoji'), git: { ...git, pr: { number: 31, checks: 'fail' } } })).toContain('#31 ✗')
    expect(footerText({ ...base, icons: iconSet('emoji'), git: { ...git, pr: { number: 31, checks: 'none' } } })).toMatch(/#31( ·|$)/)
  })
})

describe('each check with its page (054 #80)', () => {
  test('check runs and commit statuses, https pages only', () => {
    expect(
      checkRunsOf([
        { name: 'test (macos)', detailsUrl: 'https://github.com/o/r/actions/runs/1', conclusion: 'SUCCESS' },
        { context: 'ci/legacy', targetUrl: 'https://ci.example/2', state: 'FAILURE' },
        { name: 'running', detailsUrl: 'https://github.com/o/r/actions/runs/3', conclusion: '' },
        { name: 'no page', detailsUrl: 'javascript:alert(1)', conclusion: 'SUCCESS' },
      ]),
    ).toEqual([
      { name: 'test (macos)', url: 'https://github.com/o/r/actions/runs/1', result: 'pass' },
      { name: 'ci/legacy', url: 'https://ci.example/2', result: 'fail' },
      { name: 'running', url: 'https://github.com/o/r/actions/runs/3', result: 'pending' },
    ])
  })
})

describe('no escape sequences from outside text (054 #80 review)', () => {
  test('control characters are stripped from names; such a URL is refused', () => {
    expect(plainText('test\u001b]8;;https://evil\u0007 (macos)')).toBe('test]8;;https://evil (macos)')
    expect(safeHttpsUrl('https://github.com/o/r/actions/runs/1')).toBe('https://github.com/o/r/actions/runs/1')
    expect(safeHttpsUrl('https://evil\u001b]8;;x')).toBeUndefined()
    expect(checkRunsOf([{ name: 'a\u001b[2Jb', detailsUrl: 'https://x/1', conclusion: 'SUCCESS' }])).toEqual([{ name: 'a[2Jb', url: 'https://x/1', result: 'pass' }])
  })
})
