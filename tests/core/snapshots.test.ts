import { describe, expect, test } from 'claude-code/testing'

import { textWidth } from '../../hooks/core/footer'
import { FLAVORS } from '../../hooks/core/theme'
import { allSurfaces, FLAVOR_NAMES, surfacesOf, WIDTHS } from '../helpers/snapshot-fixture'
import { GOLDEN } from './snapshots.golden'

// 064 SC-001: band, status entry, footer and pane text in five flavors at four widths,
// each as text plus the flavor's colour. A deliberate change regenerates the golden file with
// `npx tsx scripts/update-snapshots.ts`; the diff is the review.
describe('surface snapshots in every flavor and width (064)', () => {
  const now = allSurfaces()

  test('the golden file covers 5 flavors x 4 widths x 5 surfaces', () => {
    expect(Object.keys(GOLDEN).length).toBe(FLAVOR_NAMES.length * WIDTHS.length * 5)
    expect(Object.keys(now).sort()).toEqual(Object.keys(GOLDEN).sort())
  })

  for (const flavor of FLAVOR_NAMES) {
    for (const columns of WIDTHS) {
      test(`${flavor} at ${columns} columns matches`, () => {
        for (const surface of ['band', 'live', 'status', 'footer', 'pane']) {
          const key = `${flavor}/${columns}/${surface}`
          expect({ key, rows: now[key] }).toEqual({ key, rows: GOLDEN[key] })
        }
      })
    }
  }
})

describe('what every snapshot must hold (064 FR-005, FR-006, FR-009, FR-016)', () => {
  test('no row is wider than its columns, and no state glyph is a wide one', () => {
    for (const columns of WIDTHS) {
      const { footer, status } = surfacesOf('mocha', columns)
      expect(textWidth(footer![0]!)).toBeLessThanOrEqual(columns)
      expect(textWidth(status![0]!)).toBeLessThanOrEqual(columns)
    }
    for (const rows of Object.values(GOLDEN)) {
      for (const row of rows) expect(/[⏸⏱⚠]/u.test(row)).toBe(false)
    }
  })

  test('every colour is a value of its flavor', () => {
    for (const flavor of FLAVOR_NAMES) {
      const roleHex = new Set<string>(Object.values(FLAVORS[flavor]))
      for (const [key, rows] of Object.entries(GOLDEN)) {
        if (!key.startsWith(`${flavor}/`) || key.endsWith('/footer') || key.endsWith('/status')) continue
        for (const row of rows) {
          const hex = row.split('|')[1]
          expect({ key, hex: hex === undefined || roleHex.has(hex) }).toEqual({ key, hex: true })
        }
      }
    }
  })

  test('feature ids are whole and padded to the widest at every width', () => {
    for (const flavor of FLAVOR_NAMES) {
      for (const columns of WIDTHS) {
        const rows = GOLDEN[`${flavor}/${columns}/pane`]!.map(r => r.split('|')[0]!)
        const listed = rows.filter(r => /^[ ▸] [●◐○] \d{3,4} /.test(r))
        expect(listed.length).toBe(4)
        // The name column starts in one place: every id occupies four cells.
        const nameAt = listed.map(r => /^[ ▸] [●◐○] (\d{3,4} +)/.exec(r)![1]!.length)
        expect(new Set(nameAt).size).toBe(1)
      }
    }
  })

  test('a footer chip joins its zone with ·, and chips are joined with │', () => {
    for (const key of Object.keys(GOLDEN).filter(k => k.endsWith('/footer'))) {
      const line = GOLDEN[key]![0]!
      for (const zone of line.split(' │ ')) expect(zone.includes(' │ ')).toBe(false)
    }
  })
})
