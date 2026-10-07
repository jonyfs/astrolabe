// Parses `git status --porcelain=v2 --branch` (spec 018). Pure: no $. Never throws.
import type { GitState } from './types'

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
    } else if (line.startsWith('u ')) state.conflicts += 1
    else if (line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('? ')) state.changed += 1
  }
  return state
}
