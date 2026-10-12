import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { describe, expect, test } from 'vitest'

// Principle IX: the only place a colour literal lives is hooks/core/theme.ts. Every other
// source file in the hooks module names a theme role and lets the engine resolve it.
const ROOT = join(__dirname, '..', '..')
const HOOKS = join(ROOT, 'hooks')
const ALLOWED = new Set([join('hooks', 'core', 'theme.ts')])
const HEX = /#[0-9a-fA-F]{6}\b/

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })

describe('colours come from theme roles only (064 FR-016, Principle IX)', () => {
  test('no #rrggbb literal outside hooks/core/theme.ts', () => {
    const offenders = sources(HOOKS)
      .map(path => relative(ROOT, path))
      .filter(path => !ALLOWED.has(path))
      .filter(path => HEX.test(readFileSync(join(ROOT, path), 'utf8')))
    expect(offenders).toEqual([])
  })

  test('the scan sees the surfaces and the register module', () => {
    const seen = sources(HOOKS).map(path => relative(ROOT, path))
    expect(seen).toContain(join('hooks', 'register.tsx'))
    expect(seen.some(path => path.startsWith(join('hooks', 'surfaces')))).toBe(true)
  })
})
