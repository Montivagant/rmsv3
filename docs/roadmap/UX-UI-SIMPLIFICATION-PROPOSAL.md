# UX/UI Simplification Plan (Detailed)

This document is the authoritative plan to simplify UX/UI and scope while keeping core functionality intact. It adopts `docs/roadmap/UX-UI-SIMPLIFICATION-PLAN.md` as the working TODO list and begins with P0 items.

Source basis (internal):
- `docs/roadmap/UX-UI-SIMPLIFICATION-PLAN.md` (primary goals and P0/P1/P2)
- `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`, `ROADMAP.md`
- `COUNT_SHEETS_IMPLEMENTATION.md`, `INVENTORY_COUNT_OVERVIEW.md`, `README_transfers.md`
- `audit/*` reports (static analysis, styling standardization, deployment checklist)

Source basis (external):
- WCAG 2.1/2.2 + WebAIM contrast guidance (AA targets)
- WAI-ARIA Authoring Practices (dialogs, menus, keyboard behavior)
- Tailwind CSS theming + dark mode (class strategy)
- Material Design and Shopify Polaris (form density, inputs, accessible states)
- Square, Toast, Lightspeed (inventory counts and transfers—workflow patterns)

## A) Gap Analysis (Code ↔ Docs)

- Theming/tokens:
  - Non‑token Tailwind color classes in components: ~349 occurrences (text-gray, bg-blue, text-white, etc.).
  - Inline styles in TSX: 24 occurrences; most are grid/virtualization/position bridges, some are heights that should be CSS‑var based.
  - Hex colors in TS/TSX: 15 occurrences (email/receipt templates primarily; acceptable exceptions or replace with tokens where feasible).
- Overlays/dialogs: Modal/Drawer/Sheet use tokens and `useDismissableLayer` (outside click, Escape, route change, one‑overlay policy). A few scrims still use `bg-white/50 dark:bg-gray-900/50` (e.g., `src/components/ui/Loading.tsx`).
- Inventory Count flow: `NewCountWizard.tsx` is 3 steps (branch → scope → confirmation). Plan calls for a single‑step modal (branch + scope) to reduce friction.
- Inventory Transfer flow: `NewTransferModal.tsx` matches simplified pattern (source → destination → items → submit) but should ensure consistent token usage and dismiss behavior.
- Stubs/no‑ops: Many routes use `PageStub` (e.g., `src/pages/manage/*`, `menu/*`, inventory subpages). These must be gated or clearly flagged in UI.
- Naming/duplication:
  - Duplicate `cn` util at `src/lib/utils.ts` and `src/utils/cn.ts`.
  - Mixed use of legacy color classes and token utilities within same files.

## B) Simplification Brief (Keep / Simplify / Remove / Defer)

- Inventory
  - Keep: Item CRUD modal patterns; Count session entry; Transfer create/complete flows; Count Sheets feature.
  - Simplify: New Count to single‑step (branch + scope); tighten copy; remove redundant confirmation; ensure fast, scannable entry.
  - Remove/Defer: Extra wizard steps; heavy per‑sheet previews in modal (defer preview to dedicated page); advanced auto‑freeze defaults.
  - Outcomes: Faster count creation, fewer clicks, consistent tokens, accessible dialogs.

- Transfers
  - Keep: Source → destination → items → submit; validations; search/dropdown patterns.
  - Simplify: Tokenize styles; ensure error states use semantic token colors; confirm outside click/Escape dismiss.
  - Defer: Complex reconciliation UI in create modal (keep in detail/receive drawer).

- POS/KDS
  - Keep: Quick actions, large targets, low density.
  - Simplify: Ensure min target sizes via tokens; declutter secondary chrome; tokenize remaining raw colors.
  - Remove: Stub actions; show clear disabled state or hide.

- Customers
  - Keep: Virtualized table + filters + URL state.
  - Simplify: Move all loyalty adjustments into detail drawer; ensure table tokens for header, rows, badges.

- Settings
  - Keep: Tokenized cards and toggles; RBAC guards.
  - Simplify: Unify form primitives + spacing; ensure all modals use shared overlay utilities.

## C) Prioritized TODO Plan

P0 (Must)
- Token/theming sweep: replace non‑token colors and overlay scrims.
- Overlay behavior parity: ARIA + dismiss (outside/Escape/route change) everywhere; one open at a time.
- Fix stubs/no‑ops: Hide or flag stub buttons; gate routes via feature flags/RBAC.
- Remove inline styles in components (allowlist CSS‑var bridges only).
- Customers: ensure virtualized table tokens; polish a11y (sort labels, sticky header tokens).
- Inventory: Count single‑step modal; Transfer copy/status polish.

