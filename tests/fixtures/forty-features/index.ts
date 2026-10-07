import { featureJson, project, RATIFIED, spec, tasks, type Scenario } from '../build'

const dirs = [...Array(40).keys()].map(i => `${String(i + 1).padStart(3, '0')}-feature-${i + 1}`)
const features = Object.fromEntries(
  dirs.map((dir, i) => [dir, i === 39 ? { spec: spec(), plan: true, tasks: tasks(3, 7) } : { spec: spec(), plan: true, tasks: tasks(4, 0) }]),
)

export const FORTY_DIRS = dirs

export const scenario: Scenario = {
  cwd: '/proj',
  tree: project({ constitution: RATIFIED, featureJson: featureJson('specs/040-feature-40'), features }),
  expected: {
    present: true,
    constitution: 'ratified',
    active: { id: '040', source: 'feature.json' },
    phases: Object.fromEntries(dirs.map((d, i) => [d, i === 39 ? 'implement' : 'done'])),
    status: '◆ 040 · implement 30%',
    next: '/speckit-implement',
  },
}
