import { describe, expect, test } from 'claude-code/testing'

import { parseGitStatus } from '../../hooks/core/git-status'

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
