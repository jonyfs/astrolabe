// Astrolabe's $.state contract and the Spec Kit state model it holds.
// Every value is plain JSON data. Self-contained: no imports.

export type Phase = 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement' | 'done' | 'abandoned'

/** A Spec Kit step a skill hint can point at; `constitution` is project level. */
export type Step = 'constitution' | 'specify' | 'clarify' | 'plan' | 'tasks' | 'implement'

export type Track = 'quick' | 'full'
export type SpecStatus = 'active' | 'done' | 'abandoned'

export type FrontMatter = { track?: Track; status?: SpecStatus }

export type Task = {
  /** The first `T\d+` token after the checkbox, when present. */
  id?: string
  text: string
  isDone: boolean
  /** 1-based line number in tasks.md. */
  line: number
}

/** What was read from disk for one `specs/NNN-<name>/` directory. */
export type FeatureFiles = {
  dir: string
  spec?: string
  plan: boolean
  tasks?: string
  /** Open and total items across `checklists/*.md` (020b). */
  checklist?: { open: number; total: number }
  /** Files that exist but whose read failed; their text, if any, is the last one read (013). */
  unreadable?: Array<'spec.md' | 'tasks.md'>
  /** Set once the texts are compacted for the memo (spec 009), so they are not compacted again. */
  compact?: true
  /** The spec's summary for the pane (024), kept when the spec text is compacted. */
  summary?: string
  /** Each task's line in its file (024), kept when the tasks are compacted. */
  taskLines?: number[]
  /** The tasks came from a quick spec's `## Tasks` section: there is no tasks.md (024). */
  tasksInSpec?: true
}

export type FeatureWarning = 'clarification-after-plan' | 'unreadable-spec' | 'unreadable-tasks'

export type Feature = {
  id: string
  name: string
  /** Directory name under specs/, for example `002-band-hint`. */
  dir: string
  phase: Phase
  track?: Track
  status?: SpecStatus
  done: number
  total: number
  currentTask?: { id?: string; text: string }
  warnings: FeatureWarning[]
  /** `[NEEDS CLARIFICATION` markers left in the spec (020b). */
  clarifications?: number
  /** Open and total checklist items (020b). */
  checklist?: { open: number; total: number }
}

export type FeatureJson =
  | { kind: 'missing' }
  | { kind: 'malformed' }
  /** `dir` is the directory name under specs/ (`002-band-hint`), or a path outside it. */
  | { kind: 'ok'; dir: string }

/** An enabled hook of `.specify/extensions.yml` (020c). */
export type ExtensionHook = { event: string; command: string; optional: boolean }

export type Snapshot = {
  /** Directory that holds `.specify/`; undefined means Spec Kit is not present. */
  root?: string
  featureJson: FeatureJson
  constitution?: string
  branch?: string
  /** The linked worktree's name when the checkout is one (023). */
  worktree?: string
  features: FeatureFiles[]
  /** Enabled Spec Kit extension hooks, read with the full snapshot (020c). */
  extensions?: ExtensionHook[]
  /** Other Spec Kit roots under the session's directory (020c). */
  otherRoots?: string[]
}

export type ActiveSource = 'feature.json' | 'branch' | 'latest'
export type ActiveWarning = 'feature-json-malformed' | 'feature-json-dangling'

export type Active = { dir: string; id: string; name: string; source: ActiveSource }

export type SkillHint = { step: Step } | { analyze: true }

/** Session-only memory kept beside the derived state. */
export type SessionMemo = {
  /** Last files read per feature dir, so a turn re-reads only what changed. */
  files: Record<string, FeatureFiles>
  /** Feature dirs for which speckit-analyze ran this session. */
  analyzed: string[]
  runningSkill?: { name: string; step: Step }
  /** Feature dirs a tool call touched during the current turn. */
  touched: string[]
  currentTask?: { dir: string; id: string; startedAt: number }
  /** The rest of the last snapshot, so a hint or one file can re-derive without reads. */
  base?: Omit<Snapshot, 'features'>
  /** This turn's drift window (reset at each main turn.complete, kept across reloads). */
  window: DriftWindow
  /** `dir:phase` keys already toasted this session. */
  toasted: string[]
  /** Whether this session's first reconcile set the phase baseline yet. */
  baselined: boolean
  /** Each feature's phase at the last reconcile, to toast moves forward (005; per session since 013). */
  baseline?: Record<string, Phase>
}

/** One main turn's work: code files edited, any Bash or Agent call, and whether drift was toasted. */
export type DriftWindow = { edits: string[]; sawShell: boolean; alarmed: boolean }

export type ConstitutionState = 'missing' | 'template' | 'ratified'

export type SpeckitState = {
  present: boolean
  root?: string
  constitution: ConstitutionState
  active?: Active
  activeWarning?: ActiveWarning
  features: Feature[]
  runningSkill?: { name: string; step: Step }
  currentTask?: { id?: string; text: string; startedAt?: number }
  isAnalyzed: boolean
  nextCommand?: string
  /** Whether this turn worked on the active feature (speckit-implement ran, or a tool touched it). */
  isWorkingOnActive?: boolean
  /** The memo version this state was derived from; an older state never overwrites a newer one. */
  memoVersion?: number
  /** Other Spec Kit roots under the session's directory, by folder name (020c). */
  otherRoots?: string[]
  /** Extension hooks before and after the next command (020c). */
  nextHooks?: { before: string[]; after: string[] }
  /** The active feature's tasks, for the pane (the memo stays out of every drawing). */
  activeTasks?: Array<{ id?: string; text: string; isDone: boolean; line?: number }>
  /** The active spec's summary as markdown (024). */
  activeSummary?: string
  /** The active feature's files that exist, for the pane's links (024). */
  activeDocs?: Array<'spec.md' | 'plan.md' | 'tasks.md'>
}

