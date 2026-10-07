import { project, RATIFIED, spec, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, features: { '001-a': { spec: spec('track: quick') } } }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '001', source: 'latest' },
    phases: { '001-a': 'implement' },
    status: '◆ 001 · implement',
    next: '/speckit-analyze',
  },
}
