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
