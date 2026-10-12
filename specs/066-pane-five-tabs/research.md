# Research: Pane in Five Tabs

## R1 Tab mapping

**Decision**: `PaneTab` becomes `specs | tasks | session | prs | setup`. A stored `dashboard` maps to `session`, `config` and `models` to `setup`, and `help` to `specs` (help is an overlay now). Hotkeys 1 to 5 in that order.

**Rationale**: the spec's migration rule; one function, tested.

## R2 Help as an overlay

**Decision**: `PaneState.help?: true`. `?` (pressed as `h`) toggles it; pressing a tab number clears it. While it is on, the body is the help rows and the tab row is unchanged. The filter box still works on help.

**Alternatives**: a second pane (a new render site needs its own spec, Platform constraints).

## R3 Legend row of buttons

**Decision**: the legend row is a row of plain Buttons with verb-only labels; a plain Button draws its own hotkey (`f: filter`), so no label carries the hotkey prefix. The tab row holds the five tabs and the close button.

## R4 Badges

**Decision**: Specs = features in progress, Tasks = open tasks of the active feature, PRs = open pull requests, Session = `▲` only while the governor holds or pauses. A zero or absent count draws nothing. Never a total.

## R5 Section order and Early

**Decision**: sections in the fixed order Active, In progress, Early, Ready to close, Next up, Done, Abandoned. Early = a feature in specify, clarify, plan or tasks that is not active; Ready to close = every task ticked while the front matter says `active` (spec 067 builds the check row on it); Next up = not started features after those. Done and Abandoned fold past three.

## R6 Session = Session + Dashboard

**Decision**: the Session tab shows the usage block and governor box first, then the Dashboard sections (dial, bars, chart, KPIs). One scroll unit list.

## R7 Setup = Config + Models

**Decision**: Setup groups the Config options under Look, Usage governor, Claude, then the Model per skill block. A non-default value carries `•` and its default shows on hover.

## R8 Width forms

**Decision**: full labels from 100 pane columns; at 80 the legend shortens verbs and keeps keys; under 60 a tab is its number and badge (`2·11`), as today.
