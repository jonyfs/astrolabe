import { project, RATIFIED, spec, tasks, type Scenario } from '../build'

// Declared done with half the tasks open: front matter wins over inference.
export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, features: { '001-a': { spec: spec('status: done'), plan: true, tasks: tasks(2, 2) } } }),
  expected: {
    present: true,
    constitution: 'ratified',
    phases: { '001-a': 'done' },
    counts: { '001-a': [2, 4] },
    status: '◆ no active feature · next: /speckit-specify',
    next: '/speckit-specify',
  },
}
