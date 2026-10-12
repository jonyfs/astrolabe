import { describe, expect, test } from 'claude-code/testing'

import { scenario as halfDone } from '../fixtures/half-done'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'

// Spec 053: the tabs follow what Claude does during a turn, not only when the turn ends.
// Each test gets its own copy of the tree: they write into it, and the fixture is shared.
let tree: Record<string, string> = {}
const setup = async ($: never, on: never) => {
  tree = { ...(halfDone.tree as Record<string, string>) }
  const session = installTree(on, tree, halfDone.cwd)
  installEngine(on)
  await startSession($, halfDone.cwd)
  return session
}

describe('live sync (053)', () => {
  test('a Write of .specify/feature.json switches the active feature at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(session.held()?.state.active?.id).toBe('002')
    tree['/proj/.specify/feature.json'] = '{ "feature_directory": "specs/001-core-state" }'
    await $.tool.call({ tool: 'Write', tool_use_id: 'w', file_path: '/proj/.specify/feature.json', content: tree['/proj/.specify/feature.json'] } as never)
    expect(session.held()?.state.active?.id).toBe('001')
  })
  test('a Bash command that makes a new spec shows it at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    tree['/proj/specs/004-new-thing/spec.md'] = '# Feature Specification: New thing\n'
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'bash .specify/scripts/bash/create-new-feature.sh "new thing"' } as never)
    expect(session.held()?.state.features.map(f => f.id)).toContain('004')
  })
})

describe('progress follows the files mid-turn (investigate: stale progress)', () => {
  const TASKS = '/proj/specs/002-band-hint/tasks.md'
  const countOf = (session: Awaited<ReturnType<typeof setup>>) => {
    const f = session.held()?.state.features.find((x: { id: string }) => x.id === '002')
    return [f?.done, f?.total]
  }
  test('a Bash command that ticks a task shows the new count before the turn ends', async ($, on) => {
    const session = await setup($ as never, on as never)
    expect(countOf(session)).toEqual([9, 20])
    tree[TASKS] = tree[TASKS]!.replace('- [ ] T010', '- [x] T010')
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: "sed -i 's/\\[ \\] T010/[x] T010/' specs/002-band-hint/tasks.md" } as never)
    expect(countOf(session)).toEqual([10, 20])
  })
  test('a subagent that returns after ticking tasks shows them at once', async ($, on) => {
    const session = await setup($ as never, on as never)
    tree[TASKS] = tree[TASKS]!.replace('- [ ] T010', '- [x] T010').replace('- [ ] T011', '- [x] T011')
    await $.tool.call({ tool: 'Agent', tool_use_id: 'a', description: 'run T010 and T011', prompt: 'go' } as never)
    expect(countOf(session)).toEqual([11, 20])
  })
  test('a tool Astrolabe does not know (an MCP file writer) that changed the file shows it too', async ($, on) => {
    const session = await setup($ as never, on as never)
    tree[TASKS] = tree[TASKS]!.replace('- [ ] T010', '- [x] T010')
    await $.tool.call({ tool: 'mcp__desktop-commander__write_file', tool_use_id: 'm', path: TASKS, content: tree[TASKS] } as never)
    expect(countOf(session)).toEqual([10, 20])
  })
})

describe('the freshness probe is cheap (investigate: stale progress)', () => {
  const TASKS = '/proj/specs/002-band-hint/tasks.md'
  const countOf = (session: Awaited<ReturnType<typeof setup>>) => {
    const f = session.held()?.state.features.find((x: { id: string }) => x.id === '002')
    return [f?.done, f?.total]
  }
  test('an unchanged file costs stats only: no read, no list, no state write', async ($, on) => {
    const session = await setup($ as never, on as never)
    // The first shell command marks the drift window (009); the probes after it write nothing.
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b0', command: 'make build' } as never)
    const reads = session.counts.read + session.counts.list
    const writes = session.stateSets.speckit ?? 0
    for (let i = 1; i < 6; i += 1) await $.tool.call({ tool: 'Bash', tool_use_id: `b${i}`, command: 'make build' } as never)
    expect(session.counts.read + session.counts.list).toBe(reads)
    expect(session.stateSets.speckit ?? 0).toBe(writes)
    expect(session.counts.stat).toBeGreaterThan(0)
  })
  test('a plain command that wrote the file is seen by the probe, one read of that feature', async ($, on) => {
    const session = await setup($ as never, on as never)
    tree[TASKS] = tree[TASKS]!.replace('- [ ] T010', '- [x] T010')
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b', command: 'make tick TASK=T010' } as never)
    expect(countOf(session)).toEqual([10, 20])
  })
  test('while a turn runs, a file changed from outside shows within seconds, with no tool call', async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.prompt.submit({ text: 'implement', origin: { kind: 'composer' } } as never)
    tree[TASKS] = tree[TASKS]!.replace('- [ ] T010', '- [x] T010')
    await session.clock.advance(2500)
    expect(countOf(session)).toEqual([10, 20])
  })
  test('after the turn ends the probe stops: no stats while idle', async ($, on) => {
    const session = await setup($ as never, on as never)
    await $.prompt.submit({ text: 'implement', origin: { kind: 'composer' } } as never)
    await completeTurn($)
    const stats = session.counts.stat
    await session.clock.advance(20_000)
    expect(session.counts.stat).toBe(stats)
  })
})

describe('live sync costs nothing for a plain command (054 #5)', () => {
  test('ls reads nothing; git checkout reads again', async ($, on) => {
    const session = await setup($ as never, on as never)
    const before = session.counts.read + session.counts.list
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'ls -la' } as never)
    expect(session.counts.read + session.counts.list).toBe(before)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'b2', command: 'git checkout 001-core-state' } as never)
    expect(session.counts.read + session.counts.list).toBeGreaterThan(before)
  })
})

