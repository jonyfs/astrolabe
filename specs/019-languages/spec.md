---
track: quick # quick | full
status: done # active | done | abandoned
---

# Quick spec: The interface in the person's language

**Created**: 2026-10-07 · **Source**: roadmap #46, with the owner's note: follow the language the person uses, with dictionaries for English, Spanish, French and Brazilian Portuguese

## Requirements

- **FR-001**: A dictionary MUST hold every text the person reads, in `en`, `pt-BR`, `es` and
  `fr`: the pane (tabs, rows, warnings, Session labels), the Dashboard (headings and KPIs), the
  governor's question and its answers, the phase and drift toasts, the status entry's words, the
  update row's `hide`, and `/astrolabe help`. Every language keeps every placeholder.
- **FR-002**: A new option `language` (`auto`, `en`, `pt-BR`, `es`, `fr`; default `auto`). `auto`
  is the language of the person's own prompts, guessed from common words and accents; English
  until a prompt says enough. A prompt a plugin sends, a slash command or a few words never
  change it. The guess is kept in the session state, so a reload keeps it.
- **FR-003**: What Claude reads (refusals, the resume and run prompts) stays in English.
- **FR-004**: Version 0.13.0; README updated.

## Tasks

- [X] T001 Tests: `tests/core/i18n.test.ts` (placeholders, the option, the guess) and `tests/integration/languages.test.tsx`
- [X] T002 `hooks/core/i18n.ts`; the language threaded through pane, dashboard, governor questions, toasts, status text, footer, ask and band surfaces, help
- [X] T003 The `language` option, the guess on `prompt.submit`, `SessionStats.language`; README and version 0.13.0

Note: the dictionaries were written before their tests in this spec; the tests were added in the same change.
