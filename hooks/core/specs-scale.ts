// The Specs tab at 100 specs and more (067, board 6): blocks of 50 by id, counts per block,
// the checks that surface data drift, placeholder runs for specs not read yet, and the
// groupings. Pure: no $.
import type { Feature, SpeckitState } from './types'
import { displaySectionOf, type Section } from './sections'

export type SpecView = 'focus' | 'all'
export type SpecGroup = 'status' | 'phase' | 'track' | 'priority'
export const SPEC_GROUPS: readonly SpecGroup[] = ['status', 'phase', 'track', 'priority']

/** The next grouping (067 #39): status, phase, track, priority, and round again. */
export const nextGroup = (g: SpecGroup | undefined): SpecGroup => SPEC_GROUPS[(SPEC_GROUPS.indexOf(g ?? 'status') + 1) % SPEC_GROUPS.length]!

const BLOCK = 50

/** `001–050` for ids 1 to 50, `051–100` for 51 to 100; a 4-digit project pads to the widest id. */
export const blockLabel = (id: string, width = 3): string => {
  const n = Number.parseInt(id, 10)
  if (!Number.isFinite(n) || n < 1) return '?'
  const start = Math.floor((n - 1) / BLOCK) * BLOCK + 1
  return `${String(start).padStart(width, '0')}–${String(start + BLOCK - 1).padStart(width, '0')}`
}

export type BlockCounts = { done: number; progress: number; early: number; checks: number; total: number }

export const countsOf = (features: readonly Feature[], activeDir: string | undefined, checkDirs: ReadonlySet<string> = new Set()): BlockCounts => {
  const out: BlockCounts = { done: 0, progress: 0, early: 0, checks: 0, total: features.length }
  for (const f of features) {
    const s = displaySectionOf(f, activeDir)
    if (s === 'done') out.done += 1
    else if (s === 'active' || s === 'progress' || s === 'close') out.progress += 1
    else if (s === 'early' || s === 'next') out.early += 1
    if (checkDirs.has(f.dir)) out.checks += 1
  }
  return out
}

/** The block header's counts: `✓42 ▶6 ·2 ▲3`, a part only when it is not zero. */
export const countsText = (c: BlockCounts): string =>
  [c.done > 0 ? `✓${c.done}` : '', c.progress > 0 ? `▶${c.progress}` : '', c.early > 0 ? `·${c.early}` : '', c.checks > 0 ? `▲${c.checks}` : ''].filter(x => x !== '').join(' ')

/** The blocks of a list of features by id, in order, each with its features. */
export const blocksOf = (features: readonly Feature[], width = 3): Array<{ label: string; features: Feature[] }> => {
  const by = new Map<string, Feature[]>()
  for (const f of [...features].sort((a, b) => a.id.localeCompare(b.id) || a.dir.localeCompare(b.dir))) {
    const label = blockLabel(f.id, width)
    by.set(label, [...(by.get(label) ?? []), f])
  }
  return [...by.entries()].map(([label, list]) => ({ label, features: list }))
}

export type Check = { kind: 'done-open' | 'duplicate-id' | 'feature-json' | 'plan-file'; dir?: string; id?: string; text: string }

/**
 * What looks wrong in the project (067 #33): a spec marked done with open tasks, an id used
 * twice, a `feature.json` that is dangling or malformed, and files `plan.md` names that are
 * not there (from the reconcile's own reads, `planMissing`).
 */
export const checksOf = (state: Pick<SpeckitState, 'features' | 'activeWarning'>, planMissing: Readonly<Record<string, readonly string[]>> = {}): Check[] => {
  const out: Check[] = []
  for (const f of state.features) {
    if (f.phase === 'done' && f.total > 0 && f.done < f.total) out.push({ kind: 'done-open', dir: f.dir, id: f.id, text: `${f.id} done with ${f.done}/${f.total} ticked` })
  }
  const seen = new Map<string, string[]>()
  for (const f of state.features) seen.set(f.id, [...(seen.get(f.id) ?? []), f.dir])
  const dups = [...seen.entries()].filter(([, dirs]) => dirs.length > 1)
  if (dups.length > 0) {
    for (const [id, dirs] of dups) for (const dir of dirs) out.push({ kind: 'duplicate-id', dir, id, text: `id ${id} used ${dirs.length === 2 ? 'twice' : `${dirs.length} times`}` })
  }
  if (state.activeWarning === 'feature-json-dangling') out.push({ kind: 'feature-json', text: 'feature.json names a folder that is not there' })
  if (state.activeWarning === 'feature-json-malformed') out.push({ kind: 'feature-json', text: 'feature.json is malformed' })
  for (const f of state.features) {
    const missing = planMissing[f.dir]
    if (missing !== undefined && missing.length > 0) out.push({ kind: 'plan-file', dir: f.dir, id: f.id, text: `${f.id} plan.md names a missing file: ${missing[0]}${missing.length > 1 ? ` +${missing.length - 1}` : ''}` })
  }
  return out
}

