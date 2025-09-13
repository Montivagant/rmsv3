## Production Readiness — Checklist

### Phase 0 — Read & model
- [x] System map drafted (`docs/system-map.md`)
- [x] Refactor plan drafted (`docs/refactor-plan.md`)

### Phase 1 — Codebase inventory & hygiene
- [ ] Remove inline styles (replace with CSS vars + utilities)
- [ ] Remove hardcoded hex (map to tokens)
- [ ] Replace bespoke overlays with shared `Modal`/`Drawer`
- [ ] Enforce dark/light across header/nav/overlays/forms
- [ ] Fix missing/unused imports, dead files, merge artifacts
- [ ] Normalize UI copy (human terms)

### Phase 2 — Accessibility & interaction
- [ ] WCAG AA contrast via tokens
- [ ] Keyboard access: dialogs/menus focus trap + restore
- [ ] ESC/outside-click/route-change dismissal
- [ ] One overlay open at a time

### Phase 3 — Routing, API, data integrity
- [ ] Route table finalized with guards and 404
- [ ] Typed APIs per page (loading/empty/error/retry)
- [ ] Persistence models match business rules
- [ ] Event types and reducers/selectors validated

### Phase 4 — Inventory scale & performance
- [ ] Virtualization for large tables/lists (windowing)
- [ ] PouchDB Mango indexes, avoid N+1, compaction notes

### Phase 5 — Testing & hardening
- [ ] Critical-path tests (POS, transfers, counts, dashboard)
- [ ] A11y smoke tests for overlays/menus
- [ ] Theme toggling and dismissal behavior tests
- [ ] Remove/align outdated tests

### Phase 6 — Production readiness
- [ ] Env configs, build scripts, Electron packaging validated
- [ ] Error boundaries and logging
- [ ] Copy consistency and locale readiness

Owner: @assignee
Status: Tracking across PRs listed in `docs/refactor-plan.md`.

