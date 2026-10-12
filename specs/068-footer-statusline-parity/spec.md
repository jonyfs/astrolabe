---
track: full # quick | full
status: active # active | done | abandoned
---

# Feature Specification: Footer and Statusline Parity

**Feature Branch**: `068-footer-statusline-parity`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Bring everything jonyfs/statusline shows into Astrolabe's three-line footer, in the places a mod may draw, so Astrolabe fully replaces the statusline."

**Depends on**: [064-design-tokens](../064-design-tokens/spec.md) and [065-band-and-status](../065-band-and-status/spec.md). **Umbrella**: [063-design-review](../063-design-review/spec.md), tasks T041, T042 and T045 to T050 (improvements #41, #42 and #45 to #50).

**Design reference**: Claude Design canvas (https://claude.ai/code/artifact/65ee4724-d195-4e86-83e2-a438c2757e04), board 7 "statusline → Astrolabe: gaps and three-line footer" (viewer https://claude.ai/artifact/57GUjfZyCCac7Qj3VkrbkL, anchor `#b7`; static copy `docs/design/astrolabe-redesign.html`). Source of the features: https://github.com/jonyfs/statusline README sections "What it knows about the work", "Git and GitHub status", "Where a number is heading", "Segments brighten when something changes", "Clickable names", "Asking what a segment shows".

## Footer layout

The footer keeps statusline's line order (`footerLines=3`), drawn as chips:

- **L1 place and git**: `⌂ astrolabe │ jonyfs/astrolabe │ ⎇ 063-statusline-parity ⇐ main │ ●3 +7 ✖2 ⇡2 ⇣5 │ +156 −23 │ PR #41 draft · ux │ ✓ CI`
- **L2 work**: `◆ 059 specify │ ❖ humanizer, dataviz, mermaid +2 │ ▸ Fix authentication (1/3) │ ● working │ NORMAL`
- **L3 model and limits**: `opus 5.5 · high · fast │ ctx 41% │ 5h 72%▵ · 2h09m │ 7d 84%▴ · Thu 18:00 │ spend 40% · 1d │ cache warm · 1m │ ⇡ 9%/h · 5h limit ~16:40 │ 1h12m │ rtk 66%`
- **Hover row**: `↳ <one sentence explaining the chip under the pointer>`

It draws at the bottom of the pane (`footerIn=pane`), under the prompt (`footerIn=status`), or both.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Git and CI at a glance (Priority: P1)

A user reads place, branch, changes and CI on line 1 and can trust each counter: conflicts apart from changes, ahead and behind only with an upstream, the short commit id on a detached HEAD, a worktree naming its origin branch, the start directory following Claude when it moved, and the last CI run for the branch.

**Why this priority**: Replacing the statusline starts with its git facts.

**Independent Test**: Draw line 1 for each fixture git state.

**Acceptance Scenarios**:

1. **Given** merge conflicts, **When** line 1 is drawn, **Then** `✖n` counts them apart from changes.
2. **Given** a branch with an upstream, **When** drawn, **Then** `⇡n` and `⇣n` show ahead and behind; **Given** no upstream, **Then** no counters show at all.
3. **Given** a detached HEAD, **When** drawn, **Then** the short commit id shows with no link.
4. **Given** a worktree, **When** drawn, **Then** it reads `wt ⇐ main`.
5. **Given** Claude moved to `src` during the session, **When** drawn, **Then** it reads `⌂ src ⇐ astrolabe`.
6. **Given** the last CI run for the branch, **When** drawn, **Then** it shows `✓ CI`, `✖ CI` or `◷ CI`.
7. **Given** a pull request, **When** drawn, **Then** it shows draft state and labels.
8. **Given** directory, repository, branch, CI and PR chips, **When** inspected, **Then** each is a link; session, model and limit chips carry no link.

---

### User Story 2 - Know when the prompt cache is about to go cold (Priority: P1)

A user sees a cache chip only when it matters: silent while warm with time to spare, `cache warm · 1m` in the last 2 minutes of a 5-minute cache or the last 10 of an hour, and `cache cold · 182k · tools changed` once cold, with the reason when the payload gives one.

**Why this priority**: A cold cache silently costs time and money.

**Independent Test**: Feed fixture payloads for each state and reason.

**Acceptance Scenarios**:

1. **Given** a warm cache with time to spare, **When** drawn, **Then** no cache chip shows.
2. **Given** the last 2 minutes of a 5-minute cache, **When** drawn, **Then** `cache warm · 1m` shows.
3. **Given** a cold cache with reason `tools changed`, **When** drawn, **Then** `cache cold · 182k · tools changed` shows; reasons are tools changed, prompt changed, model changed, history rewritten, server side; a plain expiry shows no reason.
4. **Given** narrow width, **When** drawn, **Then** the reason drops first, then the token count.
5. **Given** the cache goes cold, **When** it happens, **Then** one toast appears.
6. **Given** any payload, **When** drawn, **Then** nothing is estimated or turned into a price.

---

### User Story 3 - Skills, todo and model facts on lines 2 and 3 (Priority: P2)

A user sees skills in play as one chip (`❖ a, b, c +2`: five names, then a count; the session's own skills only), todo progress (`▸ <title> (1/3)`) leading line 2 when no Spec Kit task is active, the gateway spend-limit chip with its reset (past 100% when the payload says so), and `fast` beside the effort while fast mode is on.

**Why this priority**: Parity with statusline's work and model segments.

**Independent Test**: Draw line 2 and 3 with and without an active Spec Kit task and with fast mode.

**Acceptance Scenarios**:

1. **Given** seven skills in play, **When** drawn, **Then** five names show and `+2`; subagents' skills do not count.
2. **Given** no active Spec Kit task, **When** drawn, **Then** the todo chip leads line 2; **Given** one, **Then** the feature chip leads and the todo chip follows.
3. **Given** a spend limit, **When** drawn, **Then** `spend 40% · 1d` shows, and a value past 100% when the payload says so.
4. **Given** fast mode on, **When** drawn, **Then** `fast` shows beside the effort.

---

### User Story 4 - See where a number is heading (Priority: P2)

A user sees a burn rate (`⇡ 9%/h`) after five samples over a minute, and a projection (`5h limit ~16:40`) only when it lands before the window's reset.

**Why this priority**: A projection that lands after the reset is noise.

**Independent Test**: Feed sample series, one that crosses the limit before reset and one that does not.

**Acceptance Scenarios**:

1. **Given** fewer than five samples or under a minute, **When** drawn, **Then** no burn rate shows.
2. **Given** a projection that lands before the reset, **When** drawn, **Then** `5h limit ~16:40` shows; **Given** after the reset, **Then** it does not.

---

### User Story 5 - Changes catch the eye and chips explain themselves (Priority: P3)

A user sees branch, PR, skills and model chips brighten for 30 seconds after they change, keeping their hue; usage chips never brighten. A hover row under the footer explains the chip under the pointer in one sentence.

**Why this priority**: Replaces statusline's brighten-on-change and `doctor --explain`.

**Independent Test**: Change the branch; hover each chip.

**Acceptance Scenarios**:

1. **Given** a branch change, **When** drawn within 30 seconds, **Then** the chip is brighter with the same hue; after 30 seconds it is normal.
2. **Given** a usage chip changes, **When** drawn, **Then** it does not brighten.
3. **Given** the pointer over a chip, **When** drawn, **Then** the hover row reads `↳ <one sentence>`.

---

### Edge Cases

- No repository: line 1 shows the directory only; no git chips.
- `gh` missing or unauthenticated: PR and CI chips are absent, not errors (Principle XI).
- Narrow width: shed in this order: repository name, session duration, lines changed, projection, CI, PR, burn rate, rtk, tree counters, effort, 7d reset. Never drop context, branch, directory, 5h, model, 7d or spend. Resets shorten before an essential chip goes.
- Short window: drop L2 first, then L1; L3 stays last.
- Cache payload with an unknown reason: no reason is shown.
- Two skills with the same name across session and subagent: counted once, session only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (#41): Line 1 MUST show merge conflicts `✖n` apart from changes; ahead `⇡n` and behind `⇣n` only with an upstream and no counters without one; a detached HEAD as the short commit id with no link; a worktree as `wt ⇐ <origin>`; the start directory following Claude when it moved (`⌂ src ⇐ astrolabe`); and the last CI run for the current branch as `✓ CI`, `✖ CI` or `◷ CI`.
- **FR-002** (#41): The PR chip MUST show draft state and labels. Directory, repository, branch, CI and PR MUST be links; session, model and limit chips MUST carry no link.
- **FR-003** (#42): The cache chip MUST follow the payload's prompt-cache data: silent while warm with time to spare; `cache warm · <time>` in the last 2 minutes of a 5-minute cache or the last 10 of an hour; `cache cold · <tokens> · <reason>` once cold, with the reasons listed in User Story 2; a plain expiry MUST show no reason.
- **FR-004** (#42): On narrow widths the reason MUST drop first, then the token count. One toast MUST appear when the cache goes cold. Nothing MUST be estimated or turned into a price.
- **FR-005** (#45): Skills in play MUST be one chip of up to five names then a count, covering the session's own skills only.
- **FR-006** (#46): The todo chip MUST lead line 2 when no Spec Kit task is active; with Spec Kit the feature chip MUST lead and the todo chip follow.
- **FR-007** (#47): Line 3 MUST show the gateway spend-limit chip with its reset, past 100% when the payload says so, and `fast` beside the effort while fast mode is on.
- **FR-008** (#48): Burn rate MUST show after five samples over a minute; the projection MUST show only when it lands before the window's reset.
- **FR-009** (#49): Branch, PR, skills and model chips MUST brighten for 30 seconds after they change, keeping their hue; usage chips MUST NOT brighten. Last values MUST live in the mod state.
- **FR-010** (#50): A hover row under the footer MUST explain the chip under the pointer in one sentence.
- **FR-011**: Width shedding MUST follow the order in Edge Cases; height shedding MUST drop L2 first, then L1.
- **FR-012**: Git, `gh` and CI reads MUST run on the mod clock, PR and CI at most every five minutes, and land in the mod state; render MUST read only state (Principle XII).
- **FR-013**: The footer MUST draw at the pane bottom, under the prompt, or both, as `footerIn` says.
- **FR-014**: Out of scope: nord and gruvbox, Copilot CLI, Codex, OpenCode and installing into `settings.json` (Principles III and IX).

### Key Entities

- **Chip**: One footer segment with text, role colour, optional link and optional hover sentence.
- **Footer line**: L1, L2 or L3.
- **Cache state**: Warm, warm-ending or cold, with ttl, tokens and an optional reason.
- **Sample series**: Recent usage readings used for burn rate and projection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Core tests cover each chip, the ramp and the shedding table at 80, 100, 120, 140 and 180 columns.
- **SC-002**: Fixture git states (conflicts, no upstream, detached, worktree, moved directory) each draw the expected line 1.
- **SC-003**: Adapter tests on terminal and desktop pass.
- **SC-004**: Every statusline segment named in the statusline README maps to an Astrolabe chip in `docs/tutorial`.
- **SC-005**: The draw path performs no git, `gh` or file reads in tests.
- **SC-006**: README "The footer in place of a statusline" is rewritten with regenerated captures.

## Assumptions

- Specs 064 and 065 supply tokens, the usage ramp and the band the footer sits under.
- The session payload exposes a prompt-cache block with ttl, tokens and an optional reason.
- The mod clock and state already exist and are the only place reads happen.
- The live table (069) depends on this spec's cache and limit data.
