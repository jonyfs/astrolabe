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
  /** Files that exist but whose read failed; their text, if any, is the last one read (013). */
  unreadable?: Array<'spec.md' | 'tasks.md'>
  /** Set once the texts are compacted for the memo (spec 009), so they are not compacted again. */
  compact?: true
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
}

export type FeatureJson =
  | { kind: 'missing' }
  | { kind: 'malformed' }
  /** `dir` is the directory name under specs/ (`002-band-hint`), or a path outside it. */
  | { kind: 'ok'; dir: string }

export type Snapshot = {
  /** Directory that holds `.specify/`; undefined means Spec Kit is not present. */
  root?: string
  featureJson: FeatureJson
  constitution?: string
  branch?: string
  features: FeatureFiles[]
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
  /** The active feature's tasks, for the pane (the memo stays out of every drawing). */
  activeTasks?: Array<{ id?: string; text: string; isDone: boolean }>
}

export type PaneTab = 'specs' | 'tasks' | 'session'

/** The /astrolabe pane's session state: the tab shown and whether it opened unasked already. */
export type PaneState = { tab: PaneTab; autoOpened: boolean }

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
  override?: { target: number; until: number }
  paused: boolean
}

declare module 'claude-code' {
  interface PluginState {
    astrolabe: { speckit: SpeckitState; memo: SessionMemo; pane: PaneState; updates: UpdatesState; usage: UsageState }
  }
}
