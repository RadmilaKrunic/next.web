---
name: bass-country-config
description: "CountryConfig consumption rules for diagnostics and UI localization."
applyTo: "src/api/services/countryConfiguration/**,src/hooks/usePositionDropdownSync.ts,src/hooks/useDiagnosticsManager.ts"
---

# Country Config (Compact)

Use for any logic reading CountryConfig.

## Core Files

- src/api/services/countryConfiguration/countryConfiguration.ts
- src/hooks/useDiagnosticsManager.ts
- src/hooks/usePositionDropdownSync.ts
- src/App.tsx

## Query Model

- Fetch key: ["countryConfiguration", countryCode]
- Loaded once in App.tsx with staleTime Infinity.
- Consumers read synchronously via queryClient.getQueryData.

## Critical Naming

- Correct field: diagnosticsConfiguration.discountBase
- Values: GROSS_PRICE | NET_PRICE
- Do not use priceCalculationMode symbol in code.

## Diagnostics Rules

- Match rules by exact actionType + jobType.
- Use allowedPositions/maxCount to gate row creation.
- automaticRows apply on rule activation.
- addSpecialMaterialsAllowed gates special-material features.

## Position Behaviors

- unitPriceSource === SYSTEM -> disable unit price edit.
- quantity.quantitySource controls default quantity logic.
- Protected positions used by row UI currently: LA, FR, PC.

## Permissions

- FR visibility/editability depends on diagnostics permission checks.

## Verification

- Rule match changes update allowedPositions and automaticRows.
- discountBase is written/consumed consistently in diagnostics flow.
- Position maxCount and disabled states enforce correctly.
