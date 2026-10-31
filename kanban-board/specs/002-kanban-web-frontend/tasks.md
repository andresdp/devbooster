---

description: "Task list for the Kanban Web Frontend"
---

# Tasks: Kanban Web Frontend

**Input**: Design documents from `/specs/002-kanban-web-frontend/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (api-client.md, msw-handlers.md, routes-and-views.md), quickstart.md, design/

**Tests**: REQUIRED. Constitution IV (Test-First, NON-NEGOTIABLE) applies to `frontend/`: tests are written with Vitest + Testing Library, mocked at the contract boundary with MSW, and MUST be seen to fail before the implementation they cover. Every test task in a story phase precedes the implementation tasks it covers.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently. Within a story: tests → pure model → components → route/page integration.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1–US5)
- Every path is relative to the repository root; the app lives in `frontend/`

## Path Conventions

- App root: `frontend/` (own npm project; `backend/` and `specs/001-kanban-ticketing/` are never modified, SC-007)
- Source: `frontend/src/{api,hooks,model,styles,components,features,test}/`
- Tests live next to the code they cover (`*.test.ts`, `*.test.tsx`); the MSW double lives under `frontend/src/test/msw/`
- Contract input (read-only): `specs/001-kanban-ticketing/contracts/openapi.json`
- Design reference (read-only): `specs/002-kanban-web-frontend/design/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the `frontend/` project with the exact toolchain from plan.md and research.md §2/§10/§11, with API types generated from the committed contract (Constitution II).

