import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'
import { featureDirFor, mergedBranches, parseWorktrees, uncommittedCount, withWorktreeProgress, worktreeName, worktreeState } from '../../hooks/core/worktrees'

// Spec 037: the Specs tab shows the features the repository's other worktrees work on.
const WORKTREES = 'git worktree list --porcelain'
const LIST = 'worktree /proj\nHEAD abc\nbranch refs/heads/main\n\nworktree /wt/dev\nHEAD def\nbranch refs/heads/026-claude-context\n\nworktree /wt/old\nHEAD 123\ndetached\n'

describe('worktree specs (037)', () => {
  test('parses the porcelain list and finds the folder a branch names', () => {
    expect(parseWorktrees(LIST)).toEqual([{ path: '/proj', head: 'abc', branch: 'main' }, { path: '/wt/dev', head: 'def', branch: '026-claude-context' }, { path: '/wt/old', head: '123' }])
    expect(featureDirFor('026-claude-context', ['025-a', '026-claude-context'])).toBe('026-claude-context')
    expect(featureDirFor('feature/026-x', ['026-claude-context'])).toBe('026-claude-context')
    expect(featureDirFor('main', ['026-claude-context'])).toBeUndefined()
  })

  test('parses Windows worktree paths without corrupting their labels', () => {
    const windows = 'worktree C:\\Users\\jony\\work\\main\nHEAD abc\nbranch refs/heads/main\n\nworktree D:\\work\\026-claude-context\nHEAD def\nbranch refs/heads/026-claude-context\n'
    const worktrees = parseWorktrees(windows)
    expect(worktrees.map(w => w.path)).toEqual(['C:\\Users\\jony\\work\\main', 'D:\\work\\026-claude-context'])
    expect(worktreeName(worktrees[1]?.path ?? '')).toBe('026-claude-context')
    expect(featureDirFor(worktrees[1]?.branch, ['026-claude-context'])).toBe('026-claude-context')
  })

  test('the Specs tab lists the feature each other worktree works on, with its progress', async ($, on) => {
    const tree = {
      ...project({ constitution: RATIFIED, featureJson: featureJson('specs/025-a'), features: { '025-a': { spec: spec('status: done'), plan: true, tasks: tasks(2, 0) } } }),
      '/proj/.git/HEAD': 'ref: refs/heads/main\n',
      ...project({ root: '/wt/dev', features: { '026-claude-context': { spec: spec(), plan: true, tasks: tasks(1, 2) } } }),
    }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[WORKTREES] = { stdout: LIST }
    await startSession($, '/proj')
    await completeTurn($)
    await session.clock.advance(1000)
    expect(session.processes).toContain(WORKTREES)
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    const body = await ui.body()
    const featureRow = body.match(/▸ ● 025 a\s+done/)?.[0] ?? ''
    const worktreeRow = body.match(/⑂026 claude-context\s+implement/)?.[0] ?? ''
    expect(worktreeRow).not.toBe('')
    expect(featureRow.indexOf('025') + 4).toBe(featureRow.indexOf('a'))
    expect(worktreeRow.indexOf('026') + 4).toBe(worktreeRow.indexOf('claude-context'))
    expect(featureRow.indexOf('done') - featureRow.indexOf('025')).toBe(worktreeRow.indexOf('implement') - worktreeRow.indexOf('026'))
    expect(body).toContain('1/3')
    await ui.unmount()
  })

  test('054 #50 #51: a worktree shows its uncommitted files, and `merged` with the command that removes it', async ($, on) => {
    expect(uncommittedCount(' M a.ts\n?? b.ts\n')).toBe(2)
    expect([...mergedBranches('* main\n+ 026-claude-context\n  old\n')]).toEqual(['main', '026-claude-context', 'old'])
    expect(worktreeState({ path: '/wt/dev', changed: 3, merged: true })).toBe('  · 3 uncommitted  · merged · git worktree remove /wt/dev')
    expect(worktreeState({ path: '/wt/dev', changed: 0 })).toBe('')
    const tree = {
      ...project({ constitution: RATIFIED, featureJson: featureJson('specs/025-a'), features: { '025-a': { spec: spec('status: done'), plan: true, tasks: tasks(2, 0) } } }),
      '/proj/.git/HEAD': 'ref: refs/heads/main\n',
      ...project({ root: '/wt/dev', features: { '026-claude-context': { spec: spec(), plan: true, tasks: tasks(1, 2) } } }),
    }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    session.script.processes[WORKTREES] = { stdout: LIST }
    session.script.processes['git branch --merged main'] = { stdout: '* main\n+ 026-claude-context\n' }
    session.script.processes['git status --porcelain'] = { stdout: ' M a.ts\n' }
    await startSession($, '/proj')
    await completeTurn($)
    await session.clock.advance(1000)
    const ui = await mountPane($ as never, 'terminal', 140, 40)
    expect(await ui.body()).toContain('⑂026 claude-context  implement  1/3  · 1 uncommitted  · merged · git worktree remove /wt/dev')
    await ui.unmount()
  })

  test('054 #55: a worktree with more of the same tasks ticked lends its count to the feature', () => {
    const features = [{ id: '026', done: 1, total: 3 }, { id: '027', done: 2, total: 5 }]
    const worktrees = [{ id: '026', done: 2, total: 3 }, { id: '027', done: 4, total: 6 }]
    expect(withWorktreeProgress(features, worktrees)).toEqual([{ id: '026', done: 2, total: 3 }, { id: '027', done: 2, total: 5 }])
    expect(withWorktreeProgress(features, undefined)).toEqual(features)
  })

  test('054 #4: an unchanged HEAD reuses feature progress but still refreshes working-tree status', async ($, on) => {
    const tree = {
      ...project({ constitution: RATIFIED, featureJson: featureJson('specs/025-a'), features: { '025-a': { spec: spec('status: done'), plan: true, tasks: tasks(2, 0) } } }),
      '/proj/.git/HEAD': 'ref: refs/heads/main\n',
      ...project({ root: '/wt/dev', features: { '026-claude-context': { spec: spec(), plan: true, tasks: tasks(1, 2) } } }),
    }
    const session = installTree(on, tree, '/proj')
    installEngine(on)
    session.script.processes[WORKTREES] = { stdout: LIST }
    session.script.processes['git branch --merged main'] = { stdout: '* main\n' }
    session.script.processes['git status --porcelain'] = { stdout: ' M a.ts\n' }
    await startSession($, '/proj')
    await completeTurn($)
    await session.clock.advance(0)
    const worktreeReads = () => session.counts.reads.filter(path => path.startsWith('/wt/dev/specs/')).length
    expect(worktreeReads()).toBeGreaterThan(0)
    const reads = worktreeReads()
    session.script.processes['git status --porcelain'] = { stdout: ' M a.ts\n?? b.ts\n' }
    await completeTurn($)
    await session.clock.advance(0)
    expect(worktreeReads()).toBe(reads)
    expect(session.processes.filter(command => command === 'git status --porcelain')).toHaveLength(2)
    expect(session.logs).toEqual([])
  })
})
