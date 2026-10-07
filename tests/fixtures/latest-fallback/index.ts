import { featureJson, project, RATIFIED, spec, tasks, type Scenario } from '../build'

const features = {
  '001-done': { spec: spec(), plan: true, tasks: tasks(2, 0) },
  '002-band-hint': { spec: spec(), plan: true, tasks: tasks(9, 11) },
  '003-spinner-narration': { spec: spec(), plan: true, tasks: tasks(1, 3) },
  '004-dropped': { spec: spec('status: abandoned') },
}
void featureJson

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, features, extra: { '.git/HEAD': '4b825dc642cb6eb9a060e54bf8d69288fbee4904\n' } }),
  expected: {
    present: true, constitution: 'ratified', active: { id: '003', source: 'latest' },
    phases: { '001-done': 'done', '002-band-hint': 'implement', '003-spinner-narration': 'implement', '004-dropped': 'abandoned' },
    status: '◆ 003 · implement 25%', next: '/speckit-implement',
  },
}
