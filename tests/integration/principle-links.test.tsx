import { describe, expect, test } from 'claude-code/testing'

import { featureJson, project, spec, tasks } from '../fixtures/build'
import { installEngine, installTree, startSession } from '../helpers/fake-fs'
import { installPaneEngine, installRenderEngine, mountPane } from '../helpers/render'
import { principleHeadings } from '../../hooks/core/constitution'
import { sessionRows } from '../../hooks/core/pane'

// 054 #83: the constitution's principles link to their heading.
const CONSTITUTION = '# Demo Constitution\n\n## Core Principles\n\n### I. Test First\n\nText.\n\n### II. Small Steps\n\nText.\n\n## Governance\n\n### Amendments\n'

describe('principle links (054 #83)', () => {
  test('each heading under Core Principles with its line', () => {
    expect(principleHeadings(CONSTITUTION)).toEqual([
      { name: 'I. Test First', line: 5 },
      { name: 'II. Small Steps', line: 9 },
    ])
    expect(principleHeadings('# No principles\n')).toEqual([])
    const rows = sessionRows({ present: true, root: '/proj', constitution: 'ratified', principles: principleHeadings(CONSTITUTION), features: [], isAnalyzed: false } as never, 0)
    expect(rows.find(r => r.key === 'session-principle-1')?.href).toBe('file:///proj/.specify/memory/constitution.md#L9')
    expect(rows.findIndex(r => r.key === 'session-principle-0')).toBe(rows.findIndex(r => r.key === 'session-constitution') + 1)
  })

  test('the Session tab lists them under the constitution row', async ($, on) => {
    const tree = project({ constitution: CONSTITUTION, featureJson: featureJson('specs/001-a'), features: { '001-a': { spec: spec(), plan: true, tasks: tasks(0, 2) } } })
    installTree(on, tree, '/proj', { welcomed: 'seeded' })
    installEngine(on)
    installRenderEngine(on)
    installPaneEngine(on)
    await startSession($ as never, '/proj')
    const ui = await mountPane($ as never, 'terminal', 100, 40)
    await ui.press('tab-session')
    const body = await ui.body()
    expect(body).toContain('I. Test First')
    expect(body).toContain('II. Small Steps')
    expect(body).not.toContain('Amendments')
    expect(body.indexOf('I. Test First')).toBeGreaterThan(body.indexOf('ratified'))
    await ui.unmount()
  })
})
