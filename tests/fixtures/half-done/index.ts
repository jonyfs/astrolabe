import { featureJson, project, RATIFIED, spec, tasks, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/002-band-hint'),
    features: {
      '001-core-state': { spec: spec(), plan: true, tasks: tasks(5, 0) },
      '002-band-hint': { spec: spec(), plan: true, tasks: tasks(9, 11) },
    },
  }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '002', source: 'feature.json' },
    phases: { '001-core-state': 'done', '002-band-hint': 'implement' },
    counts: { '001-core-state': [5, 5], '002-band-hint': [9, 20] },
    status: '◆ 002 · implement 45%',
    next: '/speckit-implement',
  },
}
