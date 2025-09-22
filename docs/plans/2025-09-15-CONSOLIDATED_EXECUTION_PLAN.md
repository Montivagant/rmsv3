# Consolidated Execution Plan — 2025-09-15

This plan refines your prompts and merges them with the repo audit and existing TODOs. It is the handoff for continued work in the same footsteps as the prior agent.

## Refined Prompt (for working agent)

You are a senior full‑stack engineer acting as a repository auditor and implementer. Keep it simple and avoid over‑engineering. Deliver an offline‑first RMS using PouchDB (IndexedDB), an outbox with online triggers, idempotent server APIs, and light, typed event sourcing with zod and versioning. Favor feature‑first layout; only promote to shared when ≥2 features use it.

Objectives:
1) Implement Phase 1 (Data & Sync Foundations): data scaffolding, outbox, indexes, schemas/versioning, compaction.
2) Wire Dashboard to live data (cards/charts, compare, filters, sorting); remove/fix header status bar; fix dashboard links.
3) Address navigation/header UX: dedupe sidebar collapse, functional search, notifications list and clickthrough, clarify Settings vs Account.
4) Inventory fixes: move Item Types; separate category form; live table and edit/delete; audit/counts; history live.
5) POS/KDS/Activity/Customers: PIN guard; order submission to KDS/history; customers CRUD and POS selector; reports live.
6) Roles/Admin: signup restriction to Business Owner; custom roles; Technical Admin dashboard.
7) Cleanup & CI: remove Loyalty; business settings and branches forms; unify tests; add CI; add .env.example.

Deliverables to keep current:
- `audits/PROJECT_AUDIT.md` (updated as needed)
- `TASKS_TODO.md` (single source TODO with P0/P1/P2 and acceptance)
- `docs/RMSv3-SSOT.md` (SSOT for architecture and flows)

## Milestones and Steps

### M1 — Data & Sync Foundations (P0)
1. Scaffold `src/data/{local,remote,sync}` and `sync/outbox.ts`.
2. Initialize PouchDB with `pouchdb-find` and indexes on `aggregate.id`, `type`, `at`.
3. Implement outbox enqueue/process with exponential backoff and `'online'` listener.
4. Define zod event schemas with `version`; add validation and migration stubs.
5. Add compaction after N changes and on successful flush.

Acceptance: unit tests for outbox and schemas; manual offline→online flush demo.

### M2 — Dashboard Live (P0)
1. Replace mock adapters with projection-backed queries or `/api/reports/*`.
2. Implement compare by date ranges; persist filters/sorts.
3. Remove/feature-flag header status bar in dashboard; fix icons/metrics if kept elsewhere.
4. Wire all dashboard links to routes; add route tests.

Acceptance: real metrics render; compare works; links navigate; no extra status bar on dashboard.

### M3 — Navigation & Header (P0/P1)
1. Remove duplicate sidebar collapse button, keep one.
2. Reposition search bar; implement providers for inventory/customers/orders; debounce + results panel.
3. Notifications: make items clickable; add `/account/notifications` page; wire “See all”.
4. Clarify IA: Side‑nav shows Settings; user dropdown shows Account.

Acceptance: single collapse control; functional search; notifications clickthrough and list; IA consistent.

### M4 — Inventory (P0/P1)
1. Move Item Types to `/inventory/item-types`; remove from Manage.
2. Extract Category creation from Item form into its own modal/page.
3. Items table: connect to repository; implement edit/delete with optimistic update.
4. Audit/Counts: fix New Count; connect to items; variance indicator live.
5. Inventory History: projection + filtering/search.

Acceptance: live items and counts; history populated; tests for edit/delete and count flow.

### M5 — POS/KDS/Activity/Customers (P0/P1)
1. Enforce PIN modal on Return/Void.
2. Submit orders as events; KDS consumes same source; show notifications; order history updates.
3. Customers CRUD and POS selector/search; table shows real data.
4. KDS Reports and Activity Log wired to projections with filters.

Acceptance: end‑to‑end flow visible in UI; basic tests for append→project→query.

### M6 — Roles & Admin (P0/P1)
1. Restrict signup to Business Owner; migrate legacy roles/users.
2. Custom roles with permission sets; module toggling per role.
3. Technical Admin dashboard (`/admin`) for module toggles, suspend/terminate, exports, reset owner password, approve signups.

Acceptance: signup guard enforced; admin actions available and logged.

### M7 — Cleanup & CI (P0/P1/P2)
1. Remove Loyalty (components, routes, events, data) and update docs.
2. Business Settings and Branches forms: simplify, shared components, maps link, remove ratings.
3. Unify tests under one pattern; add GitHub Actions CI.
4. Add `.env.example` and verify `.env*` gitignored.
5. Add `depcheck` and `ts-prune` (P2) and track results.

## Notes

- Keep changes incremental and feature-first. Promote to shared when two+ domains need it.
- Update SSOT and Audit alongside major structure or contract changes.

