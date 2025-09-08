 # RMS v3 — UX/UI Simplification Plan (Saved Chat Summary)

 This document captures the analysis, competitor research, simplification strategy, and phased plan discussed in our chat. It is the source of truth for P0–P2 execution.

 ## 1) Summary of Code/Doc Insights

 - Stack: React 19 + TS + Tailwind tokens (class dark mode), Zustand, TanStack Table/Virtual, MSW, Vite/Electron.
 - Theming: Good CSS variable token mapping; some components still use non-token colors (e.g., `text-white`, `bg-black/50`).
 - Overlays: Central `useDismissableLayer` for outside/Escape/route-dismiss + one-overlay-at-a-time; ARIA implemented in Modal/Drawer/Menu.
 - Inventory: Counts, Transfers, Count Sheets implemented end-to-end; count session uses virtualization and autosave.
 - Customers: Virtualized table, URL state, profile drawer—matches docs.
 - Gaps: Non-token color usage, scattered inline styles for layout/positioning, duplicate `cn` utility, old `Toast.tsx` alongside `ToastNew.tsx`, a few stub buttons.

 ## 2) Gap Analysis (Intended vs Current)

 | Module | Intended | Current | Gaps | Action |
 |---|---|---|---|---|
 | Counts | Start → enter → submit; optional sheets; fast entry | Wizard (3 steps) + virtualized entry + autosave | Wizard heavier than needed; minor UI friction; some inline styles | Single-step modal (branch + scope), keep autosave; polish entry |
 | Transfers | Source → Destination → Items → Submit; simple list | New Transfer modal + list w/ filters + validations | No virtualization; token drift in overlays; clarify statuses | Keep modal; tighten copy; add virtualization if needed; tokens sweep |
 | Customers | Virtualized table; URL state; loyalty only in detail | Implemented | Minor ARIA/density polish | Keep; minor improvements |
 | POS/KDS | Large touch targets; quick actions | Implemented; some TODOs | Stub buttons; verify target sizes | Hide stubs; enforce min target sizes via tokens |
 | Theming | Token-only colors; class dark mode | Mixed (mostly tokens) | `text-white`, `bg-black/50`, legacy grays/blues | Replace with token utilities/classes |
 | Overlays | ARIA dialog/menu; focus trap; one-open; dismiss rules | Implemented | Raw overlay colors in places | Tokenized backdrops |
 | Forms | Reusable primitives consistent | Mixed | Inconsistent imports; occasional inline | Normalize forms; unify imports |

 ## 3) Simplification Brief

 - Inventory
   - Keep: Virtualized count session + autosave; transfer modal flow; clear list tabs.
   - Simplify: Single-step New Count (branch + scope; optional sheet); default to All Items; Advanced filters collapsed.
   - Remove: Wizard confirmation; non-essential fields from primary path.
   - Defer: CSV import for scope; sheet admin polish.
 - POS/KDS
   - Keep: Current structure; payment modal; shortcuts.
   - Simplify: Hide unimplemented actions; enforce tokenized colors and target sizes.
 - Customers
   - Keep: Table + URL state + profile drawer; loyalty adjust in detail only.
   - Simplify: Copy/density/ARIA polish; confirm sticky header + skeletons.
 - Forms/Modals
   - Keep: Primitives; ARIA patterns.
   - Simplify: Normalize spacing/copy/validation; remove inline styling patterns.

 ## 4) Prioritized TODOs (Must/Should/Could)

 - P0 (Must)
   - Token/theming sweep: replace non-token colors and overlay backdrops.
   - Overlay behavior parity: ensure ARIA + dismiss patterns consistently applied.
   - Fix stubs/no-ops (e.g., POS menu management action → hide/flag).
   - Remove UI-facing inline styles where high-visibility; keep CSS-var bridges minimal.
   - Customers MVP polish (ARIA sort, sticky header tokens).
   - Inventory MVP polish (single-step New Count; clean Transfers copy/status).
   - Quality gates: unused imports error; guard against `style={` in TSX (with allowlist).
 - P1 (Should)
   - Form system unification; error/empty/loading state standardization.
   - React Query client and slice migration for counts/transfers/customers.
   - Virtualization for Transfers/Counts lists if needed.
 - P2 (Could)
   - Scanning modes; waste adjustments flow; reporting polish; perf tuning.

 Dependencies: token sweep → utils/toast consolidation → React Query → slice refactors → feature polish.

 ## 5) Implementation Notes (Targets)

 - Tokens: add `--color-backdrop` and use in `.modal-backdrop`/`.drawer-backdrop`.
 - Replace non-token colors in: navigation (brand chips), Modal/Sheet/TopBar/MobileNavDrawer backdrops, UpdateToast.
 - Keep inline CSS-var bridges for menu positioning/virtualization; document allowlist.
 - Counts: simplify New Count wizard to single-step; preserve count-sheet option.
 - Transfers: clarify statuses (DRAFT → SENT → RECEIVED); receive drawer handles reconciliation.

 ## 6) QA Checklist (Critical Paths)

 - Theming: AA contrast; parity light/dark across layout/nav/overlays.
 - Overlays: dismiss on outside click, Escape, route change; focus trap; labelled.
 - Inventory Count: create (single-step) → enter → submit adjustments.
 - Inventory Transfer: create → send → receive (reconcile).
 - POS: add-to-cart → payment modal (happy path).
 - Customers: search, pagination/virtualized scroll, open detail, edit, save.
 - CI: zero unused imports; zero non-token color classes; no `style={` outside allowlist.

 ## 7) References

 - WCAG contrast & WebAIM (AA 4.5:1, 3:1 UI)
 - ARIA dialog/menu patterns (WAI-ARIA)
 - Tailwind theming & dark mode (class strategy)
 - Design Tokens: W3C Design Tokens CG; backlight.dev
 - Inventory flows: Square, Lightspeed, Toast, Shopify, Loyverse (count/transfer best practices)

