// The footer: the status entry under the prompt, in place of a statusline (spec 018).
// Ranked parts, one zone each and joined with ' │ ' (064 #9), dropped from the least important end to fit. Pure: no $.
import { clockOf, decide, isPaused, labelOf, usageSegment, type Decision } from './governor'
import { branchWebUrl } from './git-status'
import { duration, resetIn } from './duration'
import { usageRamp } from './usage-ramp'
import { joinZones, ZONE_SEPARATOR } from './zones'
import { EMOJI_WIDE } from './glyphs'
import { asciiFold, branchChip, burnChips, cacheChip, ciChip, dirChip, prChip, repoName, skillsChip, todoChip, treeChip, worktreeChip, type CacheFact } from './footer-chips'
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
  /** How many times the advisor ran in the session (the footer of this mod, not a statusline's). */
  advisor?: { runs: number }
  /** Astrolabe's own version, the last chip. */
  astrolabe?: { version: string }
  /** The first three sessions end with a `/astrolabe help` chip (052 #46). */
  helpHint?: boolean
  /** Per-window hold/stop thresholds (047 #66). */
  thresholds?: Record<string, { hold?: number; stop?: number }>
  /** The folder the session works in now and the one it started in (068 #41). */
  dir?: { path: string; start?: string }
  /** The remote's web page, for the repository chip (068 #41). */
  repo?: string
  /** Skills in play this session, the session's own (068 #45). */
  skills?: readonly string[]
  /** Todo list progress (068 #46). */
  todo?: { title: string; done: number; total: number }
  /** The prompt cache, from the last main-thread response (068 #42). */
  cache?: CacheFact
  /** Fast mode is on (068 #47). */
  fast?: boolean
  /** How many usage samples the burn rate rests on, and their span (068 #48). */
  burnSamples?: { count: number; spanMs: number }
}


const SEP = ZONE_SEPARATOR

/** Columns a text takes: pictographs and the declared wide emoji-set entries count two (064 #3). */
export const textWidth = (text: string): number =>
  [...text].reduce((n, ch) => n + ((ch.codePointAt(0) ?? 0) >= 0x1f000 || EMOJI_WIDE.includes(ch) ? 2 : 1), 0)

/** `claude-opus-5-5` reads `opus 5.5`; anything else is kept. */
export const shortModel = (model: string): string => {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(model.replace(/\[.*\]$/, ''))
  // The 1M context window shows (054 #42).
  const wide = /\[1m\]$/i.test(model) ? ' 1M' : ''
  return m === null ? model : `${m[1]} ${m[2]}.${m[3]}${wide}`
}

const withIcon = (icon: string, text: string) => (icon === '' ? text : `${icon} ${text}`)

/** A palette colour name (statusline's), or a ramp read from a level. */
export type ChipColour = 'mauve' | 'sapphire' | 'yellow' | 'red' | 'lavender' | 'teal' | 'peach' | 'surface1' | 'green'
/**
 * The footer's chips in one table (054 #48): the order a narrow footer drops them in (a higher
 * rank goes first) and their colour. `parts()` reads it, and the Help tab prints it.
 */
export const CHIP_TABLE = [
  { name: 'deciding', rank: 0, colour: 'sapphire' },
  { name: 'context', rank: 1, colour: 'yellow' },
  { name: 'dir', rank: 1.5, colour: 'lavender' },
  { name: 'windows', rank: 2, colour: 'sapphire' },
  { name: 'git', rank: 2.8, colour: 'lavender' },
  { name: 'model', rank: 3, colour: 'red' },
  { name: 'skill', rank: 3.5, colour: 'peach' },
  { name: 'worktree', rank: 4.6, colour: 'lavender' },
  { name: 'todo', rank: 5.1, colour: 'teal' },
  { name: 'skills', rank: 5.2, colour: 'peach' },
  { name: 'advisor', rank: 5.5, colour: 'mauve' },
  { name: 'cache', rank: 6, colour: 'teal' },
  { name: 'tree', rank: 6.4, colour: 'lavender' },
  { name: 'burn', rank: 6.8, colour: 'peach' },
  { name: 'pr', rank: 7, colour: 'lavender' },
  { name: 'ci', rank: 7.5, colour: 'green' },
  { name: 'projection', rank: 8, colour: 'peach' },
  { name: 'lines', rank: 8.5, colour: 'teal' },
  { name: 'time', rank: 9, colour: 'surface1' },
  { name: 'repo', rank: 9.5, colour: 'lavender' },
  { name: 'help', rank: 10, colour: 'surface1' },
  { name: 'astrolabe', rank: 11, colour: 'surface1' },
] as const satisfies ReadonlyArray<{ name: string; rank: number; colour: string }>

