// One duration format on every surface (064 #5): `40s`, `4m12s`, `2h09m`; unknown is `?`.
// Whole minutes drop the zero seconds (`4m`). Pure: no $.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const duration = (ms: number | undefined): string => {
  if (ms === undefined || !Number.isFinite(ms) || ms < 0) return '?'
  const total = Math.floor(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  if (minutes < 60) {
    const seconds = total % 60
    return seconds === 0 ? `${minutes}m` : `${minutes}m${String(seconds).padStart(2, '0')}s`
  }
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`
}

/** When a window resets: a countdown under a day, else the weekday and clock (`Thu 18:00`); `?` when unknown or past. */
export const resetIn = (iso: string | undefined, now: number): string => {
  const at = iso === undefined ? Number.NaN : Date.parse(iso)
  if (Number.isNaN(at) || at <= now) return '?'
  if (at - now < 86_400_000) return duration(at - now)
  const d = new Date(at)
  return `${WEEKDAYS[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
