# Items & Prices Refactor — Diagnostics / Job Overview / Claim Overview

Status: **Proposal** — not yet implemented beyond the low-risk slice described in "Shipped now" at the bottom of this document.

## 1. Problem statement

Item (spare-part/material) rendering and price computation for the diagnostics tab of Job Overview, the read-only diagnostic mirror in Claim Overview, and the editable Claim spare-parts tab have grown into the hardest part of the app to reason about and change safely:

- `src/utils/priceCalculator.ts` (591 lines) is a well-tested, pure math engine, but it is treated as the **source of truth** for what's shown to the user rather than a preview. Even after the backend responds to `POST /v1/jobs/flow/validate-and-save`, the FE explicitly discards the backend's numbers and re-derives everything client-side again (`resyncMaterialsFromAPI` → `calculatePrices`) — there is a code comment stating this "keep pricing flow FE-driven" design choice explicitly.
- `src/hooks/useDiagnosticsManager.ts` (1647 lines, 17 refs, 9 effects) exists largely to reconcile row identity/count with Formik's reinit lifecycle: it dynamically clones/removes Formik `Area`/`Field` definitions (`diagnosticsSpareParts#N`) whenever a row is added or removed. `src/hooks/useClaimMaterialsManager.ts` (812 lines) independently reimplements roughly 90% of the same responsibility for claims.
- Row/position rules are split three ways: `UIConfiguration` field metadata (`dependentFields`, `permissions`, `subtype`), `CountryConfig.diagnosticsConfiguration` (`discountBase`, `rules[]`, `allowedPositions`), and hardcoded FE tables (`POSITION_PERMISSIONS` in `SparePartsRow.tsx`, `getPriceFieldEditability`/`isSummaryControlledRow`/`isProtectedPosition` in `materialPriceEditability.ts`) — plus a fourth, simpler, divergent rule on the claim side (`isNewRow && !isClaimPending` in `ClaimSparePartsRow`).
- `PUT /v1/claims/{claimId}/prices` (`putClaimPrices`) is entirely untyped (`Record<string, unknown>` both directions), and its request payload is hand-built directly from Formik values in `ClaimOverview.tsx`'s `onValidateClaim` instead of going through the shared `mapValuesToAPI`/`buildDiagnosticPayload` pipeline the job side uses.
- Job and claim `Price` shapes have quietly diverged: claim's `Price` (`Claims.types.ts`) is missing `taxTypes?`/`discountAmount` that job's inline price type (`JobList.types.ts`) has, and `Material.isPriceManuallySet` (claim) vs `isPriceSetManually` (job) name the same concept differently.
- `SummaryArea.tsx` computes two parallel client-side aggregates every render (`summary` and `summaryMaterial`, the latter scoped to distributable positions `SP`/`PN`/`AC`) and writes them back into Formik with a `>0.0001` dirty-diff guard and an `activeValueChangeFieldRef` "don't fight the user's typing" workaround — both symptoms of deriving displayed values from the same state they're written back into.

## 2. Goals

1. A new items/price **configuration model** that covers all current item rules in one place instead of three.
2. The **backend as source of truth** for price validation — nothing rendered to the user that isn't already backend-confirmed.
3. Concrete, typed **API calls** for every price change, at a sensible granularity.
4. A rethought **`summary`/`summaryMaterial`** approach.
5. Diagnostics items **out of (or much lighter inside) Formik**, to cut refs and re-renders.
6. A simplified, unified, well-tested (**>80% coverage per changed file**) implementation shared between Job and Claim.

## 3. Guiding principles

