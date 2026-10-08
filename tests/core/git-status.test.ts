import { describe, expect, test } from 'claude-code/testing'

import { branchWebUrl, parseGitStatus, remoteWebUrl } from '../../hooks/core/git-status'

describe('git status --porcelain=v2 --branch (018)', () => {
  test('branch, upstream ahead and behind, changed and untracked, conflicts', () => {
    const out = [
      '# branch.oid 1234567890abcdef',
      '# branch.head 018-statusline-dashboard',
      '# branch.upstream origin/018-statusline-dashboard',
      '# branch.ab +2 -1',
      '1 .M N... 100644 100644 100644 aaa bbb hooks/register.tsx',
      '2 R. N... 100644 100644 100644 aaa bbb R100 new.ts\told.ts',
      'u UU N... 100644 100644 100644 100644 a b c README.md',
      '? scratch.txt',
      '! ignored.log',
      '',
    ].join('\n')
    expect(parseGitStatus(out)).toEqual({ branch: '018-statusline-dashboard', ahead: 2, behind: 1, changed: 3, conflicts: 1 })
  })

  test('no upstream: no arrows; a detached head shows the short id', () => {
    expect(parseGitStatus('# branch.oid abcdef1234\n# branch.head main\n')).toEqual({ branch: 'main', ahead: 0, behind: 0, changed: 0, conflicts: 0 })
    expect(parseGitStatus('# branch.oid abcdef1234567\n# branch.head (detached)\n').branch).toBe('(abcdef1)')
  })

  test('anything else is empty, never an error', () => {
    expect(parseGitStatus('')).toEqual({ ahead: 0, behind: 0, changed: 0, conflicts: 0 })
    expect(parseGitStatus('fatal: not a git repository')).toEqual({ ahead: 0, behind: 0, changed: 0, conflicts: 0 })
  })
})

describe('the remote page (054 #79)', () => {
  test('scp, ssh and https remotes give one https page, never with credentials', () => {
    expect(remoteWebUrl('git@github.com:jonyfs/astrolabe.git\n')).toBe('https://github.com/jonyfs/astrolabe')
    expect(remoteWebUrl('ssh://git@github.com:22/jonyfs/astrolabe.git')).toBe('https://github.com/jonyfs/astrolabe')
    expect(remoteWebUrl('https://user:secret@gitlab.com/group/sub/repo.git')).toBe('https://gitlab.com/group/sub/repo')
    expect(remoteWebUrl('/local/path/repo')).toBeUndefined()
  })
  test('a branch page encodes each segment', () => {
    expect(branchWebUrl('https://github.com/o/r', 'feat/a b#1')).toBe('https://github.com/o/r/tree/feat/a%20b%231')
  })
})
