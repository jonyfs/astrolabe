import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { drawBand, installRenderEngine } from '../helpers/render'

// Spec 069: the live table above the prompt. Gate rows come from the process list, read on the
// clock around a command that may run a git hook; drawing reads state only.
const PS = 'ps -axo pid=,ppid=,etime=,command='
const PROCESSES = [
  '  100     1    05:12 /usr/bin/zsh',
  '  200   100       14 /proj/.git/hooks/pre-commit',
  '  201   200       13 /bin/sh /proj/scripts/gates.sh',
  '  202   201       12 /bin/sh /proj/scripts/review.test.sh',
].join('\n')

const setup = async ($: never, on: never, ps = PROCESSES) => {
  const session = installTree(on, halfDone.tree, '/proj')
  installEngine(on)
  installRenderEngine(on)
  session.script.processes[PS] = { stdout: ps }
  await startSession($, '/proj')
  return session
}

const tableOf = async ($: never): Promise<string> => {
  const ui = await ($ as { ui: { mount: (o: never) => Promise<{ find: (q: never) => Promise<{ text?: string } | undefined>; unmount: () => Promise<void> }> } }).ui.mount({
    plugin: 'astrolabe',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { bodyColumns: 180, hasSurvey: false },
  } as never)
  const table = await ui.find({ key: 'astrolabe-live-table' } as never)
  await ui.unmount()
  return table?.text ?? ''
}

describe('the live table (069)', () => {
  test('a commit that runs a hook shows one gate row with its chain', async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(await tableOf($ as never)).toBe('')
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'git commit -m "x"' } as never)
    await session.clock.advance(1000)
    await session.clock.settle()
    const text = await tableOf($ as never)
    expect(text).toContain('pre-commit')
    expect(text).toContain('gates.sh › review.test.sh')
    expect(text).toContain('running')
    expect(text.match(/gates\.sh/g)?.length).toBe(1)
  })

  test('a plain command never reads the process list', async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'ls' } as never)
    await session.clock.advance(60_000)
    expect(session.processes).not.toContain(PS)
  })

  test('liveRows=agents hides the gates; off hides them too', { options: { liveRows: 'agents' } }, async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'git commit -m "x"' } as never)
    await session.clock.advance(1000)
    await session.clock.settle()
    expect(session.processes).not.toContain(PS)
    expect(await tableOf($ as never)).toBe('')
  })

  test('a running subagent is a row from its start to its end', async ($, on) => {
    const session = installTree(on as never, halfDone.tree, '/proj')
    const engine = installEngine(on as never)
    installRenderEngine(on as never)
    void session
    await startSession($ as never, '/proj')
    engine.holdAgents()
    const call = $.tool.call({ tool: 'Agent', tool_use_id: 'a1', description: 'Review the spec', subagent_type: 'Explore', model: 'claude-opus-5-5' } as never)
    await new Promise(resolve => setTimeout(resolve, 50))
    const during = await tableOf($ as never)
    engine.releaseAgents()
    await call
    const after = await tableOf($ as never)
    expect(during).toContain('Review the spec')
    expect(during).toContain('opus')
    expect(after).toBe('')
  })

  test('drawing reads no file and runs no process', async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'git push' } as never)
    await session.clock.advance(1000)
    await session.clock.settle()
    const reads = session.counts.read + session.counts.exists + session.counts.list
    const ran = session.processes.length
    await drawBand($ as never, 'terminal', 180)
    expect(session.counts.read + session.counts.exists + session.counts.list).toBe(reads)
    expect(session.processes.length).toBe(ran)
  })
})
