// Reads the files the state model needs into a Snapshot. Never throws: a file that
// cannot be read counts as missing.
import { joinPath, normalizePath, specsLocation } from '../core/paths'
import type { FeatureFiles, FeatureJson, Snapshot } from '../core/types'

import { type Fs, readOrUndefined } from './fs-port'
import { readBranch } from './git-branch'

const FEATURE_DIR = /^\d{3}-.+$/

export type SnapshotScope = 'full' | { dirs: readonly string[] }

const parseFeatureJson = (root: string, raw: string | undefined): FeatureJson => {
  if (raw === undefined) return { kind: 'missing' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'malformed' }
  }
  const dir =
    typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)['feature_directory']
      : undefined
  if (typeof dir !== 'string' || dir.trim() === '') return { kind: 'malformed' }
  const location = specsLocation(root, dir.trim())
  return { kind: 'ok', dir: location !== undefined && location.file === '' ? location.dir : normalizePath(dir.trim()) }
}

export const readFeature = async (fs: Fs, root: string, dir: string): Promise<FeatureFiles> => {
  const base = joinPath(root, 'specs', dir)
  const [spec, plan, tasks] = await Promise.all([
    readOrUndefined(fs, joinPath(base, 'spec.md')),
    fs.exists(joinPath(base, 'plan.md')).catch(() => false),
    readOrUndefined(fs, joinPath(base, 'tasks.md')),
  ])
  return { dir, ...(spec === undefined ? {} : { spec }), plan, ...(tasks === undefined ? {} : { tasks }) }
}

const listFeatureDirs = async (fs: Fs, root: string): Promise<string[]> => {
  const entries = await fs.list(joinPath(root, 'specs')).catch(() => [])
  const named = entries.filter(e => FEATURE_DIR.test(e.name))
  // $.fs.list reports a symbolic link as `other`; a link that leads somewhere is a feature too.
  const linked = await Promise.all(
    named.map(async e => e.kind === 'dir' || (e.kind === 'other' && e.isLink === true && (await fs.exists(joinPath(root, 'specs', e.name)).catch(() => false)))),
  )
  return named
    .filter((_, i) => linked[i] === true)
    .map(e => e.name)
    .sort((a, b) => a.slice(0, 3).localeCompare(b.slice(0, 3)) || a.localeCompare(b))
}

/**
 * `full` reads every feature. A `{ dirs }` scope re-reads only those features and
 * any feature `previous` does not hold, reusing `previous` for the rest (FR-016).
 */
export const readSnapshot = async (
  fs: Fs,
  root: string,
  scope: SnapshotScope,
  previous: Readonly<Record<string, FeatureFiles>> = {},
): Promise<Snapshot> => {
  const [rawFeatureJson, constitution, branch, dirs] = await Promise.all([
    readOrUndefined(fs, joinPath(root, '.specify', 'feature.json')),
    readOrUndefined(fs, joinPath(root, '.specify', 'memory', 'constitution.md')),
    readBranch(fs, root).catch(() => undefined),
    listFeatureDirs(fs, root),
  ])
  const fresh = new Set(scope === 'full' ? dirs : scope.dirs)
  const features = await Promise.all(
    dirs.map(dir => {
      const cached = previous[dir]
      return fresh.has(dir) || cached === undefined ? readFeature(fs, root, dir) : Promise.resolve(cached)
    }),
  )
  return {
    root,
    featureJson: parseFeatureJson(root, rawFeatureJson),
    ...(constitution === undefined ? {} : { constitution }),
    ...(branch === undefined ? {} : { branch }),
    features,
  }
}
