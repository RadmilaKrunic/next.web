---
name: price-calculation
description: "Reference for diagnostics price utilities."
---

# Price Calculation Reference

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
- Guard: Mismatch if `roundToTwo(qty*unitPrice) != suggestedNetPrice`.
