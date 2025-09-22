# Project Audit — RMSv3

Date: 2025-09-15

## Quick Inventory

- Stack: React 19, TypeScript 5.9, Vite 7, TailwindCSS, TanStack (Query/Table/Virtual), Zustand, PouchDB (+find, idb adapter), Zod, Vitest, MSW, Electron (optional desktop build).
- Entry points: `index.html:1` loads `src/main.tsx:1`. No `src/index.ts` present.
- Router: Data Router via `createBrowserRouter` in `src/router/RouterProvider.tsx:3` and route objects in `src/router/routes.tsx:87`.
- Tests: Mixed patterns — colocated `*.test.tsx` and `src/__tests__/**` used. Many tests wrap components with `BrowserRouter`.
- Logging: Centralized `src/shared/logger.ts` used in `src/main.tsx:9`. Vite production console stripping configured per reports.
- Data: PouchDB present (`pouchdb`, `pouchdb-find`, `pouchdb-adapter-idb`, `pouchdb-browser`, memory adapter dev). No explicit `src/data/{local,remote,sync,outbox}` folders yet.
- Events: Event store code present under `src/events/` with tests; TODOs indicate more schema and adapters needed.
- Electron: Desktop code under `electron/`, started via scripts and packaged with `electron-builder`. Web code not importing from Electron.

## Findings

### Structure
- Root docs and reports are organized into `docs/`, `audits/`, `plans/`. Historical items have been moved per Phase 0 report.
- Recommended feature-first refinement and dedicated `src/data` subfolders not yet created.

### Routing
- Data Router is implemented: `src/router/RouterProvider.tsx:3`, `src/router/routes.tsx:87`.
- Tests still reference `BrowserRouter` wrappers (e.g., `src/__tests__/...`), which is acceptable but could be aligned with the RouterProvider test utilities to match production routing.

### TypeScript & Code Quality
- `tsconfig.app.json:1` has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noUncheckedIndexedAccess: true` — already enabled.
- `baseUrl: "src"` and `paths` are configured.
- Garbled strings present in logs (artifact of copy/encoding) in `src/main.tsx:29` and `README.md` sections; should be cleaned.

### Logging
- Central logger present `src/shared/logger.ts`; `src/main.tsx` uses it. Reports note Vite build strips console in prod. A sweep for stray `console.log` is still advised; TODO scan shows mainly domain TODOs, not raw console usage.

### Data Layer & Sync
- PouchDB deps exist and are used, but no explicit outbox implementation folders; online/offline triggers not centralized.
- TODOs indicate mocked dashboard adapters and placeholder API calls in inventory/customer flows.

### Dependencies & Scripts
- `package.json:1` scripts reference `wait-on`, `cross-env`, `concurrently`, `electron`, `electron-builder` — all present in `devDependencies`.
- Lighthouse script configured. Optional bundle analyzer present.

### Tests & CI
- Vitest configured in `package.json`. Tests exist for routing, POS flows, performance/security subsets.
- CI not present in repo; recommend adding GitHub Actions workflow.

### Env & Security
- `.env.development` exists. Ensure `.env.example` is committed and `.env*` gitignored (gitignore present). If `.env.example` is missing, add it.

## Specific Confirmations

- Legacy entry point: No `src/index.ts` in repo; entry is `src/main.tsx` from `index.html:12`.
- Test layout: Mixed `src/__tests__/**` and colocated tests; propose standardizing to one pattern (prefer `__tests__` given current volume) and updating helpers to use the Data Router provider.
- TS flags: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess` are enabled in `tsconfig.app.json:1`.
- Console usage: Minimal; centralize via `src/shared/logger.ts` and ensure Vite `esbuild.drop` includes `console` and `debugger` for prod.
- Scripts vs devDeps: All referenced helpers are present (including Electron toolchain). No mismatches detected.
- Inventory API TODOs: Multiple TODOs reference mocked data and missing live repositories (`src/lib/dashboard/adapters.ts:138,163`, `src/components/dashboard/InventoryTab.tsx:38`, `src/components/ui/DashboardFilters.tsx:262`). Define minimal repository interfaces and tie into events/queries or remote endpoints.

## Summary of Recommended Structure Changes

```
src/
  app/                 # Providers, error boundaries, themes
  routes/              # Central router, lazy modules
  domains/             # Feature-first (pos, kds, inventory, customers, dashboard, account)
  data/
    local/             # PouchDB setup, indexes, migrations
    remote/            # Fetch client and repositories
    sync/              # Outbox, processors, online triggers, conflict policy
  events/              # Event types, zod schemas, versioning, projections
  ui/                  # Shared presentational components
  utils/               # ids, dates, money, logger
```

Begin with scaffolding `src/data/{local,remote,sync}` and a minimal outbox; wire dashboard and inventory to real adapters; clean garbled strings; add CI.

