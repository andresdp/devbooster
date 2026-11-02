<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: materially expanded guidance in Principle IV; no rule
  removed or weakened)
- Modified principles:
  - IV. Test-First (NON-NEGOTIABLE): added an `e2e/` bullet. End-to-end checks cover existing
    behaviour, so each check MUST be seen to fail (wrong expectation or broken flow) before it
    counts as done, MUST use an isolated database unless pointed at a dedicated test
    environment, and MUST stay outside the Vitest and pytest suites
- Added sections: none
- Removed sections: none
- Rationale: feature 003-e2e-user-flows adds a test-only `e2e/` project; its plan had to
  reinterpret Principle IV (speckit-analyze finding C4)
- Dependent artifacts: specs/003-e2e-user-flows/plan.md Constitution Check row IV updated to
  cite the new bullet; templates read the constitution at runtime (no change)
- Follow-up TODOs: none
-->
# Kanban Board Constitution

## Core Principles

### I. Python + FastAPI Backend with Pydantic v2 (backend/ only)
This principle applies to `backend/` only. The backend MUST be written in Python using FastAPI.
All request and response models MUST be Pydantic v2 models. Interactive OpenAPI documentation
MUST be served at `/docs` and MUST be generated automatically from the code, never
hand-maintained. Nothing in this principle constrains the language or framework of `frontend/`.

### II. OpenAPI Contract Is the Source of Truth
The OpenAPI contract is the single agreement between backend and frontend. Every API change
(routes, parameters, schemas, status codes, error bodies) MUST update the contract in the same
change. The committed contract under `specs/` MUST match what the running app generates, and a
test MUST fail when they diverge. The frontend MUST consume the contract rather than assume
behavior outside it.

For `frontend/`, this principle is satisfied by generating API types from the committed OpenAPI
contract. API request/response types, enums, and client signatures MUST be generated from the
contract file under `specs/` with a documented, reproducible command. Hand-written API types
are forbidden. When the contract changes, the generated types MUST be regenerated in the same
change, and type-checking MUST fail (not silently drift) when frontend code no longer matches
the contract.

### III. SQLite Persistence
All persistent data MUST be stored in SQLite. No other database or external data service may be
introduced. Schema changes MUST be reproducible from the repository (code or migration scripts)
so a fresh checkout can build the database without manual steps.

### IV. Test-First (NON-NEGOTIABLE)
Tests MUST be written before the implementation they cover, and MUST be seen to fail first
(Red-Green-Refactor). A user story is not done until all of its tests pass.

- `backend/`: tests MUST be written with pytest. Each API endpoint MUST have tests covering the
  success path and its error paths, and tests MUST run against an isolated database, never
  shared development data.
- `frontend/`: tests MUST be written with Vitest and Testing Library. Each user-facing
  component or view MUST have tests covering its primary interaction and its error/empty
  states, written from the user's perspective (rendered output and interactions, not
  implementation internals). Tests MUST NOT depend on a running backend; API calls MUST be
  mocked at the boundary defined by the generated contract types.
- `e2e/`: end-to-end checks cover behaviour that already exists in `backend/` and `frontend/`,
  so "before the implementation" does not apply. Each check MUST instead be seen to fail,
  against a deliberately wrong expectation or a deliberately broken flow, before it counts as
  done. Checks MUST run against an isolated database unless explicitly pointed at a dedicated
  test environment, and MUST stay outside the Vitest and pytest suites.

### V. Simplicity
Prefer the simplest solution that satisfies the spec. Dependencies MUST be kept minimal and each
new one MUST be justified in the plan. There is no real authentication or authorization. No
external infrastructure (message queues, caches, hosted services, containers required to run) is
allowed. Speculative features and abstractions (YAGNI) MUST be rejected.

This principle, including the no-external-infrastructure rule, applies unchanged to
`frontend/`. The frontend MUST NOT introduce state-management, UI, or data-fetching libraries
beyond what the spec demonstrably requires, and MUST NOT require any service other than the
local backend to run.

### VI. CORS for the Local Frontend
The backend MUST enable CORS so the local frontend dev server (Vite) can call the API. Allowed
origins MUST be explicit and configurable, and MUST NOT be a blanket wildcard beyond local
development needs.

### VII. Consistent API Errors
Every endpoint MUST return the correct HTTP status code (e.g. 400/422 for invalid input, 404 for
missing resources, 409 for conflicts, 500 for unexpected failures). All error responses,
including validation and unhandled errors, MUST use one uniform JSON error body, defined once
and documented in the OpenAPI contract. Internal details such as stack traces MUST NOT leak.

## Repository & Technology Constraints

- The repository is a monorepo with `backend/` and `frontend/` at the root and `specs/` shared
  by both.
- All documentation (specs, plans, tasks, README) and all code, including identifiers, comments,
  and commit messages, MUST be written in English.
- The backend MUST run locally with a single documented command and no external setup beyond
  installing Python dependencies.

### Frontend Constraints

- The frontend lives in `frontend/` and MUST be written in TypeScript using React, built and
  served in development with Vite. Adding it MUST NOT move or restructure existing directories.
- TypeScript MUST run in strict mode. Type-check and test commands MUST be documented and
  runnable from a fresh checkout after installing Node dependencies, with no other setup.
- The frontend MUST run locally with a single documented command and MUST talk only to the
  local backend via the generated contract types (see Principle II).
- The frontend MUST handle the uniform API error body (Principle VII) rather than inventing its
  own error shapes.

## Development Workflow & Quality Gates

- Work follows the Spec Kit flow: specify → plan → tasks → implement. Each plan MUST include a
  Constitution Check against the principles above.
- Quality gates before a backend story is considered done: all pytest tests pass; the OpenAPI
  contract is updated and in sync; error responses follow the uniform body; docs are updated in
  English.
- Quality gates before a frontend story is considered done: all Vitest tests pass; TypeScript
  type-check passes; generated API types are regenerated from the committed contract and
  contain no manual edits; docs are updated in English.
- Any deviation from a principle (e.g. a new dependency) MUST be recorded and justified in the
  plan's complexity or rationale notes.

## Governance

This constitution supersedes other project practices. Amendments MUST be made by editing this
file with a documented rationale, an updated version, and a review of dependent specs, plans,
and tasks for conflicts. Versioning follows semantic versioning: MAJOR for backward-incompatible
removals or redefinitions of principles, MINOR for new principles or materially expanded
guidance, PATCH for clarifications and wording. Every plan and review MUST verify compliance
with this constitution, and unjustified complexity MUST be rejected.

**Version**: 1.2.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-11-01
