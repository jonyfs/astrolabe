// Reads the current git branch without running git (FR-012). Filled in by US3.
import type { Fs } from './fs-port'

export const readBranch = async (_fs: Fs, _root: string): Promise<string | undefined> => undefined
