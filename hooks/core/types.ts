// The state model's types live in the $.state contract (types/index.d.ts).
import type { DriftWindow, SessionMemo } from '../../types'

export type {
  Phase,
  Step,
  Track,
  SpecStatus,
  FrontMatter,
  Task,
  FeatureFiles,
  FeatureWarning,
  Feature,
  FeatureJson,
  Snapshot,
  ActiveSource,
  ActiveWarning,
  Active,
  SkillHint,
  SessionMemo,
  ConstitutionState,
  SpeckitState,
  PaneTab,
  DriftWindow,
  UpdateId,
  UpdateItem,
  UpdatesState,
  UsageReading,
  UsageState,
  UsageAnswer,
  UsageQuestion,
  AskState,
  GitState,
  SessionStats,
  ExtensionHook,
  QueuedAgent,
  PaneState,
} from '../../types'

export const emptyWindow = (): DriftWindow => ({ edits: [], sawShell: false, alarmed: false })

export const emptyMemo = (): SessionMemo => ({
  files: {},
  analyzed: [],
  touched: [],
  window: emptyWindow(),
  toasted: [],
  baselined: false,
})
