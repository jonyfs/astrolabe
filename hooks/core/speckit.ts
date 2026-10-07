// Derives the whole Spec Kit state from a snapshot and the session memo. Pure: no $.
import { resolveActive } from './active'
import { classifyConstitution } from './constitution'
import { nextCommand } from './next-command'
import { deriveFeature } from './phase'
import type { SessionMemo, Snapshot, SpeckitState } from './types'

export const deriveSpeckitState = (
  snapshot: Snapshot,
  memo: SessionMemo,
  now: number,
): { state: SpeckitState; memo: SessionMemo } => {
  if (snapshot.root === undefined) {
    const { currentTask: _none, base: _base, ...kept } = memo
    return {
      state: { present: false, constitution: 'missing', features: [], isAnalyzed: false },
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
  const state: SpeckitState = { ...base, ...(next === undefined ? {} : { nextCommand: next }) }
  const files = Object.fromEntries(snapshot.features.map(f => [f.dir, f]))
  const { currentTask: _drop, ...rest } = memo
  const { features: _features, ...snapshotBase } = snapshot
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
