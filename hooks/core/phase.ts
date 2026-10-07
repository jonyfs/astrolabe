// Derives one feature's phase and progress from its files (FR-005). Pure: no $.
import { hasClarification } from './clarification'
import { parseFrontMatter } from './front-matter'
import { currentTaskOf, parseTasks } from './tasks-parser'
import type { Feature, FeatureFiles, FeatureWarning, FrontMatter, Phase } from './types'

const phaseOf = (files: FeatureFiles, front: FrontMatter, done: number, total: number): Phase => {
  if (front.status === 'abandoned') return 'abandoned'
  if (front.status === 'done') return 'done'
  if (files.spec === undefined) return 'specify'
  if (front.track === 'quick') return 'implement'
  if (!files.plan && hasClarification(files.spec)) return 'clarify'
  if (!files.plan) return 'plan'
  if (total === 0) return 'tasks'
  if (done < total) return 'implement'
  if (front.status === 'active') return 'implement'
  return 'done'
}

export const deriveFeature = (files: FeatureFiles): Feature => {
  const front = files.spec === undefined ? {} : parseFrontMatter(files.spec)
  const tasks = files.tasks === undefined ? [] : parseTasks(files.tasks)
  const done = tasks.filter(t => t.isDone).length
  const total = tasks.length
  const warnings: FeatureWarning[] = [
    ...(files.plan && files.spec !== undefined && hasClarification(files.spec) ? ['clarification-after-plan' as const] : []),
    ...(files.unreadable?.includes('spec.md') === true ? ['unreadable-spec' as const] : []),
    ...(files.unreadable?.includes('tasks.md') === true ? ['unreadable-tasks' as const] : []),
  ]
  const currentTask = currentTaskOf(tasks)
  return {
    id: files.dir.slice(0, 3),
    name: files.dir.slice(4),
    dir: files.dir,
    phase: phaseOf(files, front, done, total),
    ...(front.track === undefined ? {} : { track: front.track }),
    ...(front.status === undefined ? {} : { status: front.status }),
    done,
    total,
    ...(currentTask === undefined ? {} : { currentTask }),
    warnings,
  }
}
