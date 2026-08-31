# Items & Prices — Frontend

> Frontend implementation status for the items & pricing redesign. See **Items & Prices — Overview** for the why, and **Items & Prices — Backend** for the API contracts this code is built against.

## What's implemented today

| Area | Status |
|---|---|
| Shared `Price` type (job/claim drift fixed) | **Shipped** |
| Typed claim pricing contract (`putClaimPrices`) | **Shipped** |
| `ItemPolicyConfig` types + local dev-mode mock infra | **Shipped, not wired in** |
| `itemRulesResolver.ts` pure resolver functions | **Shipped** |
| Local price-validate simulator (`priceEngineSimulator.ts`) | **Shipped, not wired in** |
| `SparePartsRow.tsx` / `useDiagnosticsManager.ts` resolver wiring | **Shipped, behind a feature flag (off by default)** |
| `ClaimSparePartsRow.tsx` resolver wiring | **Not attempted — doesn't fit the model, see below** |
| Real `/prices/validate` endpoint integration | **Not started — blocked on backend** |
| Item rows out of Formik | **Not started** |
| Job/Claim unification | **Not started** |

## Type layer

**`src/types/price.types.ts`** — the shared `Price` interface, reused by both `JobList.types.ts` (job diagnostics) and `Claims.types.ts` (claim), reconciling a field-set drift that existed between them.

**`src/api/services/claims/claims.types.ts`** — `PutClaimPricesRequest`/`PutClaimPricesResponse`, replacing the previously-untyped `Record<string, unknown>` contract for `PUT /v1/claims/{claimId}/prices`. This is a **typing-only** pass on the existing endpoint — zero behavior change, matches exactly what `ClaimOverview.tsx`'s `onValidateClaim` already sends today.

**`src/api/services/itemPolicy/itemPolicy.types.ts`** — two families of types:
- `ItemPolicyConfig` and friends (`PositionPolicy`, `EditabilityRule`, `WarrantyGatingRule`) — the policy overlay served by the future `GET /v1/countries/{cc}/item-policy` (Backend page, API-1).
- `MaterialRow`, `PriceSummary`, `DiagnosticPricingPayload`, `DiagnosticPricingResult`, `ChangedMaterialRow`, `ChangedSummary`, `ClaimPriceValidateRequest`, `ClaimPricingResult` — the pricing wire types matching the Backend page's shared-types section exactly. Not consumed by any component yet — see the local simulator below.

## Config resolvers

**`src/utils/itemRulesResolver.ts`** — pure functions operating on either the new `ItemPolicyConfig` or the existing `CountryConfig.diagnosticsConfiguration` (`DiagnosticsRuleEntry[]`) data, replacing what used to be hardcoded/inline logic scattered across components:

- `resolvePositionPermissions`, `isPositionProtected`, `resolveEditability`, `isSummaryControlledRow`, `selectConfigForSurface` — over `ItemPolicyConfig`.
- `resolveAutomaticRows`, `resolveAllowedPositions`, `resolveEnforceSparepartExists` — over the existing `DiagnosticsRuleEntry[]` (no new fetch — this data is already served today).

All of it is gated behind one exported flag:

```ts
export const ENABLE_ITEM_RULES_RESOLVER = false;
```

**This is the single kill-switch for every resolver-driven code path.** Flip it to `true` (or wire it to an env var / remote config later) to switch every gated call site from its pre-existing hardcoded logic to the config-driven resolver, in one place. It currently defaults to `false`, so all of the wiring below is dormant in production.

## Where it's wired in (strangler-fig pattern)

Every gated call site follows the same shape: **prefer the config-driven resolver when the config is loaded, fall back to the pre-existing hardcoded logic otherwise.** This is not a rip-and-replace — the old logic (`POSITION_PERMISSIONS` in `SparePartsRow.tsx`, `materialPriceEditability.ts`) stays in place as the fallback/default, not dead code.

- **`src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`** — position permissions and price-field editability route through `resolvePositionPermissions`/`resolveEditability` when `itemPolicy` (from `DiagnosticsContext`) is loaded and the flag is on; otherwise falls back to `POSITION_PERMISSIONS`/`materialPriceEditability.ts`'s `getPriceFieldEditability`.
- **`src/hooks/useDiagnosticsManager.ts`** — `resolveAllowedPositions`/`resolveAutomaticRows` replace the hook's own inline rule-matching logic behind the same flag. `resolveEnforceSparepartExists` is defined but **not** wired anywhere — nothing in the codebase consumes `enforceSparepartExists` yet.
- **`src/modules/JobManagement/JobOverview/JobOverview.tsx`** — fetches `ItemPolicyConfig` via `useItemPolicyConfig`, resolves it for the `jobDiagnostics` surface via `selectConfigForSurface`, and exposes it through `DiagnosticsContext.itemPolicy`.

**`ClaimSparePartsRow.tsx` was deliberately not migrated.** Its real editability rule is `isNewRow && !isClaimPending` — gated on whether *this specific row* is newly added, combined with a claim-level pending flag — not a context-string lookup the way `EditabilityRule` models it. There's also no per-position permission table on the claim side (`canDeleteRows` is a single claim-level boolean). Forcing this component through the resolver shape would mean fabricating policy entries that don't reflect its actual rule. This needs the config model to gain an `isNewRow`-aware dimension before it's worth migrating — tracked, not forgotten.

