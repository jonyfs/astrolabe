# Quickstart: Astrolabe replaces the statusline

1. Install Astrolabe 0.12.0 and remove the `statusLine` entry from `~/.claude/settings.json`.
2. Start a session in a Spec Kit project inside a git repository and run one turn.
3. Under the prompt, read the footer: the Spec Kit part, both usage windows with their resets, the
   context window, the model and effort, the branch with ahead, behind and changed files, the cost
   and the session duration.
4. Narrow the terminal to 80 columns: the duration, cost and git counts drop first.
5. Type `/astrolabe`, press `4`: the Dashboard shows the dial, the phase bars, the usage chart and the
   session counts.
6. Set `icons` to `ascii` in `/config`: every glyph turns into plain characters.
