// Reads the files the state model needs into a Snapshot. Never throws: a missing file is
// left out, and a file that exists but cannot be read keeps the last text read (013).
import { checklistCounts } from '../core/clarification'
import { joinPath, normalizePath, specsLocation } from '../core/paths'
import type { FeatureFiles, FeatureJson, Snapshot } from '../core/types'

import { type Fs, readOrUndefined, readResult, type ReadResult } from './fs-port'
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

/** The text read, else the last one kept when the file exists but could not be read. */
const textOf = (result: ReadResult, last: string | undefined): string | undefined =>
  'text' in result ? result.text : 'unreadable' in result ? last : undefined

/** One feature's files. `previous` is the last read of it, kept for a file that cannot be read. */
export const readFeature = async (fs: Fs, root: string, dir: string, previous?: FeatureFiles): Promise<FeatureFiles> => {
  const base = joinPath(root, 'specs', dir)
  const [specRead, plan, tasksRead, checklists] = await Promise.all([
    readResult(fs, joinPath(base, 'spec.md')),
    fs.exists(joinPath(base, 'plan.md')).catch(() => false),
    readResult(fs, joinPath(base, 'tasks.md')),
    readChecklists(fs, joinPath(base, 'checklists')),
  ])
  const spec = textOf(specRead, previous?.spec)
  const tasks = textOf(tasksRead, previous?.tasks)
  const unreadable = [...('unreadable' in specRead ? ['spec.md' as const] : []), ...('unreadable' in tasksRead ? ['tasks.md' as const] : [])]
  return {
    dir,
    ...(spec === undefined ? {} : { spec }),
    plan,
    ...(tasks === undefined ? {} : { tasks }),
    ...(unreadable.length === 0 ? {} : { unreadable }),
    ...(checklists === undefined ? {} : { checklist: checklists }),
  }
}

/** The open and total items of a feature's `checklists/*.md`; undefined without that folder. */
const readChecklists = async (fs: Fs, dir: string): Promise<{ open: number; total: number } | undefined> => {
  const entries = await fs.list(dir).catch(() => undefined)
  if (entries === undefined) return undefined
  const texts = await Promise.all(entries.filter(e => e.kind === 'file' && e.name.endsWith('.md')).map(e => readOrUndefined(fs, joinPath(dir, e.name))))
  return checklistCounts(texts.filter((t): t is string => t !== undefined))
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
 * `last` is the previous snapshot's base, whose constitution stands in for one that
 * cannot be read.
 */
export const readSnapshot = async (
  fs: Fs,
  root: string,
  scope: SnapshotScope,
  previous: Readonly<Record<string, FeatureFiles>> = {},
  last: { constitution?: string } = {},
): Promise<Snapshot> => {
  const [rawFeatureJson, constitutionRead, branch, dirs] = await Promise.all([
    readOrUndefined(fs, joinPath(root, '.specify', 'feature.json')),
    readResult(fs, joinPath(root, '.specify', 'memory', 'constitution.md')),
    readBranch(fs, root).catch(() => undefined),
    listFeatureDirs(fs, root),
  ])
  const fresh = new Set(scope === 'full' ? dirs : scope.dirs)
  const features = await Promise.all(
    dirs.map(dir => {
      const cached = previous[dir]
      return fresh.has(dir) || cached === undefined ? readFeature(fs, root, dir, cached) : Promise.resolve(cached)
    }),
  )
  const constitution = textOf(constitutionRead, last.constitution)
  return {
    root,
    featureJson: parseFeatureJson(root, rawFeatureJson),
    ...(constitution === undefined ? {} : { constitution }),
    ...(branch === undefined ? {} : { branch }),
    features,
  }
}
