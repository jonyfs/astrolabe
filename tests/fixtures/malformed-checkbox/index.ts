import { featureJson, project, RATIFIED, spec, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/001-auth'),
    features: {
      '001-auth': { spec: spec(), plan: true, tasks: '# Tasks\n- [] T001 broken\n- [ x] T002 broken\n- [X] T003 ok\n- [ ] T004 ok\n' },
    },
  }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '001', source: 'feature.json' },
    phases: { '001-auth': 'implement' },
    counts: { '001-auth': [1, 2] },
    status: '◆ 001 · implement 50%',
    next: '/speckit-implement',
  },
}
