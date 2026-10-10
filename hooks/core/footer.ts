// The footer: the status entry under the prompt, in place of a statusline (spec 018).
// Ranked parts, joined with ' · ', dropped from the least important end to fit. Pure: no $.
import { clockOf, decide, isPaused, labelOf, usageSegment, type Decision } from './governor'
import { branchWebUrl } from './git-status'
import type { Icons } from './icons'
import { t, type Lang } from './i18n'
import type { GitState, PullRequest, UsageReading } from './types'

export type FooterInput = {
  /** The Spec Kit part, shortened to fit `columns` when given. */
  speckit: (columns?: number) => string
  readings: readonly UsageReading[]
  /** The governor's decision when the caller has it (override, hold, lift); else from the readings. */
  decision?: Decision
  context?: { percent: number }
  model?: string
  effort?: string
  git?: GitState
  startedAt?: number
  /** Usage points an hour over the session (041 #4). */
  burn?: number
  /** Lines the session's tools added and removed (041 #7). */
  lines?: { added: number; removed: number }
  /** The skill running now and the model it runs on, when skillModels picks one (054 #45). */
  skill?: { name: string; model?: string }
  now: number
  icons: Icons
  columns: number
  lang?: Lang
  /** Only the parts never dropped: the Spec Kit part and the deciding window (035). */
  lead?: boolean
  /** The first three sessions end with a `/astrolabe help` chip (052 #46). */
  helpHint?: boolean
}


const SEP = ' · '

/** Columns a text takes: emoji and other wide pictographs count two. */
export const textWidth = (text: string): number =>
  [...text].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) >= 0x1f000 || ch === '⏳' || ch === '⏱' || ch === '⚠' ? 2 : 1), 0)

/** `claude-opus-5-5` reads `opus 5.5`; anything else is kept. */
export const shortModel = (model: string): string => {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(model.replace(/\[.*\]$/, ''))
  // The 1M context window shows (054 #42).
  const wide = /\[1m\]$/i.test(model) ? ' 1M' : ''
  return m === null ? model : `${m[1]} ${m[2]}.${m[3]}${wide}`
}

