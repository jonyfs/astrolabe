import { describe, expect, test } from 'claude-code/testing'

import { usageBarRows } from '../../hooks/core/usage-bars'

const NOW = Date.UTC(2026, 9, 12, 12, 0)
const reset = (min: number) => new Date(NOW + min * 60_000).toISOString()

describe('usage bars with governor ticks (066, board 4)', () => {
  test('ctx, 5h and 7d as 20-cell bars, with ┊ at 60, 80 and 88', () => {
    const rows = usageBarRows({
      readings: [
        { kind: 'five_hour', percentUsed: 50, resetsAt: reset(25) },
        { kind: 'seven_day', percentUsed: 81, resetsAt: reset(3 * 60) },
      ],
      context: { percent: 41 },
      now: NOW,
    })
    expect(rows.map(r => r.key)).toEqual(['usage-head', 'usage-bar-ctx', 'usage-bar-five_hour', 'usage-bar-seven_day'])
    expect(rows[0]?.text).toBe('Usage  60 cap · 80 hold · 88 pause')
    for (const row of rows.slice(1)) {
      const bar = /[▰▱┊]{20}/.exec(row.text)?.[0] ?? ''
      expect([...bar].length).toBe(20)
    }
    // 60% is cell 12, 80% is cell 16 and 88% is cell 18 of 20 (index from 0, rounded).
    const five = [...(/[▰▱┊]{20}/.exec(rows[2]!.text)?.[0] ?? '')]
    expect(five[12]).toBe('┊')
    expect(five[16]).toBe('┊')
    expect(five[18]).toBe('┊')
  })

  test('a window at 81% reads with its mark and band, in the blocked role', () => {
    const rows = usageBarRows({ readings: [{ kind: 'seven_day', percentUsed: 81, resetsAt: reset(180) }], now: NOW })
    const row = rows.find(r => r.key === 'usage-bar-seven_day')!
    expect(row.text).toContain('81%▴')
    expect(row.text).toContain('3h00m')
    expect(row.role).toBe('blocked')
  })

  test('filled cells follow the percent; context has no reset', () => {
    const rows = usageBarRows({ readings: [], context: { percent: 50 }, now: NOW })
    const ctx = rows.find(r => r.key === 'usage-bar-ctx')!
    const bar = /[▰▱┊]{20}/.exec(ctx.text)![0]
    expect([...bar].filter(c => c === '▰').length).toBe(10)
    expect(ctx.text).toContain('50%')
  })

  test('a per-window threshold moves the ticks', () => {
    const rows = usageBarRows({ readings: [{ kind: 'five_hour', percentUsed: 10 }], thresholds: { five_hour: { hold: 70, stop: 90 } }, now: NOW })
    const bar = [...(/[▰▱┊]{20}/.exec(rows.find(r => r.key === 'usage-bar-five_hour')!.text)![0])]
    expect(bar[14]).toBe('┊')
    expect(bar[18]).toBe('┊')
  })

  test('no readings and no context: nothing', () => {
    expect(usageBarRows({ readings: [], now: NOW })).toEqual([])
  })
})
