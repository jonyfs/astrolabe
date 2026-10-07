import { describe, expect, test } from 'claude-code/testing'

import { readBranch } from '../../hooks/io/git-branch'
import { treeFs } from '../helpers/fake-fs'

describe('readBranch: FR-012, no process', () => {
  test('.git directory with a symbolic ref', async () => {
    const { fs } = treeFs({ '/p/.git/HEAD': 'ref: refs/heads/003-spinner-narration\n' })
    expect(await readBranch(fs, '/p')).toBe('003-spinner-narration')
  })
  test('branch names with slashes are kept whole', async () => {
    const { fs } = treeFs({ '/p/.git/HEAD': 'ref: refs/heads/feature/002-x\n' })
    expect(await readBranch(fs, '/p')).toBe('feature/002-x')
  })
  test('worktree .git file with a relative gitdir', async () => {
    const { fs } = treeFs({ '/w/a/.git': 'gitdir: ../main/.git/worktrees/a\n', '/w/main/.git/worktrees/a/HEAD': 'ref: refs/heads/002-x\n' })
    expect(await readBranch(fs, '/w/a')).toBe('002-x')
  })
  test('worktree .git file with an absolute gitdir, Windows style', async () => {
    const { fs } = treeFs({ 'c:/w/a/.git': 'gitdir: C:\\w\\main\\.git\\worktrees\\a\r\n', 'c:/w/main/.git/worktrees/a/HEAD': 'ref: refs/heads/002-x\r\n' })
    expect(await readBranch(fs, 'c:/w/a')).toBe('002-x')
  })
  test('a detached HEAD has no branch', async () => {
    const { fs } = treeFs({ '/p/.git/HEAD': '4b825dc642cb6eb9a060e54bf8d69288fbee4904\n' })
    expect(await readBranch(fs, '/p')).toBeUndefined()
  })
  test('no .git anywhere has no branch', async () => {
    const { fs } = treeFs({ '/p/.specify/': '' })
    expect(await readBranch(fs, '/p')).toBeUndefined()
  })
  test('.git above the Spec Kit root is found', async () => {
    const { fs } = treeFs({ '/mono/.git/HEAD': 'ref: refs/heads/002-x\n', '/mono/pkg/.specify/': '' })
    expect(await readBranch(fs, '/mono/pkg')).toBe('002-x')
  })
  test('a broken gitdir pointer has no branch, never throws', async () => {
    const { fs } = treeFs({ '/p/.git': 'gitdir: /nowhere\n' })
    expect(await readBranch(fs, '/p')).toBeUndefined()
  })
})
