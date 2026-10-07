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
