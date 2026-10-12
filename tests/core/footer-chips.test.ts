import { describe, expect, test } from 'claude-code/testing'

import { branchChip, burnChips, cacheChip, ciChip, dirChip, prChip, repoName, skillsChip, todoChip, treeChip, worktreeChip } from '../../hooks/core/footer-chips'
import { iconSet } from '../../hooks/core/icons'
import type { GitState } from '../../hooks/core/types'

const git = (over: Partial<GitState> = {}): GitState => ({ ahead: 0, behind: 0, changed: 0, conflicts: 0, ...over })
const ascii = iconSet('ascii')
const NOW = Date.UTC(2026, 9, 12, 12, 0)

describe('place and git (068 #41)', () => {
  test('the directory, and where Claude moved from', () => {
    expect(dirChip('/home/me/astrolabe', undefined)).toBe('⌂ astrolabe')
    expect(dirChip('/home/me/astrolabe', '/home/me/astrolabe')).toBe('⌂ astrolabe')
    expect(dirChip('/home/me/astrolabe/src', '/home/me/astrolabe')).toBe('⌂ src ⇐ astrolabe')
    expect(dirChip(undefined, undefined)).toBeUndefined()
  })
  test('the repository is owner/name', () => {
    expect(repoName('https://github.com/jonyfs/astrolabe')).toBe('jonyfs/astrolabe')
    expect(repoName(undefined)).toBeUndefined()
    expect(repoName('nope')).toBeUndefined()
  })
  test('a detached HEAD is its commit id and gives no branch link', () => {
    const detached = branchChip(git({ branch: '(abcdef1)', detached: 'abcdef1' }), ascii)
    expect(detached).toEqual({ text: 'git:abcdef1', linkBranch: false })
    expect(branchChip(git({ branch: 'main' }), ascii)).toEqual({ text: 'git:main', linkBranch: true })
  })
  test('a linked worktree names its origin branch', () => {
    expect(worktreeChip(git({ worktree: 'wt-cart', origin: 'main' }), ascii)).toBe('wt:wt-cart ⇐ main')
    expect(worktreeChip(git({ worktree: 'wt-cart' }), ascii)).toBe('wt:wt-cart')
    expect(worktreeChip(git(), ascii)).toBeUndefined()
  })
  test('conflicts are counted apart from changes; ahead and behind need an upstream', () => {
    expect(treeChip(git({ changed: 3, conflicts: 2, ahead: 2, behind: 5, upstream: 'origin/x' }), ascii)).toBe('~3 ✖2 ⇡2 ⇣5')
    expect(treeChip(git({ changed: 3, ahead: 2, behind: 5 }), ascii)).toBe('~3')
    expect(treeChip(git(), ascii)).toBeUndefined()
  })
  test('the pull request shows draft and labels; CI shows the last run', () => {
    expect(prChip({ number: 41, checks: 'none', draft: true, labels: ['ux'] }, ascii)).toBe('PR #41 draft · ux')
    expect(prChip({ number: 41, checks: 'pass', draft: true, labels: ['ux'] }, ascii)).toBe('PR #41 ok draft · ux')
    expect(prChip({ number: 41, checks: 'none' }, ascii)).toBe('PR #41')
    expect(ciChip('pass')).toBe('✓ CI')
    expect(ciChip('fail')).toBe('✖ CI')
    expect(ciChip('pending')).toBe('◷ CI')
    expect(ciChip(undefined)).toBeUndefined()
  })
})

describe('the prompt cache (068 #42)', () => {
  const five = 5 * 60_000
  test('silent while warm with time to spare', () => {
    expect(cacheChip({ at: NOW - 60_000, tokens: 182_000, ttlMs: five }, NOW)).toBeUndefined()
    expect(cacheChip(undefined, NOW)).toBeUndefined()
  })
  test('warm in the last two minutes of five', () => {
    expect(cacheChip({ at: NOW - 3 * 60_000 - 30_000, tokens: 182_000, ttlMs: five }, NOW)).toBe('cache warm · 2m')
    expect(cacheChip({ at: NOW - 4 * 60_000 - 5_000, tokens: 182_000, ttlMs: five }, NOW)).toBe('cache warm · 1m')
  })
  test('warm in the last ten minutes of an hour', () => {
    const hour = 3_600_000
    expect(cacheChip({ at: NOW - 49 * 60_000, tokens: 1, ttlMs: hour }, NOW)).toBeUndefined()
    expect(cacheChip({ at: NOW - 55 * 60_000, tokens: 1, ttlMs: hour }, NOW)).toBe('cache warm · 5m')
  })
  test('cold names the tokens and, when known, why', () => {
    expect(cacheChip({ at: NOW - 6 * 60_000, tokens: 182_000, ttlMs: five }, NOW)).toBe('cache cold · 182k')
    expect(cacheChip({ at: NOW - 6 * 60_000, tokens: 182_000, ttlMs: five, reason: 'model changed' }, NOW)).toBe('cache cold · 182k · model changed')
  })
  test('narrow: the reason goes first, then the tokens', () => {
    const cold = { at: NOW - 6 * 60_000, tokens: 182_000, ttlMs: five, reason: 'model changed' }
    expect(cacheChip(cold, NOW, 'no-reason')).toBe('cache cold · 182k')
    expect(cacheChip(cold, NOW, 'short')).toBe('cache cold')
  })
})

describe('skills, todo and the projection (068 #45, #46, #48)', () => {
  test('skills: five names, then a count', () => {
    expect(skillsChip([])).toBeUndefined()
    expect(skillsChip(['humanizer', 'dataviz', 'mermaid'])).toBe('❖ humanizer, dataviz, mermaid')
    expect(skillsChip(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe('❖ a, b, c, d, e +2')
  })
  test('todo progress', () => {
    expect(todoChip({ title: 'Fix authentication', done: 1, total: 3 })).toBe('▸ Fix authentication (1/3)')
    expect(todoChip({ title: 'x', done: 0, total: 0 })).toBeUndefined()
    expect(todoChip(undefined)).toBeUndefined()
  })
  const clock = (ms: number) => new Date(ms).toISOString().slice(11, 16)
  const base = { percent: 72, resetsAt: new Date(NOW + 3 * 3_600_000).toISOString(), now: NOW, clock }
  test('the rate needs five samples over a minute', () => {
    expect(burnChips({ ...base, rate: 9, samples: 4, spanMs: 120_000 }, '5h')).toEqual({})
    expect(burnChips({ ...base, rate: 9, samples: 5, spanMs: 30_000 }, '5h')).toEqual({})
    expect(burnChips({ ...base, rate: 9, samples: 5, spanMs: 60_000 }, '5h').burn).toBe('⇡ 9%/h')
  })
  test('the projection shows only when it lands before the reset', () => {
    // 28% left at 9 points an hour is 3h07m: after a reset in 3h, so no projection.
    expect(burnChips({ ...base, rate: 9, samples: 6, spanMs: 120_000 }, '5h').projection).toBeUndefined()
    // At 20 points an hour it lands in 1h24m, before the reset.
    expect(burnChips({ ...base, rate: 20, samples: 6, spanMs: 120_000 }, '5h').projection).toBe(`5h limit ~${clock(NOW + 1.4 * 3_600_000)}`)
  })
})
