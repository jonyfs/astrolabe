import { featureJson, project, RATIFIED, spec, tasks, type Scenario } from '../build'

const features = {
  '001-done': { spec: spec(), plan: true, tasks: tasks(2, 0) },
  '002-band-hint': { spec: spec(), plan: true, tasks: tasks(9, 11) },
  '003-spinner-narration': { spec: spec(), plan: true, tasks: tasks(1, 3) },
  '004-dropped': { spec: spec('status: abandoned') },
}
void featureJson

// The checkout is a git worktree: .git is a file pointing at the real git dir.
export const scenario: Scenario = {
  cwd: '/work/proj-002',
  tree: {
    ...project({ root: '/work/proj-002', constitution: RATIFIED, features, extra: { '.git': 'gitdir: ../main/.git/worktrees/proj-002\n' } }),
    '/work/main/.git/worktrees/proj-002/HEAD': 'ref: refs/heads/002-band-hint\n',
  },
  expected: {
    present: true, constitution: 'ratified', active: { id: '002', source: 'branch' },
    phases: { '001-done': 'done', '002-band-hint': 'implement', '003-spinner-narration': 'implement', '004-dropped': 'abandoned' },
    status: '◆ 002 · implement 45%', next: '/speckit-implement',
  },
}
