// The rows under the active spec, for tests that drew the old Tasks tab (078).
import { specChildren } from '../../hooks/core/pane-tree'
import type { PaneRow } from '../../hooks/core/pane'
import type { SpeckitState } from '../../hooks/core/types'

export const activeTaskRows = (state: SpeckitState, columns = 100, now = 0, times: ReadonlyArray<{ dir: string; id: string; ms: number }> = []): PaneRow[] => {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  if (feature === undefined) return []
  return specChildren(feature, state.activeTasks ?? [], {
    columns,
    lang: 'en',
    now,
    isActive: true,
    tasksOnly: true,
    ...(state.root === undefined ? {} : { root: state.root }),
    ...(state.currentTask === undefined ? {} : { currentTask: state.currentTask }),
    times,
  })
}
