import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, RATIFIED, spec, tasks } from '../fixtures/build'
import { completeTurn, installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'
import { featureDirFor, parseWorktrees } from '../../hooks/core/worktrees'

// Spec 037: the Specs tab shows the features the repository's other worktrees work on.
const WORKTREES = 'git worktree list --porcelain'
const LIST = 'worktree /proj\nHEAD abc\nbranch refs/heads/main\n\nworktree /wt/dev\nHEAD def\nbranch refs/heads/026-claude-context\n\nworktree /wt/old\nHEAD 123\ndetached\n'

describe('worktree specs (037)', () => {
  test('parses the porcelain list and finds the folder a branch names', () => {
    expect(parseWorktrees(LIST)).toEqual([{ path: '/proj', branch: 'main' }, { path: '/wt/dev', branch: '026-claude-context' }, { path: '/wt/old' }])
    expect(featureDirFor('026-claude-context', ['025-a', '026-claude-context'])).toBe('026-claude-context')
    expect(featureDirFor('feature/026-x', ['026-claude-context'])).toBe('026-claude-context')
    expect(featureDirFor('main', ['026-claude-context'])).toBeUndefined()
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
    expect(await ui.body()).toContain('⑂ dev  ◐ 026 claude-context  implement 1/3')
    await ui.unmount()
  })
})
