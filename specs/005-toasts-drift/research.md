# Research: Phase toasts and the drift alarm

- `$.ui.toast(text)` from any hook; a plugin's newer toast replaces its own on the bar.
- `$.store.get/set` is the plugin's own JSON under the user's config directory; the test kit's
  `mock.store(on)` answers it from memory.
- `tool.call` for `Bash` and `Agent` (the Agent tool; `Task` on older builds) can be hooked by
  name; subagent tool calls carry `agentId`.
