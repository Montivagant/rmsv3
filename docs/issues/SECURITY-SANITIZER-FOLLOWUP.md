# Issue: Harden Input Sanitization (XSS/SQL) in Security Utilities

Status: Open
Priority: High (blocking security test expectations)
Owner: TBD
ETA: 0.5–1 day

## Background
The security test suite reports two failures indicating gaps in string/HTML sanitization for XSS and SQL injection patterns.

Failing tests (from `src/__tests__/security/security.test.ts`):
- XSS Protection: should remove event handlers
  - Expected: `Hello` — Received: `"alert(1)" Hello`
- SQL Injection Protection: should remove dangerous characters
  - Expected: `admin` — Received: `admin --`

## Scope
- Update our security sanitization helpers to proactively strip inline event handlers and SQL comment markers from user-supplied text that is persisted, rendered, or used for queries (even if ORM/param binding is used elsewhere).

## Proposed Changes
- XSS:
  - Add `stripEventHandlers(html: string): string` that removes attributes matching `/^on[a-z]+/i`.
  - Ensure quotes or javascript protocol stubs left behind are also removed.
- SQL injection:
  - Extend sanitizer to strip comment patterns like `--`, `;--`, `/* ... */`, trailing `;` when found in contexts flagged as potentially dangerous text.

## Acceptance Criteria
- `src/__tests__/security/security.test.ts` passes all tests.
- New unit tests cover:
  - Attributes like `onclick`, `onerror`, `onload` stripped from HTML strings.
  - Dangerous SQL comment sequences removed from text.
- No regressions in existing sanitizer usage (manual spot-check in app paths that use the helpers).

## Implementation Notes
- Target file(s): `src/security/validation.ts` (or central sanitizer util if present).
- Provide pure functions with clear naming and tests.

## Risks / Mitigations
- Overzealous stripping could affect legitimate content. Scope destructive rules to inputs that are intended for plain text or pre-rendered safe HTML.

---

Checklist
- [ ] Implement `stripEventHandlers()` and SQL comment sanitizer
- [ ] Add/adjust unit tests
- [ ] Run `pnpm vitest run src/__tests__/security/security.test.ts`
- [ ] Document helper usage in `docs/` if needed

