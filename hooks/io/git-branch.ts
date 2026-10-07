// Reads the current git branch from HEAD without running git (FR-012). Walks up
// from the Spec Kit root to the nearest `.git`, which is a directory in a normal
// checkout and a `gitdir: <path>` file in a worktree or submodule.
import { isAbsolutePath, joinPath, normalizePath, parentDir } from '../core/paths'

import { type Fs, readOrUndefined } from './fs-port'

const HEAD_REF = /^ref:\s*refs\/heads\/(.+?)\s*$/m
const GITDIR = /^gitdir:\s*(.+?)\s*$/m

const branchOf = (head: string | undefined): string | undefined => (head === undefined ? undefined : HEAD_REF.exec(head)?.[1])

export const readBranch = async (fs: Fs, root: string): Promise<string | undefined> => {
  for (let dir: string | undefined = normalizePath(root); dir !== undefined; dir = parentDir(dir)) {
    const dotGit = joinPath(dir, '.git')
    if (!(await fs.exists(dotGit).catch(() => false))) continue
    const pointer = await readOrUndefined(fs, dotGit)
    const target = pointer === undefined ? undefined : GITDIR.exec(pointer)?.[1]
    if (target === undefined) return branchOf(await readOrUndefined(fs, joinPath(dotGit, 'HEAD')))
    const gitDir = isAbsolutePath(target) ? normalizePath(target) : joinPath(dir, target)
    return branchOf(await readOrUndefined(fs, joinPath(gitDir, 'HEAD')))
  }
  return undefined
}
