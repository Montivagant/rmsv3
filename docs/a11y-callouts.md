Accessible Callouts: Alerts vs. Status

Goal: ensure screen readers announce important messages without overwhelming users.

Use these rules for callout containers (the box around the message, not inline field text):

- Errors (blocking): role="alert"
  - Announce immediately. Use for validation errors, destructive failures.
  - Add aria-live="polite" (or leave implicit for alerts) and ensure the message is concise.

- Warnings/Info (non-blocking): role="status"
  - Announce politely without interrupting. Use for warnings, confirmations, hints.
  - Add aria-live="polite" and keep copy short, action-oriented.

Do not use alert/status for:
- Small badges/chips, decorative indicators, or destructive buttons (use proper color tokens and labels instead).
- Every inline field error (<p> under a field). Prefer block-level alert once per form or section.

Implementation patterns
- Error box:
  <div className="p-3 bg-error/10 border border-error/20 rounded-md text-error text-sm" role="alert" aria-live="polite">
    {errorText}
  </div>

- Warning/info box:
  <div className="p-3 bg-warning/10 border border-warning/20 rounded-md text-warning text-sm" role="status" aria-live="polite">
    {message}
  </div>

Testing
- Use axe or similar to ensure no duplicate live regions fire on minor updates.
- Verify a screen reader announces the callout once when it appears, and not on every re-render.
