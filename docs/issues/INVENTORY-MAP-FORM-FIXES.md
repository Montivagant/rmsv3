# Issue: Align Inventory Item Mapping & Validation with Tests

Status: Open
Priority: Medium
Owner: TBD
ETA: 1–2 days

## Background
`src/__tests__/lib/inventory/mapItemForm.test.ts` shows 11 failures across mapping, defaults, validation, and error normalization.

Representative failures:
- mapFormToAPI: expected storage unit `'pieces'` but got `undefined`.
- mapAPIToForm: expected ingredient unit `'grams'` but got `undefined`.
- validateAPIPayload: missing error strings for required fields (item name, SKU, category ID, storage unit, ingredient unit).
- createAPIError: unknown error `details` expected as string `'42'`, received number `42`.
- createDefaultFormData: expected empty string defaults for `categoryId`, `storageUnitId`, `ingredientUnitId`, received `undefined`.

## Scope
- Audit item mapping functions and schemas for unit-related fields and defaults.
- Normalize validation errors to match test expectations.
- Ensure default form data returns empty strings for controlled select IDs.
- Normalize unknown error `details` to string.

## Proposed Changes
- In `src/lib/inventory/mapItemForm.ts` (or relevant):
  - Ensure `mapFormToAPI` maps unit selectors to API: `storageUnitId`, `ingredientUnitId`.
  - Ensure `mapAPIToForm` sets corresponding form fields.
  - `createDefaultFormData()` returns `''` for `categoryId`, `storageUnitId`, `ingredientUnitId` and `undefined` for numeric optional fields like cost.
  - `validateAPIPayload()` assembles human-readable error messages:
    - 'Item name is required', 'SKU is required', 'Category ID is required', 'Storage unit is required', 'Ingredient unit is required'.
  - `createAPIError()` uses `String(value)` for `details` when value is not string.

## Acceptance Criteria
- All tests in `src/__tests__/lib/inventory/mapItemForm.test.ts` pass.
- No regressions in item form/adapter usage in the app (manual sanity around item create/edit).

## Risks / Mitigations
- Divergence between domain model and tests; confirm expected field names and requiredness with product/domain docs.

---

Checklist
- [ ] Map unit IDs both directions in adapters
- [ ] Default empty strings for select IDs, keep numeric optionals undefined
- [ ] Normalize validation error strings
- [ ] Normalize `createAPIError().details` to string
- [ ] Run `pnpm vitest run src/__tests__/lib/inventory/mapItemForm.test.ts`