const withIcon = (icon: string, text: string) => (icon === '' ? text : `${icon} ${text}`)
const duration = (ms: number): string => {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

/** A palette colour name (statusline's), or a ramp read from a level. */
export type ChipColour = 'mauve' | 'sapphire' | 'yellow' | 'red' | 'lavender' | 'teal' | 'peach' | 'surface1' | 'green'
type Part = { text: string; rank: number; colour?: ChipColour; level?: number; first?: true; links?: ReadonlyArray<{ text: string; href: string }> }

// An ASCII label ending in ':' is glued to its value (`stash:2`); a glyph takes a space.
const glued = (icon: string, text: string) => (icon.endsWith(':') ? `${icon}${text}` : withIcon(icon, text))
const prText = (icons: Icons, pr: PullRequest): string => {
  const mark = pr.checks === 'pass' ? icons.ciPass : pr.checks === 'fail' ? icons.ciFail : pr.checks === 'pending' ? icons.ciPending : ''
  const number = icons.pr === 'PR' ? `PR#${pr.number}` : withIcon(icons.pr, `#${pr.number}`)
  return mark === '' ? number : `${number} ${mark}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** When a window resets (041 #2): a countdown within a day (`2h13m`), else weekday and clock (`Mon 07:00`). */
export const resetOf = (iso: string | undefined, now: number): string | undefined => {
  const at = clockOf(iso)
  if (at === undefined || iso === undefined) return undefined
  const left = Date.parse(iso) - now
  if (left <= 0) return undefined
  return left < 86_400_000 ? duration(left) : `${WEEKDAYS[new Date(Date.parse(iso)).getDay()]} ${at}`
}

const windowText = (r: UsageReading, now: number, lang: Lang): string => {
  const renewed = r.resetsAt !== undefined && Date.parse(r.resetsAt) <= now
  if (renewed) return `${labelOf(r.kind)} ${t(lang, 'status.renewed')}`
  const at = resetOf(r.resetsAt, now)
  // At or past 100% a window reads `full` (041 #3).
  const level = r.percentUsed >= 100 ? t(lang, 'status.full') : `${Math.round(r.percentUsed)}%`
  return `${labelOf(r.kind)} ${level}${at === undefined ? '' : ` (${at})`}`
}

const parts = (input: FooterInput): Part[] => {
  const { icons, now } = input
  const out: Part[] = []
  const decision = input.decision ?? decide(input.readings, [], undefined, now)
  const binding = decision.highest
  if (binding !== undefined) {
    const segment = usageSegment(decision, input.lang ?? 'en') ?? ''
    const at = binding.renewed === true ? undefined : resetOf(binding.resetsAt, now)
    if (isPaused(decision)) {
      // Paused (047 #65): the first chip, in red, says until when.
      const until = clockOf(binding.resetsAt)
      out.push({ text: `${segment} · ${t(input.lang ?? 'en', 'status.pausedUntil', { at: until ?? t(input.lang ?? 'en', 'ask.theReset') })}`, rank: 0, colour: 'red', first: true })
    } else out.push({ text: at === undefined ? segment : `${segment} (${at})`, rank: 0, colour: 'sapphire', ...(binding.renewed === true ? {} : { level: binding.percent }) })
  }
  for (const r of input.readings) {
    if (r.kind === binding?.kind) continue
    out.push({ text: windowText(r, now, input.lang ?? 'en'), rank: 2, colour: 'sapphire', level: r.percentUsed })
  }
  if (input.context !== undefined) {
    // Past 85% the context chip says to compact (054 #43).
    const p = Math.round(input.context.percent)
    const text = p >= 85 ? `${p}% ${t(input.lang ?? 'en', 'status.compactSoon')}` : `${p}%`
    out.push({ text: withIcon(icons.context, text), rank: 1, colour: 'yellow', level: input.context.percent })
  }
  if (input.model !== undefined) {
    const effort = input.effort === undefined ? '' : ` ${input.effort}`
    out.push({ text: withIcon(icons.model, `${shortModel(input.model)}${effort}`), rank: 3, colour: 'red' })
  }
  if (input.skill !== undefined) {
    const name = input.skill.name.replace(/^[a-z0-9-]+:/, '').replace(/^speckit[-.]/, '')
    out.push({ text: `⟳ ${name}${input.skill.model === undefined ? '' : ` · ${shortModel(input.skill.model)}`}`, rank: 3.5, colour: 'peach' })
  }
  const git = input.git
  if (git?.branch !== undefined) {
    const counts = [
      git.ahead > 0 ? `${icons.ahead}${git.ahead}` : '',
      git.behind > 0 ? `${icons.behind}${git.behind}` : '',
      git.changed > 0 ? (icons.changed.length === 1 && icons.changed.codePointAt(0)! < 0x7f ? `${icons.changed}${git.changed}` : `${icons.changed} ${git.changed}`) : '',
      git.conflicts > 0 ? `${icons.conflict}${git.conflicts}` : '',
      git.stashes !== undefined && git.stashes > 0 ? glued(icons.stash, String(git.stashes)) : '',
      git.worktree === undefined ? '' : glued(icons.worktree, git.worktree),
      git.pr === undefined ? '' : prText(icons, git.pr),
    ].filter(s => s !== '')
    const branch = icons.branch.endsWith(':') ? `${icons.branch}${git.branch}` : withIcon(icons.branch, git.branch)
    out.push({
      text: [branch, ...counts].join(' '),
      rank: 4,
      colour: 'lavender',
      links: [
        ...(git.remote === undefined ? [] : [{ text: git.branch, href: branchWebUrl(git.remote, git.branch) }]),
        ...(git.pr?.url === undefined ? [] : [{ text: `#${git.pr.number}`, href: git.pr.url }]),
      ],
    })
  }
  // Burn rate (041 #4): points an hour, and where the deciding window lands at its reset.
  if (input.burn !== undefined && input.burn > 0) {
    const reset = binding?.resetsAt === undefined ? Number.NaN : Date.parse(binding.resetsAt)
    const landing = binding === undefined || binding.renewed === true || Number.isNaN(reset) || reset <= now ? undefined : Math.min(100, Math.round(binding.percent + (input.burn * (reset - now)) / 3_600_000))
    out.push({ text: `${icons.burn === '' ? '' : `${icons.burn} `}${Math.round(input.burn)}/h${landing === undefined ? '' : ` → ${landing}%`}`, rank: 5.5, colour: 'peach', ...(landing === undefined ? {} : { level: landing }) })
  }
  // Lines changed this session (041 #7): what the tools wrote, added and removed.
  if (input.lines !== undefined && input.lines.added + input.lines.removed > 0)
    out.push({ text: `±${input.lines.added + input.lines.removed}`, rank: 4.5, colour: 'teal' })
  if (input.startedAt !== undefined && now - input.startedAt >= 60_000) out.push({ text: withIcon(icons.clock, duration(now - input.startedAt)), rank: 6, colour: 'surface1' })
  // A newcomer's last chip says where the commands are; it is the first to go on a narrow footer (052 #46).
  if (input.helpHint === true) out.push({ text: '/astrolabe help', rank: 7, colour: 'surface1' })
  return out
}

