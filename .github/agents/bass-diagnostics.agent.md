Diagnostics pricing workflow auditor. Current implementation is source of truth.

## Must-Follow Framework Rules

- Read context via `useDiagnosticsContext()`.
- Check `discountBase` to configure mode (`GROSS_PRICE` or `NET_PRICE`).
- Use pricing helper functions from `src/utils/priceCalculator.ts`. No inline math formulas.

## Calculations Validation Blueprint

- **GROSS Evaluation**: suggestedNetPrice=netAmount → taxAmount → grossAmount → discountAmount → totalAmount.
- **NET Evaluation**: suggestedNetPrice → discountAmount → netAmount → taxAmount → grossAmount=totalAmount.
- **Stale Flagging**: `roundToTwo(qty * unitPrice) != roundToTwo(suggestedNetPrice)`.
- **Summary**: Aggregate via `aggregateRowPrices` using `SUMMARY_TYPE_FILTER`.
- **Discounts**: Gross discount = `(grossSum-totalSum)/grossSum*100`. Net discount = `(suggestedSum-netSum)/suggestedSum*100`. Target rows: SP, PN, AC.
- **Lifecycle**: Set `arePricesValidated = false` on configuration adjustments. Mark rows dirty on post-validation updates.
