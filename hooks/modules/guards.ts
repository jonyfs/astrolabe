import { type SpeckitState } from '../core/types'

/** One line on the active feature for Claude (026 #50); undefined without one. */
/** The note for a prompt that names a feature other than the active one, by its 3-digit id (054 #91). */
export const otherFeatureNamed = (text: string, state: SpeckitState): string | undefined => {
  const active = state.features.find(f => f.dir === state.active?.dir)
  if (active === undefined) return undefined
  const ids = [...text.matchAll(/(?:^|[^\d])(\d{3})(?![\d])/g)].map(m => m[1]!)
  const named = state.features.find(f => f.id !== active.id && ids.includes(f.id))
  return named === undefined ? undefined : `Astrolabe: this prompt names feature ${named.id} ${named.name}, but the active one is ${active.id} ${active.name}; .specify/feature.json decides which one Spec Kit skills work on.`
}

/** Why `/speckit-implement` is refused while the active spec has open clarifications (054 #57); undefined to let it run. */
export const implementRefusal = (skill: string, state: SpeckitState | undefined, waived: ReadonlySet<string>): string | undefined => {
  if (!/^speckit[-.]implement$/.test(skill) || state === undefined) return undefined
  const feature = state.features.find(f => f.dir === state.active?.dir)
  if (feature === undefined || waived.has(feature.dir)) return undefined
  const open = feature.clarifications ?? 0
  if (open === 0 && !feature.warnings.includes('clarification-after-plan')) return undefined
  const count = open === 0 ? 'open [NEEDS CLARIFICATION] markers' : `${open} open [NEEDS CLARIFICATION] marker${open === 1 ? '' : 's'}`
  return `Astrolabe: feature ${feature.id} ${feature.name} still has ${count} in spec.md. Run /speckit-clarify first. To implement anyway, call /speckit-implement again.`
}

/** A shell command that can make a spec, move feature.json or switch the branch (054 #5). */
export const canTouchSpecs = (command: string): boolean =>
  /\b(git|mv|cp|rm|mkdir|touch|specify|tee|sed|python3?|node|bun|sh|bash|zsh)\b|\.specify|specs\/|>/.test(command)

export const mayChangeGit = (command: string): boolean =>
  /\bgit\b/.test(command) &&
  !/\bgit\s+(?:status|log|diff|show|rev-parse|ls-files|check-ignore|version|remote\s+get-url|branch\s+(?:--show-current|--list|-l)|worktree\s+list|config\s+--get)\b/.test(command)

export const mayWriteFiles = (command: string): boolean =>
  /\b(?:mv|cp|rm|mkdir|rmdir|touch|tee|install|truncate)\b|(?:sed|perl)\s+-i\b|(?:^|[^>])>{1,2}\s*[^=&|]/.test(command) ||
  (!/\bgit\b/.test(command) && canTouchSpecs(command))

/** A path under a `.specify/` folder: feature.json, the constitution, extensions.yml (053). */
export const isUnderSpecify = (path: string): boolean => /(^|[\\/])\.specify[\\/]/.test(path)