1. **Reuse the math, change the authority.** `priceCalculator.ts` is well-tested pure arithmetic — it becomes the **client preview engine**, not the source of truth. Nothing in it needs to be deleted; `PriceInputs`/`PriceResults`/`FieldName` become the shape of the *optimistic* layer only, and the same types are reused directly in the new backend contracts (see §5) so there is no parallel type family to keep in sync.
2. **One config model, three consumers.** Job diagnostics, the read-only Claim diagnostic mirror, and editable Claim spare parts all need the *same* rule engine, parameterized by context (`jobType` / `claimStatus` / permissions), not three divergent hand-rolled tables.
3. **Formik stays for the form shell, not for item rows.** `useDiagnosticsManager.ts`'s 17 refs / 9 effects exist largely *because* rows are Formik-backed (dynamic `diagnosticsSpareParts#N` Area/Field cloning, `formValuesRef`, reinit dance). Moving rows to dedicated state removes the reason for most of that machinery.
4. **Backend confirms; client previews.** Every priced field carries a tri-state confidence: `pending` (optimistic, locally computed) → `confirmed` (backend-echoed, authoritative) → `error` (backend rejected). The UI always renders the authoritative value once it exists.

## 4. New item/price configuration model

**Revision note**: the original version of this section proposed one new `ItemRulesConfig` that reinvented `automaticRows`/`allowedPositions`/`discountBase` as a flat, position-global list. Reviewing the *real* `CountryConfig.diagnosticsConfiguration` payloads for TR and ZA (not available when this section was first drafted) showed that was both **inaccurate** and **redundant**:

- **Inaccurate**: `minCount`/`maxCount`/`quantitySource`/`unitPriceSource` are not global per-position constants — they vary per `(actionType, jobType)` rule. `PN` never appears under `REPAIR` rules, only `NEW_TOOL_EXCHANGE`; `SP`/`FR` only appear under `SPARE_PARTS_EXCHANGE`; `AC` only under `ACCESSORIES_EXCHANGE`. A flat global list silently allowed positions the real config forbids for a given action/job type. `quantitySource`/`unitPriceSource` enum values are also real strings observed in the data (`FAULT_CODES`, `DEFAULT`, `SPO`, `SAP`, `ASC`, or `null`) — not the placeholder `MANUAL`/`SYSTEM` originally guessed.
- **Redundant**: this rule data (`automaticRows`, `allowedPositions`, `discountBase`, `addSpecialMaterialsAllowed`, `enforceSparepartExists`) **already exists** as `CountryConfig.diagnosticsConfiguration`, served today by `GET /v1/countries/{countryCode}/country-configuration`. Proposing a whole new `GET /v1/countries/{cc}/item-rules` endpoint to re-serve the same data would be pure duplication.

**Revised recommendation: split into two configs, not one.**

- **A. Reuse `CountryConfig.diagnosticsConfiguration`/`DiagnosticsRuleEntry[]` as-is** (`api/services/countryConfiguration/countryConfiguration.ts`) for all rule-scoped data. No new backend endpoint needed — this data already exists. (`countryConfiguration.ts`'s `DiagnosticsRule` type was missing `enforceSparepartExists`, and `Quantity`/`AllowedPosition` incorrectly declared `quantitySource`/`defaultQuantity`/`unitPriceSource` as non-nullable when real payloads send `null` for many rows — both fixed as part of this session's corrections.)
- **B. A new, much smaller `ItemPolicyConfig`** — only the FE-policy overlay that has **no** backend representation today: per-position permissions, the protected-position flag, editability-by-context rules, warranty gating, and per-surface (job/claim) overrides. `UIConfiguration` is left doing what it already does well (generic field layout/visibility/labels) and gets no new item-specific semantics either.

### 4.1 Shape

