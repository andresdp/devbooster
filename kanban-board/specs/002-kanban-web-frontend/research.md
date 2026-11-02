# Research: Kanban Web Frontend

No `NEEDS CLARIFICATION` markers remain. The stack was fixed by the constitution and the planning
input; the entries below record the design source extracted from Stitch, the dependency
evaluations, and the decisions that shape `plan.md`.

## 1. Design source (Stitch project 13486008395924154472)

**Decision**: The live Stitch project "Kanban Ticketing UI Design System" is the design source.
Its two screens, one design system and the design tokens were pulled through the Stitch MCP on
2026-10-25 and frozen under [`design/`](./design/README.md) as the fixed reference for SC-006.

**Rationale**: AS-002 names the live project as source of truth but SC-006 needs a stable
reference for review; a committed snapshot gives both.

### 1.1 Screens

| Screen | Id | Content | Spec coverage |
|--------|----|---------|---------------|
| Board View (API Compliant) | `b24313442a0d41d081936182be99ccf7` | Fixed 48px header (app name, board switcher, "New board"), board subheader with open board-switcher dropdown, four columns To Do / In Progress / Review / Done with count chips, "+ New ticket" button at top of To Do, ticket cards, an in-flight dragged card (tilted, elevated, "dragging" tag), a "Drop ticket here (pos 0)" placeholder, a "Reverting move…" ghost card, a "Move Rejected" toast, an empty-column state ("No tickets in Review"), a "No boards yet" empty state with CTA, and a loading skeleton | US1, US2 (board), US4, FR-003/004/005/009/010/018, EC-001 |
| Ticket Detail Drawer & Modals (API Compliant) | `0da771a50c6c410b9afe8f2f8628ea97` | Board dimmed behind a 560px right drawer: key chip, title input, column chip, "Properties" group (segmented Type and Priority, assignee text input with clear, description textarea) with Save/Cancel, created/updated line, Comments/History tabs, comment list, new-comment form (author, text); hidden "New ticket" modal (title with required-error state, description, type, priority, assignee, general error banner) and hidden "Create New Board" modal | US2 (forms), US3, US5, FR-006/007/012/013/014/015/023 |

Not covered by any screen, to be derived from the design's visual language (FR-020): the board
list page, page-level loading/error/not-found states, phone-width layout, the move-from-detail
control. Section 1.4 records how each is derived.

### 1.2 Design tokens

Full values are in [`design/design-system.md`](./design/design-system.md). Summary of what the
app implements as CSS custom properties in `frontend/src/styles/tokens.css`:

| Group | Tokens (CSS custom property names) |
|-------|-----------------------------------|
| Surfaces | `--color-surface` #fbf8ff, `--color-surface-container-lowest` #ffffff, `--color-surface-container-low` #f4f2fd, `--color-surface-container` #eeedf7, `--color-surface-container-high` #e8e7f1, `--color-surface-container-highest` #e3e1ec, `--color-surface-dim` #dad9e3 |
| Text | `--color-on-surface` #1a1b22, `--color-on-surface-variant` #464555, `--color-outline` #777587, `--color-outline-variant` #c7c4d8 |
| Primary | `--color-primary` #3525cd, `--color-primary-container` #4f46e5, `--color-on-primary` #ffffff, `--color-on-primary-container` #dad7ff, `--color-primary-fixed` #e2dfff, `--color-on-primary-fixed` #0f0069, `--color-on-primary-fixed-variant` #3323cc |
| Secondary | `--color-secondary` #4648d4, `--color-secondary-container` #6063ee, `--color-on-secondary-container` #fffbff, `--color-secondary-fixed` #e1e0ff, `--color-on-secondary-fixed` #07006c |
| Tertiary | `--color-tertiary` #004d70, `--color-tertiary-container` #006693, `--color-on-tertiary-container` #b8e0ff, `--color-tertiary-fixed` #c9e6ff, `--color-on-tertiary-fixed` #001e2f, `--color-on-tertiary-fixed-variant` #004c6e |
| Error | `--color-error` #ba1a1a, `--color-on-error` #ffffff, `--color-error-container` #ffdad6, `--color-on-error-container` #93000a |
| Typography | `--font-sans` Inter, `--font-mono` JetBrains Mono; `--text-headline-lg/md/sm`, `--text-body-lg/md/sm`, `--text-label-lg/md/sm`, `--text-code-md`, `--text-ticket-key` as size/line-height/weight/letter-spacing triples (e.g. `--text-body-md-size: 0.875rem; --text-body-md-line: 1.25rem; --text-body-md-weight: 400`) |
| Radii | `--radius-sm` 0.25rem (badges, chips), `--radius` 0.5rem (cards, columns, inputs, buttons), `--radius-md` 0.75rem (dialogs, property groups), `--radius-full` 9999px (count chips) |
| Spacing | `--space-xs` 0.25rem, `--space-sm` 0.5rem, `--space-md` 0.75rem, `--space-lg` 1rem, `--space-xl` 1.5rem, `--gutter` 1rem, `--gutter-compact` 0.5rem, `--margin` 1.5rem, `--margin-mobile` 1rem |
| Elevation | `--shadow-sm` 0 1px 2px rgba(15,23,42,.06); `--shadow-md` 0 4px 12px -2px rgba(15,23,42,.08), 0 2px 6px -1px rgba(15,23,42,.04) (card hover); `--shadow-drag` 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.05) (dragged card, dialogs, drawer) |
| Layout | `--header-height` 3rem, `--drawer-width` 560px, `--column-min-width` 280px, `--bp-phone` 640px (media query value, not a custom property) |

