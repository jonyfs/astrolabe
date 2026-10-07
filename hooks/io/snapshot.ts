// Reads the files the state model needs into a Snapshot. Never throws: a missing file is
// left out, and a file that exists but cannot be read keeps the last text read (013).
import { checklistCounts } from '../core/clarification'
import { parseFrontMatter } from '../core/front-matter'
import { joinPath, normalizePath, specsLocation } from '../core/paths'
import { parseExtensions } from '../core/extensions'
import type { ExtensionHook, FeatureFiles, FeatureJson, Snapshot } from '../core/types'

import { type Fs, readOrUndefined, readResult, type ReadResult } from './fs-port'
import { readHead } from './git-branch'

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
  // A quick spec keeps its tasks in its own `## Tasks` section when there is no tasks.md (021).
  const tasks = textOf(tasksRead, previous?.tasks) ?? quickTasks(spec)
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

/** The checkbox lines of a quick spec's `## Tasks` section; undefined for any other spec. */
const quickTasks = (spec: string | undefined): string | undefined => {
  if (spec === undefined || parseFrontMatter(spec).track !== 'quick') return undefined
  const lines = spec.split(/\r?\n/)
  const start = lines.findIndex(l => /^##\s+Tasks\s*$/i.test(l))
  if (start < 0) return undefined
  const end = lines.findIndex((l, i) => i > start && /^#{1,2}\s/.test(l))
  const items = lines.slice(start + 1, end < 0 ? undefined : end).filter(l => /^\s*[-*+]\s+\[[ xX]\]/.test(l))
  return items.length === 0 ? undefined : `${items.join('\n')}\n`
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
  last: { constitution?: string; extensions?: ExtensionHook[]; otherRoots?: string[] } = {},
): Promise<Snapshot> => {
  const [rawFeatureJson, constitutionRead, head, dirs] = await Promise.all([
    readOrUndefined(fs, joinPath(root, '.specify', 'feature.json')),
    readResult(fs, joinPath(root, '.specify', 'memory', 'constitution.md')),
    readHead(fs, root).catch(() => ({}) as { branch?: string; worktree?: string }),
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
  // Extensions change rarely: read with the full snapshot only, kept from the last one otherwise.
  const extensions =
    scope === 'full' ? parseExtensions((await readOrUndefined(fs, joinPath(root, '.specify', 'extensions.yml'))) ?? '') : last.extensions
  return {
    root,
    featureJson: parseFeatureJson(root, rawFeatureJson),
    ...(constitution === undefined ? {} : { constitution }),
    ...(head.branch === undefined ? {} : { branch: head.branch }),
    ...(head.worktree === undefined ? {} : { worktree: head.worktree }),
    ...(extensions === undefined || extensions.length === 0 ? {} : { extensions }),
    ...(last.otherRoots === undefined || last.otherRoots.length === 0 ? {} : { otherRoots: last.otherRoots }),
    features,
  }
}
