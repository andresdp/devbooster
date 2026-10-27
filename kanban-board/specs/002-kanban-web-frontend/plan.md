# Implementation Plan: Kanban Web Frontend

**Branch**: `002-kanban-web-frontend` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-kanban-web-frontend/spec.md`

## Summary

Build the web frontend for the kanban ticketing system as a new, self-contained Vite + React +
TypeScript (strict) application in `frontend/`, consuming the existing backend only through types
generated from `specs/001-kanban-ticketing/contracts/openapi.json`. The user can list and create
boards, view a board's four columns with ticket cards, create tickets, open a ticket in a routed
side drawer to view/edit it, drag tickets between and within columns (optimistic, with rollback),
and read/add comments and column-change history. Visuals follow the Stitch project
`13486008395924154472`, frozen under `design/` and implemented as CSS custom properties with CSS
modules. Data access is a thin fetch client plus two hooks (no data-fetching library); drag and
drop uses dnd-kit; tests are Vitest + Testing Library with MSW at the network boundary, written
first per user story.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Node.js 22 LTS, ES2022 target, React 19

**Primary Dependencies**: Runtime: `react`, `react-dom`, `react-router` 7, `@dnd-kit/core`,
`@dnd-kit/sortable`. Dev: `vite` 8 + `@vitejs/plugin-react`, `typescript` + `@types/react`
+ `@types/react-dom`, `vitest` 5 + `jsdom`, `@testing-library/react` + `user-event` + `jest-dom`,
`msw` 3, `openapi-typescript` 7, `eslint` 10 + `@eslint/js` + `typescript-eslint` +
`eslint-plugin-react-hooks` + `eslint-config-prettier`, `prettier` 3. Justifications in
Complexity Tracking and [research.md](./research.md) §2, §7, §11.

**Storage**: N/A (all data lives in the backend's SQLite; the frontend holds transient state only)

**Testing**: Vitest (jsdom) + Testing Library + MSW handler set derived from the contract;
contract-drift test; pure-function unit tests for move arithmetic

**Target Platform**: Current desktop and mobile browsers; Vite dev server on `http://localhost:5173`
talking to the local backend on `http://localhost:8000`

**Project Type**: web application frontend (single-page app) in the `frontend/` half of the monorepo

**Performance Goals**: Board with 200 tickets interactive within 2 s (SC-002); optimistic move
rendered within 100 ms of drop (SC-003); first-time board + ticket creation under 1 minute (SC-001)

**Constraints**: No backend changes (SC-007, FR-021); no auth; no external infrastructure; only
the local backend as a runtime service; generated API types only (no hand-written shapes); one
uniform error body handled as `ApiError`; required-field check is the only client validation
(FR-023); TypeScript strict; ESLint and Prettier clean

**Scale/Scope**: 3 routes, 2 pages + 1 drawer, ~25 components, 10 API operations, 5 user stories,
boards of a few hundred tickets

## Constitution Check

*GATE: passed before Phase 0; re-checked after Phase 1 (section at the end).*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. Python + FastAPI backend (backend/ only) | N/A | No backend change; principle explicitly does not constrain `frontend/` |
| II. OpenAPI contract is the source of truth | PASS | `npm run api:generate` produces `src/api/schema.d.ts` from the committed contract; `npm run typecheck` first runs `scripts/check-api-types.mjs`, which fails when the committed types differ from a fresh generation; `schema.contract.test.ts` fails `npm test` on the same drift; the client and MSW handlers are typed from the generated file only (research §3) |
| III. SQLite persistence | N/A | Frontend stores nothing; no other datastore introduced |
| IV. Test-first (Vitest + Testing Library, mocked at the contract boundary) | PASS | Tasks will order tests before implementation per story; every view has primary-interaction, error and empty-state tests from the user's perspective; MSW handler set replaces the backend (contracts/msw-handlers.md) |
| V. Simplicity | PASS with justified additions | 5 runtime packages; no state-management, UI or data-fetching library; dnd-kit justified in research §7 and below; no infrastructure beyond the local backend |
| VI. CORS for the local frontend | PASS | App runs on port 5173, the backend's default allowed origin; no proxy or other origin needed |
| VII. Consistent API errors | PASS | Single `ApiError` parsed from `{ error: { code, message, details } }`; field-level vs form/page placement contract in contracts/routes-and-views.md |
| Frontend constraints (TypeScript strict, React, Vite, `frontend/`, documented commands) | PASS | `tsconfig` strict + `noUncheckedIndexedAccess`; `frontend/README.md` documents install/dev/test/typecheck/lint/format/api:generate from a fresh checkout; existing directories untouched |
| Quality gates (tests, typecheck, regenerated types without manual edits, English docs) | PASS | Scripts above; generated file excluded from lint/format and guarded by the drift check |

## Project Structure

### Documentation (this feature)

