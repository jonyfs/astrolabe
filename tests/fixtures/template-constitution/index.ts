import { project, TEMPLATE, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: TEMPLATE }),
  expected: {
    present: true,
    constitution: 'template',
    phases: {},
    status: '◆ no active feature · next: /speckit-constitution',
    next: '/speckit-constitution',
  },
}
