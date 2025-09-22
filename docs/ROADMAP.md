## RMS v3 — Unified, Simpler Roadmap

Vision: Simpler, lean core with Inventory Audit, no Suppliers, minimal item creation, and accessible patterns throughout. POS/KDS visible and fix-ready. Dynamic RBAC planned.

P0 (Must) — Completed
- Token sweep; overlay parity/ARIA; stub gating; cn unification; Customers table; Transfers polish; Inventory Audit (renamed from Counts) simple flow.

P1 (Should) — Completed
- Unified forms (Transfers, Edit Transfer, Count Sheet → removed); standardized states; scale (Customers virtualized; Transfers/Items paginated).

P2 (Could) — Active
- Remove Supplier feature across system (nav, APIs, UI, mocks).
- Inventory Audit:
  - Rename all UI copy/routes from "Counts" → "Inventory Audit".
  - Remove Count Templates entirely (nav/pages/flows).
  - Remove Freeze Inventory option in audit flows.
  - Snapshot-at-start audits: take an instant mirror at audit start; track movements during audit; on finish, display movements since start and apply diffs.
- Simplify Add Item form: minimal fields (Name, SKU, Unit). Category/Ingredient unit optional.
- POS/KDS: unhide in nav, fix access; quick polish for touch targets and actions.
- Dynamic RBAC: user-defined roles; toggle features per role; easy user assignment and scope.
- A11y: follow docs/a11y-callouts.md; add axe smoke tests.

Docs
- docs/a11y-callouts.md

Notes
- P3/P4 removed. Roadmap focuses on near-term P2 deliverables above.
