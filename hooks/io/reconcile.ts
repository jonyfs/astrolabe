// Turns "what happened" into a fresh { state, memo }: reads what the moment calls
// for (FR-015, FR-016, FR-019) and derives the rest. No $: register.tsx passes an Fs.
import { featureDirOf, specsLocation } from '../core/paths'
import { skillHint } from '../core/skill-hints'
import { deriveSpeckitState, snapshotFromMemo } from '../core/speckit'
import { emptyMemo, type SessionMemo, type SpeckitState } from '../core/types'

import type { Fs } from './fs-port'
import { findRoot } from './root'
import { readFeature, readSnapshot } from './snapshot'

export type Held = { state: SpeckitState; memo: SessionMemo }

const unique = (xs: ReadonlyArray<string | undefined>): string[] => [...new Set(xs.filter((x): x is string => x !== undefined))]

/** session.start: find the root and read every feature. Keeps this session's analyzed flags across reloads. */
export const reconcileStart = async (fs: Fs, cwd: string, previous: Held | undefined, now: number): Promise<Held> => {
  const root = await findRoot(fs, cwd)
  const memo: SessionMemo = { ...emptyMemo(), analyzed: previous?.memo.analyzed ?? [] }
  if (root === undefined) return deriveSpeckitState({ featureJson: { kind: 'missing' }, features: [] }, memo, now)
  const snapshot = await readSnapshot(fs, root, 'full')
  const carried = previous?.memo.currentTask === undefined ? memo : { ...memo, currentTask: previous.memo.currentTask }
  return deriveSpeckitState(snapshot, carried, now)
}

/** turn.complete: re-read the active feature and the features touched this turn; clear the turn's hints. */
export const reconcileTurn = async (fs: Fs, cwd: string, previous: Held | undefined, now: number): Promise<Held> => {
  if (previous === undefined || previous.state.root === undefined) return reconcileStart(fs, cwd, previous, now)
  const root = previous.state.root
  const { runningSkill: _skill, ...kept } = previous.memo
  const memo: SessionMemo = { ...kept, touched: [] }
  const dirs = unique([previous.state.active?.dir, ...previous.memo.touched])
  const snapshot = await readSnapshot(fs, root, { dirs }, previous.memo.files)
  let held = deriveSpeckitState(snapshot, memo, now)
  const active = held.state.active?.dir
  if (active !== undefined && !dirs.includes(active) && previous.memo.files[active] !== undefined) {
    const fresh = await readFeature(fs, root, active)
    held = deriveSpeckitState({ ...snapshot, features: snapshot.features.map(f => (f.dir === active ? fresh : f)) }, memo, now)
  }
  return held
}

/** A Skill call: set the running marker or the analyzed flag, then re-derive with no reads (FR-017, FR-018). */
export const applySkill = (previous: Held, skill: string, now: number): Held => {
  const hint = skillHint(skill)
  const snapshot = snapshotFromMemo(previous.memo)
  if (hint === undefined || snapshot === undefined) return previous
  const active = previous.state.active?.dir
  const memo: SessionMemo =
    'analyze' in hint
      ? { ...previous.memo, analyzed: active === undefined ? previous.memo.analyzed : unique([...previous.memo.analyzed, active]) }
      : { ...previous.memo, runningSkill: { name: skill, step: hint.step } }
  return deriveSpeckitState(snapshot, memo, now)
}

const TRACKED = new Set(['spec.md', 'plan.md', 'tasks.md'])

/**
 * A file tool call finished. Under specs/NNN-*: remember the feature as touched, and
 * when it wrote spec.md, plan.md or tasks.md (`isWrite`), re-read that feature now.
 */
export const applyFileTouch = async (
  fs: Fs,
  previous: Held,
  path: string,
  isWrite: boolean,
  now: number,
): Promise<Held> => {
  const root = previous.state.root
  if (root === undefined) return previous
  const location = specsLocation(root, path)
  const dir = location?.dir ?? featureDirOf(root, path)
  if (location === undefined || dir === undefined) return previous
  const memo: SessionMemo = { ...previous.memo, touched: unique([...previous.memo.touched, dir]) }
  const snapshot = snapshotFromMemo(memo)
  if (!isWrite || !TRACKED.has(location.file) || snapshot === undefined) return { ...previous, memo }
  const fresh = await readFeature(fs, root, dir)
  const others = snapshot.features.filter(f => f.dir !== dir)
  const features = [...others, fresh].sort((a, b) => a.dir.localeCompare(b.dir))
  return deriveSpeckitState({ ...snapshot, features }, memo, now)
}
