

/** The answer kept for the Session tab: its non-blank lines, at most 12 (055 T004). */
export const advisorFindings = (answer: string): string =>
  answer
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim() !== '')
    .slice(0, 12)
    .join('\n')

/** The prompt that asks Claude to have the advisor review a spec (055); the advisor is Claude's own tool. */
export const advisorPrompt = (feature: { id: string; name: string; dir: string }): string =>
  [
    `Review the Spec Kit feature ${feature.id} ${feature.name} with the advisor.`,
    `Read specs/${feature.dir}/spec.md, and plan.md and tasks.md if they exist, then call the advisor tool.`,
    'Report what it finds that is missing, ambiguous, inconsistent between the files, untestable or risky, most serious first.',
    'Do not edit any file; end by proposing the changes for me to approve.',
  ].join(' ')