type ChipName = (typeof CHIP_TABLE)[number]['name']
/** A chip's rank and colour from the table. */
const chipOf = (name: ChipName): { name: ChipName; rank: number; colour: ChipColour } => CHIP_TABLE.find(c => c.name === name)!
type Part = { name?: ChipName; text: string; rank: number; colour?: ChipColour; level?: number; /** The window's own hold level, when it has one. */ hold?: number; /** The ramp mark is already in the text. */ inlineMark?: true; first?: true; links?: ReadonlyArray<{ text: string; href: string }> }

// An ASCII label ending in ':' is glued to its value (`stash:2`); a glyph takes a space.
const glued = (icon: string, text: string) => (icon.endsWith(':') ? `${icon}${text}` : withIcon(icon, text))
const prText = (icons: Icons, pr: PullRequest): string => {
  const mark = pr.checks === 'pass' ? icons.ciPass : pr.checks === 'fail' ? icons.ciFail : pr.checks === 'pending' ? icons.ciPending : ''
  const number = icons.pr === 'PR' ? `PR#${pr.number}` : withIcon(icons.pr, `#${pr.number}`)
  return mark === '' ? number : `${number} ${mark}`
}

/** When a window resets (041 #2): a countdown within a day (`2h13m`), else weekday and clock (`Mon 07:00`). */
export const resetOf = (iso: string | undefined, now: number): string | undefined => {
  const at = clockOf(iso)
  if (at === undefined || iso === undefined) return undefined
  if (Date.parse(iso) - now <= 0) return undefined
  return resetIn(iso, now)
}

const windowText = (r: UsageReading, now: number, lang: Lang, thresholds?: { hold?: number; stop?: number }): string => {
  const renewed = r.resetsAt !== undefined && Date.parse(r.resetsAt) <= now
  if (renewed) return `${labelOf(r.kind)} ${t(lang, 'status.renewed')}`
  const at = resetOf(r.resetsAt, now)
  // At or past 100% a window reads `full` (041 #3); the ramp mark follows the figure (064 #1).
  const ramp = usageRamp(r.percentUsed, thresholds)
  const level = ramp.full ? t(lang, 'status.full') : `${Math.round(r.percentUsed)}%`
  return `${labelOf(r.kind)} ${level}${ramp.mark}${at === undefined ? '' : ` (${at})`}`
}

const holdOf = (input: FooterInput, kind: string): { hold?: number } => {
  const hold = input.thresholds?.[kind]?.hold
  return hold === undefined ? {} : { hold }
}

