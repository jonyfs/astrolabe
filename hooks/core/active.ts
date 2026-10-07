// Chooses the active feature (FR-011, FR-013). Pure: no $.
import type { Active, ActiveWarning, Feature, Snapshot } from './types'

const toActive = (f: Feature, source: Active['source']): Active => ({ dir: f.dir, id: f.id, name: f.name, source })

export const resolveActive = (
  snapshot: Pick<Snapshot, 'featureJson' | 'branch'>,
  features: readonly Feature[],
): { active?: Active; warning?: ActiveWarning } => {
  const byDir = new Map(features.map(f => [f.dir, f]))
  let warning: ActiveWarning | undefined
  const fj = snapshot.featureJson
  if (fj.kind === 'ok') {
    const named = byDir.get(fj.dir)
    if (named !== undefined) return { active: toActive(named, 'feature.json') }
    warning = 'feature-json-dangling'
  } else if (fj.kind === 'malformed') {
    warning = 'feature-json-malformed'
  }
  const withWarning = (active: Active | undefined) => ({
    ...(active === undefined ? {} : { active }),
    ...(warning === undefined ? {} : { warning }),
  })
  const branch = snapshot.branch
  if (branch !== undefined && /^\d{3}-/.test(branch)) {
    const onBranch = byDir.get(branch)
    if (onBranch !== undefined) return withWarning(toActive(onBranch, 'branch'))
  }
  const latest = [...features].reverse().find(f => f.phase !== 'done' && f.phase !== 'abandoned')
  return withWarning(latest === undefined ? undefined : toActive(latest, 'latest'))
}
