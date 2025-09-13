## Blockers & Proposed Resolutions

### 1) Email and Receipt Templates Using Inline Styles
- Context: `src/email/templates.ts` contains inline CSS and fixed hex colors. `src/utils/receipt.ts` embeds print CSS.
- Reason: Many email clients require inline styles; receipts target thermal printers and expect high-contrast black/white.
- Proposal:
  - Keep inline styles for email templates; ensure WCAG-compliant contrast and keep palette to black/white or safe grays.
  - Constrain receipt CSS to print-safe black/white (done), maintain dashed/solid rules using `#000000`.
  - Document exception in coding standards for email/print artifacts.

### 2) React Router Navigation Blocking
- Context: `hooks/useUnsavedGuard.ts` mentions upgrading to data router for better blocking.
- Proposal: Plan migration to `createBrowserRouter` in a routing PR after current refactors.

### 3) Docs vs Types Divergence for Inventory Count Events
- Context: Docs mention `inventory.count.*` events; types file currently focuses on `inventory.adjusted` and related inventory events.
- Proposal: Align by adding typed count events or update docs to reflect implemented approach; decide in Phase 3.