const parts = (input: FooterInput): Part[] => {
  const { icons, now } = input
  const out: Part[] = []
  const decision = input.decision ?? decide(input.readings, [], undefined, now, undefined, undefined, input.thresholds)
  const binding = decision.highest
  if (binding !== undefined) {
    const segment = usageSegment(decision, input.lang ?? 'en', input.thresholds?.[binding.kind]) ?? ''
    const at = binding.renewed === true ? undefined : resetOf(binding.resetsAt, now)
    if (isPaused(decision)) {
      // Paused (047 #65): the first chip, in red, says until when.
      const until = clockOf(binding.resetsAt)
      out.push({ text: `${segment} · ${t(input.lang ?? 'en', 'status.pausedUntil', { at: until ?? t(input.lang ?? 'en', 'ask.theReset') })}`, rank: 0, colour: 'red', first: true })
    } else out.push({ text: at === undefined ? segment : `${segment} (${at})`, ...chipOf('deciding'), inlineMark: true, ...(binding.renewed === true ? {} : { level: binding.percent, ...holdOf(input, binding.kind) }) })
  }
  for (const r of input.readings) {
    if (r.kind === binding?.kind) continue
    out.push({ text: windowText(r, now, input.lang ?? 'en', input.thresholds?.[r.kind]), ...chipOf('windows'), inlineMark: true, level: r.percentUsed, ...holdOf(input, r.kind) })
  }
  if (input.context !== undefined) {
    // Past 85% the context chip says to compact (054 #43).
    const p = Math.round(input.context.percent)
    const text = p >= 85 ? `${p}% ${t(input.lang ?? 'en', 'status.compactSoon')}` : `${p}%`
    out.push({ text: withIcon(icons.context, text), ...chipOf('context'), level: input.context.percent })
  }
  if (input.model !== undefined) {
    // Items inside one chip are joined with · (064 #9): `opus 5.5 · high · fast` (068 #47).
    const model = [shortModel(input.model), ...(input.effort === undefined ? [] : [input.effort]), ...(input.fast === true ? ['fast'] : [])].join(' · ')
    out.push({ text: withIcon(icons.model, model), ...chipOf('model') })
  }
  if (input.skill !== undefined) {
    const name = input.skill.name.replace(/^[a-z0-9-]+:/, '').replace(/^speckit[-.]/, '')
    out.push({ text: `⟳ ${name}${input.skill.model === undefined ? '' : ` · ${shortModel(input.skill.model)}`}`, ...chipOf('skill') })
  }
  // Place and git (068 #41): the directory, the repository, the branch, the worktree's origin,
  // the tree counters, the pull request and the last CI run, each its own chip.
  const place = input.dir === undefined ? undefined : dirChip(input.dir.path, input.dir.start)
  if (place !== undefined) out.push({ text: place, ...chipOf('dir') })
  const repo = repoName(input.repo)
  if (repo !== undefined) out.push({ text: repo, ...chipOf('repo'), ...(input.repo === undefined ? {} : { links: [{ text: repo, href: input.repo }] }) })
  const git = input.git
  if (git?.branch !== undefined) {
    const branch = branchChip(git, icons)!
    out.push({
      text: branch.text,
      ...chipOf('git'),
      links: git.remote === undefined || !branch.linkBranch ? [] : [{ text: git.branch, href: branchWebUrl(git.remote, git.branch) }],
    })
    const wt = worktreeChip(git, icons)
    if (wt !== undefined) out.push({ text: wt, ...chipOf('worktree') })
    const tree = treeChip(git, icons)
    if (tree !== undefined) out.push({ text: tree, ...chipOf('tree') })
    if (git.pr !== undefined) {
      out.push({ text: prChip(git.pr, icons), ...chipOf('pr'), links: git.pr.url === undefined ? [] : [{ text: `#${git.pr.number}`, href: git.pr.url }] })
    }
    const ci = ciChip(git.ci)
    if (ci !== undefined) out.push({ text: ci, ...chipOf('ci'), colour: git.ci === 'fail' ? 'red' : git.ci === 'pass' ? 'green' : 'yellow' })
  }
  // Work (068 #45, #46): skills in play and the todo list.
  const skills = skillsChip(input.skills ?? [])
  if (skills !== undefined) out.push({ text: skills, ...chipOf('skills') })
  const todo = todoChip(input.todo)
  if (todo !== undefined) out.push({ text: todo, ...chipOf('todo') })
  // The prompt cache (068 #42): silent until it is about to go cold.
  const cache = cacheChip(input.cache, now)
  if (cache !== undefined) out.push({ text: cache, ...chipOf('cache'), colour: cache.startsWith('cache cold') ? 'red' : 'yellow' })
  // The burn rate and the projection (068 #48): after five samples over a minute, and the
  // limit's time only when it lands before the window's reset.
  const burned = binding === undefined || binding.renewed === true
    ? burnChips({ rate: input.burn, samples: input.burnSamples?.count ?? 0, spanMs: input.burnSamples?.spanMs ?? 0, percent: undefined, resetsAt: undefined, now, clock: at => clockOf(new Date(at).toISOString()) ?? '?' }, binding === undefined ? '' : labelOf(binding.kind))
    : burnChips({ rate: input.burn, samples: input.burnSamples?.count ?? 0, spanMs: input.burnSamples?.spanMs ?? 0, percent: binding.percent, resetsAt: binding.resetsAt, now, clock: at => clockOf(new Date(at).toISOString()) ?? '?' }, labelOf(binding.kind))
  if (burned.burn !== undefined) out.push({ text: burned.burn, ...chipOf('burn') })
  if (burned.projection !== undefined) out.push({ text: burned.projection, ...chipOf('projection') })
  // Lines changed this session (041 #7): what the tools wrote, added and removed.
  if (input.lines !== undefined && input.lines.added + input.lines.removed > 0)
    out.push({ text: `+${input.lines.added} −${input.lines.removed}`, ...chipOf('lines') })
  if (input.startedAt !== undefined && now - input.startedAt >= 60_000) out.push({ text: withIcon(icons.clock, duration(now - input.startedAt)), ...chipOf('time') })
  // The advisor consulted this session, and Astrolabe's own version (the mod's footer, not a statusline's).
  if (input.advisor !== undefined && input.advisor.runs > 0) out.push({ text: `adv ${input.advisor.runs}`, ...chipOf('advisor') })
  if (input.astrolabe !== undefined) out.push({ text: `astrolabe ${input.astrolabe.version}`, ...chipOf('astrolabe') })
  // A newcomer's last chip says where the commands are; it is the first to go on a narrow footer (052 #46).
  if (input.helpHint === true) out.push({ text: '/astrolabe help', ...chipOf('help') })
  return input.icons.ahead === '^' ? out.map(p => ({ ...p, text: asciiFold(p.text) })) : out
}

