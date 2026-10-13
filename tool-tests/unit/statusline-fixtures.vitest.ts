// The shared host fixtures (statusline spec 060, Astrolabe spec 081 FR-006): the payloads and the
// plain rows statusline drew for them, rendered through the vendored copy in the environment the
// fixtures name. A copy older than 1.58.0 has no such folder, and the tests skip.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, test } from 'vitest'

const VENDOR = join(__dirname, '..', '..', 'vendor', 'statusline')
const FIXTURES = join(VENDOR, 'fixtures', 'host')
const HELPER = join(VENDOR, 'scripts', 'host-fixtures.js')
const present = existsSync(FIXTURES) && existsSync(HELPER)

type Helper = {
  payloads: () => string[]
  plainRows: (name: string, width: number, options?: { cli?: string }) => string[]
  WIDTHS: number[]
}

const load = async (): Promise<Helper> => (await import(pathToFileURL(HELPER).href)) as Helper

describe('the vendored host fixtures (081)', () => {
  test.skipIf(!present)('every payload has an expected file per width, and no expected file is orphaned', async () => {
    const helper = await load()
    const names = helper.payloads()
    expect(names.length).toBeGreaterThan(0)
    const want = names.flatMap(n => helper.WIDTHS.map(w => `${n}.${w}.txt`)).sort()
    expect(readdirSync(join(FIXTURES, 'expected')).filter(f => f.endsWith('.txt')).sort()).toEqual(want)
  })

  test.skipIf(!present)('the vendored renderer draws the expected rows for each payload at each width', async () => {
    const helper = await load()
    for (const name of helper.payloads()) {
      for (const width of helper.WIDTHS) {
        const expected = readFileSync(join(FIXTURES, 'expected', `${name}.${width}.txt`), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '')
        expect(helper.plainRows(name, width, { cli: join(VENDOR, 'bin', 'cli.js') }).join('\n'), `${name} at ${width} columns`).toBe(expected)
      }
    }
  })
})
