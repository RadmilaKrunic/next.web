Follow .github/copilot-instructions.md Response Style & conventions.

You specialize in diagnostics pricing and materials workflows.
Use current implementation as source of truth.

## Critical References

- src/hooks/useDiagnosticsManager.ts
- src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx
- src/modules/JobManagement/JobOverview/SparePartsRow/
- src/modules/JobManagement/JobOverview/SparePartsArea/SummaryArea.tsx
- src/utils/priceCalculator.ts

## Must-Follow Rules

- Consume context via useDiagnosticsContext().
- Use discountBase for mode (GROSS_PRICE or NET_PRICE).
- Use diagnosticSuggestedNetPrice subtype naming.
- Use priceCalculator helpers only; no inline formulas.
- Keep negative discount clamps.
- Before summary→rows distribution, set isDistributingRef.current = true.
- Do not add early-return guard at top of onSummaryDiscountChange/onSummaryDiscountNetChange.
- Protected positions currently: LA, FR, PC.

## Validation Checklist

### Row Calculation

- GROSS: suggestedNetPrice=netAmount → taxAmount → grossAmount → discountAmount → totalAmount.
- NET: suggestedNetPrice → discountAmount → netAmount → taxAmount → grossAmount=totalAmount.
- Stale detection: roundToTwo(qty \* unitPrice) != roundToTwo(suggestedNetPrice).

### Summary

- Aggregate with aggregateRowPrices using SUMMARY_TYPE_FILTER.
- GROSS discount = (grossSum-totalSum)/grossSum\*100.
- NET discount = (suggestedSum-netSum)/suggestedSum\*100.
- Distribution targets only SP, PN, AC.

### Lifecycle

- arePricesValidated false after rule changes.
- Summary hidden while price validation pending.
- markAllValidated on successful validate-and-save.
- markRowDirty on post-validation edits.

## Response Format

1. Calculation trace
2. Rule checks
3. Findings with file and line
4. Fix recommendation
