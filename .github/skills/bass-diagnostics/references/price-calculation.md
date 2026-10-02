---
name: price-calculation
description: "Reference for diagnostics price utilities (client-side preview helpers; backend is authoritative)."
---

# Price Calculation Reference

> Pricing is now calculated server-side. The UI calls `postRecalculatePrices` (onBlur) and `postValidateAndSave` (save/validate) and renders the returned `priceSummaryDetailed`/`diagnostic`. The helpers below remain for client-side previews and stale-price detection only — do not use them to persist a value that should come from the backend.

## Modes

- GROSS_PRICE: `suggestedNet=net` → tax → gross → discount → total
- NET_PRICE: `suggestedNet` → discount → net → tax → `gross=total`

## Core API

- `calculatePrices(inputs, changedField, changedValue, mode)`
- `resetRowPrices(quantity, unitPrice, taxPercent?, mode?)`
- `aggregateRowPrices(values, allFields, typeFilter?, mode?, positionFilter?)`
- `calculateSummaryTotalAmountDistribution(totalAmount, grossSum)`
- `calculateSummaryNetAmountDistribution(netAmount, suggestedNetSum)`
- `distributeGrossToRows(discountPercent, typeFilter, values, setFieldValue, allFields)`
- `distributeNetToRows(discountPercent, typeFilter, values, setFieldValue, allFields)`

## Constraints

- Clamp negative discounts to 0. Round with `roundToTwo`.
- `taxPercent` constrained 0–100. Summary distribution targets SP/PN/AC rows only.
- GROSS Summary Discount: `(grossSum - totalSum) / grossSum * 100`
- NET Summary Discount: `(suggestedSum - netSum) / suggestedSum * 100`
- Guard: Mismatch if `roundToTwo(qty*unitPrice) != suggestedNetPrice` — triggers a `postRecalculatePrices` call rather than a local recompute-and-store.