P1 (Should)
- Form system unification; standardized error/empty/loading states; virtualization for large lists.

P2 (Could)
- Scanning modes; waste adjustments flow; reporting polish; perf tuning.

Dependencies
- Token sweep → overlay/scrim utilities → React Query/slice refactors (where referenced) → feature polish.

## D) Implementation Notes (Targets/Impacts)

- Token sweep targets:
  - High‑visibility first: `src/components/ui/Loading.tsx`, `src/inventory/components/InventoryDashboard.tsx`, `src/components/ui/Accessibility.tsx`, `src/components/ui/ScreenReaderSupport.tsx`, `src/components/rbac/UserAssignmentTab.tsx`.
  - Replace: `text-*/bg-*` legacy colors → token classes: `text-text-*`, `bg-surface*`, `bg-brand-*`, `bg-success-*`, `bg-warning-*`, `bg-error-*`, `border-border`.
  - Add `.bg-scrim` utility in `src/index.css` (done) and use instead of `bg-white/50 dark:bg-gray-900/50`.
  - Inline style allowlist: only CSS‑var bridges (e.g., `--grid-template`, `--menu-top/left`, virtualization: `--virtual-total-height`, `--row-y`, `--row-h`). Migrate height/position hardcoded pixels to CSS vars where possible.
- Overlays
  - Ensure all overlays use `useDismissableLayer` and tokenized backdrops (`.modal-backdrop`, `.drawer-backdrop`, `.bg-scrim`).
- Inventory count
  - Refactor `components/inventory/counts/NewCountWizard.tsx` to single step (branch + scope, optional freeze) or new `NewCountModal.tsx`; keep redirect to Count Sheets for filtered scope.
- Customers
  - Verify `customers/CustomerTable.tsx` uses token utilities for headers/rows; replace inline behavior styles (`userSelect/touchAction`) with classes if feasible.
- Cleanup
  - Unify `cn` util to a single import path; adjust re-exports.

### D.1 Token Mapping Guide (class replacements)

- Text colors: `text-gray-900/700/600/500/400` → `text-text-primary/secondary/muted/tertiary`
- Backgrounds: `bg-white/bg-gray-50/100/200` → `bg-surface/bg-surface-secondary`
- States: `text-red-* bg-red-*` → `text-error-* bg-error-*`; similar for `warning` and `success`
- Brand accents: `text-blue-* bg-blue-*` → `text-brand-* bg-brand-*`
- Borders/dividers: `border-gray-* divide-gray-*` → `border-border divide-border`
- Scrims: `bg-white/50 dark:bg-gray-900/50` → `.bg-scrim` (uses `--color-backdrop`)

### D.2 Overlay Requirements

- Use `useDismissableLayer` with: outside click, Escape, route change; one-open policy.
- ARIA: `role="dialog"`, `aria-modal=true`, labelled by title, described by description.
- Focus trap: Tab/Shift+Tab cycling; return focus to trigger on close.
- Styling: `.modal-backdrop`/`.drawer-backdrop` or `.bg-scrim`; surfaces use token colors.

### D.3 Inventory Count (Single‑Step) — UX Spec

- Entry point: “New Count” opens a single modal with two sections:
  - Branch + optional Freeze (duration 15–480 minutes)
  - Scope: All Items or Count Sheet (with item count badges)
- Validation:
  - Branch is required; Freeze duration must be within range when enabled
  - Count Sheet selection must be non-empty; show inline tokenized error feedback
- Flows:
  - All Items: create via POST `/api/inventory/counts` then route to details
  - Count Sheet: redirect to `/inventory/counts/new?sheetId=...` (existing page) with optional freeze params
- Accessibility:
  - Dialog labelled/described; progress-free single-step to reduce cognitive load
  - Targets respect `--target-size-*`; buttons announce actions in plain language

### D.4 Transfers — UX Spec

- Structure: Source → Destination → Items → Submit (single modal)
- Item search: debounced; results list accessible; click/Enter to add
- Validation: disallow same source/destination; quantity limits; tokenized feedback
- Dismiss behavior: outside click/Escape/route change via `useDismissableLayer`

### D.5 Customers — Table & Drawer

