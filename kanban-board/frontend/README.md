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
