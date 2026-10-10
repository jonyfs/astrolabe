import { type FeatureDuration, type FeatureDurations } from '../core/history'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isFeatureDuration = (value: unknown): value is FeatureDuration => {
  if (!isRecord(value)) return false
  if (typeof value.dir !== 'string' || typeof value.id !== 'string' || typeof value.name !== 'string') return false
  if (typeof value.startedAt !== 'number' || !Number.isFinite(value.startedAt)) return false
  if (value.ms === undefined && value.completedAt === undefined) return true
  return typeof value.ms === 'number' && Number.isFinite(value.ms) && value.ms >= 0 &&
    typeof value.completedAt === 'number' && Number.isFinite(value.completedAt)
}

export const readFeatureDurations = (value: unknown): FeatureDurations | undefined => {
  if (!isRecord(value)) return undefined
  return Object.entries(value).every(([dir, item]) => isFeatureDuration(item) && item.dir === dir)
    ? value as FeatureDurations
    : undefined
}
