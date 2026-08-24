---
name: bass-country-config
description: "CountryConfig consumption rules for diagnostics."
---

# Country Config

## Query Model

- Key: `["countryConfiguration", countryCode]` cached with infinite `staleTime`.
- Read synchronously via `queryClient.getQueryData`.

## Framework Logic

- Naming: `diagnosticsConfiguration.discountBase` -> `GROSS_PRICE | NET_PRICE`.
- Rows: Match rules by exact actionType + jobType. Use allowedPositions/maxCount to gate creation.
- UI: `unitPriceSource === SYSTEM` disables edit. Protected locations: LA, FR, PC.