export type PaneTab = 'specs' | 'tasks' | 'session' | 'dashboard' | 'help' | 'config' | 'prs'

/** The /astrolabe pane's session state: the tab shown and whether it opened unasked already. */
export type PaneState = { tab: PaneTab; autoOpened: boolean; filter?: string; scroll?: { tab: PaneTab; offset: number }; draft?: Record<string, string | number | boolean>; confirm?: string }

export type UpdateId = 'gstack' | 'specify' | 'speckit-skills' | 'astrolabe'

/** Something with a newer version than the one installed. */
export type UpdateItem = { id: UpdateId; installed: string; latest: string }

/** What the band and pane draw about updates; `confirming` arms the skills refresh. */
export type UpdatesState = { items: UpdateItem[]; confirming?: UpdateId; running?: UpdateId }

/** One usage window as session.measure reports it. */
export type UsageReading = { kind: string; percentUsed: number; resetsAt?: string }

/** A subagent dispatch refused while usage is high, to re-dispatch after the reset. */
export type QueuedAgent = { id: string; description: string; prompt: string; subagentType?: string }

/** Usage governance (spec 008). `override` is the owner's raised stop and ceiling. */
export type UsageState = {
  readings: UsageReading[]
  history: Array<{ at: number; percent: number }>
  inFlight: number
  queue: QueuedAgent[]
  /** The owner's raised stop and ceiling, for the window it was given for (all windows when absent). */
  override?: { target: number; until: number; kind?: string }
  paused: boolean
  /** What the governor did, newest last (021): questions, answers, resumes; at most 20. */
  log?: Array<{ at: number; text: string }>
  /** Prompts of queued subagents the person let run once at hold ("Run this one now", 017). */
  passes?: string[]
  /** The window that entered hold, held down to 75% (016). */
  held?: { kind: string; resetsAt?: string }
  /** Until when the owner let subagents through the hold, one at a time (015). */
  holdLift?: number
  /** The answer the owner gave (or the default taken) for the band now in force (015). */
  asked?: { kind: 'hold' | 'pause'; answer: string }
}

/** What `git status --porcelain=v2 --branch` said at the end of the last main turn (018). */
export type GitState = {
  branch?: string
  ahead: number
  behind: number
  changed: number
  conflicts: number
  /** Stash entries (023), from the `# stash` header. */
  stashes?: number
  /** The linked worktree's name when the checkout is one (023). */
  worktree?: string
  /** The branch's open pull request and its checks (023), from `gh`, opt-in. */
  pr?: PullRequest
}

/** A pull request and the state of its checks: all passed, one failed, some still running, or none. */
export type PullRequest = { number: number; checks: 'pass' | 'fail' | 'pending' | 'none' }

/** The session's numbers for the footer and the Dashboard (018); bounded, written per turn. */
export type SessionStats = {
  startedAt: number
  turns: number
  toolCalls: number
  drifts: number
  agentsRun: number
  agentsQueued: number
  model?: string
  effort?: string
  context?: { percent: number }
  cost?: number
  git?: GitState
  /** How long each ticked task took, from when it became the current one (021), at most 50. */
  taskTimes?: Array<{ dir: string; id: string; ms: number }>
  /** This week's tasks and features done, across sessions (021), copied from $.store for drawing. */
  week?: { tasks: number; features: number }
  /** Tasks done in each recent main turn, by the turn's duration (021), at most 20. */
  turnTicks?: Array<{ ms: number; n: number }>
  /** The person's language guessed from their prompts (019): en, pt-BR, es or fr. */
  language?: string
  /** The binding window's percent per reading, at most 60 points. */
  series: Array<{ at: number; percent: number }>
  /** Warnings already shown this session (022): the cost budget at 80% and 100%, the context window. */
  warned?: { cost80?: boolean; cost100?: boolean; context?: boolean }
  /** The last `gh pr view` for a branch (023): when it ran and what it found, kept five minutes. */
  prCache?: { branch: string; at: number; pr?: PullRequest }
  /** The repository's open pull requests for the PRs tab (032), and when they were read. */
  pulls?: { at: number; rows: Array<import('../hooks/core/pulls').PullRow> }
  /** The last finished feature's summary from a small model (026). */
  lastSummary?: { dir: string; text: string }
  /** The features the repository's other worktrees work on (037), read after each main turn. */
  worktrees?: Array<{ name: string; branch?: string; dir: string; id: string; featureName: string; phase: Phase; done: number; total: number }>
  /** The last main turn's change to the active tasks, as unified-diff hunks (024). */
  tasksDiff?: { dir: string; file: 'tasks.md' | 'spec.md'; text: string }
}

/** One answer a usage question offers; `target` is the ceiling a lifting answer sets. */
export type UsageAnswer = { value: string; label: string; target?: number }

/** What the governor asks before it holds or pauses (015). The first answer is the default. */
export type UsageQuestion = { kind: 'hold' | 'pause'; text: string; options: UsageAnswer[]; fallback: string }

/** The open question the `astrolabe-usage` pane draws, with when its default goes ahead. */
export type AskState = { question?: UsageQuestion; deadline?: number }

declare module 'claude-code' {
  interface PluginState {
    astrolabe: { speckit: SpeckitState; memo: SessionMemo; pane: PaneState; updates: UpdatesState; usage: UsageState; ask: AskState; session: SessionStats }
  }
}
