import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, test } from 'vitest'

// `pending` (overlay0) is 3.4:1 on mocha's base and fails text contrast. It may colour rules,
// separators and glyphs only; muted text uses `faint` (064 #2). Every use is listed here with
// what it draws, so a new one is a decision, not an accident.
const ROOT = join(__dirname, '..', '..')
const ALLOWED: Readonly<Record<string, string>> = {
  [join('hooks', 'core', 'dashboard.ts')]: 'ring marks and the projected-trend dots (glyphs)',
  [join('hooks', 'core', 'pixels.ts')]: 'the projected-trend line of the usage picture (a graphic)',
  [join('hooks', 'core', 'band.ts')]: 'the ○ mark of a step not reached (a glyph)',
  [join('hooks', 'surfaces', 'pane.tsx')]: 'the rule above the pinned footer',
}
const USE = /\btokens0?\.pending\b|\.tokens\.pending\b|role: 'pending'|'○': 'pending'/

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })

describe('the pending role is for rules and glyphs (064 FR-005)', () => {
  test('only the listed files draw with it', () => {
    const using = sources(join(ROOT, 'hooks'))
      .map(path => relative(ROOT, path))
      .filter(path => path !== join('hooks', 'core', 'theme.ts'))
      .filter(path => USE.test(readFileSync(join(ROOT, path), 'utf8')))
    expect(using.sort()).toEqual(Object.keys(ALLOWED).sort())
  })
})
