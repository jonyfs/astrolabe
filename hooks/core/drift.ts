// The drift alarm (FR-003 to FR-005): a task ticked with no code edited since the
// previous tick. Pure: no $.
import { parseTasks } from './tasks-parser'
import type { DriftWindow, Task } from './types'

export const taskKey = (t: Task): string => t.id ?? t.text

/** Tasks that were open in `before` and are ticked in `after`. */
export const newlyTicked = (before: string | undefined, after: string | undefined): Task[] => {
  if (before === undefined || after === undefined) return []
  const open = new Set(parseTasks(before).filter(t => !t.isDone).map(taskKey))
  return parseTasks(after).filter(t => t.isDone && open.has(taskKey(t)))
}

// A token without a slash is a file only with one of these extensions; this keeps
// identifiers such as `ui.render`, `Node.js` or `JSON.parse` out.
const EXTENSIONS = new Set([
  'md', 'mdx', 'txt', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts', 'json', 'jsonc', 'yml', 'yaml',
  'toml', 'sh', 'ps1', 'bat', 'css', 'scss', 'html', 'svg', 'png', 'py', 'rb', 'go', 'rs', 'java', 'kt',
  'swift', 'c', 'h', 'cpp', 'hpp', 'cs', 'sql', 'lock', 'ipynb', 'xml', 'env', 'cfg', 'ini',
])
const MAX_EDITS = 200

const extensionOf = (token: string): string | undefined => /\.([A-Za-z0-9]{1,6})$/.exec(token)?.[1]?.toLowerCase()

const looksLikePath = (token: string): boolean => {
  if (token === '' || token.includes('@') || token.includes('*') || /^\d+(\.\d+)+$/.test(token)) return false
  if (!/^[\w.-]+(?:\/[\w.-]+)*$/.test(token)) return false
  const [first = ''] = token.split('/')
  if (token.includes('/')) {
    // github.com/owner/repo and the like are hosts, not files
    if (/^[\w-]+(?:\.[\w-]+)+$/.test(first) && EXTENSIONS.has(extensionOf(first) ?? '') === false && !first.startsWith('.')) return false
    return true
  }
  // dot-names (.git) and framework names (Node.js, Vue.js) are not files
  if (token.startsWith('.') || /^[A-Z][a-z]+\.js$/.test(token)) return false
  const ext = extensionOf(token)
  return ext !== undefined && EXTENSIONS.has(ext)
}

/** File paths a task text names: backticked tokens and bare tokens that look like files. */
export const namedPaths = (text: string): string[] => {
  const found: string[] = []
  const add = (raw: string) => {
    const token = raw.replace(/^\.\//, '').replace(/[.,;:)]+$/, '').replace(/^[(]+/, '')
    if (looksLikePath(token) && !found.includes(token)) found.push(token)
  }
  for (const m of text.matchAll(/`([^`\s]+)`/g)) add(m[1] ?? '')
  for (const word of text.replace(/`[^`]*`/g, ' ').split(/\s+/)) add(word)
  return found
}

export const withEdit = (window: DriftWindow, path: string): DriftWindow =>
  window.edits.includes(path) || window.edits.length >= MAX_EDITS ? window : { ...window, edits: [...window.edits, path] }

export const withShell = (window: DriftWindow): DriftWindow => (window.sawShell ? window : { ...window, sawShell: true })

const nameOf = (t: Task): string => {
  if (t.id !== undefined) return t.id
  const chars = [...t.text]
  return `"${chars.length > 40 ? `${chars.slice(0, 40).join('')}…` : t.text}"`
}

const matches = (edit: string, named: string, foldCase: boolean): boolean => {
  const [e, n] = foldCase ? [edit.toLowerCase(), named.toLowerCase()] : [edit, named]
  return e === n || e.endsWith(`/${n}`) || n.endsWith(`/${e}`)
}

/**
 * The drift toast text for a newly ticked task, or undefined when the window shows work or
 * already raised one this turn. `foldCase` compares paths case-insensitively (Windows roots).
 */
export const detectDrift = (task: Task, window: DriftWindow, foldCase = false): string | undefined => {
  if (window.sawShell || window.alarmed) return undefined
  const named = namedPaths(task.text)
  if (named.length > 0) {
    const isEdited = named.some(p => window.edits.some(e => matches(e, p, foldCase)))
    return isEdited ? undefined : `🧭 ${nameOf(task)} was ticked, but none of its files were edited: ${named.join(', ')}`
  }
  return window.edits.length === 0 ? `🧭 ${nameOf(task)} was ticked with no code edited since the last tick` : undefined
}
