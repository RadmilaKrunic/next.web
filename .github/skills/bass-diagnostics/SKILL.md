---
name: bass-diagnostics
description: "Diagnostics tab pricing/material rules."
---

# Diagnostics Skill

## Context & Naming

- Context chain: useDiagnosticsManager → DiagnosticsContext.
- Mode source: `useDiagnosticsContext().discountBase`.
- Subtype naming: `diagnosticSuggestedNetPrice`.

## Calculation Logic

- GROSS: suggestedNet=net → tax → gross → discount → total.
- NET: suggestedNet → discount → net → tax → gross=total.
- Stale trigger: `roundToTwo(qty*unitPrice) != roundToTwo(suggestedNetPrice)`.
- Distribution: Set `isDistributingRef.current = true` before `distribute*` execution. Target positions: SP, PN, AC.
- Flags: `arePricesValidated = false` on configuration rule updates.

---

name: bass-diagnostics
description: "Diagnostics tab pricing/material rules. Server-side pricing; UI renders backend values."

---

# Diagnostics Skill (updated)

## When to use

- Use this skill when modifying diagnostics UI, pricing flows, spare-part rows, `SparePartsRow`, `SummaryArea`, `useDiagnosticsManager`, or `useSparePartPriceCalculation`.

## Server-driven pricing (NEW)

- Pricing calculation moved to backend. UI must call `postRecalculatePrices` for onBlur recalculation and `postValidateAndSave` for final validation/save.
- Backend responses include `priceSummaryDetailed` (or `diagnostic.priceSummaryDetailed`). Treat these fields as authoritative.

## UI responsibilities

- Invoke `usePostRecalculatePrices` on configured blur events for price fields (qty, unitPrice, discount).
- On save/validate, call `usePostValidateAndSave`. On success, normalize response via `extractDiagnosticFromValidateResponse(data, jobId)` and write to cache: `queryClient.setQueryData(["diagnostic", jobId], diagnostic)`.
- Render all price fields from server data. Do not recompute final totals client-side for persistence.

## Local helpers & fallbacks

- `src/utils/priceCalculator.ts` remains available for UX previews and client-side stale-detection only. Never persist client-only calculations over server values.
- Stale-detection: compare `roundToTwo(qty * unitPrice)` to server `suggestedNetPrice` to flag discrepancies.

## Distribution & Discounts

- Distribution functions (`distributeGrossToRows`, `distributeNetToRows`) may be used to build request payloads, but final distributed values must be confirmed by backend response.

## Tests

- Update tests to mock `postRecalculatePrices` / `postValidateAndSave` returning `priceSummaryDetailed`.
- Prefer assertions that check: hook calls, cache writes, and rendered server values rather than client-side math.

## Implementation notes

- Commercial Goodwill rows still require `GROSS_PRICE` mode semantics server-side; ensure API respects this and UI reads `effectivePriceCalculationMode` from `diagnostic` when present.
