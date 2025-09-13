## A11y Primitives — Overlays & Menus

### Shared Hooks/Components
- `hooks/useDismissableLayer.ts`: ESC, outside-click, and route-change dismissal; single-overlay coordination; optional blur and trigger exceptions.
- `components/Modal.tsx`: Accessible modal dialog with `role="dialog"`, `aria-modal`, labelled/ described, focus trap, focus restore, body scroll lock.
- `components/Drawer.tsx`: Drawer overlay using the same dismiss layer and focus management.
- `components/DropdownMenu.tsx`: Menu button pattern with ARIA, keyboard navigation (ArrowUp/Down, Home/End), and dismiss layer.

### Adoption Status
- Modals: used across inventory/menu pages; POS `PaymentModal` migrated to shared `Modal`.
- Drawers: used for transfer completion and various inventory forms.
- Menus: `DropdownMenu` used for actions and topbar menus.
- Top bar overlays (search, notifications, profile) use `useDismissableLayer` and a focus trap sentinels pattern.

### Guarantees
- One overlay open at a time via `overlay:open` coordination.
- Dismiss on ESC, outside click, and route change.
- Focus trap within dialogs; focus is restored to trigger on close.
- WCAG AA contrast ensured via design tokens.

### Next Steps
- Ensure any remaining ad-hoc overlays migrate to `Modal`/`Drawer`.
- Keep a11y smoke tests up-to-date (tab/shift+tab, ESC, outside-click, focus restore).