```ts
// A — unchanged, already exists in countryConfiguration.ts:
//   DiagnosticsConfiguration { addSpecialMaterialsAllowed, discountBase, rules: DiagnosticsRuleEntry[] }
//   DiagnosticsRuleEntry { actionType, jobType, rule: DiagnosticsRule }
//   DiagnosticsRule { automaticRows: string[], allowedPositions: AllowedPosition[], enforceSparepartExists: boolean }
//   AllowedPosition { position, minCount, maxCount, quantity: { quantitySource: string|null, defaultQuantity: number|null }, unitPriceSource: string|null }

// B — new:
export interface PositionPermissions {
  canView: string;                // permission key, e.g. PERMISSIONS.DIAGNOSTICS.CAN_VIEW_LABOUR_ITEMS
  canDelete: string;
  canEditUnits: string;
  canEditUnitPrice: string;
  canEditDiscount: string;
  canEditTotal: string;
}

export interface PositionPolicy {
  position: string;                 // "LA" | "FR" | "PN" | "SP" | "PC"? | "AC" ...
  isProtected: boolean;             // replaces the hardcoded PROTECTED_POSITIONS Set
  permissions: PositionPermissions;
}

export interface EditabilityRule {
  contextType: "jobType" | "claimStatus";
  contextValue: string;             // "COMMERCIAL_GOODWILL" | "CHARGEABLE" | "REVISED" | "PENDING" ...
  appliesToProtectedPositionsOnly: boolean;
  fields: { discount: boolean; totalAmount: boolean; netAmount: boolean };
  controlledBySummary: boolean;     // replaces isSummaryControlledRow
}

export interface WarrantyGatingRule {
  gatedTypes: string[];
  disableTypeOptionsWhenInvalidSparePart: boolean;
}

export interface ItemPolicyConfig {
  version: string;
  countryCode: string;
  positions: PositionPolicy[];
  editability: EditabilityRule[];
  warrantyGating: WarrantyGatingRule;
  surfaceOverrides: {
    jobDiagnostics?: Partial<ItemPolicyConfig>;
    claimDiagnosticsReadOnly?: Partial<ItemPolicyConfig>;
    claimSpareParts?: Partial<ItemPolicyConfig>;
  };
}
```

`ItemPolicyConfig` subsumes `POSITION_PERMISSIONS` (`SparePartsRow.tsx`) and `materialPriceEditability.ts`'s `getPriceFieldEditability`/`isSummaryControlledRow`/`isProtectedPosition`. Note: `PC` (one of the three positions the FE currently treats as protected, alongside `LA`/`FR`) was never observed in either TR's or ZA's `diagnosticsConfiguration.rules` — kept in the policy config since it's a real value the permission system already handles, but flagged as unconfirmed against live rule data; worth a direct question to backend/product rather than an assumption.

### 4.2 Fetching/caching

