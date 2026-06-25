---
name: bass-diagnostics
description: "Diagnostics tab pricing/material rules for JobOverview."
---

# Diagnostics Skill (Compact)

Use for changes in diagnostics tab, spare-part rows, summary distribution, or validate-and-save flows.

## Core Chain

useDiagnosticsManager -> DiagnosticsContext -> SparePartsArea/SparePartsRow/SummaryArea

## Core Files

- src/hooks/useDiagnosticsManager.ts
- src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx
- src/modules/JobManagement/JobOverview/SparePartsRow/
- src/modules/JobManagement/JobOverview/SparePartsArea/SummaryArea.tsx
- src/utils/priceCalculator.ts

## Non-Negotiable Rules

- Mode source: useDiagnosticsContext().discountBase.
- Suggested net subtype: diagnosticSuggestedNetPrice.
- Use calculatePrices/aggregateRowPrices/distributeGrossToRows/distributeNetToRows/resetRowPrices.
- No inline price formulas.
- Keep negative discount clamps.
- Set isDistributingRef.current=true before summary->rows distribution.
- Do not add top early-return guard in onSummaryDiscountChange/onSummaryDiscountNetChange.
- Protected positions currently: LA, FR, PC.

## Pricing Logic

- GROSS: suggestedNet=net -> tax -> gross -> discount -> total.
- NET: suggestedNet -> discount -> net -> tax -> gross=total.
- Detect stale rows via roundToTwo(qty\*unitPrice) mismatch vs suggestedNetPrice.

## Summary Logic

- Aggregate with SUMMARY_TYPE_FILTER.
- GROSS discount = (gross-total)/gross\*100.
- NET discount = (suggested-net)/suggested\*100.
- Distribution target positions: SP, PN, AC.

## Lifecycle

- arePricesValidated false on rule changes.
- Validate action sends materials[*].price=null and priceSummary=null.
- markAllValidated on success.
- markRowDirty on user post-validation edits.

## External Row Sources

- special material modal -> origin specialMaterial.
- explosion drawing modal -> origin explosionDrawing.

## Quick Verification

- Row field updates remain consistent after any editable price change.
- Summary edits distribute expected discount to eligible rows only.
- Hidden/visible price sections match validation state and permissions.
