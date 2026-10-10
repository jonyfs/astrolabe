import { principleHeadings } from '../core/constitution'
import { focusNote } from '../core/spec-actions'
import { parseTasks } from '../core/tasks-parser'
import { type SpeckitState } from '../core/types'
import { t, type Lang } from '../core/i18n'

export const featureContext = (state: SpeckitState, driftWarning?: { dir: string; task: string }, focusOn = false): string | undefined => {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  if (!state.present || feature === undefined) return undefined
  const parts = [
    `the active Spec Kit feature is ${feature.id} ${feature.name}, phase ${feature.phase}${feature.total === 0 ? '' : `, ${feature.done} of ${feature.total} tasks done`}`,
    ...(state.currentTask === undefined ? [] : [`the current task is ${state.currentTask.id === undefined ? '' : `${state.currentTask.id} `}${state.currentTask.text}`]),
    ...(state.nextCommand === undefined ? [] : [`the next command is ${state.nextCommand}`]),
    // What still blocks the feature (054 #84, #86): open questions, open checklist items, analyze not run.
    ...((feature.clarifications ?? 0) > 0 || feature.warnings.includes('clarification-after-plan') ? ['the spec still has [NEEDS CLARIFICATION] markers'] : []),
    ...((feature.checklist?.open ?? 0) > 0 ? [`${feature.checklist!.open} checklist items are open`] : []),
    ...(feature.phase === 'implement' && !state.isAnalyzed && feature.done === 0 ? ['/speckit-analyze has not run on these tasks'] : []),
    ...(driftWarning === undefined
      ? []
      : [`tasks.md and code may have drifted: ${driftWarning.task} in ${driftWarning.dir} was marked done without matching code edits; reconcile before continuing`]),
    ...(focusOn ? [focusNote(state.currentTask)] : []),
  ]
  return `Astrolabe: ${parts.join('; ')}.`
}

/** The `###` headings under `## Core Principles`, at most 22. */
export const principlesOf = (text: string): string[] => principleHeadings(text).map(p => p.name)

/** `/astrolabe status` (025 #42): the active feature, the next command and the footer, as text. */
/** The tasks an edit ticks: unticked in the old text, ticked in the new (025 #43). */
export const tickedBy = (before: string, after: string): string[] => {
  const was = new Map(parseTasks(before).map(task => [task.id ?? task.text, task.isDone]))
  return parseTasks(after)
    .filter(task => task.isDone && was.get(task.id ?? task.text) === false)
    .map(task => `${task.id === undefined ? '' : `${task.id} `}${task.text}`)
}

export const statusText = (state: SpeckitState, footer: string, lang: Lang): string => {
  const feature = state.features.find(f => f.dir === state.active?.dir)
  const lines = [
    feature === undefined
      ? t(lang, 'status.noActive')
      : `◆ ${feature.id} ${feature.name}: ${feature.phase}${feature.total === 0 ? '' : `, ${feature.done}/${feature.total} tasks (${Math.floor((feature.done * 100) / feature.total)}%)`}`,
    ...(state.nextCommand === undefined ? [] : [`${t(lang, 'status.next')}: ${state.nextCommand}`]),
    footer,
  ]
  return lines.join('\n\n')
}
