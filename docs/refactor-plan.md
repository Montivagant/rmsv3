## RMS v3 — Refactor Plan (Production Readiness)

### Goals
Bring the app to production quality with unified design tokens, robust a11y primitives, verified routing/data integrity, scalable inventory performance, hardened tests, and packaging.

### Principles
- React + TypeScript, Tailwind via CSS variables tokens.
- No inline styles or hardcoded hex; tokens/utilities only.
- Class-based dark/light theme; consistent across header/nav/overlays.
- WCAG 2.1 AA contrast, keyboard access, ARIA patterns.
- Lean scope; prefer simplifying flows.

### Backlog (prioritized)
1) Design tokens & theming unification
   - Remove ad-hoc overlay styles; enforce `Modal`/`Drawer` and tokenized backdrop.
   - Refactor `pos/HeldOrdersModal` to use shared `Modal` or `Drawer` and tokens.
   - Replace hex/inline instances: `utils/receipt.ts` (consider print-token mapping), `mocks/handlers.ts` SVG fills → token-compatible or acceptable dev-only exceptions.
   - Replace inline `style={{ height: ... }}` and `gridTemplateColumns` with CSS var helpers already in `index.css` (e.g., `.virtual-container`, `.grid-cols-var`).
   - Verify header/nav components’ dark/light states and tokens.

2) A11y primitives
   - Consolidate overlay behavior on `useDismissableLayer` across dialogs, drawers, dropdowns.
   - Ensure focus trap + restore for modals/drawers (already present—extend to ad-hoc overlays).
   - Roving tabindex for menus where applicable; verify `DropdownMenu` keyboard navigation.
   - One overlay open at a time; route-change dismissal enforced.

3) Routing & nav fixes
   - Produce a route table with guards and 404 coverage (done in system-map, keep updated).
   - Validate all nav items map to working routes in `config/nav.config.ts` and `admin-nav.config.ts`.
   - Consider `createBrowserRouter` adoption to support future data/blocked transitions; address `useUnsavedGuard` TODO.

4) Inventory performance & scale
   - Ensure virtualization via windowing for large lists/tables (customers, counts, items). Existing virtual helpers to replace inline heights with CSS vars.
   - PouchDB: add or document Mango indexes where selectors are frequent; avoid N+1 reads; schedule compaction.
   - Add perf notes to docs and verify large datasets test coverage.

5) Testing & hardening
   - Critical-path tests: POS add→pay→receipt; inventory transfer create→complete; inventory count create→close; dashboard load.
   - A11y smoke tests for dialogs/menus (tab/shift+tab, ESC, outside click, focus restore) — extend existing tests.
   - Theme toggling and overlay dismissal behavior tests (present; expand to new overlays).
   - Remove or rewrite outdated/brittle tests after refactors.

6) Production readiness
   - Verify environment configs, build scripts, Electron packaging (`electron/main.cjs`).
   - Error boundaries and logging: ensure safe fallbacks.
   - Content pass for copy clarity and consistency; prepare for locales.

### Work Packages (PRs)
- Design tokens & theming unification
  - Scope: remove inline/hex, refactor overlays to tokens, unify header/nav/overlays in dark/light.
  - Notes: adopt `.modal-backdrop`, `.drawer-*`, token classes; migrate inline heights to CSS variables utilities.

- A11y primitives
  - Scope: finalize `useDismissableLayer` adoption in all overlays; verify focus management; ensure single-open policy.

- Routing & nav fixes
  - Scope: validate every nav -> route; add 404; consider `createBrowserRouter` plan for blocking.

- Inventory performance (virtualization + indexes)
  - Scope: enforce virtualization patterns; add Mango index notes and compaction guidance.

- Critical-path tests
  - Scope: implement tests enumerated above; align mocks and event flows.

- Build/packaging
  - Scope: Electron packaging verification; prod build sanity; environment guards.

### Blockers / Risks
- Email/receipt templates rely on inline styles for client compatibility; tokenization limited. Define exceptions with documented rationale and ensure contrast/compliance.
- Some docs mention event types not fully represented in code (e.g., count events). Align types with implemented flows or adjust docs.

### References (to follow)
- Tailwind dark mode & theme variables (class strategy)
- ARIA Authoring Practices: Modal dialog and Menu button patterns
- WCAG 2.1 AA contrast (1.4.3)
- Virtualized lists (`react-window`)
- React performance guidance
- React Router v6 route architecture — [Stack Overflow](https://stackoverflow.com/questions/51524395/pouchdb-alldocs-with-a-query)
- PouchDB performance (Mango queries, compaction) — [pouchdb.com](https://pouchdb.com/guides/compact-and-destroy.html)
- Electron packaging/distribution — [bennadel.com](https://www.bennadel.com/blog/3196-creating-a-pouchdb-playground-in-the-browser-with-javascript.htm)

### Milestones
- Week 1: Tokens/Theming PR, A11y primitives PR.
- Week 2: Routing fixes, Inventory perf; start critical-path tests.
- Week 3: Finish tests, packaging, content pass; final QA.


