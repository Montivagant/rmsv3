# RMSv3 — Single Source of Truth (SSOT)

Date: 2025-09-15

## 1. Overview

RMSv3 is an offline-first Restaurant Management System covering POS, KDS, Inventory, Reports, and Account/Settings. It runs in the browser (and Electron) with local-first storage and sync to remote APIs when online.

Goals: simple, reliable daily operations; responsive UI; resilient syncing; minimal dependencies. Non-goals: over-engineered microservices or complex CQRS beyond what’s needed.

## 2. Business Logic

- POS: create ticket, add items, apply discounts, tax, accept payment, close ticket.
- KDS: receive new orders, show prep times, bump/recall.
- Inventory: items, categories, item types; adjustments, transfers; counts/audit sessions and variance.
- Customers: create/update/delete; associate with orders; search/select in POS.
- Roles: Business Owner (sole self-signup), custom roles with permissions; Technical Admin oversees businesses, modules, and account states.

## 3. Technical Architecture

- Frontend: React + TS + Vite; TanStack Query/Table; Zustand; Tailwind.
- Data: PouchDB (IndexedDB in prod, memory in tests), `pouchdb-find` indexes.
- Events: append-only events with zod schemas, `version` field, light projections for reads.
- Routing: React Router Data Router with central `routes` and lazy modules.
- Electron: isolated under `electron/` with secure defaults.

Recommended layout:

```
src/
  app/                # Providers (Theme, Query), ErrorBoundary
  routes/             # createBrowserRouter, route objects, lazy files
  domains/            # Feature-first: pos, kds, inventory, customers, dashboard, account
  data/
    local/            # PouchDB setup, indexes, migrations
    remote/           # Fetch client and repositories
    sync/             # Outbox, processors, online triggers, conflict rules
  events/             # Types, zod schemas, versioning, projections
  ui/                 # Shared presentational components
  utils/              # ids, dates, money, logger
```

## 4. Data & Sync

- Local DB: PouchDB; add Mango indexes for hot queries (aggregate.id, type, timestamp; compound where needed).
- Outbox: persist write-intent events while offline; on online/backoff timer, flush to server via idempotent API.
- Online triggers: listen to `online`/`offline`; show status in UI.
- Conflicts: domain-specific rules (e.g., last-write-wins for non-critical metadata; merge for counts lines).
- Compaction: periodic compaction after N changes and on successful sync.

## 5. API Contracts (minimal)

- POST `/api/events` (bulk): idempotent by `event.id` or `Idempotency-Key` header.
- GET `/api/events?since=cursor`: incremental pulls when needed.
- GET `/api/projections/:name?params`: e.g., dashboard KPIs, order history.

## 6. Routing Map (high level)

- `/` → Dashboard
- `/pos` → POS
- `/kds` → KDS board
- `/inventory` → Items, Transfers, Counts, Audit, History, Item Types
- `/orders` → Active, History
- `/account` → Profile, Security, Notifications
- `/manage` → Branches, Users, Roles (moving Item Types out)
- `/admin` → Technical Admin (guarded)

Use `createBrowserRouter`; wrap routes with error boundaries and lazy imports for heavy pages.

## 7. Error Handling & Logging

- Error boundaries per feature; central fallback in `app/`.
- Logger wrapper with env-aware levels; strip `console`/`debugger` in production.

## 8. Build, Env & CI

- Commands: `pnpm dev|build|preview|test|typecheck|lint`.
- Env: `.env.example` document `VITE_*` variables (e.g., `VITE_API_BASE`, `VITE_DISABLE_SW`, `VITE_USE_MSW`).
- CI: Install → typecheck → lint → test → build.

## 9. Testing

- Unit: money utils, event schemas, projections.
- Integration: append → project → query; form submissions.
- E2E (smoke): Create order → KDS appears → History reflects; Inventory count flow.

## 10. Electron

- Set `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Narrow preload API; no remote module; CSP tightened for prod.

## 11. Diagrams

```mermaid
flowchart LR
  UI[UI Action] --> EVT[Create Event]
  EVT --> OUT[Outbox (Local)]
  OUT -->|online| REM[Remote /api/events]
  REM --> PROJ[Server Projections]
  OUT --> LDB[(PouchDB Local)]
  LDB --> READS[Local Projections]
  PROJ --> READS
  READS --> UI
```

## 12. Glossary & Change Policy

- Event: immutable domain fact (e.g., `sale.recorded`).
- Projection: materialized read model.
- Outbox: local queue for reliable async delivery.
- Changes: propose via PR, update SSOT when adding domains or changing API/contracts.

