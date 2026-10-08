// Derives the whole Spec Kit state from a snapshot and the session memo. Pure: no $.
import { resolveActive } from './active'
import { compactConstitution, compactFiles } from './compact'
import { classifyConstitution } from './constitution'
import { hooksFor } from './extensions'
import { nextCommand } from './next-command'
import { deriveFeature } from './phase'
import { specSummary } from './summary'
import { parseTasks } from './tasks-parser'
import type { SessionMemo, Snapshot, SpeckitState } from './types'

/** The feature folder a branch names by its number (`026-x`, `feature/026-x`), if any (044). */
const branchDir = (branch: string | undefined, dirs: readonly string[]): string | undefined => {
  const id = branch === undefined ? undefined : /(?:^|\/)(\d{3})-/.exec(branch)?.[1]
  return id === undefined ? undefined : dirs.find(d => d.startsWith(`${id}-`))
}

export const deriveSpeckitState = (
  snapshot: Snapshot,
  memo: SessionMemo,
  now: number,
): { state: SpeckitState; memo: SessionMemo } => {
  if (snapshot.root === undefined) {
    const { currentTask: _none, base: _base, ...kept } = memo
    return {
      state: { present: false, constitution: 'missing', features: [], isAnalyzed: false, ...(snapshot.otherRoots === undefined ? {} : { otherRoots: snapshot.otherRoots }) },
      memo: { ...kept, files: {} },
    }
  }
  const features = snapshot.features.map(deriveFeature)
  const { active, warning } = resolveActive(snapshot, features)
  const activeFeature = active === undefined ? undefined : features.find(f => f.dir === active.dir)
  const task = activeFeature?.currentTask
  const previous = memo.currentTask
  const currentTaskMemo =
    active === undefined || task?.id === undefined
      ? undefined
      : previous !== undefined && previous.dir === active.dir && previous.id === task.id
        ? previous
        : { dir: active.dir, id: task.id, startedAt: now }
  const isAnalyzed = active !== undefined && memo.analyzed.includes(active.dir)
  const constitution = classifyConstitution(snapshot.constitution)
  const base = {
    present: true,
    root: snapshot.root,
    constitution,
    ...(active === undefined ? {} : { active }),
    ...(warning === undefined ? {} : { activeWarning: warning }),
    features,
    ...(memo.runningSkill === undefined ? {} : { runningSkill: memo.runningSkill }),
    ...(task === undefined
      ? {}
      : { currentTask: { ...task, ...(currentTaskMemo === undefined ? {} : { startedAt: currentTaskMemo.startedAt }) } }),
    isAnalyzed,
  }
  const next = nextCommand({ present: true, constitution, isAnalyzed, ...(activeFeature === undefined ? {} : { active: activeFeature }) })
  const activeFiles = active === undefined ? undefined : snapshot.features.find(f => f.dir === active.dir)
  const activeTasks =
    activeFiles?.tasks === undefined
      ? undefined
      : parseTasks(activeFiles.tasks).map((t, i) => {
          // Quick specs keep their tasks in spec.md: the line is the one there (024).
          const line = activeFiles.taskLines?.[i] ?? t.line
          return { ...(t.id === undefined ? {} : { id: t.id }), text: t.text, isDone: t.isDone, ...(line === undefined ? {} : { line }), ...(t.story === undefined ? {} : { story: t.story }) }
        })
  const activeSummary = activeFiles === undefined ? undefined : activeFiles.compact === true ? activeFiles.summary : activeFiles.spec === undefined ? undefined : specSummary(activeFiles.spec)
  const activeDocs =
    activeFiles === undefined
      ? undefined
      : ([
          ...(activeFiles.spec === undefined ? [] : ['spec.md']),
          ...(activeFiles.plan ? ['plan.md'] : []),
          ...(activeFiles.tasks === undefined || activeFiles.tasksInSpec === true ? [] : ['tasks.md']),
        ] as Array<'spec.md' | 'plan.md' | 'tasks.md'>)
  const isWorkingOnActive = active !== undefined && (memo.runningSkill?.step === 'implement' || memo.touched.includes(active.dir))
  const state: SpeckitState = {
    ...base,
    ...(next === undefined ? {} : { nextCommand: next }),
    ...(snapshot.otherRoots === undefined ? {} : { otherRoots: snapshot.otherRoots }),
    ...(() => {
      const hooks = hooksFor(snapshot.extensions ?? [], next)
      return hooks.before.length + hooks.after.length === 0 ? {} : { nextHooks: hooks }
    })(),
    isWorkingOnActive,
    ...(activeTasks === undefined ? {} : { activeTasks }),
    ...(activeSummary === undefined ? {} : { activeSummary }),
    ...((dir => (dir === undefined ? {} : { branchFeature: dir }))(branchDir(snapshot.branch, snapshot.features.map(f => f.dir)))),
    ...(activeDocs === undefined || activeDocs.length === 0 ? {} : { activeDocs }),
  }
  // The memo keeps compacted files only (spec 009): enough to derive the same state again.
  const files = Object.fromEntries(snapshot.features.map(f => [f.dir, compactFiles(f)]))
  const { currentTask: _drop, ...rest } = memo
  const { features: _features, constitution: rawConstitution, ...withoutConstitution } = snapshot
  const compacted = compactConstitution(rawConstitution)
  const snapshotBase = compacted === undefined ? withoutConstitution : { ...withoutConstitution, constitution: compacted }
  return {
    state,
    memo: { ...rest, files, base: snapshotBase, ...(currentTaskMemo === undefined ? {} : { currentTask: currentTaskMemo }) },
  }
}

/** The snapshot a memo was derived from, rebuilt without reading anything. */
export const snapshotFromMemo = (memo: SessionMemo): Snapshot | undefined =>
  memo.base === undefined
    ? undefined
    : { ...memo.base, features: Object.values(memo.files).sort((a, b) => a.dir.localeCompare(b.dir)) }
