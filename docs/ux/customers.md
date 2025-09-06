# Customers Revamp – Plan of Record (POR)

Owner: UX/Frontend  
Status: Approved (v1)  
Scope: Revamp /customers to a production-grade, scalable, and accessible experience using reusable components and global design tokens (no inline styles).

## Information Architecture

- Default view: Paginated, virtualized Data Table optimized for scanning, comparison, and actions.
  - Columns (initial): Name, Contact (email/phone), Total Spend, Orders, Last Visit, Status/Tags, Actions.
  - Behaviors: sort, resize, hide/show, persistent column order and visibility (localStorage key: rms.customers.table).
  - Row interaction:
    - Primary: Open Customer Profile (right-side drawer) on row click or via row action button.
    - Secondary: Row kebab menu with one-record actions (mirrors bulk actions).
- Card view: Deferred. Toggle scaffolding behind a feature flag; default to Table.
- Customer Profile Drawer (lazy-loaded):
  - Summary: Name, contact details, tags/status, quick actions (email, call).
  - Order history snapshot: last N orders, totals.
  - Loyalty section: read-only balance and transaction snapshot.
  - Notes: simple activity notes list with author/timestamp.
  - Audit log: last changes/events.
  - Loyalty adjustment ONLY here (modal/section), never in list (no in-list points editing).
- Add/Edit Customer (modal):
  - Two-column layout on desktop; single column on mobile.
  - Required fields marked; inline errors; submit disabled until valid.
  - Role permissions respected (fields/actions visibility).
- Empty/Error/Loading/No-results states: clear guidance and next step (Add Customer, Reset filters).

## Query, Scale & Performance

- For 10k+ customers, implement server-side pagination and filtering; persist query state in URL.
  - URL schema: /customers?search=&amp;page=&amp;pageSize=&amp;sort=col:dir&amp;filters=encoded
  - sort param format: columnId:asc|desc (e.g., totalSpent:desc)
  - filters param: Rison/JSON-like compact encoding (e.g., {"status":["active"],"tags":["vip"],"spend":[100,1000],"signup":["2024-01-01","2024-12-31"],"visitRecency":"30d"})
- Debounced search: 300ms.
- Virtualization: react-window VariableSizeList integrated with TanStack Table row model.
- Skeleton loaders for table rows; sticky header for actions.
- Local persistence for column order/visibility/density preferences.

## Filters & Segmentation

- Compact Filter bar (facets):
  - Signup date range
  - Spend range
  - Visit recency (e.g., 7d/30d/90d/1y)
  - Status (active/inactive)
  - Tag(s) (multi-select)
- Applied filter chips: clear individually; “Reset” clears all.
- Filtering combined server-side; client-side only for transient UX (while typing) if needed.

References: NN/g for faceted search patterns.

## Bulk & Row Actions

- Bulk selection via table checkboxes; sticky bulk bar shows on selection.
- Actions:
  - Export CSV
  - Add Tag
  - Activate / Deactivate (dangerous; confirm modal)
- Row kebab mirrors actions for single record.
- Confirmation modals for destructive or status change actions with clear outcome; toast feedback; undo affordance where feasible.

## A11y, Theming & Interaction Quality

- Color contrast: meet WCAG AA (4.5:1 text, 3:1 large text/UI components). Validate tokens for both light/dark.
- Keyboard and screen reader:
  - Table semantics: proper table/row/column roles, aria-sort on headers, selectable rows via keyboard (Space/Enter), header checkbox for select-all.
  - Menu buttons: aria-haspopup="menu", aria-expanded, aria-controls; focus management; Esc/outside click to dismiss.
  - Modals/Drawers: focus trap, aria-modal, labelledby/ describedby, Esc/outside click close.
- Focus Visible: always show clear focus rings per tokens.
- Overlays & dropdowns: shared useDismissableLayer to ensure outside click/Esc/route-change dismiss; only one overlay open at a time.
- Theming: tailwind classes and CSS variables only; no inline styles.

## Reusable Building Blocks

Create new domain components under src/customers/:

- CustomerTable (table shell + virtualization slot)
- CustomerFilters (facet bar + chips)
- CustomerProfileDrawer (lazy-loaded)
- CustomerFormModal (Add/Edit)
- BulkActionsMenu (sticky header on selection)
- StatusPill (active/inactive) and TagBadge
- EmptyState, LoadingState (reuse global if suitable)
- Hook: useCustomerQueryState (URL sync; debounce)
- API module: customers API client for pagination/filter/sort

No inline styles; use Tailwind + tokens.

## API Contract (MSW mock support)

Endpoint: GET /api/customers  
Query params:
- page: number (default 1)
- pageSize: number (default 25)
- search: string
- sort: string (col:dir)
- filters: encoded JSON for facets (status,tags,spend:[min,max],signup:[from,to],visitRecency:"30d")

Response:
{
  "data": Customer[],
  "page": number,
  "pageSize": number,
  "total": number
}

POST /api/customers (create)  
PATCH /api/customers/:id (update basic fields, status, tags)  
POST /api/customers/:id/loyalty-adjust (loyalty changes – drawer only)

CSV Export: Client-side generation from selected rows or server endpoint (optional for MSW).

## URL State & Persistence

- Sync search, page, pageSize, sort, filters to URL.
- On add/edit/profile close, return to same table state.
- Persist column order/visibility, density and view (table) in localStorage.

## States & Resilience

- Empty: show EmptyState with CTA "Add Customer".
- Loading: row skeletons; disable controls gracefully.
- Error: retry affordance; toast and inline guidance.
- No results: from filters/search; show chips and “Reset”.
- Network resilience:
  - Optimistic updates for tag/status toggles with revert on failure.
  - Pessimistic for create/edit/loyalty adjust; clear toasts, retries.

## Testing

- Unit/integration:
  - Table sorting/filtering/pagination & URL state sync
  - Virtualized rendering window tests (assert only visible rows present)
  - Bulk selection behaviors & sticky actions
  - Drawer open/close, focus trap
  - Add/Edit modal validation (disabled submit until valid)
- A11y smoke:
  - Keyboard navigation through headers, cells, menus
  - Focus management for modals/drawers
  - Contrast checks using tokens (reuse jest-axe harness)
- MSW-backed tests for pagination/filter-sort responses

## Acceptance Checklist

- /customers defaults to a paginated, virtualized table; URL reflects state.
- No points editing in list; loyalty adjustments only in profile drawer.
- Filter bar with facets + chips; Reset works; results debounced (300ms).
- Row & bulk actions work with confirm/undo; role-gated.
- Menus/modals follow ARIA patterns; Esc/outside click closes; only one overlay open.
- Contrast passes WCAG in light/dark; visible focus present.
- All new UI uses reusable components and global tokens; no hardcoded/inline styling.
- Tests pass; docs updated.

## Implementation Notes

- Libraries: TanStack Table v8 + react-window (VariableSizeList).
- Virtualization integration: measure row size (density) and compose with table rowModel; sticky header and footer outside list.
- Density: leverage existing UI preference store (comfortable/compact).
- Persistence keys:
  - rms.customers.table.columns
  - rms.customers.table.visibility
  - rms.customers.table.order
  - rms.customers.table.density

## Rollout Plan

1) Land scaffolding + docs + basic table wired to MSW paginated API with URL state.  
2) Add filters & bulk actions.  
3) Add profile drawer with sections and loyalty adjustment.  
4) Add tests and refine a11y.  
5) Consider optional Card view toggle (flagged) later.
