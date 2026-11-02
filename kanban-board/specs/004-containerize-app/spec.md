# Feature Specification: Containerized Kanban App

**Feature Branch**: `004-containerize-app`

**Created**: 2026-11-01

**Status**: Draft

**Input**: User description: "Contenerizar la ticketera (frontend y backend) para que cualquier persona pueda levantar la aplicación completa con un único comando teniendo instalado solo Docker, sin instalar Python ni Node. Los datos deben persistir entre reinicios. La misma configuración debe servir para correr la suite E2E existente contra la app contenerizada y como base para el deploy. El flujo de desarrollo actual (sin contenedores) debe seguir funcionando."

(English: containerize the ticketing system (frontend and backend) so anyone can start the whole application with a single command having only Docker installed, without installing Python or Node. Data must persist across restarts. The same setup must serve to run the existing E2E suite against the containerized app and as the basis for deployment. The current non-container development workflow must keep working.)

## Clarifications

### Session 2026-11-01

- Q: Should running the E2E suite against the containers require only the container runtime, or may the developer need Node on the host as today? → A: Only the container runtime; the test runner and browser also run in a container, and the failure evidence is made available on the host.
- Q: Should the containerized app accept connections only from the same computer by default, or from any device on the network? → A: Same computer only by default; a setting supplied from outside the images can open it to the network.
- Q: Should the browser reach the API through the same address as the board, or should the backend also get its own separate port on the host? → A: One address only: the board, the API and the API docs are all served from the frontend's address; the backend has no port of its own on the host.

## User Scenarios & Testing *(mandatory)*

The "users" of this feature are people who want to run the kanban board (evaluators, reviewers, new contributors), the developers who maintain it, and whoever deploys it. End users of the board see no change in behavior.

### User Story 1 - Start the whole app with one command (Priority: P1)

A person who has only the container runtime installed (no Python, no Node, no project-specific tools) clones the repository, runs one documented command from the repository root, and after it finishes opens a single address in their browser and uses the full kanban board: the sample board is there, and they can create, move, edit and comment on tickets exactly as in the non-container setup. One documented command stops the app.

**Why this priority**: This is the core promise of the feature. Without it, nothing else (persistence, E2E, deploy) has a foundation.

**Independent Test**: On a machine with only the container runtime installed, clone the repository, run the start command, open the documented address, create a ticket and move it to another column. Delivers a fully usable app with zero language toolchains installed.

**Acceptance Scenarios**:

1. **Given** a fresh clone on a machine with only the container runtime installed, **When** the person runs the documented start command, **Then** the frontend and backend both start and the app is reachable at the documented address without any other setup step.
2. **Given** the app was started with the start command for the first time, **When** the person opens the documented address, **Then** they see the sample board ("Sample Project") with its tickets, exactly once.
3. **Given** the app is running, **When** the person creates, moves, edits and comments on a ticket, **Then** every action behaves the same as in the non-container setup, with no errors caused by cross-origin or address misconfiguration.
4. **Given** the app is running, **When** the person runs the documented stop command, **Then** all parts of the app stop and nothing keeps listening on the app's ports.
5. **Given** the app is running, **When** the person opens the API's interactive documentation under the app's address, **Then** it loads, and the backend is not reachable on any other host port.

---

### User Story 2 - Data survives restarts (Priority: P1)

A person who has been using the containerized app stops it (or restarts the machine), starts it again with the same command, and finds every board, ticket, comment and history entry exactly as they left it. Data is lost only if the person explicitly runs a documented reset command.

**Why this priority**: An app that forgets its data on every restart is not usable beyond a demo; the user explicitly required persistence.

**Independent Test**: Start the app, create a ticket with a unique title and a comment, stop the app, start it again, and confirm the ticket, comment and history are still there and the sample board was not duplicated.

**Acceptance Scenarios**:

