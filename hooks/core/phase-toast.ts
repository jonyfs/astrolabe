// Decides which phase toasts a reconcile raises (FR-001). Pure: no $.
import type { Feature, Phase } from './types'

export type Toast = { key: string; text: string }

const ORDER: readonly Phase[] = ['specify', 'clarify', 'plan', 'tasks', 'implement', 'done']
const NEXT: Readonly<Record<string, string>> = {
  specify: '/speckit-specify',
  clarify: '/speckit-clarify',
  plan: '/speckit-plan',
  tasks: '/speckit-tasks',
  implement: '/speckit-implement',
  done: '/speckit-specify',
}

/**
 * Compares derived phases with the stored baseline. The first reconcile of a session
 * (`isBaselined` false) only records; later ones toast each move to a later phase once
 * per session. The returned baseline always holds the current phases.
 */
export const phaseToasts = (
  features: readonly Feature[],
  baseline: Readonly<Record<string, Phase>>,
  toasted: readonly string[],
  isBaselined: boolean,
): { toasts: Toast[]; baseline: Record<string, Phase>; toasted: string[] } => {
  const next: Record<string, Phase> = { ...baseline }
  const toasts: Toast[] = []
  const seen = [...toasted]
  for (const f of features) {
    const before = baseline[f.dir]
    next[f.dir] = f.phase
    if (!isBaselined || before === undefined || f.phase === 'abandoned') continue
    const key = `${f.dir}:${f.phase}`
    if (ORDER.indexOf(f.phase) <= ORDER.indexOf(before) || seen.includes(key)) continue
    seen.push(key)
    const text =
      f.phase === 'done'
        ? `🧭 ${f.id} ${f.name} is done · next: ${NEXT.done}`
        : `🧭 ${f.id} ${f.name} moved to ${f.phase} · next: ${NEXT[f.phase]}`
    toasts.push({ key, text })
  }
  return { toasts, baseline: next, toasted: seen }
}
