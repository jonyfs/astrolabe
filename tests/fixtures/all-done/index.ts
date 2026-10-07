import { project, RATIFIED, spec, tasks, type Scenario } from '../build'

// Every feature is done and nothing names one: no active feature by fallback.
export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, features: { '001-auth': { spec: spec(), plan: true, tasks: tasks(4, 0) } } }),
  expected: {
    present: true,
    constitution: 'ratified',
    phases: { '001-auth': 'done' },
    counts: { '001-auth': [4, 4] },
    status: '◆ no active feature · next: /speckit-specify',
    next: '/speckit-specify',
  },
}
