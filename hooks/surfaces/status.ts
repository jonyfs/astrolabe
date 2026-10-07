// The status line entry. The engine follows $ only within one file, so this surface
// returns the text and register.tsx hands it to $.ui.status. No reads.
import { formatStatus } from '../core/status-text'
import type { SpeckitState } from '../core/types'

export const statusText = (state: SpeckitState): string => formatStatus(state)
