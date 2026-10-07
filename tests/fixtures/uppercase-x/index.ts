import { featureJson, project, RATIFIED, spec, type Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({
    constitution: RATIFIED,
    featureJson: featureJson('specs/001-auth'),
    features: { '001-auth': { spec: spec(), plan: true, tasks: '- [X] T001 a\n- [x] T002 b\n- [ ] T003 c\n- [ ] T004 d\n' } },
  }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '001', source: 'feature.json' },
    phases: { '001-auth': 'implement' },
    counts: { '001-auth': [2, 4] },
    status: '◆ 001 · implement 50%',
    next: '/speckit-implement',
  },
}
