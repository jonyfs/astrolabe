// The state model's types live in the $.state contract (types/index.d.ts).
import type { SessionMemo } from '../../types'

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
} from '../../types'

export const emptyMemo = (): SessionMemo => ({ files: {}, analyzed: [], touched: [] })
