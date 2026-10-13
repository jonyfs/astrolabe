import { describe, expect, test } from 'claude-code/testing'

import { nodeStatus, renderFooter, type RunProc } from '../../hooks/io/statusline-run'

const ok = (stdout: string): RunProc => async () => ({ exitCode: 0, stdout })
const clock = () => {
  let t = 1000
  return () => (t += 7)
}

describe('nodeStatus (070)', () => {
  test('18 and newer are ok', async () => {
    expect(await nodeStatus(ok('v20.11.1\n'))).toBe('ok')
    expect(await nodeStatus(ok('v18.0.0'))).toBe('ok')
  })
  test('older is old, a failing or throwing process is missing', async () => {
    expect(await nodeStatus(ok('v16.20.2'))).toBe('old')
    expect(await nodeStatus(async () => ({ exitCode: 127, stdout: '' }))).toBe('missing')
    expect(await nodeStatus(async () => { throw new Error('spawn node ENOENT') })).toBe('missing')
    expect(await nodeStatus(ok('garbage'))).toBe('missing')
  })
})

describe('renderFooter (070 FR-006, FR-008)', () => {
  const base = { cli: '/p/vendor/statusline/bin/cli.js', payload: { session_id: 's' }, env: { COLUMNS: '90' }, now: clock() }
  test('good output is parsed; the call is an argv array with stdin, env and the budget', async () => {
    let seen: { argv: string[]; init: Record<string, unknown> } | undefined
    const run: RunProc = async (argv, init) => {
      seen = { argv, init }
      return { exitCode: 0, stdout: '\x1b[1mmain\x1b[0m\nsecond\n' }
    }
    const r = await renderFooter({ ...base, run })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.lines).toEqual([[{ text: 'main', bold: true }], [{ text: 'second' }]])
    expect(seen?.argv).toEqual(['node', '/p/vendor/statusline/bin/cli.js'])
    expect(seen?.init['stdin']).toBe('{"session_id":"s"}')
    expect(seen?.init['env']).toEqual({ COLUMNS: '90' })
    expect(seen?.init['timeoutMs']).toBe(3000)
  })
  test('exit 1 is a failure', async () => {
    const r = await renderFooter({ ...base, run: async () => ({ exitCode: 1, stdout: 'x' }) })
    expect(r).toMatchObject({ ok: false, reason: 'exit' })
  })
  test('the renderer own failure line with exit 0 is a failure', async () => {
    expect(await renderFooter({ ...base, run: ok(' statusline unavailable \n') })).toMatchObject({ ok: false, reason: 'fallback' })
    expect(await renderFooter({ ...base, run: ok(' statusline needs Node 18+ \n') })).toMatchObject({ ok: false, reason: 'fallback' })
  })
  test('no output is a failure', async () => {
    expect(await renderFooter({ ...base, run: ok('\n \n') })).toMatchObject({ ok: false, reason: 'fallback' })
  })
  test('a timeout rejects and is told apart from another error', async () => {
    const slow: RunProc = async () => { throw new Error('process timed out after 3000 ms') }
    expect(await renderFooter({ ...base, run: slow })).toMatchObject({ ok: false, reason: 'timeout' })
    const bad: RunProc = async () => { throw new Error('boom') }
    expect(await renderFooter({ ...base, run: bad })).toMatchObject({ ok: false, reason: 'error' })
  })
  test('control sequences other than colour are dropped from good output', async () => {
    const r = await renderFooter({ ...base, run: ok('\x1b[2Jhello\x1b[?25l\n') })
    expect(r.ok && r.lines).toEqual([[{ text: 'hello' }]])
  })
})

describe('renderFooter, the runs form (076)', () => {
  const base = { cli: '/p/vendor/statusline/bin/cli.js', payload: {}, env: {}, now: clock() }
  test('a runs object is read as lines', async () => {
    const r = await renderFooter({ ...base, run: ok('{"contract":1,"lines":[[{"text":"main","bold":true}],[{"text":"x"}]]}') })
    expect(r).toMatchObject({ ok: true, format: 'runs', lines: [[{ text: 'main', bold: true }], [{ text: 'x' }]] })
  })
  test('ANSI text from a copy that does not know runs still renders', async () => {
    const r = await renderFooter({ ...base, run: ok('\x1b[1mmain\x1b[0m\n') })
    expect(r).toMatchObject({ ok: true, format: 'ansi' })
  })
  test('the error object arrives with exit 75 and names its code', async () => {
    const r = await renderFooter({ ...base, run: async () => ({ exitCode: 75, stdout: '{"contract":1,"error":{"code":"bad-payload","message":"x"}}' }) })
    expect(r).toMatchObject({ ok: false, reason: 'contract-error', code: 'bad-payload' })
  })
  test('a newer contract is a failure of its own', async () => {
    const r = await renderFooter({ ...base, run: ok('{"contract":9,"lines":[[{"text":"a"}]]}') })
    expect(r).toMatchObject({ ok: false, reason: 'contract-newer', contract: 9 })
  })
  test('runs with no lines is not a footer; a non-zero exit with runs is a failure', async () => {
    expect(await renderFooter({ ...base, run: ok('{"contract":1,"lines":[]}') })).toMatchObject({ ok: false, reason: 'fallback' })
    expect(await renderFooter({ ...base, run: async () => ({ exitCode: 1, stdout: '{"contract":1,"lines":[[{"text":"a"}]]}' }) })).toMatchObject({ ok: false, reason: 'exit' })
  })
})
