// The model and effort each Spec Kit and gstack skill does best with (030). Pure: no $.
// Thinking-heavy steps (specify, clarify, plan, analyze, review) on Opus; the long mechanical
// ones (tasks, implement, ship) on Sonnet; quick reports on Haiku.

export type SkillModel = { model: string; effort: 'low' | 'medium' | 'high'; why: string }

const OPUS = 'claude-opus-5-5'
const SONNET = 'claude-sonnet-5-5'
const HAIKU = 'claude-haiku-5-5'

export const SKILL_MODELS: Readonly<Record<string, SkillModel>> = {
  'speckit-constitution': { model: OPUS, effort: 'high', why: 'rules every later step checks' },
  'speckit-specify': { model: OPUS, effort: 'high', why: 'turns an idea into stories' },
  'speckit-clarify': { model: OPUS, effort: 'medium', why: 'finds the real ambiguities' },
  'speckit-plan': { model: OPUS, effort: 'high', why: 'design decisions' },
  'speckit-analyze': { model: OPUS, effort: 'medium', why: 'cross-checks three files' },
  'speckit-checklist': { model: SONNET, effort: 'low', why: 'derived from the spec' },
  'speckit-tasks': { model: SONNET, effort: 'medium', why: 'mechanical breakdown' },
  'speckit-implement': { model: SONNET, effort: 'high', why: 'long, test-first edits' },
  'speckit-converge': { model: SONNET, effort: 'medium', why: 'compares code and tasks' },
  investigate: { model: OPUS, effort: 'high', why: 'root causes' },
  review: { model: OPUS, effort: 'high', why: 'finds subtle bugs' },
  'office-hours': { model: OPUS, effort: 'high', why: 'product judgment' },
  ship: { model: SONNET, effort: 'medium', why: 'a known sequence' },
  qa: { model: SONNET, effort: 'medium', why: 'drives a browser' },
  'document-release': { model: SONNET, effort: 'low', why: 'docs from a diff' },
  retro: { model: HAIKU, effort: 'low', why: 'summarizes history' },
  health: { model: HAIKU, effort: 'low', why: 'runs checks, reports' },
}

/**
 * The model a task of this kind does best on (054 #94), from its words: tests and mechanical
 * edits on Sonnet, design and architecture on Opus; undefined when the text says neither.
 */
export const modelForTask = (text: string | undefined): SkillModel | undefined => {
  if (text === undefined) return undefined
  const t = text.toLowerCase()
  if (/\b(design|architecture|architect|schema|api contract|threat|refactor the|data model|trade-?off)\b/.test(t)) return { model: OPUS, effort: 'high', why: 'a design task' }
  if (/\b(test|tests|spec|fixture|assert|coverage|mock|rename|format|lint|docs?|readme|changelog)\b/.test(t)) return { model: SONNET, effort: 'medium', why: 'a test or mechanical task' }
  return undefined
}

/** The entry for a skill name, with or without a plugin prefix (`gstack:review`, `speckit.plan`). */
export const skillModelFor = (skill: string | undefined): SkillModel | undefined => {
  if (skill === undefined) return undefined
  const name = skill.replace(/^[a-z0-9-]+:/, '').replace(/^speckit\./, 'speckit-')
  return SKILL_MODELS[name]
}
