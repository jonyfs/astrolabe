// The text Astrolabe adds after the engine's prompt hint (FR-007). Pure: no $.
// The next command lives in one place (065 #14): the prompt suggestion while the prompt is
// empty, this hint only while it has text, never both.
import type { SpeckitState } from './types'

export const hintTail = (state: SpeckitState, isDraft: boolean): string | undefined => {
  if (!isDraft || !state.present || state.nextCommand === undefined) return undefined
  const active = state.active
  const feature = active === undefined ? undefined : state.features.find(f => f.dir === active.dir)
  const next = `next: ${state.nextCommand}`
  if (feature?.phase !== 'implement' || feature.total === 0) return next
  const left = feature.total - feature.done
  return left > 0 ? `${next} · ${left} ${left === 1 ? 'task' : 'tasks'} left` : next
}
