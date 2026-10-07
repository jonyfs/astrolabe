import { featureJson, project, RATIFIED, spec, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, featureJson: featureJson('specs/001-auth'), features: { '001-auth': { spec: spec(), plan: true } } }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '001', source: 'feature.json' },
    phases: { '001-auth': 'tasks' },
    status: '◆ 001 · tasks',
    next: '/speckit-tasks',
  },
}
