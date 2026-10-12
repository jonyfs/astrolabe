import { type SessionStats } from '../core/types'
import { sparkline } from '../core/dashboard'
import { estimateLeft, slowest, type FeatureDuration } from '../core/history'
import { t, type Lang } from '../core/i18n'

/** The Dashboard's rows from 021: task history, feature durations, this week. */
export function historyRows(
  stats: SessionStats,
  feature: { dir: string; id: string; done: number; total: number } | undefined,
  featureDurations: readonly FeatureDuration[] = [],
  lang: Lang = 'en',
): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  for (const duration of featureDurations) {
    if (duration.ms !== undefined) rows.push([t(lang, 'kpi.specToDone'), `${duration.id} ${duration.name} · ${minutes(duration.ms)}`])
  }
  const times = stats.taskTimes ?? []
  if (feature !== undefined) {
    const slow = slowest(times, feature.dir, 1)[0]
    if (slow !== undefined) rows.push([t(lang, 'kpi.slowest'), `${slow.id} · ${minutes(slow.ms)}`])
    const open = feature.total - feature.done
    const left = estimateLeft(times, feature.dir, open)
    if (left !== undefined) rows.push([t(lang, 'kpi.estimate'), t(lang, 'kpi.estimateValue', { time: minutes(left), n: open })])
  }
  if (stats.week !== undefined) rows.push([t(lang, 'kpi.week'), t(lang, 'kpi.weekValue', { tasks: stats.week.tasks, features: stats.week.features })])
  // Time per feature this week (046 #55): sum each feature's task times.
  if (feature !== undefined && feature.total > 0) {
    const featureTime = (stats.taskTimes ?? []).filter(t => t.dir === feature.dir).reduce((sum, t) => sum + t.ms, 0)
    if (featureTime > 0) rows.push([t(lang, 'kpi.featureTime', { id: feature.id }), t(lang, 'kpi.featureTimeValue', { time: minutes(featureTime) })])
  }
  if (stats.weekdays !== undefined && stats.weekdays.some(n => n > 0)) {
    const top = Math.max(...stats.weekdays)
    rows.push([t(lang, 'kpi.weekdays'), `${sparkline(stats.weekdays.map(n => (n * 100) / top))}  M T W T F S S`])
  }
  // Tasks done over the last 8 weeks (054 #40), once more than one week has any.
  if (stats.weeksTrend !== undefined && stats.weeksTrend.filter(n => n > 0).length > 1) {
    const top = Math.max(...stats.weeksTrend)
    rows.push([t(lang, 'kpi.weeks'), t(lang, 'kpi.weeksValue', { line: sparkline(stats.weeksTrend.map(n => (n * 100) / top)), n: stats.weeksTrend.at(-1) ?? 0 })])
  }
  return rows
}

export const minutes = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60_000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}