/** The footer text: Spec Kit first, then the parts in order, fitted to `columns`. */
/** The parts that fit `columns`, Spec Kit first, the least important dropped first. */
const fitted = (input: FooterInput): { speckit: string; kept: Part[] } => {
  let kept = input.lead === true ? parts(input).filter(p => p.rank === 0) : parts(input)
  const join = (speckit: string) => joinZones([[speckit], ...kept.map(p => [p.text])])
  let speckit = input.speckit()
  while (textWidth(join(speckit)) > input.columns) {
    const droppable = kept.filter(p => p.rank > 0)
    if (droppable.length === 0) break
    const worst = droppable.reduce((a, b) => (b.rank > a.rank ? b : a))
    kept = kept.filter(p => p !== worst)
  }
  if (textWidth(join(speckit)) > input.columns) {
    const rest = joinZones(kept.map(p => [p.text]))
    const room = input.columns - (rest === '' ? 0 : textWidth(rest) + SEP.length)
    speckit = input.speckit(Math.max(1, room))
  }
  return { speckit, kept }
}

/** The footer text: Spec Kit first, then the parts in order, fitted to `columns`. */
export const footerText = (input: FooterInput): string => {
  const { speckit, kept } = fitted(input)
  return joinZones([[speckit], ...kept.map(p => [p.text])])
}

export type Chip = { key: string; /** The chip's entry in CHIP_TABLE, when it has one (068 #49). */ name?: ChipName; text: string; colour: ChipColour; rank?: number; links?: ReadonlyArray<{ text: string; href: string }>; /** The whole text of a chip cut to fit, shown on hover (052 #45). */ full?: string }

/** The footer as Powerline chips in statusline's colours (039); the context ramps without a mark. */
export const footerChips = (input: FooterInput): Chip[] => {
  const { speckit, kept } = fitted(input)
  const pinned = kept.filter(p => p.first === true).map((p, i) => ({ key: `first-${i}`, text: p.text, colour: p.colour ?? 'red', rank: p.rank }))
  return [
    ...pinned,
    ...(speckit === '' ? [] : [{ key: 'speckit', text: speckit, colour: 'mauve' as const, ...((whole => (whole !== speckit ? { full: whole } : {}))(input.speckit())) }]),
    ...kept.filter(p => p.first !== true).map((p, i) => {
      // One ramp for every window and the context (064 #1); the context chip keeps its colour only.
      const ramp = p.level === undefined ? undefined : usageRamp(p.level, p.hold === undefined ? undefined : { hold: p.hold })
      const isContext = p.colour === 'yellow'
      return {
        // Per-model windows share the `windows` name: a repeated name gets its position, so keys stay unique.
        key: p.name === undefined ? `part-${i}` : kept.filter(q => q.name === p.name).length > 1 ? `${p.name}-${i}` : p.name,
        ...(p.name === undefined ? {} : { name: p.name }),
        text: ramp === undefined || isContext || p.inlineMark === true ? p.text : `${p.text}${ramp.mark}`,
        colour: p.name === 'ci' || p.name === 'cache' ? p.colour ?? 'surface1' : ramp?.chip ?? p.colour ?? 'surface1',
        rank: p.rank,
        ...(p.links === undefined || p.links.length === 0 ? {} : { links: p.links }),
      }
    }),
  ]
}

/** statusline's three-line order (041 #1): place and git, the Spec Kit work and the skill, the model and the limits. */
export const footerChipLines = (input: FooterInput): Chip[][] => {
  const flat = footerChips(input)
  // Place and git on line one, the work on line two, the model and the limits on line three (068).
  const PLACE = new Set<string>(['dir', 'repo', 'git', 'worktree', 'tree', 'lines', 'pr', 'ci'])
  const WORK = new Set<string>(['skill', 'skills', 'todo', 'advisor'])
  const lineOf = (chip: Chip): number => (chip.key === 'speckit' || (chip.name !== undefined && WORK.has(chip.name)) ? 1 : chip.name !== undefined && PLACE.has(chip.name) ? 0 : 2)
  return [0, 1, 2].map(line => flat.filter(chip => lineOf(chip) === line)).filter(line => line.length > 0)
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
