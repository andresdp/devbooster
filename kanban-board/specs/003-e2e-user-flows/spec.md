# Feature Specification: End-to-End User Flow Test Suite

**Feature Branch**: `003-e2e-user-flows`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Suite de tests E2E que verifique los flujos principales de usuario de la ticketera (crear ticket, moverlo entre columnas, editarlo, borrarlo) ejecutándose contra el front y el back reales. Los tests deben poder correrse localmente y contra un entorno desplegado."

(English: an end-to-end test suite that checks the ticketing system's main user flows — create a ticket, move it between columns, edit it, delete it — running against the real frontend and backend. The tests must be runnable locally and against a deployed environment.)

## Clarifications

### Session 2026-11-01

- Q: Deleting tickets does not exist in the product (001 EC-006, 002 AS-003). Should this feature add it, drop the delete check, or write it as a pending check? → A: Drop the delete check; this feature adds no product functionality and the suite does not test deletion.
- Q: What kind of deployed environment will the suite run against? → A: A dedicated test/staging environment where leftover test data is acceptable.
- Q: For local runs, should the suite start its own backend and frontend on a separate throwaway database, or use the app the developer already started with their normal database? → A: By default the suite starts the backend (on a separate throwaway database) and the frontend itself; when a target address is given, it uses the already-running app at that address instead.
- Q: Should checks create their setup data (boards, starting tickets) by calling the backend directly or by clicking through the web app? → A: Setup data is created by calling the backend directly; the step under test is always done through the web app.
- Q: If a check fails and then passes on an automatic retry in the same run, does that count as a pass? → A: No automatic retries anywhere (locally or in CI); a check passes only on its first attempt.

## User Scenarios & Testing *(mandatory)*

The "users" of this feature are the developers and reviewers of the kanban board. Each story is one automated check of a flow an end user performs in the web app. Every check drives the real web app in a real browser, talking to the real backend, with nothing faked in between.

### User Story 1 - Verify creating a ticket (Priority: P1)

A developer runs the suite and it confirms that an end user can open a board, create a ticket with a title and optional details, and see it appear as a card in the To Do column with its human-readable key. The check reloads the page and confirms the ticket is still there, proving it was saved by the backend rather than only shown on screen.

**Why this priority**: Creating a ticket is the entry point of every other flow. If it breaks, nothing else in the product is usable, and the other checks cannot even set up their data.

**Independent Test**: Run only this check against a running app; it passes when the new ticket is visible in To Do after a reload, and fails if creation is broken in the frontend, the backend, or the connection between them.

**Acceptance Scenarios**:

1. **Given** the app is running and the check has its own board, **When** the check creates a ticket with a unique title, type, priority and assignee, **Then** a card with that title and a key of the form TKT-<number> appears at the bottom of To Do, and the same card with the same details is shown after a page reload.
2. **Given** the create form is open, **When** the check submits it without a title, **Then** the "Required" message is shown next to the title and no ticket is created.

---

### User Story 2 - Verify moving a ticket between columns (Priority: P2)

A developer runs the suite and it confirms that an end user can move a ticket from one column to another by dragging its card, and also through the ticket's detail view (the non-drag path). After a reload the ticket is in the new column, and its history shows the column change.

**Why this priority**: Moving work across columns is the core kanban behavior and the most complex interaction (drag and drop, ordering, history), so it is the most likely to break in ways unit tests with a faked backend cannot catch.

**Independent Test**: Run only this check; it creates its own ticket, moves it, reloads, and confirms the new column and the history entry.

**Acceptance Scenarios**:

1. **Given** a ticket in To Do, **When** the check drags its card into In Progress, **Then** the card shows in In Progress, no longer shows in To Do, and is still in In Progress after a reload.
2. **Given** a ticket in In Progress, **When** the check moves it to Review from the ticket's detail view, **Then** the card is at the bottom of Review after a reload.
3. **Given** a ticket that was moved To Do → In Progress → Review, **When** the check opens its history, **Then** it shows the creation and both column changes in chronological order.
4. **Given** a column with three tickets, **When** the check drags the third card to the top, **Then** after a reload it is first and the other two keep their previous order.

---

### User Story 3 - Verify editing a ticket (Priority: P3)

A developer runs the suite and it confirms that an end user can open a ticket, change its title, description, type, priority and assignee, save, and see the changes on the card and in the detail view after a reload, while the ticket keeps its key, column and position.

**Why this priority**: Editing is a frequent action, but a broken edit is less blocking than broken creation or movement.

**Independent Test**: Run only this check; it creates its own ticket, edits it, reloads, and compares every field.

**Acceptance Scenarios**:

1. **Given** an existing ticket, **When** the check changes all editable fields and saves, **Then** after a reload the detail view shows the new values and the key, column and position are unchanged.
2. **Given** an existing ticket, **When** the check clears the title and tries to save, **Then** an error is shown next to the title and, after a reload, the ticket still has its previous title.

---

### User Story 4 - Run the same suite locally or against a deployed environment (Priority: P1)

A developer runs the suite on their own machine with one documented command; by default the suite starts its own local backend (on a throwaway database) and frontend. The same suite, with no code changes, can be pointed at a deployed environment by giving it that environment's address.

**Why this priority**: This is the second half of the request and decides whether the suite is useful at all outside one laptop; it shapes how every other check is written (no reliance on local-only data or resetting the database).

**Independent Test**: Run the suite once locally and once with a different target address; both runs execute the same checks and report results the same way.

**Acceptance Scenarios**:

1. **Given** a fresh checkout with dependencies installed and nothing running, **When** the developer runs the suite with no extra settings, **Then** it starts its own local backend on a throwaway database and the frontend, runs every check against them, reports pass/fail per check, and stops what it started.
2. **Given** a deployed environment's address, **When** the developer runs the suite with that address set, **Then** every check runs against that environment instead, with no code change.
3. **Given** the target app is not reachable, **When** the suite starts, **Then** it stops quickly with a clear message naming the address it could not reach, instead of every check failing with a timeout.
4. **Given** a check fails, **When** the run ends, **Then** the developer gets enough evidence to diagnose it without re-running: the failing step, a screenshot and a recording or trace of the browser session.

---

### Edge Cases

- **EC-001**: Other people or earlier runs have left data in the target environment (a deployed environment cannot be reset). Every check MUST create its own uniquely named board and tickets and only look at those, so existing data never makes a check pass or fail.
- **EC-002**: Two runs happen at the same time against the same environment (two developers, or a developer and CI). Unique names keep them from interfering with each other.
- **EC-003**: The local database is the developer's working data. A default local run MUST NOT touch it: the suite's own backend uses a separate throwaway database. When the developer points the suite at an app they started themselves, the suite MUST NOT wipe or reset that app's data; it only adds its own uniquely named boards.
- **EC-004**: The deployed environment is slower than a local one. Checks wait for visible outcomes (a card appears, a message shows) instead of fixed delays, so they pass on slow environments and fail clearly when something never happens.
- **EC-005**: A drag-and-drop gesture is flaky in automation. The move check MUST confirm the result by reloading the page, so a gesture that only looked successful on screen is not reported as a pass.
- **EC-006**: A check fails halfway. Its leftover board MUST NOT affect any other check or later run (follows from EC-001).
- **EC-007**: The suite cannot remove what it creates, because the product has no delete operation. Its boards stay in the target and accumulate across runs; their test prefix keeps them recognisable. In a default local run they land in the throwaway database; otherwise this is acceptable only for dedicated test/staging environments (AS-010).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The suite MUST exercise the real web app in a real browser connected to the real backend; no part of the frontend, backend or the connection between them may be replaced with a fake.
- **FR-002**: The suite MUST include checks for: creating a ticket (US1), moving a ticket between columns by drag and from the detail view, plus reordering within a column (US2), and editing a ticket (US3). Deleting is not checked because the product has no delete operation (see Clarifications).
- **FR-003**: Every check MUST confirm its outcome after a full page reload, so it proves the change was saved by the backend and not only shown by the frontend.
- **FR-004**: Every check MUST be independent: it creates the board and tickets it needs by calling the real backend directly (not through the web app), so a broken create screen fails only the create check (US1), does not depend on data from another check or from the sample board, and can run alone or in any order.
- **FR-005**: Every board and ticket created by the suite MUST carry a name that is unique per run and clearly marks it as test data (for example a fixed prefix plus a run identifier), so it can be recognised and never confused with real data.
- **FR-006**: The suite MUST NOT reset, wipe or modify any data it did not create.
- **FR-007**: The target is chosen by setting the frontend address and the backend address (needed for setup, FR-004) when starting the run. When nothing is set, the suite MUST start its own local backend, configured with a separate throwaway database (never the developer's working database), and its own local frontend, run against them, and stop them when the run ends. When an address is set, the suite MUST NOT start anything and uses the app at that address; the backend address may only be set together with the frontend address, and setting it alone MUST stop the run with a clear message. Changing target MUST NOT require code changes.
- **FR-008**: Before running checks, the suite MUST verify that the frontend and backend at the target addresses are reachable and stop with a message naming any unreachable address.
- **FR-009**: The suite MUST be runnable locally with one documented command on a fresh checkout with dependencies installed and nothing already running, and the docs MUST state how to target an already-running app (local or deployed) instead.
- **FR-010**: On failure, the suite MUST keep, per failing check, the failing step, a screenshot and a browser recording or trace, and report where to find them.
- **FR-011**: Checks MUST wait for visible outcomes rather than fixed delays, with a time limit after which the check fails with a message saying what it was waiting for.
- **FR-012**: The step under test and every outcome check MUST go through the web app the way a user does: through visible text, labels and roles, not through internal structure that a user cannot see. Only setup data (FR-004) may be created by calling the backend directly. Single exception: a board column may be located by its container element, filtered by the column's visible heading, because columns have no accessible name and this feature makes no product changes (AS-011); this is confined to one helper.
- **FR-013**: The suite MUST be kept separate from the frontend's and backend's own test suites, so their existing fast tests (which fake the backend, per the constitution) keep running without a live app.
- **FR-014**: The suite MUST NOT retry failed checks automatically, locally or in CI; a check passes only if its first attempt passes, and every failure is reported.

### Key Entities

- **Check**: One automated user flow (create, move, edit) with a name, steps, and a pass/fail result plus failure evidence.
- **Run**: One execution of the suite against one target; has a unique run identifier used to name test data, a target, and a result per check.
- **Target**: The frontend address and backend address the run talks to; defaults to the local app.
- **Test Data**: The boards and tickets a run creates, named with a test prefix and the run identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with dependencies installed and nothing running can run the full suite locally with one command and get a result in under 3 minutes, including the time to start the app.
- **SC-002**: The same suite runs against a deployed environment by changing only the target address, with zero code changes.
- **SC-003**: Running the suite 10 times in a row against an unchanged, healthy app gives 10 passing runs with every check passing on its first and only attempt (no automatic retries, FR-014).
- **SC-004**: When one flow is deliberately broken in the backend, only the checks for that flow fail and all others pass. This holds for both tried cases: (a) every ticket move is rejected → only the move checks fail; (b) every ticket edit is rejected → only the edit checks fail.
- **SC-005**: Every failing check leaves a screenshot and a browser recording or trace that lets a developer see the failing step without re-running.
- **SC-006**: Running the suite never changes or removes data it did not create, verified by comparing the target's boards before and after a run.

## Assumptions

- **AS-001**: The suite is written in English (code, names, docs) per the constitution, even though the request was in Spanish.
- **AS-002**: "Main flows" are create, move and edit, the three of the four requested flows that exist in the product (delete was dropped; see Clarifications); comments, board creation as a flow of its own, and error display beyond the required-title checks are not covered, though checks create boards as setup.
- **AS-003**: Only one desktop browser engine is required; other browsers and phone-width layouts are out of scope.
- **AS-004**: There is no authentication, so the suite needs no login or credentials for any target.
- **AS-005**: The suite starts the app itself only for a default local run (FR-007); it never starts anything for a given target address, local or deployed.
- **AS-006**: The deployed environment runs the same frontend and backend versions as the code being tested and allows the frontend's origin to reach the backend.
- **AS-007**: Leftover test boards in the target are acceptable; the suite does no cleanup, and any manual cleanup of a test environment is outside this feature.
- **AS-008**: Running the suite in CI is not required by this feature, but nothing in it may prevent that later.
- **AS-009**: An `e2e/` directory with an initial, empty test-runner scaffold already exists at the repository root and is the intended home for the suite.
- **AS-010**: Deployed targets are dedicated test/staging environments where leftover test data is acceptable. Running against production or a shared environment that must stay clean is out of scope.
- **AS-011**: This feature adds no product functionality and does not change `backend/`, `frontend/` or the API contract. If deletion is added to the product later, a delete check can be added then.
