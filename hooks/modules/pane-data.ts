import { filterFeatures } from '../core/pane'
import { type PaneState, type SessionStats, type GitState, type PullRequest, type SpeckitState } from '../core/types'

export const withPr = (git: GitState, pr: PullRequest | undefined): GitState => {
  const { pr: _old, ...rest } = git
  return pr === undefined ? rest : { ...rest, pr }
}

/** Feature id to the worktrees working on it (054 #49). */
export const worktreesById = (list: SessionStats['worktrees']): Record<string, string[]> => {
  const out: Record<string, string[]> = {}
  for (const w of list ?? []) (out[w.id] ??= []).push(w.name)
  return out
}

/** Keeps the features whose id or name holds the filter (024 #49). */
export const filtered = (
  state: SpeckitState,
  filter: string | undefined,
  status: PaneState['status'] = 'all',
  context: { priorities?: Record<string, 'high' | 'normal' | 'low'>; worktrees?: Record<string, string[]> } = {},
): SpeckitState =>
  (filter ?? '').trim() === '' && status === 'all' ? state : { ...state, features: filterFeatures(state.features, filter, state.active?.dir, status, context) }

/** Whether a colour is light enough to carry dark text (039), by its relative luminance. */
export const isLight = (hex: string): boolean => {
  const n = Number.parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 0.3
}
