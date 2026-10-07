// Reads `track` and `status` from a spec.md's front matter. Pure: no $.
// Only a block that opens on the very first line with `---` and closes with a
// later `---` line counts; anything unrecognized is ignored, never rejected.
import type { FrontMatter, SpecStatus, Track } from './types'

const TRACKS: readonly Track[] = ['quick', 'full']
const STATUSES: readonly SpecStatus[] = ['active', 'done', 'abandoned']

const valueOf = (raw: string): string =>
  raw
    .replace(/\s+#.*$/, '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim()

export const parseFrontMatter = (text: string): FrontMatter => {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trimEnd() !== '---') return {}
  const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === '---')
  if (end < 0) return {}
  const result: FrontMatter = {}
  for (const line of lines.slice(1, end)) {
    const match = /^\s*([A-Za-z_]+)\s*:(.*)$/.exec(line)
    if (!match) continue
    const value = valueOf(match[2] ?? '')
    if (match[1] === 'track' && (TRACKS as readonly string[]).includes(value)) result.track = value as Track
    if (match[1] === 'status' && (STATUSES as readonly string[]).includes(value)) result.status = value as SpecStatus
  }
  return result
}