- Virtualized list with token headers/body; sticky header tokens; ARIA sort labels
- Bulk actions remain; loyalty adjustments only within the profile drawer

### D.6 Navigation — Stubs Gating

- For pages rendering `PageStub`, either hide in config or render with a small “Coming Soon” badge
- Prefer gating via `featureFlag` in `nav.config.ts` to avoid dangling routes

## E) QA Plan (Critical Paths)

- Theme parity: Light/dark across layout, nav, overlays; verify token backgrounds and text colors.
- Overlays: Dismiss on outside click, Escape, route change; focus trap; labelled; one overlay at a time.
- Inventory Count: create (single‑step) → enter quantities → submit adjustments.
- Inventory Transfer: source → destination → items → submit (validations, a11y).
- POS: add‑to‑cart → payment modal (happy path) with token classes.
- Customers: search → virtualized scroll/pagination → open detail → edit → save.

## F) Acceptance Criteria (P0)

- Zero non‑token Tailwind color classes in changed files (“text-white/bg-gray-*/text-blue-*”).
- No inline styles in components except allowed CSS‑var bridges.
- Overlays use `.modal-backdrop`/`.drawer-backdrop` or `.bg-scrim` and `useDismissableLayer`.
- WCAG AA: Minimum 4.5:1 for text; 3:1 for large text/UI (spot‑check with axe in tests).
- CI quality gates: typecheck passes; lint warns only on non-critical; unused imports cleaned.

## G) Work Sequence (Step‑by‑Step)

1) Token Sweep Foundations
- Add `.bg-scrim` (done). Confirm Tailwind token mappings in `tailwind.config.js`
- Replace high-visibility areas (Loading, InventoryDashboard, UI primitives)

2) Overlay Parity
- Ensure Modal/Drawer/Sheet use `useDismissableLayer` w/ route change and one-open events
- Normalize aria props and focus behavior across overlays

3) Count Single‑Step
- Implement `simpleMode` (done) and enable on Counts page (done)
- Remove stepper when simpleMode; validate copy and error messages; update tests if needed

4) Transfers Polish
- Replace color classes with tokens; check error/empty/loading states
- Confirm dismiss + focus trap; adjust labels and helper text for clarity

5) Customers Polish
- Table tokens + sticky header; sort labels; ensure virtualized container tokens

6) Navigation Gating
- Add `featureFlag` or a ‘stub’ property to nav items and hide/gate in Sidebar rendering

7) Cleanup & Consistency
- Unify `cn` util imports; remove dead styles; run `style:check`, lint, typecheck

## H) Milestones & Effort (Rough)

- M1 (today): Token sweep on high-visibility, overlay parity, Count simpleMode — COMPLETE
- M2 (next): Transfers tokens/a11y; Customers polish; nav stubs gating — 1–2 days
- M3 (final P0): Sweep long‑tail raw colors; finalize QA and acceptance checks — 0.5–1 day

## I) Risks & Mitigations

- Missed raw color classes in low‑traffic files → Mitigation: `style:scan` + code review
- Contrast regressions → Mitigation: jest‑axe spot checks; manual AA spot‑tests on critical text
- Overlay focus edge cases → Mitigation: shared hook + test in `__tests__/theme-overlay` and `topbar-overlays`

---

Initial P0 actions completed in this commit
- Added `.bg-scrim` utility in `src/index.css:604` for tokenized scrims.
- Tokenized `src/components/ui/Loading.tsx` (spinner, skeletons, progress, overlay scrim).
- Tokenized high‑visibility parts of `src/inventory/components/InventoryDashboard.tsx` (tabs, status, alerts, transactions).
- Added `package.json` scripts:
  - `style:scan`: quick scan for inline styles and disallowed color classes.
  - `style:check`: helper wrapper for local checks.

Next P0 steps
- Continue token sweep on remaining high‑traffic views: `src/components/ui/*`, `src/components/navigation/*`, `src/pages/Inventory-complete.tsx`.
- Refactor New Count to single‑step modal; align copy and validations.
- Gate or hide stubbed routes/actions; ensure clear helper text on disabled UI.

References
- WCAG 2.1/2.2 & WebAIM contrast guidance.
- WAI‑ARIA dialog/menu patterns (focus management, keyboard behavior).
- Tailwind CSS theming and dark‑mode (class strategy).
- Material Design and Shopify Polaris for form density and a11y patterns.
- Square/Toast/Lightspeed patterns for inventory cycle counts and transfers.
