# Tasks: The Specs body as a Client surface module

- [ ] T001 Probe in the test kit: mount a Client under the Pane, send `ui.key`, `ui.pointer`, read `ui.message`; record what arrives. Go or stop.
- [ ] T002 `core/pane-client.ts`: `clientProps`, `windowOf`, the limits (FR-004); tests in `tests/core/pane-client.test.ts`
- [ ] T003 `surfaces/specs-client.tsx`: rows, selection, scroll, the nine keys, hover and selection mark (FR-001, FR-002, FR-006)
- [ ] T004 `register.tsx`: `ui.message` hook and the Client in place of the Specs rows (FR-003, FR-005)
- [ ] T005 The fallback and the accessible mode (FR-005, FR-007); the 066, 078 and 079 tests unchanged
- [ ] T006 Tests: `tests/integration/specs-client.test.tsx` (SC-001, SC-003)
- [ ] T007 README, CHANGELOG, help line ("click the list for ← → PageUp PageDown Home End"), four languages
- [ ] T008 `claude plugin validate .`, `claude plugin test .`, CI, PR
