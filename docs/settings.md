# Settings Revamp

This document outlines the new Information Architecture, reusable components, accessibility patterns, and how to extend the Settings area.

## Information Architecture

Settings are organized into two top-level tabs (route remains unchanged):

- Admin Console (default /settings)
- Technical Console

Within Admin Console, sections are shown with a left sub-navigation and a responsive content area:

Sections (anchors)
- General (Appearance & Layout)
  - Density (comfortable/compact)
  - Sidebar (expanded/collapsed)
  - Date format
  - Number format
- Feature Flags (User)
  - KDS
  - Loyalty
  - Payments
- Inventory Rules
  - Oversell policy (block vs allow negative & alert)
- Tax & Exemptions
  - Heavy panel, lazy-loaded
- Integrations / Payments
  - Placeholder cards to support future integrations
- Danger Zone
  - Reset user feature flags to technical defaults
  - Reset UI preferences to defaults

Layout
- Desktop: Two-column layout where the left column is a sticky SubNav and right column is the content.
- Mobile: Single column content; SubNav collapses into a scrollable anchor list.

A sticky Save/Reset bar appears when there are unsaved changes.

## Reusable Components

All settings UI uses tokenized utilities and shared components only (no inline styles).

Location: src/settings/ui

- SettingSection
  - Section wrapper with title/description and internal spacing.
- SettingCard
  - Tokenized card with title/description/actions slots.
- SettingRow
  - Grid layout row: left (label/description), right (controls/help). Responsive by default.
- Toggle
  - Accessible switch with role="switch", aria-checked; tokenized track/knob; supports md/sm sizes.
- Select
  - Uses src/components/Select (tokenized with label/help/error). Suitable for enums/policy values.
- NumberField
  - Tokenized numeric input with label/help/error.
- SubNav
  - Sticky left sub-navigation with active section highlight (IntersectionObserver-based).
- Description and HelpLink
  - Inline helpers for consistent typography and external links.
- DangerAction
  - Destructive action button coupled with a confirmation Modal wired by the shared useDismissableLayer.
- StickyBar
  - Fixed bottom bar with Save/Reset buttons that appears only when there are unsaved changes.

## Theming and Tokens

- Dark mode is class-based using the app ThemeProvider (documentElement.classList.toggle('dark')).
- Use only token utilities and Tailwind theme mappings (index.css + tailwind.config.js):
  - Text: text-primary, text-secondary, text-tertiary, text-muted
  - Background: bg-surface, bg-surface-secondary
  - Border: border-primary, border-secondary
  - Focus: focus-ring, focus-ring-inset
  - State: text-error, bg-error-50, etc.
- No hardcoded hex values; rely on design tokens.

## Accessibility

- Contrast
  - Text ≥ 4.5:1 and non-text UI (borders, icons, focus indicators) ≥ 3:1, validated through tokens.
- Focus
  - All interactive controls must have visible focus. Use focus-ring utilities.
- Targets
  - Minimum target size based on WCAG 2.2; .btn-base and .input-base already include minimum heights.
- ARIA patterns
  - Dialogs (Modal): role="dialog", aria-modal, labelled/ described, focus trapped.
  - Menus (DropdownMenu), overlays: unified dismissal via useDismissableLayer (outside click, Escape, route change).
  - Toggles: role="switch", aria-checked; Selects labelled by id.
- Keyboard
  - All flows reachable with tab/shift+tab only. No trapped focus. Escape/outside click dismiss works consistently.

## Behavior & State

- Optimistic Save with rollback
  - Admin Console is controlled locally; Save applies changes atomically:
    - Flags: setFlag per changed key
    - UI: setDensity, setSidebarCollapsed, setDateFormat, setNumberFormat
    - Inventory: setOversellPolicy
  - On error, local state rolls back to previous snapshot; a toast indicates failure.
- Reset with Guardrails
  - DangerAction confirms destructive actions:
    - Reset user flags to technical defaults
    - Reset UI preferences to defaults (local device)
- Sticky Bar
  - Appears when local state differs from the baseline snapshot (initial state).

## Performance

- Heavy panes (TaxConfigurationPanel) are lazy-loaded via React.lazy + Suspense fallback.
- Forms are controlled; minimal re-renders via simple state slices.

## Tests (smoke level)

New tests:
- src/__tests__/settings-a11y.test.tsx
  - Renders AdminConsole and validates no obvious axe violations.
  - Verifies sticky Save bar appears on change and hides after save.
- src/__tests__/dismissable-layer.settings.test.tsx
  - Opens a DangerAction dialog and verifies Escape closes it (shared hook).

Existing a11y tests cover generic components. For any new dialogs or menus, base them on Modal/DropdownMenu to inherit the dismissal and focus behaviors.

## How to Add a New Setting

1. Choose a section and anchor or create a new section using SettingSection in AdminConsole.
2. Wrap controls in SettingCard and SettingRow for label/description/help.
3. Use tokenized components only (Toggle, Select, NumberField). Avoid raw HTML elements without the token classes.
4. Bind to the appropriate store/API:
   - UI preferences: src/store/ui
   - Feature flags: src/store/flags
   - Domain rules: e.g., inventory policy, create a typed getter/setter pair and import into AdminConsole.
5. Update the sub-nav items to include the new section anchor.
6. Ensure a11y:
   - Provide label (htmlFor + id), helpText, and proper aria- attributes where applicable.
   - Validate focus orders and Escape/outside click behavior (use Modal or DropdownMenu with useDismissableLayer).
7. Add a short test if the setting introduces a new overlay or a critical keyboard flow.

## Technical Console

The Technical Console remains as a separate tab for global defaults and replication controls. It already uses the audit logger for changes. The Admin Console “Reset user flags” action will pull from these global defaults.

## Audit Logging

Audit logging is performed on:
- Feature flag changes (user scope)
- Oversell policy changes (user scope)
- Dangerous actions (flags reset, UI prefs reset)

Audit logger API: src/rbac/audit.ts

## Notes

- No public routes were renamed; APIs remain intact.
- No new libraries were introduced.
- Copy remains plain and human (“General”, “Integrations / Payments”, etc.).