```text
specs/002-kanban-web-frontend/
├── plan.md                      # This file
├── spec.md
├── research.md                  # Phase 0: design extraction, dependency evaluations, decisions
├── data-model.md                # Phase 1: contract aliases, client types, UI state machines
├── quickstart.md                # Phase 1: commands and end-to-end validation scenarios
├── contracts/
│   ├── routes-and-views.md      # Routes, views, required states, error placement
│   ├── api-client.md            # Fetch client surface and ApiError mapping
│   └── msw-handlers.md          # Test double derived from the contract
├── design/                      # Frozen Stitch reference for SC-006
│   ├── README.md                # Provenance and refresh procedure
│   ├── design-system.md         # Tokens (colours, typography, radii, spacing)
│   ├── board-view.{png,html}
│   └── ticket-detail-drawer.{png,html}
├── checklists/requirements.md
└── tasks.md                     # Created by /speckit-tasks
```

### Source Code (repository root)

```text
backend/                         # Untouched (SC-007)
specs/001-kanban-ticketing/contracts/openapi.json   # Read-only input to type generation

frontend/
├── package.json                 # scripts: dev, build, preview, test, test:watch, typecheck, lint, lint:fix,
│                                #          format, format:check, api:generate, api:check
├── package-lock.json
├── README.md                    # Fresh-checkout commands (install, dev, test, typecheck, lint, api:generate)
├── .env.example                 # VITE_API_BASE_URL=http://localhost:8000
├── index.html                   # Font links (Inter, JetBrains Mono), #root
├── vite.config.ts               # plugin-react, server.port 5173 (strictPort), vitest config (jsdom, setupFiles)
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json   # strict, noUncheckedIndexedAccess, bundler resolution
├── eslint.config.js             # flat config; ignores src/api/schema.d.ts, dist
├── .prettierrc / .prettierignore
├── scripts/
│   └── check-api-types.mjs      # Regenerates types in memory, diffs against src/api/schema.d.ts, exit 1 on drift
├── public/favicon.svg
└── src/
    ├── main.tsx                 # createRoot, BrowserRouter, global styles
    ├── App.tsx                  # Routes: /, /boards/:boardId, /boards/:boardId/tickets/:key, *
    ├── vite-env.d.ts
    ├── api/
    │   ├── schema.d.ts          # GENERATED by openapi-typescript (do not edit)
    │   ├── types.ts             # Aliases over components["schemas"] (data-model.md §1)
    │   ├── errors.ts            # ApiError, isApiError, fieldErrors
    │   ├── client.ts            # request() + boards/tickets/comments/history operations
    │   └── schema.contract.test.ts
    ├── hooks/
    │   ├── useResource.ts       # loading/ready/error + reload, abort on change
    │   ├── useAction.ts         # pending guard, error, unmount-safe
    │   └── *.test.ts
    ├── model/
    │   ├── board.ts             # findTicket, columnOrder, applyMove, movePayload
    │   ├── forms.ts             # required(), diffTicket()
    │   ├── format.ts            # formatDateTime, initials
    │   └── *.test.ts
    ├── styles/
    │   ├── tokens.css           # CSS custom properties from design/design-system.md
    │   └── global.css           # reset, fonts, body, focus ring, phone breakpoint helpers
    ├── components/              # Presentational, each with .module.css and .test.tsx
    │   ├── AppHeader/  Button/  Icon/  Badge/  Field/  FormError/  Dialog/  Tabs/
    │   ├── SegmentedControl/  Skeleton/  EmptyState/  ErrorState/  NotFoundState/
    │   └── BoardNotice/
    ├── features/
    │   ├── boards/
    │   │   ├── BoardListPage.tsx (+ .module.css, .test.tsx)
    │   │   └── BoardCreateDialog.tsx (+ .test.tsx)
    │   ├── board/
    │   │   ├── BoardPage.tsx            # useResource(board), drag state machine, Outlet for drawer
    │   │   ├── BoardHeader.tsx
    │   │   ├── Column.tsx               # droppable + SortableContext; ColumnEmptyState; NewTicketButton
    │   │   ├── TicketCard.tsx           # sortable item; dragging/placeholder/saving modifiers
    │   │   ├── DropPlaceholder.tsx
    │   │   ├── BoardDnd.tsx             # DndContext, sensors, DragOverlay, handlers → model/board
    │   │   ├── ColumnsPager.tsx         # phone-width "n / 4" indicator
    │   │   ├── TicketCreateDialog.tsx
    │   │   └── *.test.tsx
    │   └── ticket/
    │       ├── TicketDrawer.tsx         # reads ticket from board via outlet context; comments/history resources
    │       ├── TicketView.tsx           # read mode + MoveToColumnSelect + TicketMeta
    │       ├── TicketEditForm.tsx
    │       ├── CommentsTab.tsx          # CommentItem + CommentForm
    │       ├── HistoryTab.tsx           # HistoryItem
    │       └── *.test.tsx
    └── test/
        ├── setup.ts                     # jest-dom matchers, MSW server lifecycle, store reset
        ├── render.tsx                   # renderWithRouter(ui, { route })
        └── msw/
            ├── fixtures.ts              # sample board, 200-ticket board factory
            ├── store.ts                 # in-memory store + rules
            └── handlers.ts              # one handler per contract operation
```

