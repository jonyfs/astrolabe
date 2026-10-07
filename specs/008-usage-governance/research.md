# Research: Usage governance

- `session.measure` fires after each main-thread turn and when a window moves a whole point;
  `e.rateLimits[]` = `{ kind: 'five_hour' | 'seven_day' | …, percentUsed, resetsAt? }`; empty off
  a subscription.
- A `tool.call` hook refuses with `{ deny: reason }`; `.catch` keeps a failure from refusing.
- `command.run` input has `origin` (`PromptOrigin`); `composer` is the user's own gesture at the
  terminal.
- `$.prompt.submit({ text })` queues a prompt that starts a turn when the session is idle; text
  starting with `/` is refused (use plain text).
- `$.clock.after(ms, fn)` timers are dropped on reload; `session.start` re-arms from state.
