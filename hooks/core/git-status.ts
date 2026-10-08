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

// C0 and C1 control characters, ESC included: text from GitHub or git config never reaches the
// terminal with them, so a check name cannot carry an escape sequence (OSC 8, cursor moves).
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g

/** Text from outside, safe to draw: control characters removed, at most 80 cells. */
export const plainText = (text: string, max = 80): string => text.replace(CONTROL, '').slice(0, max)

/** An https URL with no control characters and no spaces, else undefined. */
export const safeHttpsUrl = (url: string): string | undefined => (/^https:\/\/[^\s\u0000-\u001f\u007f-\u009f]+$/.test(url) ? url : undefined)

/** Each check of a rollup with its page (054 #80): a check run's detailsUrl, a status's targetUrl. */
export const checkRunsOf = (statusCheckRollup: unknown): Array<{ name: string; url: string; result: 'pass' | 'fail' | 'pending' }> =>
  (Array.isArray(statusCheckRollup) ? statusCheckRollup : []).flatMap(c => {
    const r = (typeof c === 'object' && c !== null ? c : {}) as { name?: unknown; context?: unknown; detailsUrl?: unknown; targetUrl?: unknown; conclusion?: unknown; state?: unknown }
    const name = plainText(typeof r.name === 'string' ? r.name : typeof r.context === 'string' ? r.context : '')
    const url = safeHttpsUrl(typeof r.detailsUrl === 'string' ? r.detailsUrl : typeof r.targetUrl === 'string' ? r.targetUrl : '')
    if (name === '' || url === undefined) return []
    const word = typeof r.conclusion === 'string' && r.conclusion !== '' ? r.conclusion : typeof r.state === 'string' ? r.state : ''
    return [{ name, url, result: FAILED.has(word) ? 'fail' : PASSED.has(word) ? 'pass' : 'pending' } as const]
  })

/**
 * The web page of a git remote (054 #79): `git@github.com:o/r.git`, `ssh://git@host/o/r` and
 * `https://user:token@host/o/r.git` all give `https://host/o/r`. Credentials never survive.
 */
export const remoteWebUrl = (remote: string): string | undefined => {
  const text = remote.trim()
  const scp = /^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?\/?$/.exec(text)
  if (scp !== null) return safeHttpsUrl(`https://${scp[1]}/${scp[2]}`)
  const url = /^(?:https?|ssh|git):\/\/(?:[^@/]+@)?([\w.-]+)(?::\d+)?\/(.+?)(?:\.git)?\/?$/.exec(text)
  return url === null ? undefined : safeHttpsUrl(`https://${url[1]}/${url[2]}`)
}

/** A branch's page on the remote, each path segment encoded. */
export const branchWebUrl = (web: string, branch: string): string => `${web}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`
