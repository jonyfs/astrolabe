import { featureJson, project, RATIFIED, spec, tasks, type Scenario } from '../build'

const features = {
  '001-done': { spec: spec(), plan: true, tasks: tasks(2, 0) },
  '002-band-hint': { spec: spec(), plan: true, tasks: tasks(9, 11) },
  '003-spinner-narration': { spec: spec(), plan: true, tasks: tasks(1, 3) },
  '004-dropped': { spec: spec('status: abandoned') },
}
void featureJson

// A monorepo: the session starts deep inside a package; .git sits above the Spec Kit root.
export const scenario: Scenario = {
  cwd: '/mono/packages/app/src/lib',
  tree: {
    ...project({ root: '/mono/packages/app', constitution: RATIFIED, features }),
    '/mono/.git/HEAD': 'ref: refs/heads/002-band-hint\n',
    '/mono/packages/app/src/lib/x.ts': '',
  },
  expected: {
    present: true, constitution: 'ratified', active: { id: '002', source: 'branch' },
    phases: { '001-done': 'done', '002-band-hint': 'implement', '003-spinner-narration': 'implement', '004-dropped': 'abandoned' },
    status: '◆ 002 · implement 45%', next: '/speckit-implement',
  },
}
