import type { Scenario } from '../build'

export const scenario: Scenario = {
  cwd: '/home/me/notes',
  tree: { '/home/me/notes/README.md': '# Notes\n' },
  expected: { present: false, constitution: 'missing', phases: {}, status: '◆ no Spec Kit' },
}
