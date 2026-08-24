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
