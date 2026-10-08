// Acting on a spec from the pane (spec 051): priorities, the deep review's prompt, the gstack
// skills offered. Pure: no $.
import type { Feature } from './types'

export type Priority = 'high' | 'normal' | 'low'
export type Priorities = Readonly<Record<string, Priority>>

const RANK: Readonly<Record<Priority, number>> = { high: 0, normal: 1, low: 2 }
const CYCLE: Readonly<Record<Priority, Priority>> = { normal: 'high', high: 'low', low: 'normal' }

/** `priority 002 high` → the feature id and the level; undefined when it does not parse. */
export const parsePriority = (args: string): { id: string; level: Priority } | undefined => {
  const m = /^priority\s+(\d{1,4})\s+(high|normal|low)$/i.exec(args.trim())
  return m === null ? undefined : { id: m[1]!.padStart(3, '0'), level: m[2]!.toLowerCase() as Priority }
}

/** The next level when `p` is pressed: normal, high, low, normal. */
export const nextPriority = (level: Priority | undefined): Priority => CYCLE[level ?? 'normal']

/** A map with one feature's level set; `normal` is the absence of an entry. */
export const withPriority = (map: Priorities, id: string, level: Priority): Record<string, Priority> => {
  const { [id]: _old, ...rest } = map
  return level === 'normal' ? rest : { ...rest, [id]: level }
}

/** Features by priority, keeping their order within a level (a stable sort). */
export const byPriority = <F extends Pick<Feature, 'id'>>(features: readonly F[], map: Priorities): F[] =>
  features
    .map((f, i) => ({ f, i }))
    .sort((a, b) => RANK[map[a.f.id] ?? 'normal'] - RANK[map[b.f.id] ?? 'normal'] || a.i - b.i)
    .map(x => x.f)

/** The mark a priority draws before the id: `↑` high, `↓` low, nothing for normal. */
export const priorityMark = (level: Priority | undefined): string => (level === 'high' ? '↑' : level === 'low' ? '↓' : ' ')

/** The model and effort the deep review asks for (051 T003): a more expensive model than the session's helpers. */
export const REVIEW_MODEL = { model: 'opus', effort: 'xhigh' as const, maxTokens: 4000 }

/** The deep review's prompt: the spec's files and the constitution's principle names. */
export const reviewPrompt = (feature: { id: string; name: string }, files: { spec: string; plan: string; tasks: string }, principles: readonly string[]): string =>
  [
    `Review the Spec Kit feature ${feature.id} ${feature.name}. List at most 10 findings, most serious first, one line each:`,
    'what is missing, ambiguous, inconsistent between spec, plan and tasks, untestable, or risky. Name the file and section.',
    'Plain text, no headings, no preamble. If there is nothing to fix, say so in one line.',
    principles.length === 0 ? '' : `The project's principles: ${principles.join('; ')}.`,
    `--- spec.md\n${files.spec.slice(0, 24_000)}`,
    files.plan === '' ? '' : `--- plan.md\n${files.plan.slice(0, 16_000)}`,
    files.tasks === '' ? '' : `--- tasks.md\n${files.tasks.slice(0, 12_000)}`,
  ]
    .filter(line => line !== '')
    .join('\n')

/** The gstack skills offered on the active feature (051 T004), in the order drawn. */
export const GSTACK_SKILLS = ['investigate', 'review', 'health', 'qa-only', 'retro'] as const

/** Each option's default from plugin.json's userConfig, keyed `astrolabe.<field>` (054 #63). */
export const optionDefaults = (pluginJson: string): Record<string, string | number | boolean> => {
  try {
    const parsed = JSON.parse(pluginJson) as { userConfig?: Record<string, { default?: unknown }> }
    const out: Record<string, string | number | boolean> = {}
    for (const [field, spec] of Object.entries(parsed.userConfig ?? {})) {
      const value = spec.default
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') out[`astrolabe.${field}`] = value
    }
    return out
  } catch {
    return {}
  }
}

/** The mark before a Config row (052 #39): ● a change not saved yet, • a saved value off its default. */
export const configMark = (changed: boolean, value: unknown, defaults: Readonly<Record<string, unknown>>, key: string): string =>
  changed ? '● ' : key in defaults && defaults[key] !== value ? '• ' : '  '
