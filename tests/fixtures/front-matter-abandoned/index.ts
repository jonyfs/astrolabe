import { project, RATIFIED, spec, tasks, type Scenario } from '../build'

// The newest feature is abandoned: the fallback skips it.
export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({
    constitution: RATIFIED,
    features: {
      '001-a': { spec: spec(), plan: true, tasks: tasks(1, 1) },
      '002-b': { spec: spec('status: abandoned'), plan: true, tasks: tasks(0, 3) },
    },
  }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '001', source: 'latest' },
    phases: { '001-a': 'implement', '002-b': 'abandoned' },
    status: '◆ 001 · implement 50%',
    next: '/speckit-implement',
  },
}
