import { describe, expect, test } from 'claude-code/testing'

import { resolveActive } from '../../hooks/core/active'
import { deriveFeature } from '../../hooks/core/phase'
import { scenario as branchMatch } from '../fixtures/branch-match'
import { scenario as branchWorktree } from '../fixtures/branch-worktree'
import { scenario as dangling } from '../fixtures/feature-json-dangling'
import { scenario as malformed } from '../fixtures/feature-json-malformed'
import { scenario as valid } from '../fixtures/feature-json-valid'
import { scenario as latest } from '../fixtures/latest-fallback'
import { scenario as subdirectory } from '../fixtures/subdirectory-cwd'
import { scenario as windows } from '../fixtures/windows-paths'
import { checkScenario } from '../helpers/scenario'

describe('active feature over the US3 fixtures', () => {
  const all = { valid, dangling, malformed, branchMatch, branchWorktree, latest, subdirectory, windows }
  for (const [name, s] of Object.entries(all)) test(name, () => checkScenario(name, s))
})

describe('resolveActive: rules in isolation', () => {
  const features = ['001-a', '002-b', '003-c'].map(dir => deriveFeature({ dir, spec: '#', plan: true, tasks: '- [ ] T001 x\n' }))
  test('a branch that names no feature falls through to latest', () => {
    expect(resolveActive({ featureJson: { kind: 'missing' }, branch: '009-nope' }, features).active?.source).toBe('latest')
  })
  test('a branch without the NNN- prefix is ignored', () => {
    expect(resolveActive({ featureJson: { kind: 'missing' }, branch: 'main' }, features).active?.dir).toBe('003-c')
  })
  test('nothing to choose gives no active feature, warning kept', () => {
    expect(resolveActive({ featureJson: { kind: 'malformed' } }, [])).toEqual({ warning: 'feature-json-malformed' })
  })
  test('feature.json naming a done feature still wins', () => {
    const done = [deriveFeature({ dir: '001-a', spec: '#', plan: true, tasks: '- [x] T001 x\n' })]
    expect(resolveActive({ featureJson: { kind: 'ok', dir: '001-a' } }, done).active?.source).toBe('feature.json')
  })
})