1. **Given** the person created a ticket and a comment in the containerized app, **When** they stop and start the app with the documented commands, **Then** the ticket, its comment and its history are still present.
2. **Given** the app has been started and stopped several times, **When** the person opens the board list, **Then** the sample board appears exactly once.
3. **Given** the app's images are rebuilt (e.g. after pulling new code), **When** the person starts the app again, **Then** existing data is still present.
4. **Given** the person wants a clean slate, **When** they run the documented reset command, **Then** the stored data is removed and the next start shows only the freshly seeded sample board.

---

### User Story 3 - Run the existing E2E suite against the containerized app (Priority: P2)

A developer runs the existing end-to-end suite (create, move, edit checks) against the containerized app using one documented command, and gets the same pass/fail result and failure evidence as when the suite runs against the non-container app. The run uses its own isolated, unseeded data, never the person's persisted data, and does not disturb a containerized app the person may already have running.

**Why this priority**: Proves the containerized app is functionally equivalent to the non-container one and lets CI test exactly what will be deployed. Depends on Story 1.

**Independent Test**: Run the documented E2E-against-containers command on a fresh clone; all existing checks pass, and afterwards the person's own persisted data is unchanged.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the developer runs the documented E2E-against-containers command, **Then** the containerized app is started with isolated, unseeded data, all existing E2E checks run against it, and the command exits with success only if all checks pass.
2. **Given** the person has their own containerized app running with data, **When** the E2E command runs and finishes, **Then** the person's data is unchanged and the person's app is still running.
3. **Given** an E2E check fails, **When** the run ends, **Then** the same failure evidence as today (failing step, trace, screenshot) is available on the host, and the command exits with a failure status.
4. **Given** the E2E run finished (pass or fail), **When** it ends, **Then** the containers and data it created for the run are removed.
5. **Given** a machine with only the container runtime installed (no Node, no browsers), **When** the developer runs the E2E-against-containers command, **Then** the test runner and browser also run in containers and the full suite runs without any other host tooling.

---

### User Story 4 - A deployable, production-like build (Priority: P3)

Whoever deploys the app can use the same container images that the one-command setup and the E2E run use. The images run the app in production mode (the frontend is served as a prebuilt static site, not through a development server; the backend runs without auto-reload), and every environment-specific setting (public address of the frontend and API, allowed origins, data location, whether to seed sample data) is supplied from outside the images, so the same image can run locally and on a deployment target without being rebuilt per environment where possible.

**Why this priority**: The user wants the setup to be the base for deployment, but no deployment target or pipeline is in scope yet. Value is realized later, so it comes after local use and testing.

**Independent Test**: Start the images with non-default settings (a different port, sample data disabled, a different allowed origin) supplied only from outside the images and confirm the app honors them, without editing any file inside the images.

**Acceptance Scenarios**:

1. **Given** the images, **When** they are started with sample-data seeding disabled, **Then** the app starts with no boards.
2. **Given** the images, **When** they are started with a different host port configured from outside, **Then** the app is reachable on that port and works end to end.
3. **Given** the running containers, **When** their status is inspected, **Then** each part reports whether it is healthy, and the frontend part does not report ready before the backend is able to serve requests.
4. **Given** the images, **When** they are inspected, **Then** they contain no development-only tooling, test files, local databases, or secrets from the developer's checkout.

---

### User Story 5 - The non-container workflow keeps working (Priority: P1)

A developer who works without containers keeps using exactly the same documented commands as today to run the backend, the frontend, the backend tests, the frontend tests and the E2E suite, with the same results. Nothing in this feature forces them to install or run the container runtime.

**Why this priority**: Explicit user requirement, and the project's rules forbid making containers required to run the app. Breaking the existing workflow would be a regression for every current contributor.

**Independent Test**: On the feature branch, follow the existing READMEs for backend, frontend and E2E without the container runtime installed; every command works and every existing test suite passes.

**Acceptance Scenarios**:

