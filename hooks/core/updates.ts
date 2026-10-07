// Update notices (spec 007): parse what the tools report and decide what is newer. Pure: no $.
import type { UpdateItem } from './types'

export type StoredUpdates = { checkedOn: string; items: UpdateItem[] }

const VERSION = /\d+(?:\.\d+)+/g

export const parseGstackCheck = (stdout: string): UpdateItem | undefined => {
  const m = /UPGRADE_AVAILABLE\s+(\S+)\s+(\S+)/.exec(stdout)
  return m === null ? undefined : { id: 'gstack', installed: m[1] ?? '', latest: m[2] ?? '' }
}

/** `specify self check`: "Up to date: X" means none; otherwise the first two versions named. */
export const parseSelfCheck = (stdout: string): UpdateItem | undefined => {
  if (/up to date/i.test(stdout)) return undefined
  const [installed, latest] = stdout.match(VERSION) ?? []
  if (installed === undefined || latest === undefined || compareVersions(latest, installed) <= 0) return undefined
  return { id: 'specify', installed, latest }
}

export const parseCliVersion = (stdout: string): string | undefined => /CLI Version\s+(\d+(?:\.\d+)+)/.exec(stdout)?.[1]

export const compareVersions = (a: string, b: string): number => {
  const parts = (v: string) => v.replace(/^v/, '').split('.').map(n => Number.parseInt(n, 10) || 0)
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

const versionField = (json: string | undefined, field: string): string | undefined => {
  if (json === undefined) return undefined
  try {
    const value = (JSON.parse(json) as Record<string, unknown>)[field]
    return typeof value === 'string' ? value.replace(/^v/, '') : undefined
  } catch {
    return undefined
  }
}

/** Astrolabe's installed version against the body of GitHub's releases/latest. */
export const astrolabeUpdate = (installed: string, latestReleaseJson: string): UpdateItem | undefined => {
  const latest = versionField(latestReleaseJson, 'tag_name')
  return latest !== undefined && compareVersions(latest, installed) > 0 ? { id: 'astrolabe', installed, latest } : undefined
}

/** This project's Spec Kit skills (manifest version) against the installed CLI. */
export const skillsUpdate = (manifestJson: string | undefined, cliVersion: string | undefined): UpdateItem | undefined => {
  const installed = versionField(manifestJson, 'version')
  if (installed === undefined || cliVersion === undefined || compareVersions(cliVersion, installed) <= 0) return undefined
  return { id: 'speckit-skills', installed, latest: cliVersion }
}

export const localDay = (ms: number): string => {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const isDue = (stored: StoredUpdates | undefined, today: string): boolean => stored?.checkedOn !== today

const NAMES: Readonly<Record<UpdateItem['id'], string>> = {
  gstack: 'gstack',
  specify: 'specify',
  'speckit-skills': 'Spec Kit skills',
  astrolabe: 'astrolabe',
}

export const updateLabel = (item: UpdateItem, isConfirming: boolean): string =>
  isConfirming && item.id === 'speckit-skills' ? 'confirm: rewrite .claude/skills/speckit-*' : `${NAMES[item.id]} ${item.latest}`

export const isStoredUpdates = (value: unknown): value is StoredUpdates =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StoredUpdates).checkedOn === 'string' &&
  Array.isArray((value as StoredUpdates).items)

/** The first non-empty line of a process's output, for a failure toast. */
export const firstLine = (text: string): string => text.split(/\r?\n/).map(l => l.trim()).find(l => l !== '') ?? 'no output'

const ROW_PREFIX = 'updates: '

/**
 * How many update Buttons fit a band `columns` wide. The terminal draws a Button as
 * `[ label ]`; buttons that do not fit are summed up as ` +N`. One always shows.
 */
export const fitUpdateButtons = (labels: readonly string[], columns: number): { shown: number; more: number } => {
  const widthOf = (label: string) => [...label].length + 4
  let used = [...ROW_PREFIX].length
  let shown = 0
  for (const [i, label] of labels.entries()) {
    const rest = labels.length - i - 1
    const tail = rest > 0 ? ` +${rest}`.length : 0
    if (shown > 0 && used + widthOf(label) + tail > columns) break
    used += widthOf(label)
    shown += 1
  }
  return { shown, more: labels.length - shown }
}
