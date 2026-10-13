# Tasks: The Specs body as a Client surface module

- [x] T001 Probe in the test kit: mount a Client under the Pane, send `ui.key`, `ui.pointer`, read `ui.message`; record what arrives. Go or stop.
- [x] T002 `core/pane-client.ts`: `clientProps`, `windowOf`, the limits (FR-004); tests in `tests/core/pane-client.test.ts`
- [x] T003 `surfaces/specs-client.tsx`: rows, selection, scroll, the nine keys, hover and selection mark (FR-001, FR-002, FR-006)
- [x] T004 `register.tsx`: `ui.message` hook and the Client in place of the Specs rows (FR-003, FR-005)
- [x] T005 The fallback and the accessible mode (FR-005, FR-007); the 066, 078 and 079 tests unchanged
- [x] T006 Tests: `tests/integration/specs-client.test.tsx` (SC-001, SC-003)
- [x] T007 README, CHANGELOG, help line ("click the list for ← → PageUp PageDown Home End"), four languages
- [ ] T008 `claude plugin validate .`, `claude plugin test .`, CI, PR

## Result

- T001 probe: a Client mounts in the Pane, its props are readable with `find({ key })`, `ui.key` and `ui.post` reach it; what it draws is not searchable by text, so the tests read the rows from its props.
- The module has no way to take the focus without a click; the help line and the README say so.
- Not done: row buttons (advisor, gstack skills, copy, close, tick) stay in the Pane tree under the list, as FR-008 says.
