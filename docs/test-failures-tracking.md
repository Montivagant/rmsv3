# Test Failures Tracking

This document tracks current failing tests unrelated to the P0 UX/UI/a11y changes, with hypotheses and proposed fixes.

Last updated: 2025-09-07

## Summary

- Security: 2 failing tests
- Inventory mapping (mapItemForm): 11 failing tests

## Failing Suites

### 1) src/__tests__/security/security.test.ts (2 failed)

- XSS Protection: should remove event handlers
  - Expected: 'Hello' — Received: '"alert(1)" Hello'
  - Hypothesis: Sanitizer does not strip inline event handler attributes or quoted handlers prefix; adjust sanitization to drop on* attributes and sanitize quotes.

- SQL Injection Protection: should remove dangerous characters
  - Expected: 'admin' — Received: 'admin --'
  - Hypothesis: Sanitizer misses SQL comment sequences like `--`; add pattern to strip trailing comments.

Proposed Fixes:
- Update sanitization utilities to:
  - Strip attributes matching `/^on[a-z]+/i` from HTML input.
  - Remove or escape dangerous sequences such as `--`, `;--`, `/* */`, `;` when in contexts that risk SQL parsing.

### 2) src/__tests__/lib/inventory/mapItemForm.test.ts (11 failed)

Representative failures:
- mapFormToAPI: should map required fields correctly
  - Expected storageUnit 'pieces' — Received undefined
- mapAPIToForm: should map API data to form format
  - Expected ingredientUnit 'grams' — Received undefined
- validateAPIPayload: multiple expectations (require item name, SKU, category ID, storage unit, ingredient unit, etc.) are not reported
- createAPIError: should handle unknown error types
  - Expected details string '42' — Received number 42
- createDefaultFormData: should create empty strings for categoryId/storageUnitId/ingredientUnitId — Received undefined

Hypotheses:
- Shape drift between schema and adapter mapping for units (storageUnitId/ingredientUnitId) or renamed keys.
- Validation logic returns errs as codes/objects rather than plain strings expected by tests, or messages not aligned.
- Default form data function returns undefined instead of empty string for some IDs; tests expect '' for controlled inputs.
- Error normalization not converting unknown error `details` to string.

Proposed Fixes:
- Align adapters and schemas for unit fields:
  - Ensure `mapFormToAPI` maps form.unit selectors to API keys (`storageUnitId`, `ingredientUnitId`) and vice versa.
  - Ensure `createDefaultFormData()` initializes `categoryId`, `storageUnitId`, `ingredientUnitId` as '' (empty string) for controlled select inputs.
- Validation messages:
  - `validateAPIPayload()` should push human-readable strings: 'Item name is required', 'SKU is required', 'Category ID is required', 'Storage unit is required', 'Ingredient unit is required'.
- Error normalization:
  - In `createAPIError()`, coerce `details` to string via `String(value)` when unknown type.

## Action Plan

1) Security utils
- Add `stripEventHandlers(html: string): string` to remove on* attributes.
- Extend SQL sanitizer to strip comment markers `--`, `/*...*/`, and trailing semicolons as configured.

2) Inventory adapters + validation
- Audit keys used in `mapItemForm.ts` and tests; align fields and defaults.
- Ensure defaults return '' for select IDs; update adapter mapping for unit IDs.
- Normalize validation error strings and unknown error details to string.

3) PR/Commit expectations
- Add targeted unit tests for new sanitizer behaviors.
- Update adapter tests if domain changes require it (coordinate with product specs).

## Next Steps
- Implement security sanitizer fixes.
- Patch `mapItemForm.ts` adapters/validators and re-run tests for that file.
- Open follow-up issues if domain clarifications are needed for unit mappings.

