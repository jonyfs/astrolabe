// The repository's other git worktrees and the Spec Kit feature each one works on (037).
// Pure: no $. Never throws.

export type Worktree = { path: string; branch?: string }

/** Parses `git worktree list --porcelain`: the main worktree first, then the linked ones. */
export const parseWorktrees = (out: string): Worktree[] =>
  out
    .split(/\r?\n\r?\n/)
    .map(block => {
      const lines = block.split(/\r?\n/)
      const path = lines.find(l => l.startsWith('worktree '))?.slice(9).trim()
      const ref = lines.find(l => l.startsWith('branch '))?.slice(7).trim()
      const branch = ref?.replace(/^refs\/heads\//, '')
      return path === undefined || path === '' ? undefined : { path, ...(branch === undefined ? {} : { branch }) }
    })
    .filter((w): w is Worktree => w !== undefined)

/** The feature folder a branch names (`026-claude-context` or `feature/026-x`), by its number. */
export const featureDirFor = (branch: string | undefined, dirs: readonly string[]): string | undefined => {
  const id = branch === undefined ? undefined : /(?:^|\/)(\d{3})-/.exec(branch)?.[1]
  return id === undefined ? undefined : dirs.find(d => d.startsWith(`${id}-`))
}

/** The last folder name of a path, for the row label. */
export const worktreeName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? path
