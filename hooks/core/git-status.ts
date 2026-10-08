// Parses `git status --porcelain=v2 --branch` (spec 018). Pure: no $. Never throws.
import type { GitState, PullRequest } from './types'

export const parseGitStatus = (out: string): GitState => {
  const state: GitState = { ahead: 0, behind: 0, changed: 0, conflicts: 0 }
  let oid: string | undefined
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('# branch.oid ')) oid = line.slice(13).trim()
    else if (line.startsWith('# branch.head ')) {
      const head = line.slice(14).trim()
      state.branch = head === '(detached)' ? `(${(oid ?? '').slice(0, 7)})` : head
    } else if (line.startsWith('# branch.ab ')) {
      const m = /^\+(\d+) -(\d+)$/.exec(line.slice(12).trim())
      if (m !== null) {
        state.ahead = Number(m[1])
        state.behind = Number(m[2])
      }
    } else if (line.startsWith('# stash ')) {
      const n = Number(line.slice(8).trim())
      if (Number.isInteger(n) && n > 0) state.stashes = n
    } else if (line.startsWith('u ')) state.conflicts += 1
    else if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('? ')) state.changed += 1
  }
  return state
}

const FAILED = new Set(['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'])
const PASSED = new Set(['SUCCESS', 'NEUTRAL', 'SKIPPED'])

/** Parses `gh pr view --json number,statusCheckRollup` (023). Undefined when it is not that. */
export const parsePullRequest = (out: string): PullRequest | undefined => {
  let value: unknown
  try {
    value = JSON.parse(out)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  const { number, statusCheckRollup } = value as { number?: unknown; statusCheckRollup?: unknown }
  if (typeof number !== 'number') return undefined
  return { number, checks: checksOf(statusCheckRollup) }
}

/** All passed, one failed, some still running, or none (023, 032), from a statusCheckRollup. */
export const checksOf = (statusCheckRollup: unknown): PullRequest['checks'] => {
  const checks = Array.isArray(statusCheckRollup) ? statusCheckRollup : []
  // A check run has a conclusion once completed; a commit status has a state.
  const results = checks.map(c => {
    const { conclusion, state } = (typeof c === 'object' && c !== null ? c : {}) as { conclusion?: unknown; state?: unknown }
    const word = typeof conclusion === 'string' && conclusion !== '' ? conclusion : typeof state === 'string' ? state : ''
    return FAILED.has(word) ? 'fail' : PASSED.has(word) ? 'pass' : 'pending'
  })
  return results.length === 0 ? 'none' : results.includes('fail') ? 'fail' : results.includes('pending') ? 'pending' : 'pass'
}
