# Research: Band and Status

## R1 One row from a drop order

**Decision**: build the left side as a list of candidate forms, widest first, and take the first whose width fits the columns left after the right-edge buttons. Forms follow the drop order of board 2: task title, then step names (marks stay), then feature name, then the bar, then the update label.

**Rationale**: it is the structure `bandSegments` already uses (a `forms` list), so tests and hover cards keep their shape.

**Alternatives**: measure each piece and remove pieces in a loop (harder to test against the board's exact rows).

## R2 Right-edge buttons

**Decision**: the update and hide buttons are drawn by the surface, not the model. The model receives `reserved`, the cells they take, and fits the left side to `columns - reserved`.

**Rationale**: Buttons are elements with their own width and hotkeys; the model only needs the number.

## R3 Chips

**Decision**: a segment may carry `chip: true`; the surface draws it with `backgroundColor` set to the segment's role colour and the foreground from `chipForeground`. The id chip uses `accent`, the step chip `current`, a blocked step chip `blocked`.

**Rationale**: `chipForeground` already picks the stronger contrast per flavor (Principle IX).

## R4 Links

**Decision**: a segment may carry `href`; the surface wraps it in `Link`. The id chip links `spec.md`, a finished step chip its file (`plan.md`, `tasks.md`; clarify and specify link `spec.md`).

**Alternatives**: Buttons that open files (a Button takes the hotkey and focus; a Link is the native element for a file reference).

## R5 Next command in one place

**Decision**: `suggestNext` already offers the command through the prompt suggestion. The `nextRow` is removed from AbovePrompt and the hint shows the command only when the prompt has text (`e.props.isDraft`).

**Rationale**: removes the third copy. The Run and Copy buttons move to the pane header actions (existing `/astrolabe next` command and the pane's spec block button remain).

## R6 Paused and held

**Decision**: the model takes `governor: { band, until?, canLift }`. At `stop` or `ceiling` the task slot reads `‖ paused until 07:00` in `blocked` with a `lift 1h` action; at `hold` it reads `‖ holding new subagents`.

## R7 Status lead

**Decision**: a pure `statusLead(state, decision, columns, now)` returns `◆ 002 implement 45% │ 7d 81%▴ hold · Mon 07:00`, dropping the reset, then shortening the phase (`impl`), then the phase itself at 80 columns. The id and the deciding window never drop. With `footerIn=status` the three-line footer of spec 068 draws instead.

## R8 Idle

**Decision**: after 10 idle minutes the band is the 80-column row, dimmed, and carries the deciding window's text.
