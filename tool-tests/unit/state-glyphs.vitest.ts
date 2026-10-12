import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, test } from 'vitest'

// 064 #3: a state change never shifts a row by a column, so paused, elapsed time and warning
// are `‖`, `◷` and `▲`. The wide ⏸ ⏱ ⚠ remain only where the emoji icon set declares them.
const ROOT = join(__dirname, '..', '..')
const ALLOWED = new Set([join('hooks', 'core', 'icons.ts'), join('hooks', 'core', 'glyphs.ts')])
const WIDE = /[⏸⏱⚠]/u

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })

describe('state glyphs (064 FR-006)', () => {
  test('⏸ ⏱ ⚠ appear only in the emoji icon set and its declaration', () => {
    const offenders = sources(join(ROOT, 'hooks'))
      .map(path => relative(ROOT, path))
      .filter(path => !ALLOWED.has(path))
      .filter(path => WIDE.test(readFileSync(join(ROOT, path), 'utf8')))
    expect(offenders).toEqual([])
  })
})
