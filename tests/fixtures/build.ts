// Builds in-memory project trees for fixtures. Each scenario lives in
// tests/fixtures/<scenario>/index.ts and exports a Scenario.
import type { Tree } from '../helpers/fake-fs'
import type { ActiveSource, ActiveWarning, ConstitutionState, Phase } from '../../hooks/core/types'

export const RATIFIED = '# Demo Constitution\n\n## Core Principles\n\nTests first.\n'
export const TEMPLATE = '# [PROJECT_NAME] Constitution\n\n### [PRINCIPLE_1_NAME]\n'

export type FeatureSpec = { spec?: string; plan?: boolean; tasks?: string }

export type ProjectSpec = {
  root?: string
  constitution?: string
  /** Raw text of .specify/feature.json; omit for no file. */
  featureJson?: string
  features?: Record<string, FeatureSpec>
  /** Extra files, keyed relative to the root. */
  extra?: Record<string, string>
}

export const project = (p: ProjectSpec): Tree => {
  const root = p.root ?? '/proj'
  const tree: Tree = { [`${root}/.specify/`]: '' }
  if (p.constitution !== undefined) tree[`${root}/.specify/memory/constitution.md`] = p.constitution
  if (p.featureJson !== undefined) tree[`${root}/.specify/feature.json`] = p.featureJson
  for (const [dir, f] of Object.entries(p.features ?? {})) {
    tree[`${root}/specs/${dir}/`] = ''
    if (f.spec !== undefined) tree[`${root}/specs/${dir}/spec.md`] = f.spec
    if (f.plan) tree[`${root}/specs/${dir}/plan.md`] = '# Plan\n'
    if (f.tasks !== undefined) tree[`${root}/specs/${dir}/tasks.md`] = f.tasks
  }
  for (const [path, text] of Object.entries(p.extra ?? {})) tree[`${root}/${path}`] = text
  return tree
}

/** `done` ticked tasks (alternating [X] and [x]) followed by `open` unticked ones. */
export const tasks = (done: number, open: number): string => {
  const line = (n: number, mark: string) => `- [${mark}] T${String(n).padStart(3, '0')} task ${n}`
  const rows = [
    ...[...Array(done).keys()].map(i => line(i + 1, i % 2 === 0 ? 'X' : 'x')),
    ...[...Array(open).keys()].map(i => line(done + i + 1, ' ')),
  ]
  return `# Tasks\n\n${rows.join('\n')}\n`
}

export const spec = (front?: string, body = '# Spec\n'): string => (front === undefined ? body : `---\n${front}\n---\n${body}`)

export const featureJson = (dir: string): string => JSON.stringify({ feature_directory: dir }, null, 2)

export type Expected = {
  present: boolean
  constitution: ConstitutionState
  active?: { id: string; source: ActiveSource }
  warning?: ActiveWarning
  phases: Record<string, Phase>
  counts?: Record<string, [done: number, total: number]>
  status: string
  next?: string
}

export type Scenario = { cwd: string; tree: Tree; expected: Expected }
