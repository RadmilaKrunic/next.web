Diagnostics pricing has moved to backend. UI renders server-provided price values and must treat backend as source of truth.

## High-level Rules (must follow)

- Do not perform authoritative price calculation in UI. Instead call backend endpoints and render returned values.
- Use `usePostRecalculatePrices` (recalc on field blur where configured) and `usePostValidateAndSave` (on save/validate) from `api/services/jobs/hooks`.
- Expect server response field `priceSummaryDetailed` (or `diagnostic` object containing `priceSummaryDetailed`). Use these values to populate UI and cache.

## Validation & Auditing Checklist

- Verify UI triggers recalc onBlur for price-relevant fields (qty, unitPrice, discount) where metadata requires it.
- On `validateAndSave` success, ensure UI writes backend result to React Query: `queryClient.setQueryData(["diagnostic", jobId], response.diagnostic || constructedDiagnostic)`.
- Use `extractDiagnosticFromValidateResponse` (or equivalent) to normalize response to `JobDiagnostic` shape before cache write.
- Use local `priceCalculator` helpers only for non-authoritative checks, stale-detection, or UX previews — never to override server values.

## Stale detection & fallbacks

- If you need to detect stale backend prices, compare server `suggestedNetPrice` vs local `roundToTwo(qty * unitPrice)` and surface warning — do not auto-change server data.
- Distribution helpers (`distributeGrossToRows` / `distributeNetToRows`) may be used to apply client-side UI-only distributions for preview, but persisted values must come from backend.

## Tests & Mocks

- Update tests to mock `postRecalculatePrices` and `postValidateAndSave` responses containing `priceSummaryDetailed` instead of asserting client math.
- Avoid brittle assertions on numeric calculation sequence; assert cache updates, rendered values, and that appropriate hooks are called.

## Notes

- This agent audits diagnostic pricing flows. If you find UI code performing persistent price calculations, file an issue and prefer server-driven refactor.
