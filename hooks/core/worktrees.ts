// The repository's other git worktrees and the Spec Kit feature each one works on (037).
// Pure: no $. Never throws.
import { plainText } from './git-status'

export type Worktree = { path: string; head?: string; branch?: string }

/** Parses `git worktree list --porcelain`: the main worktree first, then the linked ones. */
export const parseWorktrees = (out: string): Worktree[] =>
  out
    .split(/\r?\n\r?\n/)
    .map(block => {
      const lines = block.split(/\r?\n/)
      const path = lines.find(l => l.startsWith('worktree '))?.slice(9).trim()
      const head = lines.find(l => l.startsWith('HEAD '))?.slice(5).trim()
      const ref = lines.find(l => l.startsWith('branch '))?.slice(7).trim()
      const branch = ref?.replace(/^refs\/heads\//, '')
      return path === undefined || path === '' ? undefined : { path, ...(head === undefined ? {} : { head }), ...(branch === undefined ? {} : { branch }) }
    })
    .filter((w): w is Worktree => w !== undefined)

/** The feature folder a branch names (`026-claude-context` or `feature/026-x`), by its number. */
export const featureDirFor = (branch: string | undefined, dirs: readonly string[]): string | undefined => {
  const id = branch === undefined ? undefined : /(?:^|\/)(\d{3})-/.exec(branch)?.[1]
  return id === undefined ? undefined : dirs.find(d => d.startsWith(`${id}-`))
}

/** The last folder name of a path, for the row label. */
export const worktreeName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? path

/** Lines of `git status --porcelain`: one per changed or untracked file (054 #51). */
export const uncommittedCount = (porcelain: string): number => porcelain.split(/\r?\n/).filter(l => l.trim() !== '').length

/** Branch names from `git branch --merged <base>`, without the `*` or `+` marks (054 #50). */
export const mergedBranches = (out: string): Set<string> => new Set(out.split(/\r?\n/).map(l => l.replace(/^[*+ ]+/, '').trim()).filter(l => l !== ''))

/** What a worktree row adds after its progress: uncommitted files, and `merged` with the command that removes it. */
export const worktreeState = (w: { path?: string; changed?: number; merged?: true }): string =>
  [
    ...(w.changed !== undefined && w.changed > 0 ? [`${w.changed} uncommitted`] : []),
    ...(w.merged === true && w.path !== undefined ? [`merged · git worktree remove ${plainText(w.path, 200)}`] : []),
  ].map(part => `  · ${part}`).join('')

/**
 * A feature's progress counting the worktrees that work on it (054 #55): a worktree with more of the
 * same task list ticked lends its count. A different total means a different list, so it is left alone.
 */
export const withWorktreeProgress = <F extends { id: string; done: number; total: number }>(
  features: readonly F[],
  worktrees: ReadonlyArray<{ id: string; done: number; total: number }> | undefined,
): F[] =>
  features.map(f => {
    const best = (worktrees ?? []).filter(w => w.id === f.id && w.total === f.total && w.done > f.done).reduce((m, w) => Math.max(m, w.done), f.done)
    return best === f.done ? f : { ...f, done: best }
  })
