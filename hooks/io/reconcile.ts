// Turns "what happened" into a fresh { state, memo }: reads what the moment calls
// for (FR-015, FR-016, FR-019) and derives the rest. No $: register.tsx passes an Fs.
import { detectDrift, newlyTicked, taskKey, withEdit, withShell } from '../core/drift'
import type { Lang } from '../core/i18n'
import { parseTasks, tasksFingerprint } from '../core/tasks-parser'
import { isWindowsPath, joinPath, relativeTo, specsLocation } from '../core/paths'
import { skillHint } from '../core/skill-hints'
import { deriveSpeckitState, snapshotFromMemo } from '../core/speckit'
import { emptyMemo, emptyWindow, type DriftWindow, type SessionMemo, type SpeckitState, type Task } from '../core/types'

import type { Fs } from './fs-port'
import { findOtherRoots, findRoot } from './root'
import { readFeature, readSnapshot } from './snapshot'

export type Held = { state: SpeckitState; memo: SessionMemo }

const unique = (xs: ReadonlyArray<string | undefined>): string[] => [...new Set(xs.filter((x): x is string => x !== undefined))]

/** session.start: find the root and read every feature. Keeps this session's analyzed flags across reloads. */
/** How many features a session start reads at once before it defers the rest (040). */
export const DEFER_ABOVE = 150

/** Reads features left for later (040), keeping everything else as the memo has it. */
export const reconcileDeferred = async (fs: Fs, previous: Held, dirs: readonly string[], now: number): Promise<Held> => {
  const root = previous.state.root
  if (root === undefined || dirs.length === 0) return previous
  const snapshot = await readSnapshot(fs, root, { dirs }, previous.memo.files, previous.memo.base)
  return deriveSpeckitState(snapshot, previous.memo, now)
}

export const reconcileStart = async (fs: Fs, cwd: string, previous: Held | undefined, now: number): Promise<Held> => {
  const root = await findRoot(fs, cwd)
  // A reload fires session.start again: keep this session's analyzed flags, toasted keys and
  // drift window so a reload is not mistaken for a new session.
  const memo: SessionMemo = {
    ...emptyMemo(),
    analyzed: previous?.memo.analyzed ?? [],
    ...(previous?.memo.analyzedTasks === undefined ? {} : { analyzedTasks: previous.memo.analyzedTasks }),
    toasted: previous?.memo.toasted ?? [],
    window: previous?.memo.window ?? emptyWindow(),
  }
  const otherRoots = await findOtherRoots(fs, cwd, root)
  if (root === undefined) {
    return deriveSpeckitState({ featureJson: { kind: 'missing' }, features: [], ...(otherRoots.length === 0 ? {} : { otherRoots }) }, memo, now)
  }
  // Same root (a reload): the last read stands in for a file that cannot be read now.
  const last = previous?.state.root === root ? previous.memo : undefined
  const read = await readSnapshot(fs, root, 'full', last?.files, last?.base, DEFER_ABOVE)
  const snapshot = otherRoots.length === 0 ? read : { ...read, otherRoots }
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
  const memo: SessionMemo = { ...kept, touched: [], window: emptyWindow() }
  // A feature marked unreadable is tried again each turn, so the mark clears once a read works.
  const marked = Object.values(previous.memo.files).filter(f => f.unreadable !== undefined).map(f => f.dir)
  const dirs = unique([previous.state.active?.dir, ...previous.memo.touched, ...marked])
  const snapshot = await readSnapshot(fs, root, { dirs }, previous.memo.files, previous.memo.base)
  let held = deriveSpeckitState(snapshot, memo, now)
  const active = held.state.active?.dir
  if (active !== undefined && !dirs.includes(active) && previous.memo.files[active] !== undefined) {
    const fresh = await readFeature(fs, root, active, previous.memo.files[active])
    held = deriveSpeckitState({ ...snapshot, features: snapshot.features.map(f => (f.dir === active ? fresh : f)) }, memo, now)
  }
  return held
}

/**
 * Mid-turn (053): a Bash command or a write under `.specify/` may have made a spec, switched
 * the branch or pointed feature.json elsewhere. Read the root's own files and the specs/
 * listing again, new features and the active one, and keep the turn's memo (touched, window,
 * running skill). Hands back `previous` itself when nothing moved, so nothing is written.
 */
export const reconcileNow = async (fs: Fs, previous: Held, now: number): Promise<Held> => {
  const root = previous.state.root
  if (root === undefined) return previous
  const snapshot = await readSnapshot(fs, root, { dirs: [] }, previous.memo.files, previous.memo.base)
  let held = deriveSpeckitState(snapshot, previous.memo, now)
  const active = held.state.active?.dir
  // A newly active feature is read fresh: its cache may be from an earlier turn.
  if (active !== undefined && active !== previous.state.active?.dir && previous.memo.files[active] !== undefined) {
    const fresh = await readFeature(fs, root, active, previous.memo.files[active])
    held = deriveSpeckitState({ ...snapshot, features: snapshot.features.map(f => (f.dir === active ? fresh : f)) }, previous.memo, now)
  }
  // The drawn state carries the memo version and the time it was written with; the derived one does not.
  const { memoVersion: _v, updatedAt: _at, ...shown } = previous.state as typeof previous.state & { memoVersion?: number }
  const same = JSON.stringify(held.state) === JSON.stringify(shown) && JSON.stringify(held.memo) === JSON.stringify(previous.memo)
  return same ? previous : held
}

