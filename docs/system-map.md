## RMS v3 — System Map

### Overview
- React + TypeScript SPA with Electron entry, Tailwind driven by design tokens (CSS variables) and class-based dark mode.
- Event-driven domain with typed events and a local-first storage layer (PouchDB), MSW-backed API mocks for dev.
- Routing via React Router v6 using `BrowserRouter` in `src/App.tsx` with guarded subtrees (role/permission-based).

### Modules
- Events: `src/events/**` (store, types, optimized queries, persistence). Key events include `sale.recorded`, `loyalty.*`, `inventory.adjusted`, `payment.*`, audit log events, and inventory lifecycle events.
- Inventory: `src/inventory/**` (engine, policy, audits/counts, transfers, items, categories) with UI in `src/components/inventory/**` and pages under `src/pages/inventory/**`.
- POS/KDS: POS under `src/pages/POS.tsx` with supporting components in `src/components/pos/**`. KDS at `src/pages/KDS.tsx`.
- Customers: `src/customers/**` with virtualized `CustomerTable` and filters/query-state helpers.
- Menu Management: `src/menu/**` domain + `src/pages/menu/**` with create/edit modals.
- Reports: `src/pages/reports/**` (landing + detailed reports) and `src/reports/**` utilities.
- Settings & Account: `src/pages/settings/**`, `src/pages/account/**`, reusable settings UI in `src/settings/ui` and `src/components/ui/**`.
- RBAC: `src/rbac/**` (roles, dynamic guards, audit logging).
- API/Mocks: `src/api/**` thin clients; `src/mocks/**` MSW handlers (`handlers.ts`) for dev data.
- Styling & Theme: `tailwind.config.js` maps color scales to CSS vars defined in `src/index.css`. `ThemeProvider` toggles `.dark` on `documentElement` and persists preference.
- Overlays/A11y primitives: `src/hooks/useDismissableLayer.ts` plus `Modal`, `Drawer`, `DropdownMenu` implementing focus trap, ESC/outside-click, and route-change dismissal.

### Routes (App Shell)
Root at `/` uses `AdminLayout` with guarded child routes (see `src/App.tsx`). Key entries:
- `/login`, `/signup`, `/signup/success` (public)
- `/dashboard` (default landing)
- POS/KDS: `/pos`, `/kds`
- Orders: `/orders`, `/orders/active`, `/orders/history`
- Inventory:
  - redirect `/inventory` → `/inventory/items`
  - `/inventory/items`
  - Counts (audit): `/inventory/audit`, `/inventory/audit/new`, `/inventory/audit/:auditId`, `/inventory/audit/:auditId/entry`
  - Transfers: `/inventory/transfers`, `/inventory/transfers/:transferId`, `/inventory/transfers/:transferId/edit`
  - History: `/inventory/history`
- Customers: `/customers`
- Menu: `/menu/categories`, `/menu/items`, `/menu/modifiers`
- Recipes: `/recipes`
- Reports: `/reports`, `/reports/sales`, `/reports/inventory`, `/reports/business`, `/reports/analysis`, `/reports/customers`, `/reports/z-reports`
- Manage: `/manage/users`, `/manage/roles`, `/manage/branches`, `/manage/item-types`
- Account (guarded subtree): `/account` → `profile|business|preferences|notifications|security`
- Settings: `/settings`, `/settings/menu`, `/settings/tax`, `/settings/system`, `/settings/item-types`
- Fallback: `*` → NotFound

Guards: Implemented via `DynamicRoleGuard` with permission strings per route (e.g., `inventory.view`, `inventory.count`, `reports.view`).

### Data Flow
- Command/UI interaction → services/hooks → event generation via `eventStore.append()` → persisted (local) → projections/queries via `events/optimizedQueries` → UI reads derived state. MSW handlers simulate API CRUD for menu, inventory, etc.
- Inventory transfers and counts emit `inventory.adjusted` and count/transfer events; POS sale emits `sale.recorded` and `payment.*` events.

### Events (business-significant)
- Sales: `sale.recorded` with line/totals; loyalty `accrued|redeemed`.
- Inventory: `inventory.adjusted`, `inventory.transfer.initiated`, `inventory.received`; count lifecycle in docs with `inventory.count.*` (present in docs; partially represented in code as audit/count pages and adjustments).
- Payments: `payment.initiated|succeeded|failed`.
- Tax: `tax.*` events for settings and calculations.
- Audit: `audit.logged` for RBAC-sensitive changes.

### Business Rules (selected)
- Transfers: Draft → Completed|Cancelled; atomic stock movement on completion, quantity/unit validation, RBAC for create/complete/cancel.
- Counts: Snapshot-based variance; submit generates adjustments; single active count per branch/scope; RBAC restricted.
- POS totals: subtotal/discount/tax/total with rounding rules; optional customer affects loyalty accrual and tax where applicable.
- Settings: Feature flags (KDS/Loyalty/Payments) influence route availability and UI affordances.

### Theming & A11y
- Class-based `.dark` theme toggled via `ThemeProvider`; tokens drive bg/text/border/state colors across components.
- Overlays: unified dismissal (`useDismissableLayer`) with ESC, outside click, route-change, and one-overlay-at-a-time; modal/drawer include focus trap and focus restore.
- Utilities in `index.css` provide WCAG-friendly focus rings, sizes, and contrast via tokens.

### Gaps and Contradictions
- Routing uses `BrowserRouter` with TODO hint to upgrade for navigation blocking; no `createBrowserRouter` yet for data routers.
- Docs list extended event set (e.g., inventory count events) not fully materialized as concrete types in `src/events/types.ts`—align types and emitters.
- Some overlays bypass shared `Modal` (e.g., `pos/HeldOrdersModal`) and use ad-hoc backdrops (`bg-black/50`) → violates token rule.
- Inline styles exist for virtualization and positioning (heights, grid templates) in several components; many already use CSS var indirection, some still inline.
- Email templates include inline styles and hex colors by necessity; must be exempted or tokenized for server-rendered HTML with fallbacks.

### Known Inline/Hex Offenders (to refactor)
- Inline styles: `pages/inventory/AuditSession.tsx`, `pages/inventory/CountSession.tsx`, `components/ui/* (Loading, DynamicForms)`, `customers/CustomerTable.tsx`, `components/cards/ChartCard.tsx`, `components/inventory/*List.tsx` virtualization heights.
- Hardcoded hex: `utils/receipt.ts` (print CSS), MSW SVG placeholder fill in `mocks/handlers.ts`.
- Ad-hoc overlay: `components/pos/HeldOrdersModal.tsx`.

### Dependencies and Integrations
- Local storage and PouchDB utilities under `src/db/**`; syncing logic present.
- Electron main entry in `electron/main.cjs` for packaging.
- Test suite via Vitest; a11y and overlay behavior tests present.

---
This map reflects the current repository state and will be kept updated as we align docs and code during refactors.