- [X] T001 Create `frontend/package.json` with `"name": "kanban-frontend"`, `"private": true`, `"type": "module"`, and scripts exactly as in research.md §3/§10: `dev` (`vite`), `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `test:watch` (`vitest`), `typecheck` (`npm run api:check && tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json`), `lint` (`eslint .`), `lint:fix`, `format` (`prettier --write .`), `format:check` (`prettier --check .`), `api:generate` (`openapi-typescript ../specs/001-kanban-ticketing/contracts/openapi.json -o src/api/schema.d.ts`), `api:check` (`node scripts/check-api-types.mjs`)
- [X] T002 Install dependencies from `frontend/` and commit `frontend/package-lock.json`: runtime `react@19`, `react-dom@19`, `react-router@7` (pin to 7.x, NOT 8), `@dnd-kit/core@6`, `@dnd-kit/sortable`; dev `vite@8`, `@vitejs/plugin-react`, `typescript@~5.9` (pin to 5.9.x, NOT 7), `@types/react`, `@types/react-dom`, `vitest@5`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw@3`, `openapi-typescript@7`, `eslint@10`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `prettier@3`; verify `npm ci` reports no peer-dependency errors
- [X] T003 [P] Create `frontend/vite.config.ts` with `@vitejs/plugin-react`, `server: { port: 5173, strictPort: true }`, and the Vitest block `test: { environment: "jsdom", setupFiles: ["src/test/setup.ts"], globals: false, css: { modules: { classNameStrategy: "non-scoped" } } }`
- [X] T004 [P] Create `frontend/tsconfig.json` (project references), `frontend/tsconfig.app.json` (`strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2022`, `moduleResolution: bundler`, `jsx: react-jsx`, `types: ["vite/client", "@testing-library/jest-dom"]`, `include: ["src"]`) and `frontend/tsconfig.node.json` (`include: ["vite.config.ts", "scripts/**/*.mjs"]`)
- [X] T005 [P] Create `frontend/eslint.config.js` (flat config: `@eslint/js` recommended, `typescript-eslint` recommended-type-checked with `parserOptions.projectService`, `eslint-plugin-react-hooks` recommended, `eslint-config-prettier` last; `ignores: ["dist", "src/api/schema.d.ts"]`), `frontend/.prettierrc` (`{ "printWidth": 100 }`) and `frontend/.prettierignore` (`dist`, `src/api/schema.d.ts`, `package-lock.json`)
- [X] T006 [P] Create `frontend/index.html` (lang `en`, `<title>Kanban</title>`, Google Fonts `<link>` for Inter 400/500/600 and JetBrains Mono 400/500, `<div id="root">`, `<script type="module" src="/src/main.tsx">`), `frontend/public/favicon.svg` (simple kanban glyph in `--color-primary` #3525cd), `frontend/.env.example` (`VITE_API_BASE_URL=http://localhost:8000`) and `frontend/src/vite-env.d.ts` (`/// <reference types="vite/client" />` plus an `ImportMetaEnv` interface declaring `readonly VITE_API_BASE_URL?: string`)
- [X] T007 Run `npm run api:generate` in `frontend/` to produce `frontend/src/api/schema.d.ts` from `specs/001-kanban-ticketing/contracts/openapi.json`; verify it exports `paths` and `components["schemas"]` including `BoardSummary`, `BoardCreated`, `BoardDetail`, `ColumnWithTickets`, `ColumnRef`, `TicketRead`, `TicketType`, `Priority`, `BoardCreate`, `TicketCreate`, `TicketUpdate`, `TicketMove`, `CommentRead`, `CommentCreate`, `HistoryEntryRead`, `ErrorResponse`, `ErrorDetail`; commit the file unedited
- [X] T008 Create `frontend/scripts/check-api-types.mjs`: import `openapiTS` and `astToString` from `openapi-typescript`, regenerate in memory from `new URL("../../specs/001-kanban-ticketing/contracts/openapi.json", import.meta.url)`, compare byte-for-byte with `src/api/schema.d.ts`, on mismatch print `API types are out of date: run "npm run api:generate"` and `process.exit(1)`; verify `npm run api:check` exits 0 and exits 1 after a one-character edit to the generated file (then revert)
- [X] T009 [P] Create `frontend/README.md` documenting, from a fresh checkout: prerequisites (Node 22 LTS, npm 10+, backend running per `backend/README.md`), `npm ci`, `npm run dev` (http://localhost:5173), `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run api:generate` (when to run it, drift check behaviour), `npm run build`, and `VITE_API_BASE_URL` override; add a two-line pointer to `frontend/README.md` in the root `README.md`

**Checkpoint**: `npm run api:check`, `npm run lint`, `npm run format:check` pass on the empty project.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Styles tokens, the API layer, the two data hooks, the MSW test double, and the reusable presentational components every story renders. No user story can start before this phase completes.

**⚠️ CRITICAL**: Test tasks here are written first and must fail before the matching implementation task.

### Styles

- [X] T010 [P] Create `frontend/src/styles/tokens.css` declaring on `:root` every CSS custom property from research.md §1.2 with the verbatim hex values from `specs/002-kanban-web-frontend/design/design-system.md`: surfaces (`--color-surface` #fbf8ff, `--color-surface-container-lowest` #ffffff, `--color-surface-container-low` #f4f2fd, `--color-surface-container` #eeedf7, `--color-surface-container-high` #e8e7f1, `--color-surface-container-highest` #e3e1ec, `--color-surface-dim` #dad9e3), text (`--color-on-surface` #1a1b22, `--color-on-surface-variant` #464555, `--color-outline` #777587, `--color-outline-variant` #c7c4d8), primary/secondary/tertiary/error groups, typography triples (`--text-headline-lg/md/sm`, `--text-body-lg/md/sm`, `--text-label-lg/md/sm`, `--text-code-md`, `--text-ticket-key` as `-size/-line/-weight/-tracking`), `--font-sans` Inter / `--font-mono` JetBrains Mono with system fallbacks, radii (`--radius-sm` 0.25rem, `--radius` 0.5rem, `--radius-md` 0.75rem, `--radius-full` 9999px), spacing (`--space-xs` … `--space-xl`, `--gutter`, `--gutter-compact`, `--margin`, `--margin-mobile`), shadows (`--shadow-sm`, `--shadow-md`, `--shadow-drag`), layout (`--header-height` 3rem, `--drawer-width` 560px, `--column-min-width` 280px)
- [X] T011 [P] Create `frontend/src/styles/global.css`: minimal reset (`box-sizing`, margins), `body` with `--color-surface` background, `--color-on-surface` text, `--font-sans`; the FR-024 focus ring (`:focus-visible` → 2px `--color-primary` outline with 2px offset; inputs 1px ring); a `.visually-hidden` utility; `@media (prefers-reduced-motion: reduce)` disabling transitions/animations globally; document the phone breakpoint `@media (max-width: 639px)` in a comment (not a custom property)

### API layer (contracts/api-client.md, data-model.md §1–2)

- [X] T012 Create `frontend/src/api/types.ts` exporting type aliases over `components["schemas"]` from `./schema` only (no new shapes): `BoardSummary`, `BoardCreated`, `BoardDetail`, `ColumnWithTickets`, `ColumnRef`, `Ticket` (= `TicketRead`), `TicketType`, `Priority`, `BoardCreate`, `TicketCreate`, `TicketUpdate`, `TicketMove`, `Comment` (= `CommentRead`), `CommentCreate`, `HistoryEntry` (= `HistoryEntryRead`), `ErrorResponse`, `ErrorDetail`; plus `const TICKET_TYPES = ["bug","feature","task"] as const satisfies readonly TicketType[]` and `const PRIORITIES = ["low","medium","high","critical"] as const satisfies readonly Priority[]`
- [X] T013 [P] Write `frontend/src/api/errors.test.ts`: `ApiError` carries `status`, `code`, `message`, `details` (`[]` when constructed with `null`/undefined); `isApiError` true for `ApiError`, false for `Error`/plain objects; `fieldErrors(err, ["title"])` puts a `title` detail in `byField` (first message wins for duplicates) and a `description` detail in `rest`; empty details → `byField {}` and `rest []`
- [X] T014 Create `frontend/src/api/errors.ts`: `class ApiError extends Error { status: number; code: string; details: ErrorDetail[] }` (constructor `{ status, code, message, details?: ErrorDetail[] | null }`, `details ?? []`, `name = "ApiError"`), `isApiError(e: unknown): e is ApiError`, `fieldErrors(e: ApiError, visible: readonly string[]): { byField: Record<string, string>; rest: string[] }` exactly per contracts/api-client.md §Error mapping
- [X] T015 [P] Write `frontend/src/api/client.test.ts` (MSW `setupServer` local to the test, `onUnhandledRequest: "error"`): every operation hits the right method/path under `${VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1` with `Accept: application/json` and `Content-Type: application/json` only when a body is sent; path params URL-encoded; 422 `ErrorResponse` body → `ApiError` with status/code/message/details; 500 with non-JSON body → `code: "unexpected_response"`, message `Unexpected response from the server (500).`; `HttpResponse.error()` → `status: 0`, `code: "network_error"`, message `Could not reach the server.`; an aborted `signal` rethrows the native `AbortError` (not `ApiError`); 2xx with invalid JSON → `unexpected_response`
- [X] T016 Create `frontend/src/api/client.ts`: `BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"`, `PREFIX = "/api/v1"`, a private `request<T>(method, path, { body?, signal? })` implementing the error mapping of T015, and the typed operations `boards.list(signal?)`, `boards.create(body)`, `boards.get(id, signal?)`, `tickets.create(boardId, body)`, `tickets.get(key, signal?)`, `tickets.update(key, body)`, `tickets.move(key, body)`, `comments.list(key, signal?)`, `comments.add(key, body)`, `history.list(key, signal?)`, each typed from `paths["…"]["<method>"]["requestBody"]…` / `["responses"][2xx]…` of `./schema`; no retries, caching or interceptors
- [X] T017 [P] Create `frontend/src/api/schema.contract.test.ts`: regenerate the types in memory with `openapiTS` + `astToString` from `../../../specs/001-kanban-ticketing/contracts/openapi.json` and assert strict equality with the committed `schema.d.ts` content read via `node:fs`; failure message says to run `npm run api:generate`

### Data hooks (data-model.md §3, research.md §5)

- [X] T018 [P] Write `frontend/src/hooks/useResource.test.ts` (renderHook): starts `loading`; resolves to `ready` with data; rejection → `error` with the `ApiError`; `reload()` returns to `loading` while keeping previous `data`; a result from a superseded load (deps changed) is ignored and its `signal` is aborted; unmount aborts the in-flight signal
- [X] T019 Create `frontend/src/hooks/useResource.ts`: `useResource<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) → { status: "loading" | "ready" | "error"; data: T | undefined; error: ApiError | undefined; reload: () => void }` using an `AbortController` plus generation counter; `AbortError` rejections are swallowed
- [X] T020 [P] Write `frontend/src/hooks/useAction.test.ts`: `pending` true during `execute`, false after; a second `execute` while pending is a no-op returning `undefined`; rejection sets `error` and `execute` resolves `undefined`; success resolves the value and clears `error`; `reset()` clears `error`; a result arriving after unmount does not set state (no act warning, no throw)
- [X] T021 Create `frontend/src/hooks/useAction.ts`: `useAction<A extends unknown[], R>(run: (...args: A) => Promise<R>) → { execute: (...args: A) => Promise<R | undefined>; pending: boolean; error: ApiError | undefined; reset: () => void }`; non-`ApiError` rejections are rethrown; unmount-safe via a mounted ref

### Model helpers shared by all stories

- [X] T022 [P] Write `frontend/src/model/format.test.ts`: `formatDateTime("2026-10-20T10:12:00Z")` equals `new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(...))`; invalid input returns the raw string; `initials("Ada Lovelace")` → `"AL"`, `initials("ada")` → `"A"`, `initials("")` → `"?"`
- [X] T023 Create `frontend/src/model/format.ts` exporting `formatDateTime(iso: string): string` (data-model.md §4) and `initials(name: string): string`

### Test infrastructure (contracts/msw-handlers.md)

- [X] T024 Create `frontend/src/test/msw/fixtures.ts`: `sampleBoard()` returning one `BoardDetail`-shaped seed (board id 1 "Sample Project", columns ids 1–4 named To Do, In Progress, Review, Done with positions 0–3, 7 tickets `TKT-1`…`TKT-7` spread as 3/2/2/0 across To Do / In Progress / Review / Done (Done empty; `TKT-1` in To Do; `TKT-3` in Review, consistent with its history) with mixed types, priorities and one `assignee: null`), 2 comments and 3 history entries on `TKT-3` (`from_column: null` → To Do, To Do → In Progress, In Progress → Review, matching its current column), plus `createLargeBoard(n = 200)` putting `n` tickets in To Do; all literals typed with the aliases from `src/api/types.ts`
- [X] T025 Create `frontend/src/test/msw/store.ts`: `createStore(seed = sampleBoard())` → `{ boards, columns, tickets, comments, history, nextTicketId, nextBoardId }` with the rule helpers the handlers need: `boardDetail(id)` (columns by `position`, tickets by `position`), `moveTicket(key, column_id, position)` renumbering source and target and appending history only when the column changes (same column and same position → no-op), `validateTicketCreate/Update/CommentCreate` returning `ErrorDetail[]` for: `title` empty or > 200, `description` > 10,000, `assignee` > 100, bad `type`/`priority`, unknown field, `author`/`text` empty or > 100 / > 5,000, `name` empty or > 100 after trim
- [X] T026 Create `frontend/src/test/msw/handlers.ts`: one `http.*` handler per contract operation under `http://localhost:8000/api/v1` using the store, reproducing every success and error row of contracts/msw-handlers.md: 201 on creates; 404 `not_found`; 409 `conflict` on case-insensitive duplicate board name; 422 `validation_error` with `details` array (non-integer board id, malformed key, field rules); 422 `invalid_move` when `column_id` is not on the ticket's board or `position` is out of range (cross-column `0..n`, same column `0..n-1`); 200 no-op move; `PATCH` bumping `updated_at`, blank `assignee` → `null`, `""` description allowed, 422 on empty body; all error bodies `{ error: { code, message, details } }` with `details: null` outside `validation_error`; export `handlers`, `store` (mutable binding) and `resetStore()`
- [X] T027 Create `frontend/src/test/setup.ts` (`import "@testing-library/jest-dom/vitest"`, `server = setupServer(...handlers)`, `beforeAll(() => server.listen({ onUnhandledRequest: "error" }))`, `afterEach(() => { server.resetHandlers(); resetStore(); cleanup() })`, `afterAll(() => server.close())`; export `server`) and `frontend/src/test/render.tsx` exporting `renderWithRouter(ui, { route = "/", path? })` that wraps in `MemoryRouter initialEntries=[route]` and, when `path` is given, in `Routes`/`Route`, returning the Testing Library result plus `user = userEvent.setup()`

### Reusable presentational components (research.md §1.3; each gets `.module.css` + `.test.tsx`)

- [X] T028 [P] Write `frontend/src/components/Button/Button.test.tsx` (renders children, `variant="primary"|"ghost"`, `pending` sets `disabled` + `aria-busy="true"` and shows `pendingLabel`, forwards `type`) then create `frontend/src/components/Button/Button.tsx` + `Button.module.css` (primary: `--color-primary-container` bg / `--color-on-primary`; ghost: transparent with `--color-primary` text; radius `--radius`; min touch size 40px)
- [X] T029 [P] Create `frontend/src/components/Icon/Icon.tsx`: inline SVG paths (24px viewBox, `currentColor`) for `kanban`, `plus`, `close`, `inbox`, `error`, `arrowRight`, `history`, `comment`, `clear`, `drag`, `edit`, `check`, `chevronDown`; `aria-hidden="true"` by default, `title` prop adds an accessible name; test in `frontend/src/components/Icon/Icon.test.tsx` asserting hidden by default and labelled with `title`
- [X] T030 [P] Write `frontend/src/components/Badge/Badge.test.tsx` (`variant="type" value="bug"` renders text "Bug" with class `type-bug`; `variant="priority" value="critical"` renders "Critical" with class `priority-critical`) then create `frontend/src/components/Badge/Badge.tsx` + `Badge.module.css` mapping the seven enum colours verbatim from research.md §1.2 (bug: error-container/on-error-container; feature: secondary-container/on-secondary-container; task: surface-container-highest/on-surface-variant; low: surface-container/on-surface-variant; medium: tertiary-fixed/on-tertiary-fixed-variant; high: primary-fixed/on-primary-fixed-variant; critical: error/on-error), radius `--radius-sm`, label-sm typography
- [X] T031 [P] Write `frontend/src/components/Field/Field.test.tsx` (label linked to control via `htmlFor`/`id`; `required` shows a visual asterisk and sets `aria-required`; `error` renders a `FieldError` paragraph with the error icon, links it with `aria-describedby` and sets `aria-invalid="true"` on the control; `hint` text rendered) then create `frontend/src/components/Field/Field.tsx` (render-prop or `children(controlProps)` API exposing `id`, `aria-describedby`, `aria-invalid`), `FieldError.tsx` and `Field.module.css` (error ring `--color-error`, error text label-sm)
- [X] T032 [P] Write `frontend/src/components/FormError/FormError.test.tsx` (renders nothing for `null`; renders `role="alert"` banner with title "Something went wrong" and the message; optional `messages: string[]` list) then create `frontend/src/components/FormError/FormError.tsx` + `FormError.module.css` (`--color-error-container` bg, `--color-on-error-container` text, warning icon)
- [X] T033 [P] Write `frontend/src/components/Dialog/Dialog.test.tsx` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` the heading; focus moves to the first focusable field on open; Tab wraps inside; Escape and backdrop click call `onClose`; on close focus returns to the element focused before open) then create `frontend/src/components/Dialog/Dialog.tsx` + `Dialog.module.css` (portal, backdrop with blur, max-width 32rem, radius `--radius-md`, `--shadow-drag`, title with icon and "Close" icon button, `initialFocusRef` optional)
- [X] T034 [P] Write `frontend/src/components/Skeleton/Skeleton.test.tsx` (`aria-busy="true"`, `aria-label` default "Loading", `lines` count, `variant="card"|"line"`) then create `frontend/src/components/Skeleton/Skeleton.tsx` + `Skeleton.module.css` (grey bars `--color-surface-container-high`, pulse animation disabled under reduced motion)
- [X] T035 [P] Write tests then create the three state components: `frontend/src/components/EmptyState/EmptyState.tsx` (icon, `title`, `description`, optional `action` button slot; test in `EmptyState.test.tsx`), `frontend/src/components/ErrorState/ErrorState.tsx` (`role="alert"`, `message`, "Retry" button calling `onRetry`; test in `ErrorState.test.tsx`), `frontend/src/components/NotFoundState/NotFoundState.tsx` (`title`, `description`, link with `to` and `linkLabel`; test in `NotFoundState.test.tsx`), each with its `.module.css`
- [X] T036 Write `frontend/src/components/AppHeader/AppHeader.test.tsx` (48px header renders app name "Kanban" linking to `/`, kanban icon, a right-aligned primary "New board" button that calls `onNewBoard`) then create `frontend/src/components/AppHeader/AppHeader.tsx` + `AppHeader.module.css` (fixed `--header-height`, `--color-surface-container-lowest` bg, bottom border `--color-outline-variant`)

### App shell

- [X] T037 Create `frontend/src/App.tsx` with `Routes`: `/` → `BoardListPage` placeholder, `/boards/:boardId` → `BoardPage` placeholder, nested `tickets/:key` → `TicketDrawer` placeholder, `*` → `NotFoundPage` (`NotFoundState` "Page not found", link to `/`); the `AppHeader` rendered on every route with the "New board" dialog host state owned by `App` (FR-002: available on any page); placeholders are replaced in the story phases. Create `frontend/src/main.tsx` (`createRoot`, `StrictMode`, `BrowserRouter`, import `styles/tokens.css` and `styles/global.css`); write `frontend/src/App.test.tsx` asserting an unknown address renders "Page not found" with a link to `/`
- [X] T038 Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check` in `frontend/`; all green with the foundational tests passing

**Checkpoint**: Foundation ready. User stories can now proceed in priority order (or in parallel across stories).

---

## Phase 3: User Story 1 - Browse boards and view a board (Priority: P1) 🎯 MVP

**Goal**: List all boards at `/`; open a board at `/boards/:boardId` showing the four columns in server order with ticket cards (key, title, type, priority, assignee or "Unassigned"); loading, empty, error and not-found states; phone-width snap-scrolling columns with the "n / 4" indicator.

**Independent Test**: With the MSW sample board (or the real backend's "Sample Project"), open `/`, see the board listed with its creation date, click it, see To Do / In Progress / Review / Done in order with each card under the right column in server order; an empty column shows "No tickets in Done"; `/boards/9999` shows "Board not found"; an unreachable server shows the error state with a working Retry.

### Tests for User Story 1 (write first, must fail)

- [X] T039 [P] [US1] Write `frontend/src/model/board.test.ts` for `columnOrder(board)`: returns columns sorted by `position` without mutating the input; leaves `tickets` arrays in server order
- [X] T040 [P] [US1] Write `frontend/src/features/boards/BoardListPage.test.tsx`: shows a skeleton while loading; lists every board name as a link to `/boards/{id}` with "Created {formatDateTime(created_at)}"; zero boards → `EmptyState` "No boards yet" with a "New board" button; `server.use` 500 → `ErrorState` with the server message and a "Retry" button that refetches and renders the list; `HttpResponse.error()` → message "Could not reach the server."
- [X] T041 [P] [US1] Write `frontend/src/features/board/TicketCard.test.tsx`: renders key in mono, title, type and priority badges, assignee text; `assignee: null` renders italic "Unassigned" (EC-011); the card is a single link to `/boards/{board_id}/tickets/{key}` whose accessible name is `"{key} {title}"` (FR-024); long title gets the 2-line clamp class
- [X] T042 [P] [US1] Write `frontend/src/features/board/Column.test.tsx`: `<h2>` with the column name and a count chip; cards rendered in `tickets` array order; zero tickets → `ColumnEmptyState` "No tickets in {name}"; `isFirst` renders the "+ New ticket" button (disabled/no-op until US2) and other columns do not
- [X] T043 [P] [US1] Write `frontend/src/features/board/BoardPage.test.tsx` (route `/boards/:boardId`): loading renders header and four column skeletons; ready renders `BoardHeader` with the board name and four `<h2>` headings in the order To Do, In Progress, Review, Done; each ticket is under its column; `/boards/9999` → `NotFoundState` "Board not found" with link "Back to boards" to `/`; `/boards/abc` renders the not-found view and the MSW server receives no request; 500 → `ErrorState` with Retry; reloading the same address renders the same board (EC-003: page loads on its own without visiting `/` first)
- [X] T044 [P] [US1] Write `frontend/src/features/board/ColumnsPager.test.tsx`: renders "1 / 4" and four dots each labelled with its column name (FR-024); `visibleIndex` 2 marks the third dot current and shows "3 / 4"

### Implementation for User Story 1

- [X] T045 [US1] Create `frontend/src/model/board.ts` with `columnOrder(board: BoardDetail): ColumnWithTickets[]` (pure, immutable); `findTicket`, `applyMove`, `movePayload` are added in US3/US4
- [X] T046 [P] [US1] Create `frontend/src/features/boards/BoardListPage.tsx` + `BoardListPage.module.css`: `useResource(boards.list)`; heading "Boards" (headline-lg); rows as `--color-surface-container-lowest` cards with headline-sm name link and body-sm "Created …"; states per contracts/routes-and-views.md §BoardListPage (`Skeleton`, `EmptyState` "No boards yet" with helper text and primary "New board" calling the App-level `onNewBoard`, `ErrorState` with `reload`)
- [X] T047 [P] [US1] Create `frontend/src/features/board/TicketCard.tsx` + `TicketCard.module.css`: `<Link>` to the ticket address with `aria-label="{key} {title}"`; layout per design: key (mono, `--color-outline`), assignee (truncated ellipsis) or italic "Unassigned" in `--color-outline`, title clamped to 2 lines (`-webkit-line-clamp: 2`), `Badge` type + priority; radius `--radius`, `--shadow-sm`, hover `--shadow-md`; exposes `className` modifiers `dragging`, `placeholder`, `saving` as empty hooks for US4
- [X] T048 [P] [US1] Create `frontend/src/features/board/BoardHeader.tsx` + `BoardHeader.module.css`: overline label "Board" + headline-md board name
- [X] T049 [US1] Create `frontend/src/features/board/Column.tsx` + `Column.module.css`: `--color-surface-container-low` panel, radius `--radius`, header with `<h2>` headline-sm name and `--radius-full` count chip; `ColumnEmptyState` (inbox icon, "No tickets in {name}", hint "Drag a ticket here or create one"); `NewTicketButton` ghost full-width "+ New ticket" rendered only for the first column (`onNewTicket` prop, wired in US2); body `overflow-y: auto` so 200 tickets scroll inside the column (EC-006)
- [X] T050 [US1] Create `frontend/src/features/board/ColumnsPager.tsx` + `ColumnsPager.module.css`: props `columns`, `visibleIndex`; renders "n / 4" text and dot buttons with `aria-label={column.name}` and `aria-current` on the visible one; visible only under `max-width: 639px`
- [X] T051 [US1] Create `frontend/src/features/board/BoardPage.tsx` + `BoardPage.module.css`: validate `boardId` against `^\d+$` (invalid → `NotFoundState` with no request); `useResource((signal) => boards.get(Number(boardId), signal), [boardId])`; states per contracts/routes-and-views.md §BoardPage (skeleton, 404 → "Board not found" + "Back to boards", other error → `ErrorState`); ready renders `BoardHeader`, a `BoardNotice` slot (empty until US4), the columns row (`columnOrder(board)`), and an `<Outlet context={{ board, reload }} />` for the drawer; phone layout (`@media (max-width: 639px)`): columns row `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`, each column `flex: 0 0 100%; scroll-snap-align: start`, scroll listener deriving `visibleColumnIndex = Math.round(scrollLeft / clientWidth)` for `ColumnsPager` (FR-019, EC-007)
- [X] T052 [US1] Replace the `/` and `/boards/:boardId` placeholders in `frontend/src/App.tsx` with `BoardListPage` and `BoardPage`; run the US1 test files and the full suite; confirm green, typecheck and lint clean

**Checkpoint**: US1 is a working read-only kanban board. Validate with quickstart.md §US1 against the real backend.

---

## Phase 4: User Story 2 - Create boards and tickets (Priority: P2)

**Goal**: "New board" dialog from the header on any page (navigates to the new board on success); "+ New ticket" dialog in To Do (new card appears last in To Do after a board reload); required-field check client-side, every other error from the server placed beside the field or at form level; pending state blocks double submission.

**Independent Test**: Create a board with a new name and land on `/boards/{newId}` with four empty columns; create one ticket with only a title (card shows Task / Medium / Unassigned) and one with all fields; submit a duplicate board name and see the server's 409 message beside the name field; submit an empty ticket title and see "Required" beside it with no network request; a 201-character title shows the server's message beside the title with the other values kept.

### Tests for User Story 2 (write first, must fail)

- [X] T053 [P] [US2] Write `frontend/src/model/forms.test.ts` for `required(value)`: `""` and `"   "` → `"Required"`, `"x"` → `undefined`; `requiredErrors(values, ["title"])` returns only missing required keys
- [X] T054 [P] [US2] Write `frontend/src/features/boards/BoardCreateDialog.test.tsx`: opens with focus in the name field; empty/whitespace submit shows "Required" beside the field (`aria-invalid`, `aria-describedby`) and the server receives no request; duplicate name ("sample project") → the 409 message appears beside the name field; `server.use` 422 with `field: "name"` → message beside the field; 422 naming an unknown field or 500 → `FormError` with `error.message` (EC-002, EC-001); while pending (use `delay`) the submit button is disabled with label "Creating…" and a second click sends one request only; success closes the dialog and navigates to `/boards/{id}`; Cancel closes and returns focus to the opener; typing in the field clears its error (FR-014)
- [X] T055 [P] [US2] Write `frontend/src/features/board/TicketCreateDialog.test.tsx`: fields title, description, type `<select>` default "Task", priority `<select>` default "Medium", assignee, note "The ticket will be added to the bottom of To Do."; title-only submit sends `POST /boards/1/tickets` with body `{ title }` only (no default fields sent, AS-006); full submit sends all five fields; empty title → "Required" and no request, other values kept; `server.use` 422 with details for `title` and `assignee` → each message beside its field, values kept (FR-015), no ticket created; 422 for `description` when the form shows it → beside description; pending → "Creating…" disabled, one request; success closes, board reload is called and the new card renders last in To Do; Escape closes and discards values and errors
- [X] T056 [P] [US2] Extend `frontend/src/App.test.tsx`: the header "New board" button opens `BoardCreateDialog` on `/` and on `/boards/1`; the empty-state "New board" button on `/` opens the same dialog

### Implementation for User Story 2

- [X] T057 [US2] Create `frontend/src/model/forms.ts`: `required(value: string): string | undefined` (missing when `value.trim() === ""`, message exactly `"Required"`), `requiredErrors<T extends Record<string,string>>(values: T, fields: (keyof T)[]): Partial<Record<keyof T, string>>`, and the `FormState<TValues>` type from data-model.md §2 (`values`, `fieldErrors`, `formError`, `pending`); NO other client-side validation (FR-023)
- [X] T058 [US2] Create `frontend/src/features/boards/BoardCreateDialog.tsx` + `BoardCreateDialog.module.css`: `Dialog` titled "Create new board" with `Field` name* (focus on open), Cancel + primary "Create board" (`pending` → "Creating…", `aria-busy`); `useAction(boards.create)`; on submit run `required`, else send `{ name }` (trimmed); map `ApiError` with `fieldErrors(err, ["name"])`: 409 `conflict` and any `byField.name` → beside the field, otherwise `FormError`; on success `onClose()` then `navigate("/boards/{id}")`; clearing on field change per FR-014
- [X] T059 [US2] Wire the dialog host in `frontend/src/App.tsx`: `AppHeader onNewBoard` and `BoardListPage` empty-state button both open one `BoardCreateDialog` instance rendered by `App`; focus returns to the opener on close (FR-024)
- [X] T060 [US2] Create `frontend/src/features/board/TicketCreateDialog.tsx` + `TicketCreateDialog.module.css`: `Dialog` titled "New ticket"; fields title* (focus), description textarea, type `<select>` (options Bug/Feature/Task, default `task`), priority `<select>` (Low/Medium/High/Critical, default `medium`), assignee; info note; Cancel + "Create ticket" ("Creating…" while pending); `useAction((body) => tickets.create(boardId, body))`; body contains only fields the user filled (empty description/assignee omitted; type/priority included only when changed from the default); `fieldErrors(err, ["title","description","type","priority","assignee"])` for placement, `rest`/empty → `FormError`; on success `onCreated()` (board `reload()`) and close
- [X] T061 [US2] Wire `NewTicketButton` in `frontend/src/features/board/Column.tsx` and `frontend/src/features/board/BoardPage.tsx`: first column's button opens `TicketCreateDialog` with the current `board.id` and `reload`; after reload the new card is last in To Do; run the US2 tests and the full suite; typecheck and lint clean

**Checkpoint**: Boards and tickets can be created end to end. Validate with quickstart.md §US2.

---

## Phase 5: User Story 3 - View and edit ticket details (Priority: P3)

**Goal**: Routed side drawer at `/boards/:boardId/tickets/:key` over the board (full screen on phone) showing key, title, description, type, priority, assignee, column, created/updated; view mode with "Edit"; one edit form with Save (one PATCH of changed fields only; no request when nothing changed) and Cancel; not-found states for malformed/unknown keys; focus management per FR-024.

**Independent Test**: Click a card → URL changes, drawer shows every field; Escape closes it with no board refetch; Edit → change title and priority, clear assignee → Save sends one PATCH with exactly those fields, drawer and card update, "Updated" changes; Edit → Cancel restores values; empty title → "Required", no request; reload with the drawer open restores it; `/boards/1/tickets/TKT-0` and `TKT-99999` show "Ticket not found" with "Back to board".

### Tests for User Story 3 (write first, must fail)

- [X] T062 [P] [US3] Extend `frontend/src/model/board.test.ts` for `findTicket(board, key)`: returns `{ ticket, column }` for a key on the board, `undefined` otherwise
- [X] T063 [P] [US3] Extend `frontend/src/model/forms.test.ts` for `diffTicket(original, values)`: unchanged → `{}`; changed title only → `{ title }`; assignee cleared → `{ assignee: null }`; description cleared → `{ description: "" }`; type/priority changes included; untouched fields never present
- [X] T064 [P] [US3] Write `frontend/src/components/Tabs/Tabs.test.tsx` (`role="tablist"`, tabs with `aria-selected`/`aria-controls`, ArrowRight/ArrowLeft move selection and focus, panel `role="tabpanel"` shows the active content) and `frontend/src/components/SegmentedControl/SegmentedControl.test.tsx` (`role="radiogroup"` with a label, one `role="radio"` per option, click and arrow keys change `value` via `onChange`)
- [X] T065 [P] [US3] Write `frontend/src/features/ticket/TicketDrawer.test.tsx` (render `App` routes with `MemoryRouter` at `/boards/1/tickets/TKT-3`): `role="dialog"` + `aria-modal` + labelled heading; shows key chip, title, description (or "No description"), type and priority badges, assignee or "Unassigned", column chip with the column name, "Created {time} · Updated {time}"; focus lands on the "Close" button on open; Escape and the close button navigate to `/boards/1` and the board is NOT refetched (count `GET /boards/1` requests = 1); clicking a card on `/boards/1` opens the drawer and closing returns focus to that card; `/boards/1/tickets/TKT-0` (malformed) and `/boards/1/tickets/TKT-99999` (unknown) render "Ticket not found" with a "Back to board" link and no `GET /tickets/...` request (phone-width full-screen layout is CSS-only via `@media (max-width: 639px)` in T072 and is verified manually in T095, not asserted here: jsdom does not evaluate media queries)
- [X] T066 [P] [US3] Write `frontend/src/features/ticket/TicketEditForm.test.tsx`: "Edit" switches to the form pre-filled with current values; Save after changing title + priority and clearing assignee sends ONE `PATCH /tickets/TKT-3` with body exactly `{ title, priority, assignee: null }`; view mode shows the saved values, the board card title updates, and focus is on "Edit"; Save with no change sends no request and returns to view mode; Cancel discards changes; empty title → "Required" beside title and no request; `server.use` 422 `title` → message beside title, ticket keeps previous values in view after Cancel; 500 → `FormError`; pending → "Saving…" disabled; Escape while editing closes the drawer and discards edits without confirmation (FR-007)

### Implementation for User Story 3

- [X] T067 [P] [US3] Add `findTicket(board, key): { ticket: Ticket; column: ColumnWithTickets } | undefined` to `frontend/src/model/board.ts`
- [X] T068 [P] [US3] Add `diffTicket(original: Ticket, values: { title; description; type; priority; assignee }): TicketUpdate` to `frontend/src/model/forms.ts` (only changed fields; `assignee` trimmed empty → `null`; `description` cleared → `""`)
- [X] T069 [P] [US3] Write-then-create `frontend/src/components/Tabs/Tabs.tsx` + `Tabs.module.css` (tablist pattern, arrow keys, `--color-primary` underline on the active tab) and `frontend/src/components/SegmentedControl/SegmentedControl.tsx` + `SegmentedControl.module.css` (radiogroup, options with label, `--color-surface-container` track, `--color-surface-container-lowest` selected segment with `--shadow-sm`)
- [X] T070 [US3] Create `frontend/src/features/ticket/TicketView.tsx` + `TicketView.module.css`: read mode per contracts/routes-and-views.md §View mode: headline-md title, description with `overflow-wrap: anywhere` (or "No description"), `Badge` type/priority, assignee or italic "Unassigned", `TicketMeta` line "Created … · Updated …" with `<time dateTime>` attributes, "Edit" button; a `ColumnChip` row with a slot for the `MoveToColumnSelect` added in US4
- [X] T071 [US3] Create `frontend/src/features/ticket/TicketEditForm.tsx` + `TicketEditForm.module.css`: `Field`s title* (focus on entry), description textarea, `SegmentedControl` type, `SegmentedControl` priority, assignee input with a "Clear assignee" icon button; Save ("Saving…" while pending) + Cancel; submit: `required(title)` → "Required"; `diffTicket` empty → behave like Cancel (no request); else `useAction(tickets.update)` with the diff; `fieldErrors(err, ["title","description","type","priority","assignee"])` placement, `rest` → `FormError`; on success call `onSaved()` (board `reload()`) and return to view mode; focus "Edit" after Save or Cancel (FR-024)
- [X] T072 [US3] Create `frontend/src/features/ticket/TicketDrawer.tsx` + `TicketDrawer.module.css`: read `{ board, reload }` from `useOutletContext()`; validate `key` against `^TKT-[1-9][0-9]*$` and `findTicket(board, key)`; not-found state "Ticket not found" + "Back to board" link (navigates to `/boards/{boardId}`); otherwise `role="dialog"`, `aria-modal`, heading = key chip + title, focus trap, focus on "Close" on open, Escape/close/backdrop navigate to the board address (replace when opened by direct load, push otherwise) and restore focus to the opener card or the board heading; mode state `view | edit`; right panel `--drawer-width` 560px with `--shadow-drag`, slide-in disabled under reduced motion; `@media (max-width: 639px)` full-screen; `Tabs` "Comments (n)" / "History (n)" with placeholder panels until US5
- [X] T073 [US3] Replace the nested-route placeholder in `frontend/src/App.tsx` with `TicketDrawer`; ensure `BoardPage` keeps rendering (not refetching) when the drawer route changes; mark the card that opened the drawer so focus can return to it; run the US3 tests and the full suite; typecheck and lint clean

**Checkpoint**: Tickets can be inspected and edited from the drawer with deep-linkable addresses. Validate with quickstart.md §US3.

---

## Phase 6: User Story 4 - Move and reorder tickets by dragging (Priority: P4)

**Goal**: dnd-kit drag and drop between and within columns with an index-accurate placeholder, optimistic `applyMove` within 100 ms, `movePayload` returning null when nothing changed, rollback + `BoardNotice` on failure, board refetch on success and on `invalid_move`, `saving` modifier after 300 ms, and the non-drag `MoveToColumnSelect` in the drawer.

**Independent Test**: Drag a To Do card between two In Progress cards → placeholder while hovering, card in place on drop, same order after reload; drag the last card of a column to the top → order persists; drop into empty Done → only ticket; pick up and drop in place → no request; with the server failing the card snaps back instantly and a notice near the board shows the message; from the drawer, "Move to" + "Move" puts the ticket at the bottom of the chosen column.

### Tests for User Story 4 (write first, must fail)

- [X] T074 [P] [US4] Extend `frontend/src/model/board.test.ts` for `applyMove` and `movePayload`: cross-column move removes from source, inserts at index, renumbers `position` in both columns and sets `column_id`; same-column move to top (index 0) and to end (index n-1); drop into empty column; input not mutated; `movePayload` → `null` when column and index unchanged (FR-009); cross-column payload `{ column_id, position }` with position in `0..n`; same-column payload with `0..n-1`; dropping at the very end yields the last position (EC-009)
- [X] T075 [P] [US4] Write `frontend/src/components/BoardNotice/BoardNotice.test.tsx`: renders nothing for `null`; `role="alert"` panel with error icon, message and a "Close" button calling `onClose`
- [X] T076 [P] [US4] Write `frontend/src/features/board/BoardDnd.test.tsx` using the keyboard sensor (focus card → Space → ArrowRight/ArrowDown → Space): moving `TKT-1` from To Do into In Progress sends `POST /tickets/TKT-1/move` with `{ column_id: 2, position: <index> }` and the card renders in In Progress synchronously before the response; after success the board is refetched (`GET /boards/1` count = 2); picking up and dropping in place sends no request and no notice; `server.use` 500 → card back in To Do at its original index immediately, `BoardNotice` shows the server message, no refetch; `server.use` 422 `invalid_move` → rollback, notice, AND refetch (EC-004); notice closes with its button and clears on the next successful move (FR-014); with fake timers a move whose response takes 500 ms shows the `saving` modifier (label "Saving move…") only after 300 ms and a 100 ms response never shows it; a second drag started while committing is ignored (no second request); Escape during drag restores the snapshot (EC-010 via `over == null`)
- [X] T077 [P] [US4] Write `frontend/src/features/ticket/MoveToColumnSelect.test.tsx`: `<select>` lists the three other columns; "Move" sends `POST /tickets/{key}/move` with `{ column_id }` only (no `position`, AS-007); pending → "Moving…" disabled; success reloads the board, the chip shows the new column, and a live region announces "Moved to {column name}"; `server.use` 422 `invalid_move` → the message appears inline beneath the control (`role="alert"`) and no `BoardNotice` is rendered (FR-011)

### Implementation for User Story 4

- [X] T078 [US4] Add to `frontend/src/model/board.ts`: `applyMove(board, key, toColumnId, toIndex): BoardDetail` (immutable) and `movePayload(board, key, toColumnId, toIndex): TicketMove | null` per data-model.md §2 and research.md §7 (cross-column index `0..n`, same column `0..n-1`, `null` when unchanged)
- [X] T079 [P] [US4] Create `frontend/src/components/BoardNotice/BoardNotice.tsx` + `BoardNotice.module.css`: white `--color-surface-container-lowest` panel at the top of the board area, error icon, message, "Close" icon button, `role="alert"`
- [X] T080 [P] [US4] Create `frontend/src/features/board/DropPlaceholder.tsx` + `DropPlaceholder.module.css`: 80px dashed slot, `--color-primary-fixed` at 30% background, text "Drop ticket here"
- [X] T081 [US4] Make `frontend/src/features/board/TicketCard.tsx` sortable: `useSortable({ id: ticket.key, data: { columnId } })`, spread `attributes`/`listeners`/`setNodeRef` on the single card link element (FR-024: one focusable element carrying the drag attributes), build the transform string with a 3-line local helper (no `@dnd-kit/utilities` import); modifiers: `dragging` (rotate 2deg, scale 1.02, `--shadow-drag`, key in `--color-primary`; used by the `DragOverlay` copy), `placeholder` (original slot rendered as `DropPlaceholder`), `saving` (muted ghost, label "Saving move…", `aria-busy`); tilt/scale disabled under reduced motion
- [X] T082 [US4] Make `frontend/src/features/board/Column.tsx` a drop target: `useDroppable({ id: "column-{id}" })` + `SortableContext(items = ticket keys, strategy = verticalListSortingStrategy)`; empty columns remain valid drop targets
- [X] T083 [US4] Create `frontend/src/features/board/BoardDnd.tsx`: `DndContext` with `MouseSensor` (activationConstraint distance 6), `TouchSensor` (delay 200, tolerance 6), `KeyboardSensor` with `sortableKeyboardCoordinates`, `closestCorners` collision; `DragOverlay` rendering `TicketCard dragging`; handlers delegate to callbacks `onDragStart(key)`, `onDragOver(key, columnId, index)`, `onDragEnd(key, columnId | null, index)`, `onDragCancel()`; resolves hovered column/index from `over.id` (card key → its column and index; `column-{id}` → that column, index = its length)
- [X] T084 [US4] Implement the drag state machine in `frontend/src/features/board/BoardPage.tsx` per data-model.md §3 (`idle → dragging{snapshot} → committing{payload} → idle`): local `board` state seeded from the resource and replaced on every resource update; `onDragOver` → `applyMove`; cancel/`over == null` → restore snapshot; `onDragEnd` → `movePayload(snapshot, …)`; `null` → restore snapshot, no request; else keep optimistic state and `tickets.move`; success → `reload()`; `ApiError` → restore snapshot synchronously, `setNotice(message)`, and `reload()` only when `code === "invalid_move"`; `saving` modifier on the moved card via a 300 ms timer; ignore a new drag start and disable `MoveToColumnSelect` while committing (FR-016); drop results after unmount; notice cleared on the next successful action (create ticket, edit, move, comment)
- [X] T085 [US4] Create `frontend/src/features/ticket/MoveToColumnSelect.tsx` + `MoveToColumnSelect.module.css` and render it in the `ColumnChip` row of `frontend/src/features/ticket/TicketView.tsx`: `<select>` labelled "Move to" with the other three columns, ghost "Move" button ("Moving…" while pending, `aria-busy`); `useAction((columnId) => tickets.move(key, { column_id: columnId }))`; success → `reload()` and an `aria-live="polite"` announcement "Moved to {name}"; any `ApiError` → inline `role="alert"` message beneath the control (never `BoardNotice`); disabled while a drag move is committing (prop from outlet context)
- [ ] T086 [US4] Run the US4 tests and the full suite; typecheck and lint clean; manually verify quickstart.md §US4 steps 1–7 against the real backend (including the two-tab stale-move case)

**Checkpoint**: Full kanban interaction with optimistic moves and rollback. Validate with quickstart.md §US4.

---

## Phase 7: User Story 5 - Comment on a ticket and see its history (Priority: P5)

**Goal**: Comments tab (list oldest first, "No comments yet", add form with author*/text*, cleared on success, focus kept in author) and History tab ("Created in {to}", "{from} → {to}", local times) in the drawer, each with loading, inline error + retry, and empty states; tab counts from the loaded lists.

**Independent Test**: Open `TKT-3` → Comments (2) lists both oldest first with author and time; open a ticket with none → "No comments yet" with the form; submit empty author → "Required" beside it, text kept, no request; add a comment → appended, form cleared, focus in author; History (3) shows "Created in To Do", "To Do → In Progress", "In Progress → Review" oldest first; after a same-column reorder no new entry appears.

### Tests for User Story 5 (write first, must fail)

- [X] T087 [P] [US5] Write `frontend/src/features/ticket/CommentsTab.test.tsx`: loading skeleton; list oldest first with initials avatar, author (label-md bold), `formatDateTime(created_at)`, text; zero comments → "No comments yet" and the form still rendered; `CommentForm` author* and text*: empty author → "Required" beside author, text kept, no request; empty text → "Required" beside text; valid submit sends `POST /tickets/TKT-3/comments` with `{ author, text }`, the new comment is appended last, both fields clear and focus stays in the author field; pending → "Adding…" disabled, one request; `server.use` 422 `text` (too long) → server message beside text, values kept; 500 → `FormError`; `server.use` 500 on the list → inline `role="alert"` message with a "Retry" that refetches; tab label reads "Comments (2)" from the loaded list
- [X] T088 [P] [US5] Write `frontend/src/features/ticket/HistoryTab.test.tsx`: loading skeleton; three entries oldest first for `TKT-3`: first "Created in To Do" (`from_column: null`), then "To Do → In Progress", "In Progress → Review", each with `formatDateTime(changed_at)` in a `<time>`; a ticket with only the creation entry shows one row; list error → inline alert with Retry; tab label "History (3)"; after a drawer move via `MoveToColumnSelect` the history refetches and shows the new entry

### Implementation for User Story 5

- [X] T089 [P] [US5] Create `frontend/src/features/ticket/CommentsTab.tsx` + `CommentsTab.module.css` containing `CommentItem` (initials avatar in `--color-primary-fixed`, author, time with `<time dateTime>`, text wrapping with `overflow-wrap: anywhere`) and `CommentForm` (`Field` author*, `Field` text* textarea, primary "Add comment" → "Adding…" while pending); `useResource((signal) => comments.list(key, signal), [key])`; submit: `requiredErrors(values, ["author","text"])`; `useAction((body) => comments.add(key, body))`; `fieldErrors(err, ["author","text"])` placement, `rest` → `FormError`; success → `reload()` comments, clear both fields, keep focus in author (FR-024); empty → `EmptyState` "No comments yet"; error → inline alert + Retry
- [X] T090 [P] [US5] Create `frontend/src/features/ticket/HistoryTab.tsx` + `HistoryTab.module.css` containing `HistoryItem` (history icon, label "Created in {to_column.name}" when `from_column` is null else "{from_column.name} → {to_column.name}", `<time>` with `formatDateTime(changed_at)`); `useResource((signal) => history.list(key, signal), [key])`; loading skeleton, inline error + Retry, empty state "No history yet" (defensive; the contract always returns the creation entry)
- [X] T091 [US5] Wire both tabs into `frontend/src/features/ticket/TicketDrawer.tsx`: `Tabs` labels "Comments (n)" / "History (n)" from each resource's `data?.length` ("…" while loading); default tab Comments; reload the history resource after a successful `MoveToColumnSelect` move and after the board reload that follows a drag move of the open ticket; run the US5 tests and the full suite; typecheck and lint clean

**Checkpoint**: All five user stories are functional and independently tested. Validate with quickstart.md §US5.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Performance, accessibility and visual-consistency gates (SC-002, SC-005, SC-006, FR-024), final documentation, and the quality gates from the constitution.

- [X] T092 [P] Write `frontend/src/features/board/BoardPage.perf.test.tsx` using `createLargeBoard(200)`: the board renders all 200 cards in To Do, the column body is scrollable, and a keyboard move of the last card still works (EC-006, SC-002 proxy); measure render time with `performance.now()` and assert it stays under 2000 ms in jsdom
- [X] T093 [P] Accessibility pass against FR-024 across `frontend/src/components/**` and `frontend/src/features/**`: verify and fix focus order (dialog first field, drawer close button, return-to-opener), `role="alert"` on `FormError`/`BoardNotice`/inline tab errors, `aria-busy` on pending controls, `aria-live` move announcement, tablist arrow keys, radiogroup segmented controls, text labels on icon-only buttons ("Close", "Clear assignee"), column dots labelled by column name, visible `:focus-visible` ring on cards/buttons/links/inputs; add assertions to the existing component tests where missing
- [X] T094 [P] Contrast and reduced-motion audit in `frontend/src/styles/tokens.css`, `frontend/src/styles/global.css` and every `*.module.css`: check each text/background pair including the seven badge pairs for ≥ 4.5:1 (adjust only via the token already used for the pair, documenting any deviation from the design); confirm `prefers-reduced-motion: reduce` disables drawer slide-in, skeleton pulse and the dragged card's tilt/scale while keeping shadows and colours
- [ ] T095 [P] Phone-width review at 375px (DevTools device mode) per SC-005 and quickstart.md §Cross-cutting: all five stories completable; columns snap one per screen with the "n / 4" indicator; drawer full-screen; dialogs fit without horizontal scroll; touch targets ≥ 40px; fix any clipping in the relevant `*.module.css`
- [ ] T096 [P] Visual-consistency review per SC-006: compare `/boards/1` and the open drawer against `specs/002-kanban-web-frontend/design/board-view.png` and `specs/002-kanban-web-frontend/design/ticket-detail-drawer.png`, and the board list against the design's visual language; fix deviations in the relevant `*.module.css`; record the review notes (what matches, intentional deviations from research.md §1.4) in `specs/002-kanban-web-frontend/checklists/ux-review.md`
- [X] T097 Error-placement audit per contracts/routes-and-views.md §Error placement contract (SC-004): walk every action (board create, ticket create, edit, drag move, detail move, comment add) and every page load through the MSW failure switches (500, `network_error`, 422 unknown field, 404) and confirm each message lands where the table says; add any missing test case to the corresponding `*.test.tsx`
- [X] T098 [P] Finalise `frontend/README.md` (project layout summary, how the MSW double works, how to refresh API types, how to run the quickstart scenarios) and confirm the root `README.md` pointer; all documentation in English
- [X] T099 Run the complete quality gate in `frontend/`: `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`; then `git status -- backend specs/001-kanban-ticketing` must be clean (SC-007) and `git diff --stat frontend/src/api/schema.d.ts` after `npm run api:generate` must be empty
- [ ] T100 Execute every scenario in `specs/002-kanban-web-frontend/quickstart.md` against the real backend (`cd backend && uv run uvicorn app.main:app --reload`) and record pass/fail per step in `specs/002-kanban-web-frontend/checklists/ux-review.md`; fix any failure before marking the feature done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 → T002 first; T003–T006, T009 in parallel after T002; T007 after T002; T008 after T007.
- **Foundational (Phase 2)**: Depends on Phase 1. BLOCKS all user stories. Internal order: T012 → T014 → T016; T024 → T025 → T026 → T027; components T028–T036 after T010/T011 and T027; T037 after T036; T038 last.
- **User Stories (Phases 3–7)**: All depend on Phase 2. Sequential in priority order is the default (P1 → P5); US2–US5 each integrate with earlier stories' files but keep their own tests independent.
- **Polish (Phase 8)**: Depends on all five stories.

### User Story Dependencies

- **US1 (P1)**: After Phase 2 only. Delivers `BoardListPage`, `BoardPage`, `Column`, `TicketCard`, `ColumnsPager`.
- **US2 (P2)**: After Phase 2; touches `App.tsx`, `Column.tsx`, `BoardPage.tsx` from US1 (wiring only). Testable on its own with the MSW double.
- **US3 (P3)**: After US1 (`BoardPage` outlet context, `TicketCard` link). Adds `Tabs`, `SegmentedControl`, drawer, edit form.
- **US4 (P4)**: After US1 (cards/columns) and US3 (`MoveToColumnSelect` lives in `TicketView`); the drag-and-drop half (T078–T084) can start right after US1.
- **US5 (P5)**: After US3 (drawer tabs). Independent of US4 except the history-refetch wiring in T091.

### Within Each User Story

- Test tasks first; run them and watch them fail before implementing (Constitution IV).
- Pure model (`src/model/*`) before components; components before page/route wiring.
- The last task of each story runs the full suite, typecheck and lint.

### Parallel Opportunities

- Phase 1: T003, T004, T005, T006, T009 together after T002.
- Phase 2: T010 ∥ T011; T013 ∥ T015 ∥ T017 ∥ T018 ∥ T020 ∥ T022; all component tasks T028–T035 together.
- US1: T039–T044 together; then T046 ∥ T047 ∥ T048.
- US2: T053–T056 together.
- US3: T062–T066 together; T067 ∥ T068 ∥ T069.
- US4: T074–T077 together; T079 ∥ T080.
- US5: T087 ∥ T088; T089 ∥ T090.
- Phase 8: T092–T096 and T098 together.

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests together (they must fail first):
Task: "T039 model/board.test.ts columnOrder"
Task: "T040 features/boards/BoardListPage.test.tsx"
Task: "T041 features/board/TicketCard.test.tsx"
Task: "T042 features/board/Column.test.tsx"
Task: "T043 features/board/BoardPage.test.tsx"
Task: "T044 features/board/ColumnsPager.test.tsx"

# Then the independent presentational pieces together:
Task: "T046 BoardListPage.tsx"
Task: "T047 TicketCard.tsx"
Task: "T048 BoardHeader.tsx"
```

## Parallel Example: User Story 4

```bash
Task: "T074 model/board.test.ts applyMove + movePayload"
Task: "T075 components/BoardNotice/BoardNotice.test.tsx"
Task: "T076 features/board/BoardDnd.test.tsx"
Task: "T077 features/ticket/MoveToColumnSelect.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup (T001–T009) → toolchain, generated types, drift check.
2. Phase 2 Foundational (T010–T038) → API layer, hooks, MSW double, base components, app shell.
3. Phase 3 US1 (T039–T052) → read-only board list and board view.
4. **STOP and VALIDATE**: quickstart.md §US1 against the real backend; demo a shared read-only board.

### Incremental Delivery

1. US1 → read-only kanban (MVP).
2. US2 → teams can add boards and tickets without the API.
3. US3 → ticket drawer with deep links and editing.
4. US4 → drag-and-drop moves with rollback plus move-from-detail.
5. US5 → comments and history.
6. Phase 8 → performance, accessibility, visual review, final gates.

### Parallel Team Strategy

After Phase 2: Developer A takes US1 then US4's drag half; Developer B takes US2 then US5; Developer C takes US3 then US4's `MoveToColumnSelect`. Integrate at each story checkpoint by running the full suite.

---

## Notes

- Never edit `frontend/src/api/schema.d.ts` by hand; regenerate with `npm run api:generate` (Constitution II). Hand-written API shapes are forbidden: use the aliases in `src/api/types.ts`.
- The only client-authored user-facing texts are "Required", "Could not reach the server.", "Unexpected response from the server (<status>)." and the not-found/empty-state copy (AS-008). Every other message is the server's.
- No client-side validation beyond the required-field check (FR-023).
- `backend/` and `specs/001-kanban-ticketing/` stay untouched (SC-007).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

## Phase 9: Convergence

- [X] T101 CRITICAL: Justify the `@types/node` dev dependency (needed by `frontend/tsconfig.node.json` `types: ["node"]`, `frontend/scripts/check-api-types.mjs` and the `node:fs` read in `frontend/src/api/schema.contract.test.ts`) with a row in the Complexity Tracking table of `specs/002-kanban-web-frontend/plan.md`, or remove it from `frontend/package.json` if those files can type-check without it; re-run `npm run typecheck` and `npm test` in `frontend/` per Constitution V (unrequested)
- [X] T102 HIGH: Make each column scroll vertically on its own: give the board/columns row in `frontend/src/features/board/BoardPage.module.css` and `Column.module.css` a bounded height (e.g. `.page`/`.columns` fill the viewport below `--header-height` with `min-height: 0`, columns `max-height: 100%`/`align-self: stretch`) so the `.body { overflow-y: auto }` actually engages instead of the page growing; on phone width keep one full-width column per screen with the same per-column scroll; add a `Column`/`BoardPage` assertion that guards the layout contract (e.g. the column body is the scroll container) per EC-006, FR-019 and US1/AC4 (partial)
- [X] T103 MEDIUM: Stop `BoardPage` showing the previous board under a new address: in `frontend/src/features/board/BoardPage.tsx` key `LoadedBoard` by `boardId` (or ignore `data` whose `id` differs from `Number(boardId)`) so that navigating between `/boards/1` and `/boards/2` (history back/forward, edited address) renders the skeleton until the requested board loads; add a `BoardPage.test.tsx` case that navigates between two boards and asserts the old board's name and tickets are not shown while the new one loads per FR-017 and US1/AC3 (partial)
