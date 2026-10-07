// Decides which phase toasts a reconcile raises (FR-001). Pure: no $.
import { t, type Lang } from './i18n'
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
  /** The real next command for a feature (the active one's may be /speckit-analyze). */
  nextOf: Readonly<Record<string, string>> = {},
  lang: Lang = 'en',
): { toasts: Toast[]; baseline: Record<string, Phase>; toasted: string[] } => {
  // Only listed features stay, so the stored baseline never grows with deleted ones.
  const next: Record<string, Phase> = {}
  const toasts: Toast[] = []
  const seen = [...toasted]
  for (const f of features) {
    const before = baseline[f.dir]
    next[f.dir] = f.phase
    if (!isBaselined || before === undefined || before === 'abandoned' || f.phase === 'abandoned') continue
    const key = `${f.dir}:${f.phase}`
    if (ORDER.indexOf(f.phase) <= ORDER.indexOf(before) || seen.includes(key)) continue
    seen.push(key)
    const text =
      f.phase === 'done'
        ? t(lang, 'toast.done', { id: f.id, name: f.name, next: NEXT.done! })
        : t(lang, 'toast.moved', { id: f.id, name: f.name, phase: f.phase, next: nextOf[f.dir] ?? NEXT[f.phase]! })
    toasts.push({ key, text })
  }
  return { toasts, baseline: next, toasted: seen }
}