/** The one-line summary of the checks: `▲ 3 checks · 028 done with 1/30 ticked · ids 029 and 030 used twice`. */
export const checksLine = (checks: readonly Check[]): string | undefined => {
  if (checks.length === 0) return undefined
  const dupIds = [...new Set(checks.filter(c => c.kind === 'duplicate-id').map(c => c.id!))]
  const parts = [
    ...checks.filter(c => c.kind === 'done-open' || c.kind === 'plan-file' || c.kind === 'feature-json').map(c => c.text),
    ...(dupIds.length === 0 ? [] : [`${dupIds.length === 1 ? 'id' : 'ids'} ${dupIds.length === 2 ? dupIds.join(' and ') : dupIds.join(', ')} used twice`]),
  ]
  const n = new Set(checks.map(c => `${c.kind}:${c.dir ?? c.text}`)).size - (dupIds.length > 0 ? checks.filter(c => c.kind === 'duplicate-id').length - dupIds.length : 0)
  return `▲ ${n} check${n === 1 ? '' : 's'} · ${parts.join(' · ')}`
}

/** Runs of consecutive specs not read yet (067 #36): `040–049` for a run, one id for a lone one. */
export const loadingRuns = (features: readonly Feature[]): Array<{ from: string; to: string; dirs: string[] }> => {
  const runs: Array<{ from: string; to: string; dirs: string[] }> = []
  let current: { from: string; to: string; dirs: string[] } | undefined
  const sorted = [...features].sort((a, b) => a.id.localeCompare(b.id) || a.dir.localeCompare(b.dir))
  for (const f of sorted) {
    if (!f.warnings.includes('loading')) {
      current = undefined
      continue
    }
    if (current === undefined) {
      current = { from: f.id, to: f.id, dirs: [f.dir] }
      runs.push(current)
    } else {
      current.to = f.id
      current.dirs.push(f.dir)
    }
  }
  return runs
}

export const runLabel = (run: { from: string; to: string }): string => (run.from === run.to ? run.from : `${run.from}–${run.to}`)

/** The group a feature falls in for a grouping, and the order of the groups (067 #39). */
export const groupKeyOf = (group: SpecGroup, f: Feature, activeDir: string | undefined, priority: string | undefined): string => {
  switch (group) {
    case 'phase':
      return f.phase
    case 'track':
      return f.track ?? 'full'
    case 'priority':
      return priority ?? 'normal'
    default:
      return displaySectionOf(f, activeDir) satisfies Section
  }
}

/** `#05` in the filter box is a jump to an id (067 #31): the query after the `#`, or undefined. */
export const jumpQuery = (filter: string | undefined): string | undefined => {
  const text = (filter ?? '').trim()
  return text.startsWith('#') ? text.slice(1).trim() : undefined
}

/** The ids a jump query completes to, in order, at most `limit`; duplicates keep both folders. */
export const jumpMatches = (features: readonly Feature[], query: string, limit = 10): Feature[] =>
  [...features]
    .filter(f => f.id.startsWith(query))
    .sort((a, b) => a.id.localeCompare(b.id) || a.dir.localeCompare(b.dir))
    .slice(0, limit)

/** The jump row under the filter: `# 05 → 050 051 … 059`, or what to type when nothing matches. */
export const jumpLine = (features: readonly Feature[], query: string): string => {
  const hits = jumpMatches(features, query, 50)
  if (hits.length === 0) return `# ${query} → ?`
  const ids = hits.map(f => f.id)
  const shown = ids.length > 4 ? [...ids.slice(0, 2), '…', ids[ids.length - 1]!] : ids
  return `# ${query} → ${shown.join(' ')}`
}
