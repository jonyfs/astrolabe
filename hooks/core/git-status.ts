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
      // A detached HEAD has a commit and no branch page (068 #41).
      if (head === '(detached)' && oid !== undefined && oid !== '') state.detached = oid.slice(0, 7)
    } else if (line.startsWith('# branch.upstream ')) {
      const upstream = line.slice(18).trim()
      if (upstream !== '') state.upstream = upstream
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

/** Parses `gh pr view --json number,url,statusCheckRollup` (023). Undefined when it is not that. */
export const parsePullRequest = (out: string): PullRequest | undefined => {
  let value: unknown
  try {
    value = JSON.parse(out)
  } catch {
    return undefined
  }
  if (typeof value !== 'object' || value === null) return undefined
  const { number, url, statusCheckRollup, isDraft, labels } = value as { number?: unknown; url?: unknown; statusCheckRollup?: unknown; isDraft?: unknown; labels?: unknown }
  if (typeof number !== 'number') return undefined
  const page = typeof url === 'string' ? safeHttpsUrl(url) : undefined
  const names = (Array.isArray(labels) ? labels : []).flatMap(l => {
    const name = typeof l === 'object' && l !== null ? (l as { name?: unknown }).name : l
    return typeof name === 'string' && plainText(name, 24) !== '' ? [plainText(name, 24)] : []
  })
  return {
    number,
    checks: checksOf(statusCheckRollup),
    ...(page === undefined ? {} : { url: page }),
    ...(isDraft === true ? { draft: true } : {}),
    ...(names.length === 0 ? {} : { labels: names.slice(0, 3) }),
  }
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

/** The last CI run of a branch (068 #41), from `gh run list --json status,conclusion --limit 1`. */
export const parseCiRun = (out: string): GitState['ci'] => {
  let value: unknown
  try {
    value = JSON.parse(out)
  } catch {
    return undefined
  }
  const run = Array.isArray(value) ? value[0] : undefined
  if (typeof run !== 'object' || run === null) return undefined
  const { status, conclusion } = run as { status?: unknown; conclusion?: unknown }
  if (typeof status === 'string' && status !== 'completed') return 'pending'
  const word = typeof conclusion === 'string' ? conclusion.toUpperCase() : ''
  if (FAILED.has(word)) return 'fail'
  if (PASSED.has(word)) return 'pass'
  return word === '' ? 'pending' : undefined
}
