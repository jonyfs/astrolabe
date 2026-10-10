// The repository's open pull requests for the PRs tab (032), from `gh pr list --json`. Pure: no $.
import { checkRunsOf, checksOf, plainText, safeHttpsUrl } from './git-status'
import type { PullRequest } from './types'

export type PullRow = {
  number: number
  title: string
  branch: string
  url: string
  labels: string[]
  review: 'approved' | 'changes' | 'required' | 'none'
  checks: PullRequest['checks']
  /** Each check with its page (054 #80). */
  runs?: ReadonlyArray<{ name: string; url: string; result: 'pass' | 'fail' | 'pending' }>
  /** GitHub's mergeStateStatus: CLEAN merges, BEHIND needs an update, the rest wait. */
  merge: string
  isDraft: boolean
  /** The head commit when listed; a merge passes it, so a push in between makes the merge fail. */
  head?: string
  /** Who opened it and when, in epoch ms (052 #40). */
  author?: string
  createdAt?: number
}

/** How long ago, in the largest whole unit: `12m`, `5h`, `3d` (052 #40). */
export const ageOf = (at: number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - at) / 60_000))
  return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`
}

export const PR_LIST_FIELDS = 'number,title,headRefName,headRefOid,url,labels,reviewDecision,statusCheckRollup,mergeStateStatus,isDraft,author,createdAt'

/** Parses `gh pr list --json <PR_LIST_FIELDS>`; an empty list for anything else. */
export const parsePullList = (out: string): PullRow[] => {
  let value: unknown
  try {
    value = JSON.parse(out)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (typeof item !== 'object' || item === null) return []
    const p = item as Record<string, unknown>
    if (typeof p['number'] !== 'number' || typeof p['title'] !== 'string') return []
    const decision = p['reviewDecision']
    return [
      {
        number: p['number'],
        // Text from GitHub reaches the terminal without control characters (054 #80 review).
        title: plainText(p['title'], 200),
        branch: typeof p['headRefName'] === 'string' ? plainText(p['headRefName'], 120) : '',
        url: typeof p['url'] === 'string' ? (safeHttpsUrl(p['url']) ?? '') : '',
        labels: Array.isArray(p['labels']) ? p['labels'].flatMap(l => (typeof l === 'object' && l !== null && typeof (l as { name?: unknown }).name === 'string' ? [plainText((l as { name: string }).name, 40)] : [])) : [],
        review: decision === 'APPROVED' ? 'approved' : decision === 'CHANGES_REQUESTED' ? 'changes' : decision === 'REVIEW_REQUIRED' ? 'required' : 'none',
        checks: checksOf(p['statusCheckRollup']),
        ...((runs => (runs.length === 0 ? {} : { runs }))(checkRunsOf(p['statusCheckRollup']))),
        merge: typeof p['mergeStateStatus'] === 'string' ? p['mergeStateStatus'] : 'UNKNOWN',
        isDraft: p['isDraft'] === true,
        ...((a => (typeof a === 'object' && a !== null && typeof (a as { login?: unknown }).login === 'string' ? { author: plainText((a as { login: string }).login, 60) } : {}))(p['author'])),
        ...(typeof p['createdAt'] === 'string' && !Number.isNaN(Date.parse(p['createdAt'])) ? { createdAt: Date.parse(p['createdAt']) } : {}),
        ...(typeof p['headRefOid'] === 'string' && /^[0-9a-f]{7,40}$/.test(p['headRefOid']) ? { head: p['headRefOid'] } : {}),
      } satisfies PullRow,
    ]
  })
}

/** The argv for an action on a pull request. */
export const pullAction = (action: 'approve' | 'update' | 'merge', n: number, head?: string): string[] =>
  action === 'approve'
    ? ['gh', 'pr', 'review', String(n), '--approve']
    : action === 'update'
      ? ['gh', 'pr', 'update-branch', String(n)]
      : // The merge lands the head the person saw, or fails if someone pushed since.
        ['gh', 'pr', 'merge', String(n), '--merge', ...(head === undefined ? [] : ['--match-head-commit', head])]

/** The pull request a `gh pr create` just opened (054 #97): its number from the URL gh prints, else undefined. */
export const prOpened = (command: string, output: string): number | undefined => {
  if (!/\bgh\s+pr\s+create\b/.test(command)) return undefined
  const m = /https:\/\/[^\s]+\/pull\/(\d+)/.exec(output)
  return m === null ? undefined : Number(m[1])
}