- **A** (rule data): existing `getCountryConfig`/`["countryConfiguration", cc]` — no change to the contract. This session also closed a gap where `getCountryConfig` had no dev-local-mock branch (unlike `getUIConfiguration`); it now loads `data/countryConfigurationTR.json`/`ZA.json` in DEV, sourced from real exported configs.
- **B** (policy overlay): `GET /v1/countries/{countryCode}/item-policy` (renamed from the earlier `item-rules` naming to avoid confusion with A's real rules), React Query key `["itemPolicyConfig", countryCode]`, `staleTime: Infinity`. Hook: `useItemPolicyConfig(countryCode)`.

### 4.3 Pure resolvers replace the scattered functions

```ts
// Over ItemPolicyConfig (B):
export function resolvePositionRule(config: ItemPolicyConfig, position: string): PositionPolicy | null;
export function resolvePositionPermissions(config: ItemPolicyConfig, position: string): PositionPermissions | null;
export function isPositionProtected(config: ItemPolicyConfig, position: string): boolean;
export function resolveEditability(config: ItemPolicyConfig, args: { position: string; context: "jobType" | "claimStatus"; contextValue: string }): PriceFieldEditability;
export function isSummaryControlledRow(config: ItemPolicyConfig, args: {...}): boolean;
export function selectConfigForSurface(config: ItemPolicyConfig, surface?: ItemSurface): ItemPolicyConfig;

// Over DiagnosticsRuleEntry[] (A, already-existing data — no new fetch):
export function resolveAutomaticRows(rules: DiagnosticsRuleEntry[], actionType: string, jobType: string): string[];
export function resolveAllowedPositions(rules: DiagnosticsRuleEntry[], actionType: string, jobType: string): AllowedPosition[];
export function resolveEnforceSparepartExists(rules: DiagnosticsRuleEntry[], actionType: string, jobType: string): boolean;
```

Job's `SparePartsRow`, Claim's `ClaimSparePartsRow`, and the read-only `diagnosticData` mirror in `ClaimOverview` all call the **same** resolvers with a different `context`/`contextValue`/`surfaceOverrides` slice (policy) and the same `actionType`/`jobType` lookup (rules) — this is what enables the §7 unification (shared row component, pluggable policy).

## 5. Backend-as-source-of-truth API design

Full request/response contracts live in the companion document, `items-and-prices-backend-api-spec.md`. Summary of the design decisions:

- **Granularity: debounced batch of changed rows** (500ms, coalesced by stable client-generated `rowId`), not per-field (too chatty — 9 fields recompute per row per edit) and not whole-diagnostic-per-edit (today's `postValidateAndSave` problem: it always sends the entire diagnostic).
- **New endpoint** `POST /v1/diagnostic/{jobId}/prices/validate` — request/response reuse `priceCalculator.ts`'s existing `PriceInputs`/`PriceResults`/`FieldName` types directly. The FE renders response rows **directly** — no more `resyncMaterialsFromAPI` → `calculatePrices` re-derivation after a successful call.
- **Formalize** `putClaimPrices` with real `PutClaimPricesRequest`/`PutClaimPricesResponse` types (the low-risk slice of this proposal already shipped — see §9).
- **Tri-state confidence**: `status: "pending" | "confirmed" | "error"` per row (and per summary), with a client-generated `requestId` for race-discarding superseded responses — replacing today's ad hoc `isDistributingRef`/`isResyncingRef`/`activeValueChangeFieldRef` guards with one mechanism.
- **Error convention**: keep the existing in-body `errorMessages` (always-HTTP-200) convention rather than introducing 422s. It is proven in this codebase (`ValidateAndSaveResponse.errorMessages`) and the axios client has no structured-validation-error handling today (only 401/403 are special-cased). Type it properly and attach `rowId`/`field` where possible instead of inventing a second error channel.
- **Evolution of existing endpoints**: `postDiagnostic` (silent save) stops carrying client-computed `priceSummary` once the new endpoint is authoritative. `postValidateAndSave`'s consumer stops re-deriving via `calculatePrices` and trusts its response directly, once BE guarantees the invariant described in API-4 of the companion spec — both endpoints converge on the same `RowPriceResult`/`Price` contract as the new endpoint.

## 6. `summary` / `summaryMaterial` approach

**Recommendation: move both to backend-computed** (`PriceValidateResponse.summary` / `.summaryMaterial`), and delete `aggregateRowPrices` from the runtime path — keep it in `priceCalculator.ts` only as the *optimistic preview* aggregate, computed client-side over `pending`-status rows while waiting on BE confirmation, using the same "confirmed wins" rule as row prices.

This generalizes a pattern the codebase **already proves out today**: `ClaimSummaryArea` is a thin bridge adapter — it maps `ClaimContext` fields into a `DiagnosticsContextValue`-shaped object and renders the job side's `SummaryArea` inside a fresh `DiagnosticsContext.Provider`. Under the new design, both Job's context and Claim's bridge adapter expose the same two fields — `summary: PriceResults & { type }` and `summaryMaterial: PriceResults & { type; positions }` — sourced from the BE response. `ClaimSummaryArea`'s adapter role shrinks to "map claim-specific fields into the shared shape," exactly what it already does, just with less to bridge.

Net effect: `SummaryArea.tsx` stops doing `useMemo`-driven `aggregateRowPrices` + dirty-diff `setFieldValue` writes; it becomes a pure presentational component reading `summary`/`summaryMaterial` off the item-row store (§7), with a preview fallback only while `status === "pending"`. The `>0.0001` diff-guard and `activeValueChangeFieldRef` workaround disappear — there is nothing left to "fight" once summary is confirmed-data-driven instead of derived-and-written-back into Formik on every render pass.

Editing the summary discount/total directly (`onSummaryDiscountChange` et al., currently backed by `distributeGrossToRows`/`distributeNetToRows`) becomes a **request**, not client math: a special `summary` pseudo-row sent to `/prices/validate`, whose response carries the redistributed per-row values in `rows[]`. The existing distribution functions remain in `priceCalculator.ts` only for the optimistic preview of that redistribution while the request is in flight.

## 7. Formik isolation strategy

### 7.1 Recommendation: dedicated reducer-based row store, bridging into Formik only at submit time

```ts
interface ItemsState {
  rows: Record<string /* rowId */, MaterialItem & RowPriceState>;
  archivedRows: Record<string, MaterialItem & RowPriceState>;
  summary: (PriceResults & { type: string }) | null;
  summaryMaterial: (PriceResults & { type: string; positions: string[] }) | null;
  order: string[];
}

interface RowPriceState {
  status: "pending" | "confirmed" | "error";
  optimistic: PriceResults;        // instant, via existing calculatePrices()
  confirmed?: PriceResults;        // last BE-confirmed values; rendered once present
  requestId?: string;
  errorMessage?: string;
}

type ItemsAction =
  | { type: "ADD_ROW"; row: MaterialItem }
  | { type: "ADD_MATERIALS"; rows: MaterialItem[] }
  | { type: "DELETE_ROW"; rowId: string }
  | { type: "RESTORE_ROW"; rowId: string }
  | { type: "EDIT_FIELD"; rowId: string; field: FieldName; value: number }
  | { type: "OPTIMISTIC_UPDATE"; rowId: string; prices: PriceResults }
  | { type: "CONFIRM_ROWS"; requestId: string; response: PriceValidateResponse }
  | { type: "REJECT_ROWS"; requestId: string; errors: RowPriceResult[] };
```

Paired with a React Query `useMutation` for `/prices/validate` (or `putClaimPrices`), debounced via the same 300–500ms pattern already proven in `useSparePartPriceCalculation.ts`. **Rows are keyed by stable client-generated `rowId`s (UUIDs), not by Formik field-name ordinals** — this is what eliminates the need for dynamic `diagnosticsSpareParts#N` Area/Field cloning entirely, since row identity no longer depends on Formik's field-naming scheme.

Rendering rule: show `confirmed ?? optimistic`, with a subtle pending affordance while `status === "pending"`, and an inline error state on `"error"` that reverts the row to its last `confirmed` value (never leaves a value on screen the BE rejected). Race handling: each debounced batch call carries a `requestId`; a response whose `requestId` isn't the latest one issued for that row is discarded.

### 7.2 What stays in Formik vs what moves out

- **Stays in Formik**: everything driven by `UIConfiguration` Section→Area→Field metadata that isn't an item row — header fields, notes, documents, accessories, etc. `GenericForm`/`GenericSection`/`GenericArea`/`GenericField` are unchanged.
- **Moves to the item store**: all `MaterialItem` row state, archived rows, summary/summaryMaterial, and the pending/confirmed/error status machinery. `SparePartsArea`/`SparePartsRow`/`ArchivedSparePartsRow`/`SummaryArea` (job) and the claim equivalents read/write through the store's context instead of `useFormikContext`/`DiagnosticsContext`/`ClaimContext`.
- **Bridge at submit-time**: a single, testable `serializeItemsForSubmit(state: ItemsState): MaterialSubmitPayload` replaces the ad hoc `formValuesRef`/`setInitialFormValues` reinit dance in `useDiagnosticsManager.ts` and the hand-rolled payload builder in `ClaimOverview.tsx`'s `onValidateClaim`.

### 7.3 Why not React 19 `useOptimistic`/`useActionState` as the primary mechanism

Considered and rejected as the primary state owner: `useOptimistic` is scoped to a single async transition tied to one component's render, and this system needs cross-row batching, debouncing, and race-discarding by `requestId` — a reducer + mutation combo gives explicit control over exactly those three things. `useOptimistic` can still be used *locally* inside a single row component as an ergonomic wrapper around dispatching `OPTIMISTIC_UPDATE`/`CONFIRM_ROWS` during implementation, but the reducer/store stays the state-of-record.

### 7.4 Expected effect

`useDiagnosticsManager.ts` (1647 lines, 17 refs, 9 effects) shrinks substantially: row add/delete/restore become plain reducer actions (no Formik field cloning, no `formValuesRef` sync effect, no `isDistributingRef`/`isResyncingRef` guard refs — replaced by `requestId` comparison in the reducer). Remaining complexity is debounce/mutation wiring, not Formik reconciliation.

## 8. Unification plan for Job + Claim

- **Shared hook + context**: replace `DiagnosticsContextValue`/`ClaimContextValue` (currently ~90% overlapping field sets) with one `useItemsContext(config: ItemsSurfaceConfig)`, where job/claim-specific behavior (goodwill flyout, warranty gating, `canArchiveOnDelete`, whole-claim decisioning) is expressed as config flags/callbacks, not separate context shapes.
- **Shared row component**: one `ItemRow` replaces `SparePartsRow.tsx` + `ClaimSparePartsRow`, with editability resolved via `resolveEditability` (§4.3) instead of the row hardcoding `POSITION_PERMISSIONS` or the claim-only `isNewRow && !isClaimPending` rule — that rule becomes one `EditabilityRule` entry in `surfaceOverrides.claimSpareParts`. The existing presentational split (`SparePartsRow.shared.ts`'s `useSparePartsRowCommon`, `SparePartsRow.components.tsx`'s `SparePartsMainFields`/`SparePartsCollapsedSection`) survives underneath.
- **Unify archived-row rendering**: `ClaimArchivedSparePartsArea` currently inlines its own near-duplicate row instead of reusing job's `ArchivedSparePartsRow`. Extract `ArchivedSparePartsRow` to a shared location (or fold it into `ItemRow` in a read-only/archived mode) and have both areas consume it.
- **Replace claim's hand-rolled payload builder**: once rows are out of Formik, `onValidateClaim`'s manual `materials[]`/`claimPriceSummary` construction is replaced by the shared `serializeItemsForSubmit` feeding into `putClaimPrices`'s typed request — the same function the job side uses for `/prices/validate` requests.

## 9. Testing strategy (>80% per changed file)

Reuse the two patterns already strong in this codebase:

- **Pure-function tests** for anything with no I/O — `itemRulesResolver.ts`, `serializeItemsForSubmit`, the items reducer, and the unchanged parts of `priceCalculator.ts` — mirroring `priceCalculator.test.ts`'s table-driven style (per `FieldName`/mode combination).
- **`vi.mock`-based hook/component tests** for the new BE-call hooks — mock `axiosClient`/the action functions exactly as `jobs/hooks.test.ts` and `claims/hooks.test.ts` already do; assert debounce timing, `requestId` race-discarding, and optimistic→confirmed→error transitions using `renderHook`/`act`/`waitFor` (the existing convention, e.g. `useSparePartPriceCalculation`'s test suite).
- **New coverage specifically required**: `itemRulesResolver.test.ts` (every rule/branch, including `surfaceOverrides` merging), the item store's reducer tests (stale-`requestId` discard, archive/restore), a single parameterized `ItemRow.test.tsx` covering job/claim/read-only surfaces from one file (rather than the current two near-duplicate 1800+/700-line suites), and a rewritten `SummaryArea.test.tsx` asserting BE-confirmed rendering with preview fallback only while pending (the dirty-diff/`activeValueChangeFieldRef` guard tests become dead code and can be deleted).

## 10. Phasing / migration plan

| Phase | Scope | Risk | Effort | Buildable without a real backend? |
|---|---|---|---|---|
| **1** | Type `putClaimPrices` contract + reconcile `Price` shape drift | Low | Small | Yes — pure typing, existing endpoint |
| **2** | `ItemRulesConfig` + resolver, wired into existing components, Formik untouched | Low-Medium | Medium | Mostly — resolver fully testable; config can be served from a local dev fixture (see §11) until BE ships it |
| **3** | New `/prices/validate` endpoint behind a feature flag; stop client re-derivation once trusted | Medium-High | Large | FE work yes (against a local simulator, §11); authoritative production behavior needs the real endpoint |
| **4** | Extract item rows out of Formik into the reducer/store | High (touches `useDiagnosticsManager.ts`) | Large | Yes, in parallel with Phase 3, against the agreed contract |
| **5** | Unify Job/Claim shared hook + context + row + archived-row | Medium | Large | Yes — FE-only structural consolidation |
| **6** | Cleanup/dead-code removal, drop feature flag | Low | Small-Medium | Yes, final pass |

Phases 1–2 are pure typing/config additions with no behavior change — safe to ship independently. Phase 3 is the one genuinely blocked on production backend availability; Phases 4–5 can proceed in parallel against the agreed, locally-simulated contract so the team isn't idle waiting on BE. Phase 3's feature flag lets its FE work ship dark before the real endpoint exists, then flip on once BE is ready.

## 11. Local BE-mocking strategy

The repo already has a proven pattern for developing FE features ahead of real backend endpoints: `getUIConfiguration` (`src/api/services/uiConfiguration/action.ts`) loads `data/dataTR.json`/`data/dataZA.json` via `import.meta.glob` when `import.meta.env.DEV`, and only calls the real API otherwise. This proposal replicates that pattern for the new endpoints:

- **Item Rules Config** (API-1) — `data/itemRulesTR.json`/`data/itemRulesZA.json` local fixtures + `getItemRulesConfig(countryCode)` following the identical dev-local/prod-API branch.
- **Price validation** (API-2/API-3) — a `priceEngineSimulator.ts` module that wraps the existing, already-tested `calculatePrices`/`aggregateRowPrices` to produce responses shaped like the new BE contracts, used as the dev-mode backing for `/prices/validate` and the proposed upgraded `putClaimPrices` response.

This means Phases 2–5 can be built and demoed entirely on the frontend, independent of backend delivery timing, and swapped to the real endpoints with no FE code change once BE ships them (same as how `getUIConfiguration` behaves today).

## 12. Shipped now

This session implements, with no behavior change and no dependency on new backend work:

- The shared `Price` type (`src/types/price.types.ts`) reconciling the job/claim field drift, reused by `JobList.types.ts` and `Claims.types.ts`.
- A fully typed `putClaimPrices` contract (`src/api/services/claims/claims.types.ts`, `PutClaimPricesRequest`/`PutClaimPricesResponse`), replacing the untyped `Record<string, unknown>` on both request and response.
- The local BE-mocking infrastructure from §11: `data/itemPolicyTR.json`/`itemPolicyZA.json` + `src/api/services/itemPolicy/*` (renamed from `itemRules` once it became clear the module only covers the FE-policy overlay, not real rule data) and `src/utils/itemRulesResolver.ts` — built and tested but **not yet wired into any existing component** — ready for Phase 2/3 to adopt.
- Corrections made after reviewing real TR/ZA `country-configuration` exports (see §4's revision note): fixed `DiagnosticsRule`/`Quantity`/`AllowedPosition` types in `countryConfiguration.ts` (`enforceSparepartExists` was missing entirely; `quantitySource`/`defaultQuantity`/`unitPriceSource` were incorrectly typed as non-nullable), added a dev-local-mock branch to `getCountryConfig` (previously always hit the real API even in DEV, unlike `getUIConfiguration`) backed by `data/countryConfigurationTR.json`/`ZA.json` (the real exported configs), and split the originally-proposed single `ItemRulesConfig` into the leaner `ItemPolicyConfig` described in §4 to avoid duplicating backend data.

Everything else in this document (Phases 2–6) is a proposal for the team to review and schedule; see the companion `items-and-prices-backend-api-spec.md` for the backend-ticket-ready contract details.
