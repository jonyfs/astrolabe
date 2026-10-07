// Finds the Spec Kit root: the nearest directory, walking up from the session's
// directory, that holds `.specify/` (FR-001).
import { joinPath, normalizePath, parentDir } from '../core/paths'

import type { Fs } from './fs-port'

export const findRoot = async (fs: Fs, cwd: string): Promise<string | undefined> => {
  for (let dir: string | undefined = normalizePath(cwd); dir !== undefined; dir = parentDir(dir)) {
    if (await fs.exists(joinPath(dir, '.specify')).catch(() => false)) return dir
  }
  return undefined
}

const MAX_SCANNED = 40

/**
 * Other Spec Kit roots right under the session's directory (020c #21): its child folders that
 * hold `.specify/`, by name, at most 40 looked at. One listing, read at session start only.
 */
export const findOtherRoots = async (fs: Fs, cwd: string, root: string | undefined): Promise<string[]> => {
  const base = normalizePath(cwd)
  const entries = await fs.list(base).catch(() => [])
  const dirs = entries.filter(e => e.kind === 'dir' && !e.name.startsWith('.')).slice(0, MAX_SCANNED)
  const found = await Promise.all(
    dirs.map(async e => ((await fs.exists(joinPath(base, e.name, '.specify')).catch(() => false)) ? e.name : undefined)),
  )
  return found.filter((name): name is string => name !== undefined && joinPath(base, name) !== root).sort()
}