**Structure Decision**: Frontend-only layout from the constitution's monorepo rule, with
`frontend/` as its own npm project. `api/` is the only module touching the network and is typed
from the generated schema; `model/` holds pure functions (unit-tested, framework-free); `hooks/`
holds the two data hooks; `components/` are reusable presentational pieces matching the design's
component inventory; `features/` groups the three route-level units (boards list, board, ticket
drawer) with their tests next to them. Tests live beside the code they cover, with the MSW double
under `src/test/`.

## Key design decisions (from research.md)

- **Design source**: Stitch project frozen under `design/`; tokens in `tokens.css`; design
  elements that contradict the spec or contract are dropped or replaced (research §1.4).
- **API types**: `openapi-typescript` → `schema.d.ts`; drift fails both `typecheck` and `test`.
- **Client**: thin fetch wrapper; one `ApiError`; no retries/caching.
- **Data flow**: `useResource` / `useAction`; board refetched after every successful mutation;
  the drawer reads its ticket from the board; no data-fetching library.
- **Routing**: React Router 7, three routes, drawer as a nested route rendered through `Outlet`.
- **Drag and drop**: dnd-kit core + sortable with mouse/touch/keyboard sensors; optimistic
  `applyMove`, rollback on error, board refetch on success and on `invalid_move`.
- **Mobile**: CSS scroll-snap columns under 640px, full-screen drawer, move-from-detail control.
- **Testing**: Vitest + Testing Library + MSW; keyboard-driven DnD tests; pure helpers unit-tested.

## Complexity Tracking

Packages beyond the planning input's list, each with its justification (Principle V). No
principle is violated; these are the minimal companions of the listed tools.

| Addition | Why needed | Simpler alternative rejected because |
|----------|------------|-------------------------------------|
| `@dnd-kit/core` + `@dnd-kit/sortable` (runtime) | Touch support, index-accurate drop placeholder, styled drag overlay, cross-column moves (research §7) | Native HTML5 DnD does not fire on Android touch and needs hand-written geometry/placeholder code that is larger than the library |
| `@vitejs/plugin-react` | Vite does not transform JSX/Fast Refresh without it | None: it is Vite's own React plugin |
| `@types/react`, `@types/react-dom` | React ships no types; strict TS needs them | None |
| `@types/node` (dev) | Node ships no types; `tsconfig.node.json` lists `types: ["node"]` for `vite.config.ts` and `scripts/check-api-types.mjs` (`node:fs`, `process`), and `src/api/schema.contract.test.ts` imports `node:fs`/`node:path`/`node:url` for the contract-drift check. Verified: without it both `tsc` projects fail (TS2307, TS2688) | Dropping the types or the Node imports: the contract-drift test and API-types check must read files from disk, and strict TS cannot type them without Node's declarations |
| `jsdom` | Vitest DOM environment required by Testing Library | happy-dom: narrower DOM coverage for dnd-kit sensors and focus management |
| `@testing-library/user-event`, `@testing-library/jest-dom` | Realistic interactions (typing, keyboard DnD) and DOM matchers; part of the "testing-library" family in the input | fireEvent only: does not model focus/keyboard sequences the drawer and DnD tests need |
| `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier` | ESLint 10 flat config needs the base rules, TS parser/rules, hooks rules, and the Prettier conflict-disabler; part of the "eslint" family in the input | A bare ESLint with no TS parser cannot lint `.tsx` |
| TypeScript pinned to 5.9.x (not 7.x "latest") | `typescript-eslint` (<6.1) and `openapi-typescript` (^5) do not support 7.x yet | Using 7.x would break lint and type generation |
| React Router pinned to 7.x (not 8.x "latest") | Plan specifies the 7.x API; 8.x migration not verified during planning | Upgrading blind risks API changes in the routing layer; tracked as a follow-up |

Explicitly rejected: React Query/SWR (no requirement needs a cache), openapi-fetch (thin client
suffices), Tailwind or any UI component library (plain CSS modules per input), icon fonts (inline
SVG), Playwright (not required by the spec; MSW + keyboard DnD cover the stories).

## Constitution Check (post-design re-evaluation)

Re-checked after Phase 1 artifacts: no change to the gate results above. Design artifacts keep
`backend/` and the committed contract untouched (SC-007); every request/response in
`contracts/api-client.md` and `contracts/msw-handlers.md` is expressed in generated types; the
dependency set is the one in Complexity Tracking; test doubles sit at the network boundary.

## Follow-ups outside this plan

- Upgrade React Router to 8.x and TypeScript to 7.x once their ecosystems support it.
- Optional browser-level DnD test with Playwright if keyboard-driven tests prove insufficient.
