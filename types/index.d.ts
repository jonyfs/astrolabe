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
}

export type FeatureWarning = 'clarification-after-plan'

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
}

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
}

export type PaneTab = 'specs' | 'tasks' | 'session'

/** The /astrolabe pane's session state: the tab shown and whether it opened unasked already. */
export type PaneState = { tab: PaneTab; autoOpened: boolean }

declare module 'claude-code' {
  interface PluginState {
    astrolabe: { speckit: { state: SpeckitState; memo: SessionMemo }; pane: PaneState }
  }
}