Semantic enum colours (from the Board View screen, which is the screen that shows badges):

| Enum | Background | Text |
|------|-----------|------|
| type=bug | error-container | on-error-container |
| type=feature | secondary-container | on-secondary-container |
| type=task | surface-container-highest | on-surface-variant |
| priority=low | surface-container | on-surface-variant |
| priority=medium | tertiary-fixed | on-tertiary-fixed-variant |
| priority=high | primary-fixed | on-primary-fixed-variant |
| priority=critical | error | on-error |

### 1.3 Component inventory

Extracted from both screens; the right column is the React component that implements it.

| Design element | Where | Component |
|----------------|-------|-----------|
| App header (48px, app name with kanban icon, right-aligned primary "New board" button) | both | `AppHeader` |
| Board title block ("Sprint 24 Backlog" headline-md with overline label) | board view | `BoardHeader` |
| Board switcher dropdown | board view | not built: the board list page (`/`) replaces it (section 1.4) |
| Column (surface-container-low panel, radius 8, header: headline-sm name + count chip, status icon) | both | `Column` |
| "+ New ticket" full-width ghost button in To Do | board view | `NewTicketButton` inside `Column` (first column only) |
| Ticket card (key mono muted, assignee or italic "Unassigned", title 2-line clamp, type + priority badges) | board view | `TicketCard` |
| Type / priority badge | both | `Badge` (`variant="type"|"priority"`) |
| Dragged card (rotate 2deg, scale 1.02, shadow-drag, key primary) | board view | `TicketCard` with `dragging` modifier, rendered in `DragOverlay` |
| Drop placeholder ("Drop ticket here", primary-fixed/30, 80px, dashed) | board view | `DropPlaceholder` (rendered in place of the dragged card's original/target slot) |
| "Reverting move…" ghost card | board view | `TicketCard` with `saving` modifier (same muted ghost style, labelled "Saving move…", shown at the card's new position while the move request exceeds 300 ms; rollback is instant with no modifier, FR-010/FR-016) |
| Toast "Move Rejected" (top-right, white, error icon, close) | board view | `BoardNotice` (rendered near the board, FR-010) |
| Empty column state (inbox icon, "No tickets in <Column>", hint) | board view | `ColumnEmptyState` |
| "No boards yet" empty state with CTA | board view (state preview) | `EmptyState` used by `BoardListPage` |
| Loading skeleton (grey bars, pulse) | board view (state preview) | `Skeleton` used by board/list loading states |
| Drawer (560px right panel, sticky header with key chip, copy, open-full, close) | drawer screen | `TicketDrawer` (copy and open-full icons dropped: not in spec) |
| Column chip + note | drawer | `ColumnChip` + `MoveToColumnSelect` (replaces the "moves via drag & drop only" note; see 1.4) |
| Properties group (segmented Type, segmented Priority, assignee input with clear, description textarea, Save/Cancel) | drawer | `TicketEditForm` (one form, one Save/Cancel pair; the design's separate "Save description" button is dropped per FR-007) |
| Segmented control | drawer | `SegmentedControl` (used for type and priority in the edit form; native `<select>` in the create dialog as in the design) |
| Created/updated metadata line | drawer | `TicketMeta` |
| Tabs (Comments (n) / History (n)) | drawer | `Tabs` |
| Comment item (initials avatar, author label-md bold, time, text) | drawer | `CommentItem` |
| New comment form (author input, text textarea, "Add comment" primary button) | drawer | `CommentForm` |
| History item (icon, "To ← From" label, time) | drawer | `HistoryItem` |
| Dialog shell (backdrop blur, max-w-lg, radius 12, title with icon, close) | drawer screen (modals) | `Dialog` |
| New ticket form (title*, description, type select, priority select, assignee, info note, Cancel/Create) | modal | `TicketCreateDialog` |
| New board form (name*, Cancel/Create) | modal | `BoardCreateDialog` (key prefix and column fields dropped: not in contract) |
| Field with label, optional hint, error line (icon + label-sm error text, error ring) | modal | `Field` + `FieldError` |
| General error banner (error-container, warning icon, title + message) | modal | `FormError` |
| Button (primary / ghost) | all | `Button` |

### 1.4 Decisions where the design and the spec/contract disagree

| Design shows | Spec/contract says | Decision |
|--------------|-------------------|----------|
| Board switcher dropdown in header and subheader; "Backlog" and "Settings" nav links; filter bar, quick filters, avatar stack, "Board settings" button | Out of scope (AS-003: no filtering/search/customising columns); FR-001 needs a board list page | Header keeps app name and "New board". Board list is its own page at `/` using the design's card/list language (surface-container-lowest rows, headline-sm names, body-sm created date). No nav links, filters or avatars. |
| Drawer screen has a 5th "Backlog" column and "Review & QA" | Contract: four fixed columns from the server | Columns always rendered from `BoardDetail.columns` in server order |
| "Column moves via board drag & drop only" lock note | FR-011: move from the detail | Note replaced by a `<select>` + "Move" ghost button in the same chip row |
| Separate "Save description" button; title styled as inline input | FR-007: one form, one Save/Cancel | One `TicketEditForm` wrapping title, description, type, priority, assignee |
| Properties group always editable, no read-only view | FR-007: the drawer opens in view mode and an "Edit" button opens the form | View mode (`TicketView`) with an "Edit" button; `TicketEditForm` rendered only in edit mode, Save/Cancel return to view mode |
| History lists "Assignee set to…" entries, "Automated webhook" actors | Contract history = column changes only, no actor | History shows creation + column changes with time only |
| Relative times ("2h ago") in comments | FR-022: human-readable local time | Absolute local time via `Intl.DateTimeFormat` (medium date, short time), same format as the drawer's "Created Oct 20, 2026, 10:12 AM" line |
| "Markdown supported" hint | Not in spec | Dropped; plain text |
| Comment author prefilled, avatars with initials | AS-004: free-text author | Author input empty by default; initials avatar computed from the author string (pure presentation) |
| Move rejection as a toast top-right | FR-010: "near the board" | `BoardNotice` rendered at the top of the board area (same visual: white panel, error icon, close); not a global toast system |
| "+ New ticket" only at top of To Do | FR-005: ticket created at bottom of To Do by server | Kept as designed (button in the first column), dialog note "The ticket will be added to the bottom of To Do" |
| Card radius 4px (board screen) vs 8px (drawer screen) | — | 8px for cards (design-system prose) |
| Material Symbols icon font + Google Fonts | Principle V | Inter and JetBrains Mono loaded from Google Fonts with system fallbacks (only runtime network asset; tests do not need it). Icons are a dozen inline SVG paths in `Icon.tsx`, no icon font. |
| Mobile: "single-column stacked tab switch / aggregated priority stream" (prose) | Clarification: horizontal snap-scroll, one column per screen | Snap-scroll per the clarified spec; the column header shows "n / 4" and the other columns' names remain reachable by swiping |

## 2. Stack and versions

**Decision**: Node 22 LTS, TypeScript 5.9 (strict), React 19, Vite 8 with `@vitejs/plugin-react`,
React Router 7, Vitest 5 with jsdom, Testing Library (react, user-event, jest-dom), MSW 3,
openapi-typescript 7, ESLint 10 (flat config) with typescript-eslint, eslint-plugin-react-hooks
and eslint-config-prettier, Prettier 3. Package manager: npm (lockfile committed).

**Rationale**: Mandated by the constitution and the planning input except for two pins verified
against npm on 2026-10-25:

- TypeScript is pinned to 5.9.x, not the 7.x "latest" (the native compiler line):
  `typescript-eslint` declares `typescript >=4.8.4 <6.1.0` and `openapi-typescript` declares
  `^5.x`, so 7.x would break lint and type generation. Revisit when both support 7.
- React Router is pinned to 7.x (`version-7` tag, 7.18.x, maintained). 8.x was released after the
  planning knowledge of its API; the plan specifies only `BrowserRouter`, `Routes`, `Route`,
  `Outlet`, `Link`, `useParams`, `useNavigate`, which are the stable 7.x surface. Upgrading to 8
  is a separate task once its migration notes are checked.

Other peer ranges checked: `@vitejs/plugin-react` 6 ↔ Vite 8; Vitest 5 ↔ Vite 8; MSW 3 ↔ Vite ≥6,
TypeScript ≥5.9; `@testing-library/react` 16 ↔ React 19; `@dnd-kit/core` 6.3 ↔ React ≥16.8.

**Alternatives considered**: pnpm/yarn (no benefit for one package); happy-dom instead of jsdom
(jsdom is the Testing Library default and has the broader DOM coverage dnd-kit's sensors need).

## 3. API types from the contract (Principle II)

**Decision**: `openapi-typescript` generates `frontend/src/api/schema.d.ts` from
`specs/001-kanban-ticketing/contracts/openapi.json`. Scripts:

```json
"api:generate": "openapi-typescript ../specs/001-kanban-ticketing/contracts/openapi.json -o src/api/schema.d.ts",
"api:check":    "node scripts/check-api-types.mjs",
"typecheck":    "npm run api:check && tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json"
```

`scripts/check-api-types.mjs` regenerates in memory with the library's programmatic API
(`openapiTS(url)` + `astToString`) and compares byte-for-byte with the committed file; on
mismatch it prints a unified diff hint ("run npm run api:generate") and exits 1, so `npm run
typecheck` fails before `tsc` runs. The same comparison is a Vitest test
(`src/api/schema.contract.test.ts`), so `npm test` fails on drift too (user input: "contract-drift
test"). The generated file carries a header comment and is excluded from ESLint and Prettier; a
lint rule (`no-restricted-imports` is not needed) is replaced by review: hand-written API shapes
are forbidden, every request/response type is `components["schemas"][...]` or
`paths[...]["get"]["responses"]...`.

**Rationale**: constitution II requires generated types, a reproducible command and a failing
check on divergence. Generating from the path keeps `specs/` the single source.

**Alternatives considered**: `openapi-fetch` on top of the types (extra runtime dependency; the
contract has 10 operations and a thin client is ~80 lines); Orval/Kubb (heavier generators that
also emit clients and mocks, more config than the feature warrants).

## 4. Fetch client and error handling (Principle VII)

**Decision**: `src/api/client.ts` exports one `request` helper and typed operation functions
(see [`contracts/api-client.md`](./contracts/api-client.md)). Every non-2xx response is parsed as
`ErrorResponse` and thrown as `ApiError { status, code, message, details }`. A failed `fetch`
(network, CORS, aborted) becomes `ApiError { status: 0, code: "network_error", message: "Could
not reach the server." }`; a non-JSON error body becomes `code: "unexpected_response"` with the
HTTP status text. Base URL: `import.meta.env.VITE_API_BASE_URL` defaulting to
`http://localhost:8000`; all paths are prefixed with `/api/v1`. Timestamps stay ISO strings in
the API layer; formatting happens in `format.ts`.

**Rationale**: the backend already allows origin `http://localhost:5173` (AS-009), so no Vite
proxy is needed; one error type keeps FR-014 mapping in one place (`fieldErrors(error)` returns
`Record<field, message>` and `formError(error)` returns the message for everything else, with
unknown-field details falling back to the form level per EC-002).

**Alternatives considered**: Vite dev proxy (hides CORS in dev only; production build would still
need the real origin); axios (dependency with no benefit over fetch).

## 5. Data fetching without a library (Principle V)

**Decision**: Two small hooks in `src/hooks/`:

- `useResource(load, deps)` → `{ status: "loading"|"ready"|"error", data, error, reload }`,
  cancels stale results with an `AbortController`/generation counter.
- `useAction(run)` → `{ execute, pending, error, reset }`, guarantees one in-flight call per
  action (FR-016) and ignores results after unmount (EC-008).

The board page owns `useResource(() => boards.get(id))`; every successful mutation (create ticket,
edit, move, comment) calls `reload()` so the board and the drawer re-render from server state.
The drawer reads its ticket from the loaded board (`BoardDetail` embeds full `TicketRead`), and
fetches comments and history with `useResource` keyed by ticket key. No cache, no global store:
component state plus the route is the whole state model.

**Rationale**: the spec needs loading/error states, refetch after mutation and one optimistic
path (moves). React Query would add a dependency, a provider and cache-invalidation semantics
to replace ~60 lines of hooks. The plan found no requirement (background refresh, dedupe across
components, pagination, retries) that needs it. `GET /tickets/{key}` is not called by the app:
the board already contains the ticket, and deep links to a key that is not on the board show the
not-found state from local data (FR-017).

**Alternatives considered**: React Query / SWR (rejected above); React Router loaders/actions
(would split data access between two mechanisms and complicate MSW-based component tests).

## 6. Routing

**Decision**: `react-router` 7 with `BrowserRouter` and nested `Routes`:

```text
/                                  BoardListPage
/boards/:boardId                   BoardPage
/boards/:boardId/tickets/:key      BoardPage + <TicketDrawer> via <Outlet>
*                                  NotFoundPage
```

`boardId` must match `^\d+$` and `key` must match `^TKT-[1-9][0-9]*$` (the contract's pattern);
anything else renders the not-found view without a request. The drawer closes by navigating to
`/boards/:boardId` (no reload of the board, FR-006). Tests mount pages inside `MemoryRouter`.

**Rationale**: three routes, no loaders, so the plain component router is the simplest setup.

## 7. Drag and drop: dnd-kit vs native HTML drag and drop

Requirements (FR-008/009/010, SC-003, EC-009/010, user input): column-to-column moves and
in-column reorder, a visible drop placeholder, touch support, optimistic update with rollback,
keyboard alternative already provided by the move-from-detail control.

| Criterion | Native HTML5 DnD | dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`) |
|-----------|------------------|-------------------------------------------------|
| Touch | Not fired on Android Chrome; iOS Safari only since 11 with quirks; would need a hand-written pointer-event fallback | Pointer/Touch/Mouse sensors built in, with activation delay/distance to coexist with scrolling and click-to-open |
| Drop placeholder at the exact index | Manual: compute index from `dragover` pointer geometry on every event (fires continuously), throttle, manage insertion state by hand | `SortableContext` + `verticalListSortingStrategy` shift siblings to open the gap; the dragged item's original node becomes the placeholder |
| Drag preview | Browser ghost image; cannot be styled (no tilt/shadow per design) | `DragOverlay` renders our own `TicketCard` with the design's dragging style |
| Cross-container move | Manual tracking of source/target lists | Standard pattern: `onDragOver` moves the item between containers in local state |
| Keyboard | None | `KeyboardSensor` for free (also makes DnD testable in jsdom via `user-event` keyboard, where pointer-drag simulation is unreliable) |
| Browser quirks | Firefox requires `dataTransfer.setData`; `dragend` lost when DOM re-renders under the pointer | Pointer events only, independent of the DnD DOM API |
| Size / deps | 0 | core ≈ 11 kB + sortable ≈ 4 kB gzipped; transitive `@dnd-kit/utilities`, `@dnd-kit/accessibility`, `tslib` only; React ≥16.8 peer; no CSS |
| Code to write | ~250 lines of event handling plus geometry, with the touch fallback still missing | ~120 lines: sensors, two handlers, `applyMove` helper |

**Decision**: `@dnd-kit/core` and `@dnd-kit/sortable` (runtime dependencies). Sensors:
`MouseSensor` (distance 6px so a click still opens the drawer), `TouchSensor` (delay 200ms,
tolerance 6px so vertical scrolling in a column still works) and `KeyboardSensor` with
`sortableKeyboardCoordinates`. The transform string is built with a 3-line local helper so
`@dnd-kit/utilities` is not imported directly.

Flow: `onDragStart` snapshots the board; `onDragOver` moves the card between columns in local
state so the gap appears in the hovered column; `onDragEnd` computes `{column_id, position}` from
the resulting arrays (cross-column: index in target 0..n; same column: 0..n-1, matching the
contract), returns early with no request when column and position are unchanged (FR-009, EC-010
when dropped outside any column via `over == null` → restore snapshot), otherwise keeps the
optimistic state and calls `tickets.move`. On success: `reload()` the board. On `ApiError`:
restore the snapshot, show the message in `BoardNotice`; if `code === "invalid_move"` also
`reload()` (FR-010, EC-004). Rendering the optimistic state is synchronous, which satisfies
SC-003's 100 ms.

**Justification per Principle V**: the native API fails the touch requirement outright and the
placeholder/preview requirements without substantial custom code; dnd-kit is a focused library
with no transitive UI or state dependencies, so it is the simplest solution that satisfies the
spec. `@hello-pangea/dnd` (heavier, opinionated DOM) and `@atlaskit/pragmatic-drag-and-drop`
(several packages, adapters) were considered and rejected as larger.

## 8. Styling

**Decision**: plain CSS: `src/styles/tokens.css` (custom properties from section 1.2),
`src/styles/global.css` (reset, font-face links, body background, focus ring), and one
`*.module.css` per component. No UI library, no Tailwind, no CSS-in-JS. Phone width uses one
media query (`max-width: 639px`): the columns row becomes `display: flex; overflow-x: auto;
scroll-snap-type: x mandatory`, each column `flex: 0 0 100%; scroll-snap-align: start` with its
own vertical scroll; the drawer becomes full-screen. The visible column index is tracked with a
scroll listener to render the "n / 4" indicator and column dots.

**Rationale**: FR-020 and the planning input; CSS modules are built into Vite with no plugin.

## 9. Testing strategy (Principle IV)

**Decision**: Vitest (`environment: jsdom`, `setupFiles: src/test/setup.ts`), Testing Library with
`user-event`, MSW `setupServer` started in setup with `onUnhandledRequest: "error"`. Handlers
(`src/test/msw/handlers.ts`) implement the ten operations over an in-memory fixture store typed
with `components["schemas"]`, reproducing the contract's rules the UI depends on (see
[`contracts/msw-handlers.md`](./contracts/msw-handlers.md)). Tests are organised per user story
and written before implementation; each view has tests for its primary interaction and its
loading/empty/error states, asserting rendered output only.

DnD tests drive moves through the keyboard sensor (focus card → Space → Arrow keys → Space),
which dnd-kit supports in jsdom, and the pure helpers `applyMove` and `movePayload` get unit
tests for the index arithmetic (EC-009). A contract-drift test compares the generated types with
the contract (section 3). Coverage is not gated.

**Alternatives considered**: Playwright for DnD (real browser, but a second runner and a
running backend; deferred, not required by the spec); mocking `fetch` by hand (MSW keeps mocks at
the network boundary required by the constitution).

## 10. Lint, format, docs

**Decision**: ESLint flat config (`eslint.config.js`) with `@eslint/js` recommended,
`typescript-eslint` recommended-type-checked, `eslint-plugin-react-hooks`, and
`eslint-config-prettier` last; Prettier with defaults (`printWidth` 100, single quotes off).
Scripts `lint`, `lint:fix`, `format`, `format:check`. `src/api/schema.d.ts` is ignored by both.
`frontend/README.md` documents install, dev, test, typecheck, lint, format and api:generate from
a fresh checkout; the root `README.md` gets a two-line pointer.

## 11. Dependency list (final)

Runtime: `react`, `react-dom`, `react-router`, `@dnd-kit/core`, `@dnd-kit/sortable`.
Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`,
`jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
`msw`, `openapi-typescript`, `eslint`, `@eslint/js`, `typescript-eslint`,
`eslint-plugin-react-hooks`, `eslint-config-prettier`, `prettier`. Each line outside the
planning input's list is justified in `plan.md` (Complexity Tracking).
