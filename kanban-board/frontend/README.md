# Kanban frontend

React + TypeScript single-page app for the kanban board. It talks to the FastAPI backend in
`../backend` through the typed client in `src/api/`.

## Prerequisites

- Node 22 LTS and npm 10+
- The backend running as described in `../backend/README.md` (default `http://localhost:8000`)

## Getting started

```sh
npm ci
npm run dev        # http://localhost:5173
```

## Scripts

| Command                | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server on http://localhost:5173 (port is strict)            |
| `npm test`             | Vitest + Testing Library, backend mocked with MSW                    |
| `npm run typecheck`    | API drift check, then `tsc` for the app and node configs             |
| `npm run lint`         | ESLint                                                               |
| `npm run format:check` | Prettier check (`npm run format` to fix)                             |
| `npm run api:generate` | Regenerate `src/api/schema.d.ts` from the committed OpenAPI contract |
| `npm run build`        | Type-check and build to `dist/`                                      |

### API types

`src/api/schema.d.ts` is generated from
`../specs/001-kanban-ticketing/contracts/openapi.json`. Run `npm run api:generate` whenever that
contract changes and commit the result unedited. `npm run api:check` (part of `typecheck`) and
`src/api/schema.contract.test.ts` regenerate the types in memory and fail if the committed file
differs.

## Configuration

`VITE_API_BASE_URL` overrides the backend address (default `http://localhost:8000`); see
`.env.example`.

### Container build

The Docker image (`Dockerfile`) builds with `VITE_API_BASE_URL=""`, so the app calls `/api/...` on
its own origin and nginx forwards those requests to the backend
(`nginx/default.conf.template`). The dev server default `http://localhost:8000` is unchanged. The
image build fails if `localhost:8000` appears in `dist/`. See "Run with Docker" in the
[root README](../README.md).

## Project layout

```text
src/
  api/          typed client (client.ts), ApiError + field-error helpers, generated schema.d.ts
  hooks/        useResource (loading/ready/error + reload) and useAction (pending + ApiError)
  model/        pure logic: board.ts (columnOrder, findTicket, applyMove, movePayload),
                forms.ts (required, diffTicket), format.ts
  styles/       tokens.css (design tokens) and global.css
  components/   shared UI: Button, Dialog, Field, FormError, Tabs, SegmentedControl, BoardNotice, ...
  features/     boards/ (list + create dialog), board/ (board, columns, cards, drag and drop),
                ticket/ (drawer, view/edit, move-to-column, comments, history)
  test/         MSW double (msw/), render helper, jsdom layout stub for drag-and-drop tests
```

## Tests and the MSW double

Tests run against an in-memory implementation of the backend contract in `src/test/msw/`
(`fixtures.ts` seed data, `store.ts` state and validation, `handlers.ts` one handler per
operation). `src/test/setup.ts` starts the server for every test file, fails on unhandled
requests and resets the store after each test. Override a single response in a test with
`server.use(http.post(...))` to exercise failures (500, 422, 409, network errors).

jsdom has no layout, so `src/test/layout.ts` fakes element rectangles and `ResizeObserver` for the
keyboard drag-and-drop tests.

## Validating against the real backend

Start the backend (`cd ../backend && uv run uvicorn app.main:app --reload`), then follow the
scenario walkthroughs in
[`../specs/002-kanban-web-frontend/quickstart.md`](../specs/002-kanban-web-frontend/quickstart.md).
Results are recorded in `../specs/002-kanban-web-frontend/checklists/ux-review.md`.

## Design notes

Text that would use `--color-outline` on a light surface uses `--color-on-surface-variant`
instead: `--color-outline` measures 4.05:1 to 4.49:1 on the surface tokens, below the 4.5:1 WCAG AA
target (FR-024). All seven badge colour pairs are at least 4.5:1.

Drag and drop uses a composite collision strategy (pointer, then rectangle overlap, preferring
cards over their column, then `closestCorners`): columns are much taller than cards, so
`closestCorners` alone favours a neighbouring column's cards.
