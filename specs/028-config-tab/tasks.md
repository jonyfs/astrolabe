---

description: "Task list for Config Tab implementation"
---

# Tasks: Config Tab

**Input**: Design documents from `/specs/028-config-tab/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests included for validation scenarios

**Organization**: Tasks grouped by user story (P1-P2) for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create directory structure for config tab components (hooks/surfaces/, hooks/core/)
- [ ] T002 [P] Install Zod dependency for schema validation
- [ ] T003 [P] Verify plugin.json userConfig structure is accessible

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create config schema parser in hooks/core/config-schema.ts (parses plugin.json userConfig → ConfigSchema per data-model.md)
- [ ] T005 Create validation logic in hooks/core/config-validate.ts (Zod schemas per option type, constraints: enum, min, max)
- [ ] T006 Create base ConfigField component in hooks/surfaces/config-field.tsx (renders TextField/Checkbox/Select per option type)
- [ ] T007 Create ConfigForm component in hooks/surfaces/config-form.tsx (manages form state, validation, submit)
- [ ] T008 [P] Create test fixtures in tests/fixtures/config-tab/ (sample plugin.json configs)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Config Tab UI (Priority: P1) 🎯 MVP

**Goal**: Implement Config tab in pane with editable form for all userConfig options

**Independent Test**: Open pane → click Config tab → verify all options render with current values, correct input types

### Tests for User Story 1

- [x] T009 [P] [US1] Contract test for config tab in tests/contract/config-tab-contract.test.ts (validates config-tab-contract.json)
- [ ] T010 [P] [US1] Integration test for tab rendering in tests/integration/config-tab.test.ts (full tab open/render)

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create ConfigTab component in hooks/surfaces/config-tab.tsx (tab content, fetches schema/values)
- [ ] T012 [US1] Register Config tab in hooks/register.tsx (add to pane tabs array)
- [ ] T013 [US1] Implement form submit handler in config-form.tsx (calls $.config.set, triggers reload)
- [ ] T014 [US1] Add Save button with loading state in config-tab.tsx
- [ ] T015 [US1] Add README.md update for Config tab usage and configuration guide

**Checkpoint**: User Story 1 fully functional - Config tab renders, edits, saves, reloads

---

## Phase 4: User Story 2 - Option Validation (Priority: P2)

**Goal**: Add real-time validation with inline errors and submit blocking

**Independent Test**: Enter invalid values → verify inline errors, Save disabled until valid

### Tests for User Story 2

- [ ] T016 [P] [US2] Contract test for config field in tests/contract/config-field-contract.test.ts (validates config-field-contract.json)
- [ ] T017 [P] [US2] Validation test in tests/integration/config-validation.test.ts (type, enum, min/max validation)

### Implementation for User Story 2

- [ ] T018 [P] [US2] Add onBlur validation in config-field.tsx (real-time field validation)
- [ ] T019 [US2] Add form-level validation on submit in config-form.tsx (blocks invalid submit)
- [ ] T020 [US2] Display inline error messages below fields in config-field.tsx
- [ ] T021 [US2] Disable Save button when form has errors in config-tab.tsx
- [ ] T022 [US2] Add README.md update for validation behavior and error messages

**Checkpoint**: User Story 2 fully functional - validation works, errors displayed, Save blocked

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T023 [P] Documentation updates in docs/ (README updates for Config tab)
- [ ] T024 Code cleanup and refactoring (shared utilities, error handling consistency)
- [ ] T025 Performance optimization (memoization, lazy loading)
- [ ] T026 [P] Additional unit tests in tests/unit/ (edge cases, error paths)
- [ ] T027 Security hardening (input sanitization, XSS prevention)
- [ ] T028 Run quickstart.md validation (all 6 scenarios)
- [ ] T029 [P] Add CHANGELOG entries for 028-config-tab
- [ ] T030 Verify CI workflows pass (typecheck, tests, plugin validation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-4)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1 - Config Tab UI)**: Can start after Foundational - No dependencies on other stories
- **US2 (P2 - Validation)**: Can start after Foundational - Enhances US1, independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Core components before integration
- Integration before polish
- Story complete before moving to next priority (for sequential execution)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Once Foundational phase completes, both user stories can start in parallel
- All tests for a user story marked [P] can run in parallel

---

## Parallel Example: User Story 1 (Config Tab UI)

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for config tab in tests/contract/config-tab-contract.test.ts"
Task: "Integration test for tab rendering in tests/integration/config-tab.test.ts"

# Launch implementation tasks that can run in parallel:
Task: "Create ConfigTab component in hooks/surfaces/config-tab.tsx"
Task: "Register Config tab in hooks/register.tsx"
```

---

## Parallel Example: User Story 2 (Validation)

```bash
# Launch all tests for User Story 2 together:
Task: "Contract test for config field in tests/contract/config-field-contract.test.ts"
Task: "Validation test in tests/integration/config-validation.test.ts"

# Launch implementation tasks that can run in parallel:
Task: "Add onBlur validation in config-field.tsx"
Task: "Add form-level validation in config-form.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Config Tab UI) - **MVP Core**
4. **STOP and VALIDATE**: Test Config tab independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 (Config Tab UI) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (Validation) → Test independently → Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Config Tab UI)
   - Developer B: User Story 2 (Validation)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence