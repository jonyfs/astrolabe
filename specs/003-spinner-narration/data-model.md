# Data model: Spinner narrates the current task

No new stored data. Inputs: `state.currentTask` (`id?`, `text`, `startedAt?`), `state.active`,
`memo.runningSkill`, `memo.touched`, the clock, and the surface's `columns`. Output: the
`suffix` string, or undefined to leave the spinner as the engine drew it.
