// The repository's open pull requests for the PRs tab (032), from `gh pr list --json`. Pure: no $.
import { checksOf } from './git-status'
import type { PullRequest } from './types'

export type PullRow = {
  number: number
  title: string
  branch: string
  url: string
  labels: string[]
  review: 'approved' | 'changes' | 'required' | 'none'
  checks: PullRequest['checks']
  /** GitHub's mergeStateStatus: CLEAN merges, BEHIND needs an update, the rest wait. */
  merge: string
  isDraft: boolean
}

export const PR_LIST_FIELDS = 'number,title,headRefName,url,labels,reviewDecision,statusCheckRollup,mergeStateStatus,isDraft'

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
        title: p['title'],
        branch: typeof p['headRefName'] === 'string' ? p['headRefName'] : '',
        url: typeof p['url'] === 'string' ? p['url'] : '',
        labels: Array.isArray(p['labels']) ? p['labels'].flatMap(l => (typeof l === 'object' && l !== null && typeof (l as { name?: unknown }).name === 'string' ? [(l as { name: string }).name] : [])) : [],
        review: decision === 'APPROVED' ? 'approved' : decision === 'CHANGES_REQUESTED' ? 'changes' : decision === 'REVIEW_REQUIRED' ? 'required' : 'none',
        checks: checksOf(p['statusCheckRollup']),
        merge: typeof p['mergeStateStatus'] === 'string' ? p['mergeStateStatus'] : 'UNKNOWN',
        isDraft: p['isDraft'] === true,
      } satisfies PullRow,
    ]
  })
}

/** The argv for an action on a pull request. */
export const pullAction = (action: 'approve' | 'update' | 'merge', n: number): string[] =>
  action === 'approve' ? ['gh', 'pr', 'review', String(n), '--approve'] : action === 'update' ? ['gh', 'pr', 'update-branch', String(n)] : ['gh', 'pr', 'merge', String(n), '--merge']