/** The footer text: Spec Kit first, then the parts in order, fitted to `columns`. */
/** The parts that fit `columns`, Spec Kit first, the least important dropped first. */
const fitted = (input: FooterInput): { speckit: string; kept: Part[] } => {
  let kept = input.lead === true ? parts(input).filter(p => p.rank === 0) : parts(input)
  const join = (speckit: string) => [speckit, ...kept.map(p => p.text)].filter(s => s !== '').join(SEP)
  let speckit = input.speckit()
  while (textWidth(join(speckit)) > input.columns) {
    const droppable = kept.filter(p => p.rank > 0)
    if (droppable.length === 0) break
    const worst = droppable.reduce((a, b) => (b.rank > a.rank ? b : a))
    kept = kept.filter(p => p !== worst)
  }
  if (textWidth(join(speckit)) > input.columns) {
    const rest = kept.map(p => p.text).join(SEP)
    const room = input.columns - (rest === '' ? 0 : textWidth(rest) + SEP.length)
    speckit = input.speckit(Math.max(1, room))
  }
  return { speckit, kept }
}

/** The footer text: Spec Kit first, then the parts in order, fitted to `columns`. */
export const footerText = (input: FooterInput): string => {
  const { speckit, kept } = fitted(input)
  return [speckit, ...kept.map(p => p.text)].filter(s => s !== '').join(SEP)
}

/** statusline's level ramp (039): green below 60%, yellow to 85%, red above, a mark past the first band. */
export const rampOf = (level: number): { colour: ChipColour; mark: string } =>
  level < 60 ? { colour: 'green', mark: '' } : level < 85 ? { colour: 'yellow', mark: '▵' } : { colour: 'red', mark: '▴' }

export type Chip = { key: string; text: string; colour: ChipColour; rank?: number; links?: ReadonlyArray<{ text: string; href: string }>; /** The whole text of a chip cut to fit, shown on hover (052 #45). */ full?: string }

/** The footer as Powerline chips in statusline's colours (039); the context ramps without a mark. */
export const footerChips = (input: FooterInput): Chip[] => {
  const { speckit, kept } = fitted(input)
  const pinned = kept.filter(p => p.first === true).map((p, i) => ({ key: `first-${i}`, text: p.text, colour: p.colour ?? 'red', rank: p.rank }))
  return [
    ...pinned,
    ...(speckit === '' ? [] : [{ key: 'speckit', text: speckit, colour: 'mauve' as const, ...((whole => (whole !== speckit ? { full: whole } : {}))(input.speckit())) }]),
    ...kept.filter(p => p.first !== true).map((p, i) => {
      const ramp = p.level === undefined ? undefined : rampOf(p.level)
      const isContext = p.colour === 'yellow'
      return {
        key: `part-${i}`,
        text: ramp === undefined || isContext ? p.text : `${p.text}${ramp.mark}`,
        colour: ramp?.colour ?? p.colour ?? 'surface1',
        rank: p.rank,
        ...(p.links === undefined || p.links.length === 0 ? {} : { links: p.links }),
      }
    }),
  ]
}

/** statusline's three-line order (041 #1): place and git, the Spec Kit work and the skill, the model and the limits. */
export const footerChipLines = (input: FooterInput): Chip[][] => {
  const flat = footerChips(input)
  const ofLine = (line: number) => (chip: Chip) =>
    line === 0 ? chip.rank === 4 : line === 1 ? chip.key === 'speckit' || chip.rank === 3.5 || chip.rank === 4.5 : chip.rank !== 4 && chip.key !== 'speckit' && chip.rank !== 3.5 && chip.rank !== 4.5
  return [0, 1, 2].map(line => flat.filter(ofLine(line))).filter(line => line.length > 0)
}

/** A text's lines: a trailing newline ends no line (041 #7). */
const linesOf = (text: string): string[] => (text === '' ? [] : text.replace(/(?:\r?\n)+$/, '').split(/\r?\n/))

/** Lines an edit added and removed (041 #7): a multiset diff of the lines, so a line kept once counts on neither side. */
export const linesChanged = (before: string | undefined, after: string): { added: number; removed: number } => {
  const counts = new Map<string, number>()
  for (const line of before === undefined ? [] : linesOf(before)) counts.set(line, (counts.get(line) ?? 0) + 1)
  let added = 0
  for (const line of linesOf(after)) {
    const left = counts.get(line) ?? 0
    if (left > 0) counts.set(line, left - 1)
    else added += 1
  }
  let removed = 0
  for (const left of counts.values()) removed += left
  return { added, removed }
}