/**
 * A Read of one of the active feature's files (014): the turn is working on it, so the
 * spinner narrates from the first read. No disk read; nothing changes for any other path.
 */
export const applyRead = (previous: Held, path: string, now: number): Held => {
  const root = previous.state.root
  const active = previous.state.active?.dir
  if (root === undefined || active === undefined || previous.memo.touched.includes(active)) return previous
  if (specsLocation(root, path)?.dir !== active) return previous
  const snapshot = snapshotFromMemo(previous.memo)
  if (snapshot === undefined) return previous
  return deriveSpeckitState(snapshot, { ...previous.memo, touched: [...previous.memo.touched, active] }, now)
}

/** A Skill call: set the running marker or the analyzed flag, then re-derive with no reads (FR-017, FR-018). */
export const applySkill = (previous: Held, skill: string, now: number): Held => {
  const hint = skillHint(skill)
  const snapshot = snapshotFromMemo(previous.memo)
  if (hint === undefined || snapshot === undefined) return previous
  const active = previous.state.active?.dir
  const memo: SessionMemo =
    'analyze' in hint
      ? active === undefined
        ? previous.memo
        : {
            ...previous.memo,
            analyzed: unique([...previous.memo.analyzed, active]),
            analyzedTasks: { ...previous.memo.analyzedTasks, [active]: tasksFingerprint(previous.memo.files[active]?.tasks) },
          }
      : { ...previous.memo, runningSkill: { name: skill, step: hint.step } }
  return deriveSpeckitState(snapshot, memo, now)
}

const TRACKED = new Set(['spec.md', 'plan.md', 'tasks.md'])

const windowOf = (memo: SessionMemo): DriftWindow => memo.window ?? emptyWindow()

/** An Edit's strings may hold only part of a task line; take the full task from the file. */
const fullTasks = (ticked: readonly Task[], text: string | undefined): Task[] => {
  const keys = new Set(ticked.map(taskKey))
  const inFile = parseTasks(text ?? '').filter(t => t.isDone && keys.has(taskKey(t)))
  return inFile.length > 0 ? inFile : [...ticked]
}

/** A Bash or Agent call: their file changes are invisible, so drift stays quiet this window. */
export const applyShell = (previous: Held): Held => {
  const window = windowOf(previous.memo)
  const next = withShell(window)
  // Unchanged window: hand back the same object so nothing is written (spec 009, FR-003).
  return next === window ? previous : { ...previous, memo: { ...previous.memo, window: next } }
}

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
  /** For an Edit: the text it replaced and the text it wrote, which say what it ticked. */
  change?: { before: string; after: string },
  lang: Lang = 'en',
): Promise<{ held: Held; drift?: string }> => {
  const root = previous.state.root
  if (root === undefined) return { held: previous }
  const relative = relativeTo(root, path)
  if (relative === undefined) return { held: previous }
  const foldCase = isWindowsPath(root)
  const location = specsLocation(root, path)
  if (location === undefined) {
    if (/^(\.specify|specs)(\/|$)/i.test(relative)) return { held: previous }
    const edit = foldCase ? relative.toLowerCase() : relative
    const window = windowOf(previous.memo)
    const next = withEdit(window, edit)
    return { held: next === window ? previous : { ...previous, memo: { ...previous.memo, window: next } } }
  }
  const dir = location.dir
  const isTouched = previous.memo.touched.includes(dir)
  const memo: SessionMemo = isTouched ? previous.memo : { ...previous.memo, touched: [...previous.memo.touched, dir] }
  const snapshot = snapshotFromMemo(memo)
  if (!isWrite || !TRACKED.has(location.file) || snapshot === undefined) return { held: isTouched ? previous : { ...previous, memo } }
  const fresh = await readFeature(fs, root, dir, previous.memo.files[dir])
  const others = snapshot.features.filter(f => f.dir !== dir)
  const features = [...others, fresh].sort((a, b) => a.dir.localeCompare(b.dir))
  const ticked =
    location.file !== 'tasks.md'
      ? []
      : change !== undefined
        ? fullTasks(newlyTicked(change.before, change.after), fresh.tasks)
        : newlyTicked(previous.memo.files[dir]?.tasks, fresh.tasks)
  const first = ticked[0]
  const drift = first === undefined ? undefined : detectDrift(first, windowOf(memo), foldCase, lang)
  const next = drift === undefined ? memo : { ...memo, window: { ...windowOf(memo), alarmed: true } }
  const held = deriveSpeckitState({ ...snapshot, features }, next, now)
  return drift === undefined ? { held } : { held, drift }
}
