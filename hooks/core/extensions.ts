// Spec Kit extensions (spec 020c #22) and parallel tasks (#19). Pure: no $.
import type { ExtensionHook, Task } from './types'

export type { ExtensionHook }

const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '')

/**
 * The enabled hooks of `.specify/extensions.yml`, read line by line for the shape Spec Kit
 * writes (`hooks:` > `<event>:` > list of maps). Anything else gives no hooks, never an error.
 */
export const parseExtensions = (yaml: string): ExtensionHook[] => {
  const out: ExtensionHook[] = []
  let inHooks = false
  let event: string | undefined
  let current: { command?: string; enabled?: boolean; optional?: boolean } | undefined
  const flush = () => {
    if (event !== undefined && current?.command !== undefined && current.enabled !== false) {
      out.push({ event, command: current.command, optional: current.optional !== false })
    }
    current = undefined
  }
  for (const raw of yaml.split(/\r?\n/)) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    const line = raw.trim()
    if (indent === 0) {
      flush()
      inHooks = line === 'hooks:'
      event = undefined
      continue
    }
    if (!inHooks) continue
    const eventMatch = /^([a-z_]+):\s*$/.exec(line)
    if (eventMatch !== null && !line.startsWith('-')) {
      flush()
      event = eventMatch[1]
      continue
    }
    const item = /^-\s*(.*)$/.exec(line)
    const body = item === null ? line : item[1]!
    if (item !== null) {
      flush()
      current = {}
    }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(body)
    if (kv === null || current === undefined) continue
    const [, key, value] = kv
    if (key === 'command') current.command = unquote(value!)
    else if (key === 'enabled') current.enabled = unquote(value!) !== 'false'
    else if (key === 'optional') current.optional = unquote(value!) !== 'false'
  }
  flush()
  return out
}

/** Why a line of extensions.yml cannot be read: a tab, an unclosed quote, or an unknown shape. */
export type ExtensionsReason = 'tab' | 'quote' | 'shape'

/**
 * The first line of `.specify/extensions.yml` that cannot be read (054 #16): a tab in the
 * indentation, an unclosed quote, or a line under `hooks:` that is not an event, an item or a
 * `key: value`. Block scalars (`key: |` or `key: >`) and their lines are skipped.
 */
export const extensionsProblem = (yaml: string): { line: number; reason: ExtensionsReason } | undefined => {
  let inHooks = false
  let blockIndent: number | undefined
  const lines = yaml.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]!
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue
    const lead = /^[ \t]*/.exec(raw)![0]
    if (blockIndent !== undefined && lead.length > blockIndent) continue
    blockIndent = undefined
    if (lead.includes('\t')) return { line: i + 1, reason: 'tab' }
    const line = raw.trim()
    const quotes = (line.replace(/\s#.*$/, '').match(/"/g) ?? []).length
    if (quotes % 2 === 1) return { line: i + 1, reason: 'quote' }
    if (lead.length === 0) {
      inHooks = line === 'hooks:'
      continue
    }
    if (!inHooks) continue
    const body = line.startsWith('-') ? line.replace(/^-\s*/, '') : line
    if (body === '') continue
    const kv = /^[A-Za-z_][\w-]*:(\s+(.*))?$/.exec(body)
    if (kv === null) return { line: i + 1, reason: 'shape' }
    if (/^[|>][+-]?$/.test((kv[2] ?? '').trim())) blockIndent = lead.length
  }
  return undefined
}

/** The hooks around a next command, as slash commands: `speckit.git.commit` reads `/speckit-git-commit`. */
export const hooksFor = (hooks: readonly ExtensionHook[], nextCommand: string | undefined): { before: string[]; after: string[] } => {
  const step = /^\/speckit-([a-z]+)$/.exec(nextCommand ?? '')?.[1]
  const name = (h: ExtensionHook) => `/${h.command.replace(/\./g, '-')}${h.optional ? ' (optional)' : ''}`
  if (step === undefined) return { before: [], after: [] }
  return {
    before: hooks.filter(h => h.event === `before_${step}`).map(name),
    after: hooks.filter(h => h.event === `after_${step}`).map(name),
  }
}

/** The run of `[P]` tasks at the head of the open tasks: they can go to subagents at once. */
export const parallelTasks = (tasks: ReadonlyArray<Pick<Task, 'id' | 'text' | 'isDone'>>): string[] => {
  const open = tasks.filter(t => !t.isDone)
  const run: string[] = []
  for (const t of open) {
    if (!/\[P\]/.test(t.text) || t.id === undefined) break
    run.push(t.id)
  }
  return run.length >= 2 ? run : []
}
