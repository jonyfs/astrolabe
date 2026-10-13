// The contract Astrolabe relies on in the vendored statusline (spec 070 FR-003): it renders a
// mod-shaped payload, exits 0, never prints its fallback line, fits the width it is given and
// reads the environment names the mod sets. A sync pull request must keep this green.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const CLI = join(ROOT, 'vendor', 'statusline', 'bin', 'cli.js')
const FALLBACKS = ['statusline unavailable', 'statusline needs Node']

// ESC [ ... m and OSC 8 links: what the renderer paints with.
// eslint-disable-next-line no-control-regex
const SGR = /\x1b\[[0-9;:]*m/g
// eslint-disable-next-line no-control-regex
const OSC8 = /\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/g
const plain = (s: string) => s.replace(OSC8, '').replace(SGR, '')

const payload = (over: Record<string, unknown> = {}) => ({
  session_id: 'contract-test',
  cwd: ROOT,
  workspace: { current_dir: ROOT, project_dir: ROOT },
  model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' },
  context_window: { used_percentage: 41, context_window_size: 200000 },
  rate_limits: {
    five_hour: { used_percentage: 50, resets_at: Math.floor(Date.now() / 1000) + 3600 },
    seven_day: { used_percentage: 81, resets_at: Math.floor(Date.now() / 1000) + 86400 },
  },
  cost: { total_duration_ms: 65 * 60_000 },
  ...over,
})

const run = (input: unknown, columns: number, env: Record<string, string> = {}) => {
  // A throwaway HOME: the renderer writes its caches under it, never under a real one.
  const home = mkdtempSync(join(tmpdir(), 'astrolabe-statusline-'))
  const r = spawnSync('node', [CLI], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      PATH: process.env['PATH'] ?? '',
      HOME: home,
      USERPROFILE: home,
      COLUMNS: String(columns),
      LINES: '3',
      COLORTERM: 'truecolor',
      CLAUDE_STATUSLINE_UPDATES: 'off',
      CLAUDE_STATUSLINE_DEBUG: '0',
      CLAUDE_STATUSLINE_NO_REFRESH: '1',
      ...env,
    },
  })
  return { status: r.status, out: r.stdout ?? '', err: r.stderr ?? '' }
}

describe('the vendored statusline (070)', () => {
  test('the copy is complete and says where it came from', () => {
    expect(existsSync(CLI)).toBe(true)
    const v = JSON.parse(readFileSync(join(ROOT, 'vendor', 'statusline', 'VERSION'), 'utf8')) as { commit: string; version: string }
    expect(v.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(v.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  for (const columns of [80, 100, 144, 200]) {
    test(`at ${columns} columns: exit 0, no fallback, lines fit`, () => {
      const r = run(payload(), columns)
      expect(r.status).toBe(0)
      const lines = r.out.split('\n').filter(l => plain(l).trim() !== '')
      expect(lines.length).toBeGreaterThan(0)
      for (const fb of FALLBACKS) expect(plain(r.out)).not.toContain(fb)
      for (const line of lines) expect([...plain(line)].length).toBeLessThanOrEqual(columns)
    })
  }

  test('a sparse payload still renders', () => {
    const r = run({ session_id: 'sparse' }, 100)
    expect(r.status).toBe(0)
    expect(plain(r.out).trim()).not.toBe('')
    for (const fb of FALLBACKS) expect(plain(r.out)).not.toContain(fb)
  })

  test('the update chip stays off and the ASCII switch is honoured', () => {
    const r = run(payload(), 140, { CLAUDE_STATUSLINE_ASCII: '1' })
    expect(r.status).toBe(0)
    // No private-use glyph of the Nerd Font in the ASCII set.
    expect(/[-]|[\u{F0000}-\u{FFFFD}]/u.test(plain(r.out))).toBe(false)
    expect(plain(r.out).toLowerCase()).not.toContain('update ready')
  })

  test('the flavor variable is read', () => {
    const mocha = run(payload(), 140, { CLAUDE_STATUSLINE_FLAVOR: 'mocha' })
    const latte = run(payload(), 140, { CLAUDE_STATUSLINE_FLAVOR: 'latte' })
    expect(mocha.out).not.toBe(latte.out)
  })

  test('an old Node prints its notice, which the mod treats as failure', () => {
    // The strings the mod's fallback detection looks for are the ones the CLI prints.
    const src = readFileSync(CLI, 'utf8')
    expect(src).toContain('statusline unavailable')
    expect(src).toContain('needs Node')
  })
})

// Statusline spec 056: the runs form and the failure contract. The copy vendored today predates it,
// so these run only once a sync brings it (the mod reads ANSI until then).
const runsSupported = (() => {
  const r = run(payload(), 100, { CLAUDE_STATUSLINE_OUTPUT: 'runs' })
  return r.out.trim().startsWith('{')
})()

describe.skipIf(!runsSupported)('the runs form (076, statusline 056)', () => {
  test('one object with contract 1 and lines; the runs join to the ANSI text', () => {
    for (const columns of [80, 100, 144, 200]) {
      const data = JSON.parse(run(payload(), columns, { CLAUDE_STATUSLINE_OUTPUT: 'runs' }).out) as { contract: number; lines: Array<Array<{ text: string }>> }
      expect(data.contract).toBe(1)
      const ansi = run(payload(), columns).out.split('\n').map(plain).filter(l => l.trim() !== '')
      expect(data.lines.map(l => l.map(r => r.text).join(''))).toEqual(ansi)
    }
  })
  test('input that is not an object exits 75 with bad-payload', () => {
    const r = run('not json' as unknown, 100, { CLAUDE_STATUSLINE_OUTPUT: 'runs' })
    expect(r.status).toBe(75)
    expect(JSON.parse(r.out)).toMatchObject({ contract: 1, error: { code: 'bad-payload' } })
  })
})
