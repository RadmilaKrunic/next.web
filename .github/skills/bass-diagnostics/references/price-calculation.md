---
name: price-calculation
description: "Compact reference for diagnostics price utilities."
---

# Price Calculation Reference

Source: `src/utils/priceCalculator.ts`

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

## Required Constraints

- Clamp negative discounts to 0
- Round with `roundToTwo`
- `taxPercent` constrained 0–100
- Summary distribution targets SP/PN/AC rows only

## Summary Discount Formulas

- GROSS: `(grossSum - totalSum) / grossSum * 100`
- NET: `(suggestedSum - netSum) / suggestedSum * 100`

## Integration Rules

- Read `discountBase` from `DiagnosticsContext` — never hardcode mode
- Keep stale-price guards: `roundToTwo(qty*unitPrice)` vs `suggestedNetPrice`
- Never bypass helpers with inline formulas in components