1. **Given** the feature is merged, **When** a developer without the container runtime follows the existing backend, frontend and E2E instructions, **Then** every command works unchanged and all test suites pass.
2. **Given** a developer used the containerized app, **When** they later run the non-container backend, **Then** the two use separate data and neither overwrites the other.

---

### Edge Cases

- **Port already in use**: if a port the app needs on the host is taken, the start command fails with a message naming the port, and the documentation explains how to choose a different one.
- **Container runtime not running / not installed**: the documented command fails with the runtime's own error; the README lists the runtime as the only prerequisite and the minimum version.
- **First start is slow**: the first start builds or downloads images and may take several minutes; later starts reuse them. The README says so.
- **Backend not ready yet**: while the backend is still starting, the frontend part does not report healthy; the user is never shown a broken page because of start-up order.
- **Machine architecture**: the app starts on both Intel/AMD and ARM machines (e.g. Apple Silicon).
- **Stale local files**: local virtual environments, installed Node packages, build output and the developer's local database in the checkout never end up inside the images and never change the containerized app's behavior.
- **Containers and non-container app running at once**: if the person runs both on the same machine, they either use different ports or the conflict is reported as in "Port already in use"; their data is always separate.
- **Unexpected stop** (machine crash, forced kill): on next start the data written before the stop is still present, to the same degree as in the non-container setup.
- **Access from another device**: with default settings, a phone or another computer on the same network cannot open the app or the API; after the documented network-access setting is applied, it can.
- **Reset command run by accident**: the reset command is clearly named and documented as destructive; it is never part of the normal start/stop commands.

## Requirements *(mandatory)*

### Functional Requirements

**Starting and stopping**

- **FR-001**: The repository MUST provide one documented command, run from the repository root, that builds (if needed) and starts both the frontend and the backend, requiring only the container runtime on the host.
- **FR-002**: After FR-001 completes, the full app MUST be usable from a single documented browser address; the API and its interactive documentation MUST be served under that same address, and the backend MUST NOT be published on a host port of its own.
- **FR-003**: The repository MUST provide one documented command that stops all parts of the app, and one separately documented, clearly destructive command that also deletes the stored data.
- **FR-004**: The host port the app uses MUST have a documented default and MUST be changeable from outside the images without editing tracked files.
- **FR-004a**: By default the app MUST accept connections only from the same machine (other devices on the network cannot reach it); a documented setting supplied from outside the images MUST allow network access without rebuilding, and the README MUST warn that the app has no login when it is opened to the network.
- **FR-005**: Each part of the app MUST report its health, and the app MUST NOT report ready until the backend can serve requests.

**Data**

- **FR-006**: Boards, tickets, comments and history MUST persist across stop/start of the app, across machine restarts, and across rebuilds of the images.
- **FR-007**: The sample board MUST be seeded on the first start with empty data and never duplicated on later starts (the existing seeding behavior); seeding MUST be switchable off from outside the images.
- **FR-008**: The containerized app's data MUST be stored separately from the non-container development database; neither setup MUST read or overwrite the other's data.

**E2E**

- **FR-009**: The repository MUST provide one documented command that starts the containerized app with isolated, unseeded data, runs the full existing E2E suite against it, removes what it created, and exits with success only if every check passed.
- **FR-010**: The E2E run against the containers MUST NOT use, modify or stop the person's own containerized app or its data.
- **FR-011**: The E2E suite's existing checks, rules (no retries, no `test.only` in CI) and failure evidence MUST be unchanged; the containerized run MUST make that evidence available on the host.
- **FR-012**: The command in FR-009 MUST require only the container runtime on the host: the E2E test runner and its browser MUST also run in a container. The existing host-based ways of running the suite (managed and external modes) MUST keep working unchanged.

**Deploy readiness**

