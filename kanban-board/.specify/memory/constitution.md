<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0
- Modified principles: none renamed; all placeholders replaced with initial principles
- Added sections: Core Principles I–VII, Repository & Technology Constraints,
  Development Workflow & Quality Gates, Governance
- Removed sections: none
- Follow-up TODOs: none
- Deferred non-governance intents: none (frontend/ is mentioned only as a structural constraint)
-->
# Kanban Board Constitution

## Core Principles

### I. Python + FastAPI Backend with Pydantic v2
The backend MUST be written in Python using FastAPI. All request and response models MUST be
Pydantic v2 models. Interactive OpenAPI documentation MUST be served at `/docs` and MUST be
generated automatically from the code, never hand-maintained.

### II. OpenAPI Contract Is the Source of Truth
The OpenAPI contract is the single agreement between backend and frontend. Every API change
(routes, parameters, schemas, status codes, error bodies) MUST update the contract in the same
change. The committed contract under `specs/` MUST match what the running app generates, and a
test MUST fail when they diverge. The frontend MUST consume the contract rather than assume
behavior outside it.

### III. SQLite Persistence
All persistent data MUST be stored in SQLite. No other database or external data service may be
introduced. Schema changes MUST be reproducible from the repository (code or migration scripts)
so a fresh checkout can build the database without manual steps.

### IV. Test-First with pytest (NON-NEGOTIABLE)
Tests MUST be written with pytest before the implementation they cover, and MUST be seen to fail
first (Red-Green-Refactor). A user story is not done until all of its tests pass. Each API
endpoint MUST have tests covering the success path and its error paths, and tests MUST run
against an isolated database, never shared development data.

### V. Simplicity
Prefer the simplest solution that satisfies the spec. Dependencies MUST be kept minimal and each
new one MUST be justified in the plan. There is no real authentication or authorization. No
external infrastructure (message queues, caches, hosted services, containers required to run) is
allowed. Speculative features and abstractions (YAGNI) MUST be rejected.

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
  by both. Work starts with `backend/` only.
- The `frontend/` app (Vite) arrives in a later feature. The layout MUST allow it to be added
  without moving or restructuring existing directories.
- All documentation (specs, plans, tasks, README) and all code, including identifiers, comments,
  and commit messages, MUST be written in English.
- The backend MUST run locally with a single documented command and no external setup beyond
  installing Python dependencies.

## Development Workflow & Quality Gates

- Work follows the Spec Kit flow: specify → plan → tasks → implement. Each plan MUST include a
  Constitution Check against the principles above.
- Quality gates before a story is considered done: all pytest tests pass; the OpenAPI contract
  is updated and in sync; error responses follow the uniform body; docs are updated in English.
- Any deviation from a principle (e.g. a new dependency) MUST be recorded and justified in the
  plan's complexity or rationale notes.

## Governance

This constitution supersedes other project practices. Amendments MUST be made by editing this
file with a documented rationale, an updated version, and a review of dependent specs, plans,
and tasks for conflicts. Versioning follows semantic versioning: MAJOR for backward-incompatible
removals or redefinitions of principles, MINOR for new principles or materially expanded
guidance, PATCH for clarifications and wording. Every plan and review MUST verify compliance
with this constitution, and unjustified complexity MUST be rejected.

**Version**: 1.0.0 | **Ratified**: 2026-10-20 | **Last Amended**: 2026-10-20
