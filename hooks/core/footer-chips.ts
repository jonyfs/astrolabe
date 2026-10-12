// The footer's chips that statusline shows and Astrolabe did not (068): the directory, the
// repository, the tree counters, the pull request and CI, the prompt cache, the skills in play,
// the todo list and the projection. Each is a pure function from facts to text. No $.
import { duration } from './duration'
import type { Icons } from './icons'
import type { GitState, PullRequest } from './types'

const withIcon = (icon: string, text: string) => (icon === '' ? text : `${icon} ${text}`)

/** `⌂ astrolabe`, or `⌂ src ⇐ astrolabe` when Claude moved to a folder other than the start one (068 #41); ASCII sets go through `asciiFold`. */
export const dirChip = (dir: string | undefined, startDir: string | undefined): string | undefined => {
  if (dir === undefined || dir === '') return undefined
  const name = (path: string) => path.replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? path
  const now = name(dir)
  const start = startDir === undefined ? undefined : name(startDir)
  return start === undefined || start === now ? `⌂ ${now}` : `⌂ ${now} ⇐ ${start}`
}

/** `owner/name` from the remote's web page; undefined when there is none. */
export const repoName = (remoteWeb: string | undefined): string | undefined => {
  if (remoteWeb === undefined) return undefined
  const m = /^https:\/\/[^/]+\/([^/]+\/[^/]+?)\/?$/.exec(remoteWeb)
  return m === null ? undefined : m[1]
}

/**
 * The branch chip: `⎇ name`, a detached HEAD as its short commit id with no link, and a linked
 * worktree as `wt ⇐ main` after it (068 #41).
 */
export const branchChip = (git: GitState, icons: Icons): { text: string; linkBranch: boolean } | undefined => {
  if (git.branch === undefined) return undefined
  const label = git.detached !== undefined ? git.detached : git.branch
  const base = icons.branch.endsWith(':') ? `${icons.branch}${label}` : withIcon(icons.branch, label)
  return { text: base, linkBranch: git.detached === undefined }
}

export const worktreeChip = (git: GitState, icons: Icons): string | undefined => {
  if (git.worktree === undefined) return undefined
  const base = icons.worktree.endsWith(':') ? `${icons.worktree}${git.worktree}` : withIcon(icons.worktree, git.worktree)
  return git.origin === undefined ? base : `${base} ⇐ ${git.origin}`
}

/**
 * The tree counters (068 #41): changes, conflicts apart from them, and ahead and behind only
 * when an upstream exists. With none of them the chip is absent.
 */
export const treeChip = (git: GitState, icons: Icons): string | undefined => {
  const glyph = (icon: string, n: number) => (icon.length === 1 && icon.codePointAt(0)! < 0x7f ? `${icon}${n}` : `${icon} ${n}`.replace(/^ /, ''))
  const parts = [
    git.changed > 0 ? glyph(icons.changed, git.changed) : '',
    git.conflicts > 0 ? `✖${git.conflicts}` : '',
    git.upstream !== undefined && git.ahead > 0 ? `⇡${git.ahead}` : '',
    git.upstream !== undefined && git.behind > 0 ? `⇣${git.behind}` : '',
    git.stashes !== undefined && git.stashes > 0 ? (icons.stash.endsWith(':') ? `${icons.stash}${git.stashes}` : withIcon(icons.stash, String(git.stashes))) : '',
  ].filter(p => p !== '')
  return parts.length === 0 ? undefined : parts.join(' ')
}

/** `PR #41 draft · ux`: the number, a draft mark and the labels (068 #41). */
export const prChip = (pr: PullRequest, icons: Icons): string => {
  const number = icons.pr === 'PR' ? `PR #${pr.number}` : withIcon(icons.pr, `#${pr.number}`)
  const mark = pr.checks === 'pass' ? icons.ciPass : pr.checks === 'fail' ? icons.ciFail : pr.checks === 'pending' ? icons.ciPending : ''
  const facts = [pr.draft === true ? 'draft' : '', ...(pr.labels ?? [])].filter(x => x !== '')
  return [number, ...(mark === '' ? [] : [mark]), ...(facts.length === 0 ? [] : [facts.join(' · ')])].join(' ')
}

