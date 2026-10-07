// Turns "what happened" into a fresh { state, memo }: reads what the moment calls
// for (FR-015, FR-016, FR-019) and derives the rest. No $: register.tsx passes an Fs.
import { detectDrift, newlyTicked, withEdit, withShell } from '../core/drift'
import { joinPath, relativeTo, specsLocation } from '../core/paths'
import { skillHint } from '../core/skill-hints'
import { deriveSpeckitState, snapshotFromMemo } from '../core/speckit'
import { emptyMemo, emptyWindow, type DriftWindow, type SessionMemo, type SpeckitState } from '../core/types'

import type { Fs } from './fs-port'
import { findRoot } from './root'
import { readFeature, readSnapshot } from './snapshot'

export type Held = { state: SpeckitState; memo: SessionMemo }

const unique = (xs: ReadonlyArray<string | undefined>): string[] => [...new Set(xs.filter((x): x is string => x !== undefined))]

/** session.start: find the root and read every feature. Keeps this session's analyzed flags across reloads. */
export const reconcileStart = async (fs: Fs, cwd: string, previous: Held | undefined, now: number): Promise<Held> => {
  const root = await findRoot(fs, cwd)
  const memo: SessionMemo = { ...emptyMemo(), analyzed: previous?.memo.analyzed ?? [], toasted: previous?.memo.toasted ?? [] }
  if (root === undefined) return deriveSpeckitState({ featureJson: { kind: 'missing' }, features: [] }, memo, now)
  const snapshot = await readSnapshot(fs, root, 'full')
  const carried = previous?.memo.currentTask === undefined ? memo : { ...memo, currentTask: previous.memo.currentTask }
  return deriveSpeckitState(snapshot, carried, now)
}

/** turn.complete: re-read the active feature and the features touched this turn; clear the turn's hints. */
export const reconcileTurn = async (fs: Fs, cwd: string, previous: Held | undefined, now: number): Promise<Held> => {
  if (previous === undefined || previous.state.root === undefined) return reconcileStart(fs, cwd, previous, now)
  const root = previous.state.root
  // One check per turn: a root whose .specify/ is gone is looked for again from scratch.
  if (!(await fs.exists(joinPath(root, '.specify')).catch(() => false))) return reconcileStart(fs, cwd, previous, now)
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

const windowOf = (memo: SessionMemo): DriftWindow => memo.window ?? emptyWindow()

/** A Bash or Agent call: their file changes are invisible, so drift stays quiet this window. */
export const applyShell = (previous: Held): Held => ({
  ...previous,
  memo: { ...previous.memo, window: withShell(windowOf(previous.memo)) },
})

/**
 * A file tool call finished. Outside specs/ and .specify/ (inside the root) it is a code
 * edit for the drift window. Under specs/NNN-*: remember the feature as touched, and when it
 * wrote spec.md, plan.md or tasks.md (`isWrite`), re-read that feature now. A write of
 * tasks.md that ticks a task closes the drift window and may report drift (FR-004, FR-005).
 */
export const applyFileTouch = async (
  fs: Fs,
  previous: Held,
  path: string,
  isWrite: boolean,
  now: number,
): Promise<{ held: Held; drift?: string }> => {
  const root = previous.state.root
  if (root === undefined) return { held: previous }
  const relative = relativeTo(root, path)
  if (relative === undefined) return { held: previous }
  const location = specsLocation(root, path)
  if (location === undefined) {
    if (/^\.specify(\/|$)/i.test(relative)) return { held: previous }
    return { held: { ...previous, memo: { ...previous.memo, window: withEdit(windowOf(previous.memo), relative) } } }
  }
  const dir = location.dir
  const memo: SessionMemo = { ...previous.memo, touched: unique([...previous.memo.touched, dir]) }
  const snapshot = snapshotFromMemo(memo)
  if (!isWrite || !TRACKED.has(location.file) || snapshot === undefined) return { held: { ...previous, memo } }
  const fresh = await readFeature(fs, root, dir)
  const others = snapshot.features.filter(f => f.dir !== dir)
  const features = [...others, fresh].sort((a, b) => a.dir.localeCompare(b.dir))
  const ticked = location.file === 'tasks.md' ? newlyTicked(previous.memo.files[dir]?.tasks, fresh.tasks) : []
  const first = ticked[0]
  const drift = first === undefined ? undefined : detectDrift(first, windowOf(memo))
  const next = first === undefined ? memo : { ...memo, window: emptyWindow() }
  const held = deriveSpeckitState({ ...snapshot, features }, next, now)
  return drift === undefined ? { held } : { held, drift }
}