- **FR-013**: The images MUST run the app in production mode: the frontend served as a prebuilt static site, the backend without development auto-reload.
- **FR-014**: All environment-specific settings (public frontend and API addresses, allowed cross-origin addresses, data location, sample-data seeding, ports, network exposure) MUST be supplied from outside the images; documented defaults MUST make the one-command local start work with no settings supplied.
- **FR-015**: Because the browser reaches the API through the same address as the board, the default setup MUST work without the backend allowing any extra cross-origin address; when cross-origin addresses are configured (e.g. for a deployment), the rules MUST stay explicit (no blanket wildcard).
- **FR-016**: The images MUST NOT contain development-only tooling, tests, local databases, local dependency folders, build caches or secrets from the developer's checkout.
- **FR-017**: The images MUST run their processes as a non-administrator user.
- **FR-018**: The images MUST build and run on both x86-64 and ARM64 hosts.

**Non-container workflow and docs**

- **FR-019**: Every existing non-container command (backend run, backend tests and lint, frontend run, frontend tests and type-check, E2E managed and external modes) MUST keep working unchanged, and all existing test suites MUST keep passing.
- **FR-020**: The root README MUST document, in English: the single prerequisite and its minimum version, the start, stop and reset commands, the default addresses, how to change ports and settings, the E2E-against-containers command, and that the non-container workflow is unchanged.
- **FR-021**: The feature MUST NOT change the API, its contract, or any user-visible behavior of the board.

### Key Entities

- **App data store**: The persisted boards, tickets, comments and history of the containerized app. Survives restarts and rebuilds; removed only by the reset command. Separate from the non-container development database and from E2E run data.
- **E2E run data store**: A throwaway, unseeded store created for one E2E run and removed when it ends.
- **Runtime settings**: The environment-specific values (addresses, allowed origins, ports, network exposure, seeding, data location) supplied from outside the images, with documented defaults for local use.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a machine with only the container runtime installed, a person can go from a fresh clone to using the board in the browser by running exactly one command, with zero other installation steps.
- **SC-002**: After the first build, starting the app takes under 30 seconds until the board is usable; the first start including the build takes under 10 minutes on a typical broadband connection.
- **SC-003**: 100% of data created before a stop/start cycle (boards, tickets, comments, history) is present after it, verified over at least 3 consecutive cycles, with the sample board appearing exactly once.
- **SC-004**: 100% of the existing E2E checks pass against the containerized app on a fresh clone, using one command, with zero changes to the checks themselves.
- **SC-005**: 100% of the existing backend, frontend and E2E (non-container) tests still pass, and every existing documented command works unchanged.
- **SC-006**: The same images run with at least two different sets of settings (default local, and one with a different port, seeding off and a different allowed origin) without rebuilding, and the app honors every setting.
- **SC-007**: A new contributor following only the root README starts, stops and resets the containerized app without asking for help.

## Assumptions

- "Only Docker installed" means the Docker container runtime with its built-in multi-container command (Compose v2) and Git to clone; no other host tooling is assumed for running the app.
- Deployment itself (choosing a host, CI/CD pipeline, TLS, domains, publishing images to a registry) is out of scope; this feature only makes the images and settings ready to be used by a later deployment feature.
- No container-based development workflow (live reload of source code inside containers) is in scope; developers who want hot reload keep using the non-container workflow.
- The project constitution (Principle V) forbids containers being *required* to run the app. This feature keeps containers optional, as an additional way to run, so it does not conflict; the plan's Constitution Check must confirm this and note the "single command, no external setup beyond installing Python/Node dependencies" constraints remain true for the non-container path.
- Persistence stays in the existing single-file database (Principle III); the containerized app keeps that file in persistent storage managed by the container runtime, not inside the image.
- The app remains single-user with no authentication, as today; the containerized setup adds no login and is intended for local use or a trusted environment; by default it accepts connections only from the same machine (FR-004a).
- The containerized app publishes a single host port (FR-002); its default may differ from the non-container defaults (8000 and 5173) so both setups can run side by side; the exact value is chosen in the plan.
- The browser address of the API is fixed when the frontend is built (existing behavior); in the containerized setup the API is served under the same address as the frontend (FR-002), so the frontend build needs no environment-specific API address.