/** `✓ CI`, `✖ CI` or `◷ CI` for the last run of the branch. */
export const ciChip = (ci: GitState['ci']): string | undefined => (ci === undefined ? undefined : `${ci === 'pass' ? '✓' : ci === 'fail' ? '✖' : '◷'} CI`)

export type CacheFact = {
  /** When the last main-thread response came, and the tokens its prompt held. */
  at: number
  tokens: number
  ttlMs: number
  /** Why the cache went cold, when the engine's own facts say it (a model switch). */
  reason?: string
}

const k = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

/**
 * The prompt cache chip (068 #42): silent while warm with time to spare; `cache warm · 1m` in
 * the last two minutes of a 5-minute cache or the last ten of an hour; `cache cold · 182k` once
 * cold, with the reason when one is known. A narrow footer drops the reason, then the tokens.
 * Nothing is estimated and nothing is turned into a price.
 */
export const cacheChip = (cache: CacheFact | undefined, now: number, room?: 'full' | 'no-reason' | 'short'): string | undefined => {
  if (cache === undefined) return undefined
  const left = cache.at + cache.ttlMs - now
  const warnAt = cache.ttlMs >= 3_600_000 ? 10 * 60_000 : 2 * 60_000
  if (left > warnAt) return undefined
  if (left > 0) return `cache warm · ${duration(Math.ceil(left / 60_000) * 60_000)}`
  if (room === 'short') return 'cache cold'
  const tokens = cache.tokens > 0 ? ` · ${k(cache.tokens)}` : ''
  const reason = room === 'no-reason' || cache.reason === undefined ? '' : ` · ${cache.reason}`
  return `cache cold${tokens}${reason}`
}

/** Skills in play as one chip (068 #45): five names, then a count. */
export const skillsChip = (names: readonly string[]): string | undefined => {
  if (names.length === 0) return undefined
  const shown = names.slice(0, 5)
  const rest = names.length - shown.length
  return `❖ ${shown.join(', ')}${rest > 0 ? ` +${rest}` : ''}`
}

/** The todo list's progress (068 #46): `▸ Fix authentication (1/3)`. */
export const todoChip = (todo: { title: string; done: number; total: number } | undefined): string | undefined =>
  todo === undefined || todo.total === 0 ? undefined : `▸ ${todo.title} (${todo.done}/${todo.total})`

/**
 * The burn rate and where it lands (068 #48): the rate after five samples over a minute, and
 * the time the window reaches its limit only when that is before the window's reset.
 */
export const burnChips = (
  input: { rate: number | undefined; samples: number; spanMs: number; percent: number | undefined; resetsAt: string | undefined; now: number; clock: (ms: number) => string },
  windowLabel: string,
): { burn?: string; projection?: string } => {
  const { rate, samples, spanMs, percent, resetsAt, now } = input
  if (rate === undefined || rate <= 0 || samples < 5 || spanMs < 60_000) return {}
  const burn = `⇡ ${Math.round(rate)}%/h`
  if (percent === undefined || resetsAt === undefined) return { burn }
  const reset = Date.parse(resetsAt)
  if (Number.isNaN(reset) || reset <= now || percent >= 100) return { burn }
  const hitsAt = now + ((100 - percent) / rate) * 3_600_000
  return hitsAt < reset ? { burn, projection: `${windowLabel} limit ~${input.clock(hitsAt)}` } : { burn }
}

const ASCII_MARKS: ReadonlyArray<readonly [string, string]> = [
  ['⌂', 'dir'], ['⇐', '<-'], ['⇡', '^'], ['⇣', 'v'], ['✖', '!'], ['✓', 'ok'], ['◷', '..'], ['❖', '*'], ['▸', '>'],
]

/** A chip's text with every non-ASCII mark of the vocabulary spelled in ASCII (the `ascii` icon set wins everywhere). */
export const asciiFold = (text: string): string => ASCII_MARKS.reduce((acc, [from, to]) => acc.split(from).join(to), text)