## Local dev-mode mocking

The repo already has a proven pattern for building frontend features ahead of real backend endpoints: `getUIConfiguration` loads local JSON fixtures via `import.meta.glob` when `import.meta.env.DEV`, and only calls the real API otherwise. This pattern is replicated for the new endpoints so all of Phases 2–5 can be built and demoed on the frontend alone:

- **`src/api/services/itemPolicy/action.ts`** — `getItemPolicyConfig(countryCode)` loads `data/itemPolicy{CC}.json` in DEV, falls back to the real `GET /v1/countries/{cc}/item-policy` otherwise.
- **`src/api/services/countryConfiguration/countryConfiguration.ts`** (`getCountryConfig`) — gained the same dev-local-mock branch (`data/countryConfiguration{CC}.json`), which it was previously missing (unlike `getUIConfiguration`).
- **`src/api/services/itemPolicy/priceEngineSimulator.ts`** — `simulatePriceValidate`, `simulateClaimPriceValidate`, `simulateClaimPricesSave`. These wrap the existing, already-tested `calculatePrices`/aggregation math from `priceCalculator.ts` — no new pricing logic — and reshape the output into the new `DiagnosticPricingResult`/`ClaimPricingResult` contracts, including the backend's "merge dirty rows onto the last-saved baseline" behavior (see Backend page). Not wired into any component yet; ready for whoever picks up Phase 3 to consume as the dev-mode backing for `/prices/validate`, swappable for the real endpoint with no frontend code change once it exists.

## Testing approach

- **Pure-function tests** for anything with no I/O — `itemRulesResolver.test.ts`, `priceEngineSimulator.test.ts` — table-driven, mirroring `priceCalculator.test.ts`'s existing style.
- **`vi.mock`-based hook/action tests** — `itemPolicy/action.test.ts`, `itemPolicy/hooks.test.ts` — mirroring the conventions already used for `claims/action.test.ts`, `claims/hooks.test.ts` (dev-local-file branch + prod-API-fallback branch, exactly like `uiConfiguration/action.test.ts`).
- **Regression tests for the strangler-fig wiring**: `SparePartsRow.test.tsx` and `useDiagnosticsManager.test.ts` were extended (not modified) with tests proving the config-driven path activates once `itemPolicy`/rule data is supplied — every pre-existing test continues to exercise the unchanged fallback path by construction, since `itemPolicy` is an optional field none of the existing test fixtures set.

Target: >80% coverage on every changed file, consistent with the rest of the codebase's conventions.

## Recent fix worth knowing about

`SparePartsRow.tsx`'s position-change effect had a regression where it stopped syncing the changed position back into `DiagnosticsContext`'s `materials` state — anything reading `materials[i].position` (summary aggregation, position-based rules) saw a stale value once a row's position was picked, most visibly on the first material row. Fixed, with two new regression tests covering the `setMaterials` sync and a related shared-ref guard (`isResyncingRef`, shared across all rows via context, used to suppress spurious dirty-tracking when a second row is added).

## Not yet done / dependent on the backend

- The real `GET /v1/countries/{cc}/item-policy` endpoint doesn't exist — `useItemPolicyConfig` currently fails silently (`retry: false`) in any environment without the local dev fixture, leaving `itemPolicy` undefined and every gated call site on its fallback path regardless of the feature flag.
- `POST /v1/diagnostic/{jobId}/prices/validate` and the claim equivalent don't exist yet — no component calls the simulator or a real endpoint for pricing; `priceCalculator.ts` remains the de facto source of truth in production until Phase 3 ships.
- Item rows are still Formik-backed; `useDiagnosticsManager.ts`'s dynamic field cloning is unchanged.
- Job and Claim still have separate context/hook/row implementations.

## Key files at a glance

```
src/types/price.types.ts                                  Shared Price type
src/utils/itemRulesResolver.ts                             Pure resolvers + ENABLE_ITEM_RULES_RESOLVER flag
src/api/services/itemPolicy/
  itemPolicy.types.ts                                      Policy config + pricing wire types
  action.ts / hooks.ts                                     GET item-policy (+ local dev mock)
  priceEngineSimulator.ts                                  Local /prices/validate simulator
src/api/services/claims/claims.types.ts                    Typed putClaimPrices contract
src/api/services/countryConfiguration/countryConfiguration.ts  + local dev mock branch
src/modules/JobManagement/JobOverview/
  JobOverview.tsx                                          Fetches + resolves ItemPolicyConfig
  SparePartsRow/SparePartsRow.tsx                          Resolver-wired (flagged)
src/hooks/useDiagnosticsManager.ts                         Resolver-wired (flagged)
src/modules/ClaimManagement/ClaimOverview/
  ClaimSparePartsRow.tsx                                   Not migrated — doesn't fit the model
data/itemPolicy{TR,ZA}.json                                Local dev fixtures
data/countryConfiguration{TR,ZA}.json                      Local dev fixtures
```
