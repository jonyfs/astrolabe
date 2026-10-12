# Research: Design Tokens

Measured on 2026-10-12 with the same relative-luminance formula `hooks/core/theme.ts` and `tests/core/theme.test.ts` use. Bases are the test's `BASE` table.

## R1 `faint` values per flavor

**Decision**: `faint` is Catppuccin overlay2 where it reaches 4.5:1 and a darker value where it does not.

| Flavor | Base | overlay2 | Ratio | Chosen `faint` | Ratio |
|---|---|---|---|---|---|
| mocha | `#1e1e2e` | `#9399b2` | 5.81 | `#9399b2` | 5.81 |
| frappe | `#303446` | `#949cbb` | 4.53 | `#949cbb` | 4.53 |
| macchiato | `#24273a` | `#939ab7` | 5.29 | `#939ab7` | 5.29 |
| latte | `#eff1f5` | `#7c7f93` | 3.49 | `#686b80` | 4.64 |
| colorblind | `#151515` | none | n/a | `#9a9a9a` | above 6 |

**Rationale**: the spec asks for the matching Catppuccin value in each flavor and 4.5:1 on its base. Latte's overlay2 fails the second condition, so the contrast rule wins and latte gets a darker grey, still lighter than `muted` (`#5c5f77`, 5.53) so the two roles stay distinct. Frappe passes with a thin margin (4.53); the test guards it.

**Alternatives**: reuse `muted` as the muted-text role (no new role, but then rules and text cannot be told apart in review); lighten the frappe base (changes every surface).

**Current pending ratios** for the record: mocha 3.36, frappe 2.87, macchiato 3.15, latte 2.30. `pending` stays for rules, separators and glyphs only.

## R2 The yellow in the ramp

**Decision**: add a theme role `warn` holding Catppuccin yellow, darkened in latte until it reaches 4.5:1 on latte's base. The ramp maps ok to `done`, warn to `warn`, block to `blocked`. For footer chips it maps to the existing chip colours `green`, `yellow`, `red`.

**Rationale**: the spec says yellow with `▵`. Today `rampOf` in `footer.ts` returns chip colour names while panes colour text with `current` (peach), which is the cause of "81% in peach". A role is the only way text surfaces and chips share one answer without a literal colour (Principle IX). `current` stays peach: it means "the current step", not a warning level.

**Alternatives**: reuse `current` for warn (keeps peach, contradicts the spec); keep chip names only (leaves the text surfaces on peach).

**Open for the test**: latte yellow candidate values are checked by the contrast test, not chosen by hand here. Task 5 finds the lightest value that passes.

## R3 Duration format

**Decision**: one function. Under 60 seconds `40s`; under one hour `4m12s`; one hour or more `2h09m`; not a finite number `?`. A reset under a day counts down with that function; beyond a day it prints weekday and time (`Thu 18:00`).

**Rationale**: it is the format in the spec. It replaces seven copies of the minutes-only format in `footer.ts`, `governor.ts` (twice), `pane.ts`, `summary.ts`, `dashboard.ts` and `spinner.ts` (`formatElapsed`), which today print `4m` and `2h09m` only. Seconds appear for anything under an hour unless they are zero, so a reset 42 minutes and 5 seconds away prints `42m05s` and one exactly 42 minutes away prints `42m`. The spinner's `2m` became `2m05s`; that is the visible change. Estimates ("in about 12m") are rounded to whole minutes before formatting.

**Draw cost**: the footer redraws on the existing clock tick; formatting is pure arithmetic.

**Alternatives**: seconds only for elapsed timers and minutes for countdowns (two formats, against the spec).

## R4 Glyph width test scope

**Decision**: the width test asserts three things: every state glyph in `STATE_GLYPHS` (`‖`, `◷`, `▲`) measures 1 with `textWidth`; every entry of the nerd set measures 1; every entry of the ascii set is printable ASCII. The emoji set may hold wide entries only when they appear in a declared list (`EMOJI_WIDE`). `textWidth` loses its special cases for `⏳`, `⏱` and `⚠`, so it treats wide-ness by code point only.

**Rationale**: ascii entries such as `stash:` are labels, not single glyphs, so "width 1" applies to glyphs and to the nerd set. The emoji set legitimately carries `⏳ ⏱ ⚠` today; those remain as declared entries so Windows terminals without Nerd Fonts keep a glyph, while every state mark in pane and footer text uses the narrow ones.

**Alternatives**: remove the emoji set (breaks users who chose it); assert width 1 for the ascii set literally (fails on every label).

## R5 One key-verb table

**Decision**: a data table in `keys.ts`: `r` refresh, `q` run queued, `?` help (alias `h`), `/` filter, `c` clear, `o` order, `p` priority, `a` advisor, `space` page, `esc` close. The pane's existing legend and help read it. The tab restructure and the legend row are spec 066; this spec only makes the verbs one table and removes conflicts.

**Rationale**: Principle X, presets are data. Spec 066 reads the same table.

**Alternatives**: leave verbs inline per tab (the source of today's drift).

## R6 Message prefix scope

**Decision**: `message.ts` produces `astrolabe ✓ <text>` and `astrolabe ▲ <text>` for toasts and the status entry. `toasts.ts` replaces its `🧭` prefix. The `astrolabe:` strings in `register.tsx` go to `$.ui.log(..., { to: 'debug' })`, which is a log, not a toast or the status entry, so they stay.

**Rationale**: the spec names toasts and the status entry; the debug log is for developers. The success-versus-warning mark follows `STATUS_ROLE` (`done` and `current`/`blocked`).

**Alternatives**: rewrite debug logs too (churn, no user benefit).

## R7 Ids

**Decision**: task ids are passed through unchanged from `tasks-parser.ts`'s `ID` match; feature ids are padded on the right with spaces to the widest id of the project's features (`ids.ts`), minimum 3. Zero-padding would change the id a person searches for. Surfaces that cut text call a helper that never cuts the id.

**Rationale**: `pane.ts:624` already pads spec numbers to 3 in one place only; there is no project-wide width. The helper makes the rule one function.

## R8 Where snapshots live and what they cover

**Decision**: `tests/core/snapshots.test.ts` renders band, status, footer and pane text through the same core functions the adapters call, for five flavors and widths 80, 100, 144 and 200, with a fixed `now`. The live table has no code yet (spec 069), so its snapshot is added there; this spec's acceptance covers the four surfaces that exist.

**Rationale**: the spec lists the live table among surfaces; honest scope is the code that exists. Spec 069 inherits the snapshot harness.

**Alternatives**: stub a live table here (dead code).
