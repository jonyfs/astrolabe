// The active spec's summary for the pane (024 #7) and the turn's tasks.md diff (024 #8).
import { t, type Lang } from './i18n'
// Pure: no $. Never throws.

const MAX_PARAGRAPH = 400
const TITLE_PREFIX = /^(quick spec|feature specification|spec)\s*:\s*/i
const STORY = /^###\s+User Story\s+\d+\s*[-–—:]\s*(.+?)\s*(?:\(Priority:\s*(P\d)\))?\s*$/i

const isProse = (line: string) => line !== '' && !/^(#|\*\*|[-*+]\s|\d+\.\s|\||>|<!--|```|---)/.test(line)

/** Bold title, first paragraph and the user stories with their priority; undefined for an empty spec. */
export const specSummary = (text: string): string | undefined => {
  const lines = text.split(/\r?\n/).map(l => l.trim())
  let start = 0
  if (lines[0] === '---') {
    const end = lines.findIndex((l, i) => i > 0 && l === '---')
    start = end < 0 ? 0 : end + 1
  }
  const body = lines.slice(start)
  const heading = body.find(l => /^#\s/.test(l))
  const title = heading?.replace(/^#\s+/, '').replace(TITLE_PREFIX, '').trim()
  const first = body.findIndex(isProse)
  let paragraph: string | undefined
  if (first >= 0) {
    const end = body.findIndex((l, i) => i > first && !isProse(l))
    const words = body.slice(first, end < 0 ? undefined : end).join(' ').replace(/\s+/g, ' ').trim()
    paragraph = words.length > MAX_PARAGRAPH ? `${words.slice(0, MAX_PARAGRAPH).trimEnd()}…` : words
  }
  const stories = body.flatMap(l => {
    const m = STORY.exec(l)
    return m === null ? [] : [`- ${m[1]}${m[2] === undefined ? '' : ` (${m[2]})`}`]
  })
  const parts = [
    ...(title === undefined || title === '' ? [] : [`**${title}**`]),
    ...(paragraph === undefined || paragraph === '' ? [] : [paragraph]),
    ...(stories.length === 0 ? [] : [stories.slice(0, 6).join('\n')]),
  ]
  return parts.length === 0 ? undefined : parts.join('\n\n')
}

export type TaskLine = { id?: string; text: string; isDone: boolean; line?: number }

const taskText = (t: TaskLine, isDone: boolean) => `- [${isDone ? 'x' : ' '}] ${t.id === undefined ? '' : `${t.id} `}${t.text}`

/** Unified-diff hunks of the tasks whose box changed between two reads; undefined when none did. */
export const tasksDiff = (before: readonly TaskLine[], after: readonly TaskLine[]): string | undefined => {
  const was = new Map(before.map(t => [t.id ?? t.text, t]))
  const hunks = after.flatMap(t => {
    const old = was.get(t.id ?? t.text)
    if (old === undefined || old.isDone === t.isDone || t.line === undefined) return []
    return [`@@ -${t.line},1 +${t.line},1 @@\n-${taskText(old, old.isDone)}\n+${taskText(t, t.isDone)}\n`]
  })
  return hunks.length === 0 ? undefined : hunks.join('')
}

/** The last turn's tasks diff, at most 6 lines and a `+N lines` line (052 #19). */
const DIFF_LINES = 6
export const capDiff = (text: string, lang: Lang): string => {
  const lines = text.split('\n')
  return lines.length <= DIFF_LINES ? text : [...lines.slice(0, DIFF_LINES), t(lang, 'pane.diffMore', { n: lines.length - DIFF_LINES })].join('\n')
}

