import { describe, expect, test } from 'claude-code/testing'

import { footerText } from '../../hooks/core/footer'
import { iconSet } from '../../hooks/core/icons'
import { ITEM_SEPARATOR, joinZones, ZONE_SEPARATOR } from '../../hooks/core/zones'

describe('separators by level (064 #9)', () => {
  test('│ between zones and · inside a zone', () => {
    expect(ZONE_SEPARATOR).toBe(' │ ')
    expect(ITEM_SEPARATOR).toBe(' · ')
    expect(joinZones([['◆ 002', 'implement 45%'], ['7d 81%▴ hold', 'Mon 07:00']])).toBe('◆ 002 · implement 45% │ 7d 81%▴ hold · Mon 07:00')
  })

  test('empty items and empty zones leave no separator behind', () => {
    expect(joinZones([['a', ''], [], ['b']])).toBe('a │ b')
    expect(joinZones([])).toBe('')
    expect(joinZones([['only']])).toBe('only')
  })

  test('an item that carries a zone bar cannot make a zone hold both separators', () => {
    const text = joinZones([['a │ b', 'c']])
    expect(text).toBe('a | b · c')
    expect(text.includes(' │ ') && text.includes(' · ')).toBe(false)
  })

  test('the footer joins its chips with │ and no chip holds both', () => {
    const now = Date.UTC(2026, 9, 12, 12, 0)
    const text = footerText({
      speckit: () => '◆ 002 · implement 45%',
      readings: [{ kind: 'seven_day', percentUsed: 83, resetsAt: new Date(now + 5 * 86_400_000).toISOString() }],
      context: { percent: 61 },
      model: 'claude-opus-5-5',
      effort: 'high',
      git: { branch: 'main', ahead: 2, behind: 1, changed: 3, conflicts: 0 },
      startedAt: now - 65 * 60_000,
      now,
      icons: iconSet('ascii'),
      columns: 200,
    })
    const zones = text.split(' │ ')
    expect(zones.length).toBeGreaterThan(3)
    expect(zones[0]).toBe('◆ 002 · implement 45%')
    for (const zone of zones) expect(zone.includes(' │ ')).toBe(false)
  })
})