describe('session activity sync (053 T004)', () => {
  test('tool calls update the Session activity rows before the turn ends', async ($, on) => {
    installRenderEngine(on)
    installPaneEngine(on)
    await setup($ as never, on as never)
    const ui = await mountPane($ as never, 'terminal')
    await ui.press('tab-session')
    expect(await ui.body()).toMatch(/tool calls\s+0/)
    await $.tool.call({ tool: 'Search', tool_use_id: 'search-1' } as never)
    expect(await ui.body()).toMatch(/tool calls\s+1/)
    await ui.unmount()
  })
})

describe('git status sync after Bash (053 T005)', () => {
  test('read-only git commands skip status; a checkout refreshes the Session branch row', async ($, on) => {
    tree = { ...(halfDone.tree as Record<string, string>), '/proj/.git/HEAD': 'ref: refs/heads/main\n' }
    const session = installTree(on, tree, halfDone.cwd)
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes['git status --porcelain=v2 --branch --show-stash'] = {
      stdout: '# branch.oid abc123\n# branch.head main\n# branch.ab +0 -0\n',
    }
    await startSession($ as never, halfDone.cwd)
    const ui = await mountPane($ as never, 'terminal')
    await ui.press('tab-session')
    expect(await ui.body()).not.toMatch(/branch\s+main/)
    const writes = session.stateSets.session ?? 0
    await $.tool.call({ tool: 'Bash', tool_use_id: 'git-status', command: 'git status' } as never)
    expect(session.processes.filter(p => p === 'git status --porcelain=v2 --branch --show-stash')).toHaveLength(0)
    expect(await ui.body()).not.toMatch(/branch\s+main/)
    await $.tool.call({ tool: 'Bash', tool_use_id: 'git-checkout', command: 'git checkout feature' } as never)
    expect(await ui.body()).toMatch(/branch\s+main/)
    expect(session.stateSets.session).toBeGreaterThan(writes)
    expect(session.processes.filter(p => p === 'git status --porcelain=v2 --branch --show-stash')).toHaveLength(1)
    await ui.unmount()
  })

  test('the turn-end status read is skipped until a tool may have changed files or HEAD', async ($, on) => {
    const session = installTree(on, { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }, '/proj')
    installEngine(on)
    session.script.processes['git status --porcelain=v2 --branch --show-stash'] = {
      stdout: '# branch.oid abc123\n# branch.head main\n# branch.ab +0 -0\n',
    }
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    const statuses = () => session.processes.filter(p => p === 'git status --porcelain=v2 --branch --show-stash').length
    expect(statuses()).toBe(1)
    await completeTurn($ as never)
    expect(statuses()).toBe(1)
    await $.tool.call({ tool: 'Write', tool_use_id: 'write-file', file_path: '/proj/README.md', content: 'updated' } as never)
    await completeTurn($ as never)
    expect(statuses()).toBe(2)
  })
})

describe('Claude spinning on a task (054 #85)', () => {
  test('three turns on the same task without a tick toast once', async ($, on) => {
    const session = await setup($ as never, on as never)
    await completeTurn($ as never)
    await completeTurn($ as never)
    expect(session.toasts.some(t => t.includes('three turns'))).toBe(false)
    await completeTurn($ as never)
    await completeTurn($ as never)
    expect(session.toasts.filter(t => t.includes('three turns on T010'))).toHaveLength(1)
  })
})

describe('idle poller and manual refresh (058)', () => {
  const status = 'git status --porcelain=v2 --branch --show-stash'
  const arm = async ($: never, on: never) => {
    const session = installTree(on, { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[status] = { stdout: '# branch.oid abc123\n# branch.head main\n# branch.ab +0 -0\n' }
    await startSession($, '/proj')
    await completeTurn($)
    return session
  }

  test('ten idle minutes after a turn re-read git; the poller stops after six', async ($, on) => {
    const session = await arm($ as never, on as never)
    const statuses = () => session.processes.filter(p => p === status).length
    const before = statuses()
    await session.clock.advance(9 * 60_000)
    expect(statuses()).toBe(before)
    await session.clock.advance(61_000)
    expect(statuses()).toBe(before + 1)
    await session.clock.advance(10 * 6 * 60_000)
    expect(statuses()).toBe(before + 6)
    await session.clock.advance(60 * 60_000)
    expect(statuses()).toBe(before + 6)
  })

  test('r refreshes the pane now, even before the idle time', async ($, on) => {
    const session = await arm($ as never, on as never)
    const statuses = () => session.processes.filter(p => p === status).length
    const before = statuses()
    const ui = await mountPane($ as never, 'terminal', 100, 30)
    await ui.press('refresh')
    expect(statuses()).toBe(before + 1)
    await ui.unmount()
  })
})

describe('the idle poller waits for a running turn (058)', () => {
  test('a prompt cancels it: eleven minutes inside a turn read nothing', async ($, on) => {
    const status = 'git status --porcelain=v2 --branch --show-stash'
    const session = installTree(on as never, { ...halfDone.tree, '/proj/.git/HEAD': 'ref: refs/heads/main\n' }, '/proj')
    installEngine(on as never)
    session.script.processes[status] = { stdout: '# branch.oid abc123\n# branch.head main\n# branch.ab +0 -0\n' }
    await startSession($ as never, '/proj')
    await completeTurn($ as never)
    const statuses = () => session.processes.filter(p => p === status).length
    const before = statuses()
    await $.prompt.submit({ text: 'keep going', origin: { kind: 'composer' } } as never).catch(() => undefined)
    await session.clock.advance(11 * 60_000)
    expect(statuses()).toBe(before)
  })
})
