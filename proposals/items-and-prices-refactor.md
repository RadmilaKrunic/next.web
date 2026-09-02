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
5. Cut the refs/effects/re-renders around diagnostics items — by replacing *incremental* Formik row reconciliation with full derivation from `materials` on every change, not by pulling items out of Formik (see §7's revision).
6. A simplified, unified, well-tested (**>80% coverage per changed file**) implementation shared between Job and Claim.

## 3. Guiding principles

1. **Reuse the math, change the authority.** `priceCalculator.ts` is well-tested pure arithmetic — it becomes the **client preview engine**, not the source of truth. Nothing in it needs to be deleted; `PriceInputs`/`PriceResults`/`FieldName` become the shape of the *optimistic* layer only, and the same types are reused directly in the new backend contracts (see §5) so there is no parallel type family to keep in sync.
2. **One config model, three consumers.** Job diagnostics, the read-only Claim diagnostic mirror, and editable Claim spare parts all need the *same* rule engine, parameterized by context (`jobType` / `claimStatus` / permissions), not three divergent hand-rolled tables.
3. **Formik stays for item rows too — fix the reconciliation strategy, not row ownership.** `useDiagnosticsManager.ts`'s 17 refs / 9 effects exist largely because Effect 3 reconciles rows *incrementally* (clone N missing Areas, trim excess ones) and leaves the kept areas untouched, forcing every delete to separately shift every subsequent row's names/values by hand. Replacing that with a full recomputation from `materials` on every change (§7) — field names stay index-based, `GenericField`/`mapValuesToAPI` untouched — removes the reason for most of that machinery.
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
  isEditable: boolean;              // which of totalAmount/netAmount is exposed is derived
                                     // from discountBase at resolve time, not stored here
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

- **One response shape for validate and validate-and-save, diagnostic and claim alike; a lean request for validate** (revised twice — see the companion spec's "API-2/API-3/API-4" section for the full rationale). `POST /v1/jobs/flow/validate-and-save` (API-4) keeps sending/receiving the full `DiagnosticPricingPayload` — it's a full persist. `POST /v1/diagnostic/{jobId}/prices/validate` (API-2) fires once per field edit (500ms debounce), so its request only carries the rows dirty since the last save (`changedRows: ChangedMaterialRow[]`, usually one entry) — the backend merges those onto its last-saved baseline before recomputing (see "Backend merge semantics" in the companion spec). Both endpoints' **responses** are the identical `DiagnosticPricingResult` shape — one frontend rendering path regardless of which call produced it. This was a direct response to the fact that validate and validate-and-save operate on the same Formik fields through the same `attributeMapping`-based mapping — maintaining two different row representations for the same edit was unjustified duplication, and resending untouched rows on every keystroke was unjustified bandwidth.
- **Claim pricing aligns onto the same shape**: `PUT /v1/claims/{claimId}/prices` (API-3) reuses the identical `MaterialRow[]`/`PriceSummary` types for the claim's own materials, plus the existing verbatim `jobDiagnostic` pass-through (already shaped like `DiagnosticPricingPayload` today) and a small claim-only envelope. This retires the claim-specific field names that drifted from the job side (`materials[].jobType` → `type`, `claimPriceSummary` → `priceSummary`).
- **Tri-state confidence**: `changeStatus: "pending" | "confirmed" | "error"` per row (and per summary) — named `changeStatus`, not `status`, since `status` on a material row is already its real approval status ("APPROVED"/"PENDING"/etc.) — with a client-generated `requestId` for race-discarding superseded responses, replacing today's ad hoc `isDistributingRef`/`isResyncingRef`/`activeValueChangeFieldRef` guards with one mechanism.
- **Error convention**: keep the existing in-body `errorMessages` (always-HTTP-200) convention rather than introducing 422s. It is proven in this codebase (`ValidateAndSaveResponse.errorMessages`) and the axios client has no structured-validation-error handling today (only 401/403 are special-cased). Type it properly and attach `rowId`/`field` where possible instead of inventing a second error channel.
- **Evolution of existing endpoints**: `postDiagnostic` (silent save) stops carrying client-computed `priceSummary` once the new endpoint is authoritative. `postValidateAndSave`'s consumer stops re-deriving via `calculatePrices` and trusts its response directly, once BE guarantees the invariant described in API-4 of the companion spec — all three endpoints now converge on the same `MaterialRow`/`Price`/`DiagnosticPricingPayload` contract described there, rather than each having its own shape.

## 6. `summary` / `summaryMaterial` approach

**Recommendation: move both to backend-computed** (`DiagnosticPricingPayload.priceSummary` / `.priceSummaryMaterial` — see the companion spec's shared-types section), and delete `aggregateRowPrices` from the runtime path — keep it in `priceCalculator.ts` only as the *optimistic preview* aggregate, computed client-side over `pending`-status rows while waiting on BE confirmation, using the same "confirmed wins" rule as row prices.

This generalizes a pattern the codebase **already proves out today**: `ClaimSummaryArea` is a thin bridge adapter — it maps `ClaimContext` fields into a `DiagnosticsContextValue`-shaped object and renders the job side's `SummaryArea` inside a fresh `DiagnosticsContext.Provider`. Under the new design, both Job's context and Claim's bridge adapter expose the same two fields — `priceSummary: PriceSummary` and `priceSummaryMaterial: PriceSummary` — sourced from the BE response, using the exact same `PriceSummary` type on both surfaces (not a job-shaped and a claim-shaped variant). `ClaimSummaryArea`'s adapter role shrinks to "map claim-specific fields into the shared shape," exactly what it already does, just with less to bridge.

Net effect: `SummaryArea.tsx` stops doing `useMemo`-driven `aggregateRowPrices` + dirty-diff `setFieldValue` writes; it becomes a pure presentational component reading `summary`/`summaryMaterial` off the item-row store (§7), with a preview fallback only while `changeStatus === "pending"`. The `>0.0001` diff-guard and `activeValueChangeFieldRef` workaround disappear — there is nothing left to "fight" once summary is confirmed-data-driven instead of derived-and-written-back into Formik on every render pass.

Editing the summary discount/total directly (`onSummaryDiscountChange` et al., currently backed by `distributeGrossToRows`/`distributeNetToRows`) becomes a **request**, not client math: named via `changedSummary: { target: "priceSummaryMaterial", field: "discount", summary }` (see the companion spec's "Leaning out validate's request"), carrying the frontend's optimistic redistribution — the response's `diagnostic.materials[]`/`priceSummaryMaterial` then carries the backend-authoritative redistribution across the full row set. The existing distribution functions remain in `priceCalculator.ts` only for that optimistic preview while the request is in flight.

## 7. Row rendering strategy

**Revision note**: §7 originally recommended extracting item rows entirely out of Formik into a dedicated reducer/store (kept below as §7.5, rejected). Reconsidered after tracing the actual current rendering path: the real complexity in `useDiagnosticsManager.ts` isn't that Formik owns the field values — it's that Effect 3 reconciles row **count** and per-row **field names** *incrementally* (clone N missing Areas, or trim excess ones — `needed = materials.length - currentAreaCount`), which forces every delete to separately, manually shift every subsequent row's names/values (`shiftSparePartsArea`/`shiftSparePartsKey`/`reindexSparePartsValues` in `onDeleteRow`) rather than trusting Effect 3 to just recompute everything. That's the direct cause of the `areaIndex === 1` special-casing this session already had to work around a bug in (§14).

**Revision note 2**: the first pass of this section proposed naming Formik fields by a stable `rowId` instead of array index (`diagnosticsSpareParts#{rowId}_...`), to remove value-reindexing on delete entirely. That conflicts with `mapValuesToAPI`/`extractIndexFromName` (`src/components/generics/utils.ts`) — the **generic**, app-wide value→API serializer every UIConfiguration-driven multiple-area form depends on, not just spare parts. It parses a **numeric** index out of that same `#N` slot (`current[key][index] = {...}`) to build the API's `materials[]` array; a non-numeric `rowId` there either fails to match (every row collapses into `materials[0]`, silently overwriting each other) or partially matches into a garbage index. Decoupling that would mean bypassing `mapValuesToAPI` for spare-parts rows with a dedicated serializer — real additional scope, weighed against reduced value: **decided to keep field names index-based** (`mapValuesToAPI` untouched) and scope this section to removing the *imperative, incremental* reconciliation instead. Formik values still need re-keying when a row's position in the array changes (unavoidable with index-based names), but that becomes one clean full-recompute step instead of four things touched by hand per delete.

### 7.1 What actually happens today (traced, not assumed)

- There is no `.map()` over materials anywhere. `GenericSection.tsx` sorts `section.areas` and maps each `Area` to a `<GenericArea>`; `CustomAreasMapper.tsx` routes any area named `diagnosticsSpareParts#N...` to `<SparePartsArea>`, which renders exactly **one** `<SparePartsRow>` using `area.fields`. Row count = number of distinct `Area` objects that exist in `tabs`, not a property of `materials` itself.
- `useDiagnosticsManager.ts`'s Effect 3 (~`useDiagnosticsManager.ts:1074-1180`) is the reconciler: on every `materials` change, it computes `needed = materials.length - currentAreaCount` and **incrementally** clones (`structuredClone(templateArea)` + `setDuplicatedArea`) or trims trailing Areas/Fields to match — it never touches the areas that already existed and stay in range. `materials: MaterialItem[]` (React state) and the Formik Area/Field list are two parallel structures kept in lockstep by hand, not one derived from the other.
- Because Effect 3 only appends/trims and never re-derives the *kept* areas, `onDeleteRow` has to pre-shift everything itself before `materials` even updates, in one call: remove the deleted Area, call `shiftSparePartsArea`/`shiftSparePartsKey` (regex-based) to rename every higher-index Area/Field down by one, reindex raw Formik values (`reindexSparePartsValues`), reindex `formValuesRef.current` directly, *and* reindex `materials` — five things touched together to delete one row, so that by the time Effect 3 sees the new `materials`, the areas already match.
- `SparePartsRow.tsx` parses its own `areaIndex` out of `fields[0].fieldMapping.nameStartsWith` via a `#(\d+)_` regex, then uses that parsed index for every `setMaterials((prev) => prev.map((m, i) => i === areaIndex ? {...} : m))` call — the row writing back into `materials` by position is the other half of the manual lockstep.

### 7.2 The fix: full derivation instead of incremental patching

Field names stay index-based (`diagnosticsSpareParts#{index}_{key}`, `mapValuesToAPI` untouched). What changes is *how* Effect 3 gets there: instead of diffing "how many areas do I need to add or remove," it recomputes the **entire** spare-parts area/field/value set from `materials` on every change — conceptually `materials.map((material, index) => deriveRowArea(templateArea, index))` — and replaces the derived slice of `tabs`/`allFields`/`initialValues` wholesale, the same way `React.useMemo` derives a value from its inputs rather than patching a previous one.

- **`GenericField.tsx`, `mapValuesToAPI`, and the UIConfiguration field template are untouched.** Field names, `fieldMapping`, and API serialization work exactly as they do today — this is a reconciliation-strategy change, not a naming or Formik-ownership change.
- **`onDeleteRow`/`onRestoreRow`/`onAddRow` stop doing their own shifting.** They only need to update `materials` correctly (filter out the deleted item, push the restored/new one) and signal a full rebuild; the simplified Effect 3 re-derives every row's Area/Field/value set fresh from whatever `materials` now looks like. `shiftSparePartsArea`, `shiftSparePartsKey`, and `reindexSparePartsValues` are deleted outright — nothing calls them once Effect 3 always recomputes from scratch instead of trusting stale kept-area state.
- **Values for a row that "moved" (e.g. row 2 becomes row 1 after row 0 is deleted) are naturally correct**, because `buildMaterialsRowValues`/`buildRowValues` (unchanged, already keyed by `materials[idx]` against `areas[idx]`) get called for the *new* index-0..N-1 range every time, not just for the delta.
- The `areaIndex === 1`-specific `isResyncingRef` special-casing (§14) becomes unnecessary for the same reason it was needed: it existed to protect sibling rows from a second row's *incremental* addition tripping dirty-tracking mid-reconciliation. A full-recompute-per-change model doesn't have a distinct "incremental add" moment to guard against — every materials change looks the same to Effect 3, whether it's the first row or the fifth.

### 7.3 What this eliminates from `useDiagnosticsManager.ts`

- `shiftSparePartsArea`, `shiftSparePartsKey`, `reindexSparePartsValues`, and the `needed > 0`/`needed < 0` branching in Effect 3. (Effect 3b, which reconciles *archived* materials, never had this incremental-reindexing problem to begin with — archived-row removal is always a single targeted removal via `onRestoreRow`, with no dense-numeric-suffix dependency — so it's left as-is, not touched by this change.)
- `onDeleteRow`'s five-things-at-once manual pre-shift (area removal, field renaming, raw `formValuesRef` mutation, value reindexing, materials reindexing) — collapses to "remove from `materials`, let Effect 3 recompute."
- The `areaIndex === 1`/`isResyncingRef` special-casing from §14's bug fix.

**What does *not* change**: field naming scheme, `mapValuesToAPI`, `GenericField.tsx`, the UIConfiguration field template, `SparePartsRow.tsx`'s `areaIndex` parsing (still needed — field names are still index-based), Formik as the field-value store, permission gating, price calculation. This is narrower than the original §7.2 draft: it kills the *imperative incremental reconciliation*, not the index-based naming itself — a real simplification, but not the full "no reindexing at all" outcome a `rowId`-keyed design would have given, traded off against not touching the shared `mapValuesToAPI` engine (see Revision note 2).

### 7.4 Open items to resolve before implementation

1. **Source of `materials` at render time**: unchanged from before — today it's `DiagnosticsContext.materials` (client `MaterialItem[]` state, built from the API response at load, mutated locally on edits). Once the backend `/prices/validate`/validate-and-save alignment ships (companion spec), `materials` itself could be sourced from `DiagnosticPricingResult.diagnostic.materials` — orthogonal to this section's change, which only touches how Effect 3 turns whatever `materials` currently is into Formik state.
2. **How much of Effect 3's "reuse existing values when nothing changed" optimization (`shouldReuseExistingRowValues`) survives.** Full recomputation must still avoid clobbering a row's in-flight, not-yet-synced-to-`materials` edits with stale `materials` data on every unrelated materials change (e.g. a sibling row being added) — `shouldReuseExistingRowValues`'s live-value-reuse logic stays, just applied per full recompute rather than per incremental patch.
3. **`GenericFormContext.allFields`** stays state-backed (used by many non-spare-parts consumers too) — Effect 3 still calls `setAllFields`, just with a wholesale-replaced spare-parts slice instead of an appended/trimmed one.

### 7.5 Rejected alternative: dedicated reducer-based row store (original §7 recommendation)

The original recommendation was to move row state fully out of Formik into a `useReducer`-backed store (`ItemsState`/`ItemsAction` below), with `GenericField` replaced by a new store-aware row component. Rejected in favor of §7.2: it solves the same problem (row-identity/reindexing pain) but at much higher cost — it would touch `GenericField.tsx`, which every non-item field in the app also depends on, for a fix that `materials.map()` + stable-id keying achieves without touching Formik or `GenericField` at all. Kept here for reference in case a future phase (full Formik removal for item rows, not just fixing row identity) revisits it.

```ts
interface ItemsState {
  rows: Record<string /* rowId */, MaterialItem & RowPriceState>;
  archivedRows: Record<string, MaterialItem & RowPriceState>;
  priceSummary: PriceSummary | null;
  priceSummaryMaterial: PriceSummary | null;
  order: string[];
}

interface RowPriceState {
  changeStatus: "pending" | "confirmed" | "error";
  optimistic: PriceResults;
  confirmed?: Price;
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
  | { type: "CONFIRM_ROWS"; requestId: string; response: DiagnosticPricingResult }
  | { type: "REJECT_ROWS"; requestId: string; errors: (MaterialRow & { changeStatus: "error"; errorMessage?: string })[] };
```

## 8. Unification plan for Job + Claim

- **Shared hook + context**: replace `DiagnosticsContextValue`/`ClaimContextValue` (currently ~90% overlapping field sets) with one `useItemsContext(config: ItemsSurfaceConfig)`, where job/claim-specific behavior (goodwill flyout, warranty gating, `canArchiveOnDelete`, whole-claim decisioning) is expressed as config flags/callbacks, not separate context shapes.
- **Shared row component**: one `ItemRow` replaces `SparePartsRow.tsx` + `ClaimSparePartsRow`, still Formik/`GenericField`-backed and still reading its index the way `SparePartsRow.tsx` does today (§7.2 keeps field naming index-based). Editability resolved via `resolveEditability` (§4.3) instead of the row hardcoding `POSITION_PERMISSIONS` or the claim-only `isNewRow && !isClaimPending` rule — that rule becomes one `EditabilityRule` entry in `surfaceOverrides.claimSpareParts`. The existing presentational split (`SparePartsRow.shared.ts`'s `useSparePartsRowCommon`, `SparePartsRow.components.tsx`'s `SparePartsMainFields`/`SparePartsCollapsedSection`) survives underneath.
- **Unify archived-row rendering**: `ClaimArchivedSparePartsArea` currently inlines its own near-duplicate row instead of reusing job's `ArchivedSparePartsRow`. Extract `ArchivedSparePartsRow` to a shared location (or fold it into `ItemRow` in a read-only/archived mode) and have both areas consume it, both fed by the same `materials`/`archivedMaterials` state as today (Effect 3b's own reconciliation is untouched by §7.2, see §7.3).
- **Replace claim's hand-rolled payload builder**: `onValidateClaim`'s manual `materials[]`/`claimPriceSummary` construction is replaced by a shared `serializeItemsForSubmit(materials: MaterialItem[]): MaterialSubmitPayload` feeding into `putClaimPrices`'s typed request — the same function the job side uses for `/prices/validate` requests. This no longer depends on rows being out of Formik (per §7's revision) — it's a pure mapping function over whatever `materials` state already is.

## 9. Testing strategy (>80% per changed file)

Reuse the two patterns already strong in this codebase:

- **Pure-function tests** for anything with no I/O — `itemRulesResolver.ts`, the full-derivation reconciliation function replacing Effect 3's incremental logic (§7.2), `serializeItemsForSubmit`, and the unchanged parts of `priceCalculator.ts` — mirroring `priceCalculator.test.ts`'s table-driven style (per `FieldName`/mode combination).
- **`vi.mock`-based hook/component tests** for the new BE-call hooks — mock `axiosClient`/the action functions exactly as `jobs/hooks.test.ts` and `claims/hooks.test.ts` already do; assert debounce timing and `requestId` race-discarding using `renderHook`/`act`/`waitFor` (the existing convention, e.g. `useSparePartPriceCalculation`'s test suite).
- **New coverage specifically required**: `itemRulesResolver.test.ts` (every rule/branch, including `surfaceOverrides` merging), tests for the new full-recomputation reconciliation logic (delete-then-recompute produces identical output to a fresh mount with the same `materials`, no stale kept-area values), a single parameterized `ItemRow.test.tsx` covering job/claim/read-only surfaces from one file (rather than the current two near-duplicate 1800+/700-line suites), and a rewritten `SummaryArea.test.tsx` asserting BE-confirmed rendering with preview fallback only while pending (the dirty-diff/`activeValueChangeFieldRef` guard tests become dead code and can be deleted once summary moves to backend-computed, §6).

## 10. Phasing / migration plan

| Phase | Scope | Risk | Effort | Buildable without a real backend? |
|---|---|---|---|---|
| **1** | Type `putClaimPrices` contract + reconcile `Price` shape drift | Low | Small | Yes — pure typing, existing endpoint |
| **2** | `ItemPolicyConfig` + resolver, wired into existing components, Formik untouched | Low-Medium | Medium | Mostly — resolver fully testable; config can be served from a local dev fixture (see §11) until BE ships it — **wired for `SparePartsRow.tsx` this session, see §12** |
| **3** | New `/prices/validate` endpoint behind a feature flag; stop client re-derivation once trusted | Medium-High | Large | FE work yes (against a local simulator, §11); authoritative production behavior needs the real endpoint |
| **4** | Replace Effect 3's incremental Area-cloning reconciliation with full recomputation from `materials` on every change; simplify `onDeleteRow` accordingly (§7) | Medium (touches `useDiagnosticsManager.ts`; field naming, `mapValuesToAPI`, `GenericField.tsx` untouched) — lower than the originally-planned store extraction | Medium | **Shipped** |
| **5** | Unify Job/Claim shared hook + context + row + archived-row | Medium | Large | Yes — FE-only structural consolidation — **in progress** |
| **6** | Cleanup/dead-code removal, drop feature flag | Low | Small-Medium | Yes, final pass |

Phases 1–2 are pure typing/config additions with no behavior change — safe to ship independently. Phase 3 is the one genuinely blocked on production backend availability. **Phase 4 no longer depends on Phase 3 at all** (it doesn't touch pricing/validation, only row identity/rendering) — it can be scheduled any time, independently, once §7.4's open items are resolved. Phase 5 can proceed in parallel against the agreed, locally-simulated contract so the team isn't idle waiting on BE. Phase 3's feature flag lets its FE work ship dark before the real endpoint exists, then flip on once BE is ready.

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

**Phase 2 (partial)**: `SparePartsRow.tsx` now consumes `useItemPolicyConfig` (fetched in `JobOverview.tsx`, resolved for the `jobDiagnostics` surface via `selectConfigForSurface`, exposed through `DiagnosticsContext.itemPolicy`) for position permissions and price-field editability, via `resolvePositionPermissions`/`resolveEditability`. This is a **strangler-fig migration**, not a rip-and-replace: every call site prefers the config-driven resolver when `itemPolicy` is loaded and falls back to the pre-existing hardcoded `POSITION_PERMISSIONS`/`materialPriceEditability.ts` logic otherwise — which is the only path exercised today, since the real `GET /v1/countries/{cc}/item-policy` endpoint doesn't exist yet (the query uses `retry: false` and fails silently, leaving `itemPolicy` undefined). This was deliberately scoped to be provably behavior-preserving without being able to run the existing 1800+ line `SparePartsRow.test.tsx` suite in this sandbox (see repo-wide caveat below): `itemPolicy` is an optional field the existing tests' typed context fixtures don't set, so every pre-existing test exercises the unchanged fallback path by construction. New tests were added (not modified) proving the config-driven path activates and takes precedence once `itemPolicy` is supplied. `materialPriceEditability.ts`, `POSITION_PERMISSIONS`, and their own test file are intentionally left in place as that fallback/default — not dead code. `jobTypeDiscountRepopulation.ts`'s own use of position/editability logic was left untouched (out of scope for this pass).

## 13. Phase 2 completion + a feature flag

Following up on §12's partial Phase 2, this session:

- **Added `ENABLE_ITEM_RULES_RESOLVER`** (`src/utils/itemRulesResolver.ts`), a single exported boolean, default `false`. It is the one kill-switch for every resolver-driven code path described in §12/§13 — flipping it to `true` (or wiring it to an env var/remote config later) switches every gated call site from its pre-existing hardcoded/inline logic to the config-driven resolver in one place. `SparePartsRow.tsx`'s `itemPolicy` destructure was retrofitted to `ENABLE_ITEM_RULES_RESOLVER ? rawItemPolicy : undefined`, so the wiring from §12 is now dormant by default (not just implicitly dormant because no BE endpoint exists) until deliberately enabled.
- **Wired `resolveAllowedPositions`/`resolveAutomaticRows` into `useDiagnosticsManager.ts`**, replacing the hook's own inline `matchedRule?.allowedPositions`/`automaticRows` lookup behind the same flag. These resolver functions are a pure extraction of exactly that inline logic (same `actionType`+`jobType` rule match against `CountryConfig.diagnosticsConfiguration.rules`) — no new data source, no behavior change while the flag is off. `resolveEnforceSparepartExists` was **not** wired in: nothing in the codebase currently consumes `enforceSparepartExists` at all, so exposing it would just be a dead value with no caller.
- **Investigated extending the same pattern to `ClaimSparePartsRow.tsx` and found it doesn't fit.** That component's real editability rule is `isNewRow && !isClaimPending` — gated on whether *this specific material row* is newly added, combined with a claim-level pending flag — not a lookup keyed by a context string like `jobType`/`claimStatus` the way `EditabilityRule` models it. There's also no per-position permission table there at all (`canDeleteRows` is a single claim-level boolean, not position-keyed), so `resolvePositionPermissions` has nothing to attach to either. Forcing this component through the existing resolver shape would have meant fabricating `surfaceOverrides.claimSpareParts` entries that don't actually correspond to the component's real logic (the `REVISED`/`PENDING` `claimStatus` entries already sitting in `data/itemPolicyTR.json`/`itemPolicyZA.json` are exactly that kind of mismatch — they don't reflect this component's actual rule and should not be trusted as accurate until the config model gains an `isNewRow`-aware dimension, or this component's rule is deliberately left un-migrated). No code changed here this pass.
- **Found and fixed a real regression from this session's own earlier commit**: `CountryConfig.reimbursementCreateOn` had been retyped `string → number` based on one observed raw JSON payload (`"reimbursementCreateOn": 1`). That broke ~25 existing test fixtures across unrelated ASC/reimbursement modules, and more importantly contradicts how the field is actually consumed in production code (`AddASC.tsx`: `countryConfiguration?.reimbursementCreateOn || "1"`, form field values) — the frontend's real, load-bearing contract for this field is `string`, whatever the one sample payload showed. Reverted to `string`, with a comment explaining why, and fixed the one genuinely-needed `enforceSparepartExists` fixture gap in `useDiagnosticsManager.test.ts` (the only file constructing an actual `DiagnosticsRule`-shaped object literal — everywhere else "automaticRows" turned out to be an unrelated flat `DiagnosticsContextValue`/`ClaimContextValue` field, not this nested shape). This is called out explicitly since it was a mistake in earlier work from this same session, not something inherited.

Everything else in this document (the rest of Phase 2 — job/claim unification, summary/summaryMaterial moving to BE-computed — and Phases 3–6) is a proposal for the team to review and schedule; see the companion `items-and-prices-backend-api-spec.md` for the backend-ticket-ready contract details.

**Repo-wide caveat**: this sandbox cannot fully `npm install` (the private Bosch/Azure package registry needs credentials not present here), so none of this session's work — including this wiring — could be verified with the project's real `typecheck`/`lint`/`test` commands. Verification here relied on careful manual type-matching, a syntax-only TypeScript transpile check (catches parse errors, not type errors), and behavior-preservation-by-construction arguments as described above. The `reimbursementCreateOn` regression above is a direct consequence of that limitation — confirm with a real `npm run typecheck && npm run test` before merging, and treat any other type-widening in this session's commits with the same suspicion until verified.

## 14. Fixed: first material row rendering incorrectly (`SparePartsRow.tsx`)

Reported bug, reproduced against a known-good reference version of `SparePartsRow.tsx`. Root cause: the position-change effect (`prevPositionRef` `useEffect`) had regressed to only running the position-autofill side effect — it no longer wrote the changed position back into `DiagnosticsContext`'s `materials` state via `setMaterials`. Everything downstream that reads `materials[i].position` (summary aggregation, position-based rules) kept seeing a stale/empty position for a row once the user picked one, most visibly for the first material row.

A second, related issue: `isResyncingRef` is a single ref shared across every row via `DiagnosticsContext`, used to suppress dirty-tracking/reset effects during API-driven or setup-driven changes that aren't real user edits. The reference version special-cases `areaIndex === 1` (the second row): when that row's position is auto-populated for the first time (`!isResyncingRef.current && !prevPartNumberRef.current`), it flips the shared ref so sibling rows — including the first material row, `areaIndex === 0` — aren't spuriously affected by the new row's own setup in the same render cycle. This repo's version was missing that guard in all three places it belongs (the position-change effect, `resetPartNumberDependentFields`, and the job-type-change/discount-repopulation effect).

Fixed by:
- Restoring the `setMaterials` sync in the position-change effect.
- Restoring the `areaIndex === 1` shared-ref guard in the three effects above.
- Restoring the `positionField?.name` exclusion in the row wrapper's `onChange` handler (it already excluded `typeField`/`partNumberFieldName` from triggering the REVISED/REJECTED-row reset; the position field was missing from that list).

Deliberately **not** ported over from the reference file: `SPARE_PARTS_EXCHANGE_ACTION_TYPES`/`isSparepartExchangeRow` (a WARRANTY/SERVICE_OFFERING type-option-disabling bypass for `SPARE_PARTS_EXCHANGE` action types) and the reference file's `0`-based (vs this repo's `null`-based) price-field reset in `resetPartNumberDependentFields`. Neither is related to the rendering bug; the `null`-based reset is this session's own deliberate, documented choice to match the backend's `price: null` contract (see the comment on `resetPartNumberDependentFields`), and the exchange-action bypass is an unrelated business rule whose presence/absence in this repo wasn't established to be a regression. Flagging both for confirmation rather than silently changing behavior outside this bug's scope.

Added two regression tests to `SparePartsRow.test.tsx` covering the `setMaterials` sync and the shared-ref guard directly (not just an end-to-end render assertion), since the previous test suite had no coverage for either.

## 15. Phase 5: unifying Job/Claim item rows (in progress — steps 1–7 of 10 done)

Two research passes (traced against the actual code, not assumed from this doc's earlier §8 sketch) found the real Job/Claim divergence is bigger than "two near-identical implementations":

1. **Claim's hook (`useClaimMaterialsManager.ts`) never adopted Phase 4's full-recomputation fix** — it still incrementally clones/trims Formik Areas for both live and archived rows.
2. **Claim's row editability is a third, independent, coarser model** (`isNew`/`isDisabled`/`isClaimPending` only) — it never adopted job's `POSITION_PERMISSIONS` table or `itemRulesResolver.ts`'s `resolveEditability`/`ItemPolicyConfig` machinery. `EditabilityRule.contextType` had no dimension for "is this row new" (only `jobType`/`claimStatus`) — extending it to `isNewRow` is the first implementation step (done).
3. **Claim test coverage is ~1/3–2/5 the size of job's** for the equivalent hook/row, and this session cannot execute `npm install`/`tsc`/`vitest`/`eslint` (no private registry access) — only manual tracing and a syntax-only transpile check are available, which shapes how the merge is sequenced (small, individually-inspectable steps; nothing deleted until its replacement is checklist-confirmed against the old test file's cases).

Target end state: one `useItemsManager(config: ItemsSurfaceConfig)` hook (replacing `useDiagnosticsManager.ts` + `useClaimMaterialsManager.ts`), one `ItemsContextValue` shape backing two separate `React.Context` objects (`DiagnosticsContext`/`ClaimContext` stay separate — `ClaimOverview.tsx` provides two different values, a stubbed read-only one and the real claim one, simultaneously in the same tree, which a single shared context couldn't do), one `ItemRow` component (replacing `SparePartsRow.tsx` + `ClaimSparePartsRow.tsx`), one `ArchivedItemRow` component. Every real behavioral divergence — job's bare-sales autofill, `POSITION_INSERT_PERMISSIONS`, `resyncMaterialsFromAPI`/`canArchiveOnDelete`; claim's `onDeleteArchivedRow`, `isClaimPending`-based locking, always-`WARRANTY`-on-add, single-eligible-position auto-fill — becomes an explicit, named field on a per-surface config object rather than a silently-dropped feature or an implicit `if (surface === "claim")` branch, so each can be checked against pre-merge behavior without a test runner.

Full step-by-step plan (10 steps, each individually verifiable): extend `EditabilityRule` (this session, done) → extract shared pure derivation helpers → build `useItemsManager` unwired → wire claim through it (the one step that changes live claim behavior: incremental → full recomputation) → merge the two contexts → merge the two row components → unify archived-row rendering → update both pages' call sites → unify the claim payload serializer → delete the old implementations once every replacement is checklist-confirmed. `ENABLE_ITEM_RULES_RESOLVER` stays `false` throughout this phase — flipping it needs claim's own `useItemPolicyConfig` wiring (not part of this merge) and a fix to `data/itemPolicyTR.json`/`itemPolicyZA.json`'s `claimSpareParts` fixtures (their current `claimStatus`-keyed entries don't reflect claim's real `isNewRow`-based rule).

### 15.1 Progress

- **Steps 1–5: done.** `EditabilityRule.contextType` extended with `isNewRow`; shared derivation helpers extracted to `hooks/itemsManager/materialsDerivation.ts`; `useItemsManager(config)` built in `hooks/itemsManager/` (`itemsManager.types.ts`, `useItemsManager.ts`); claim wired through it via `modules/ClaimManagement/ClaimOverview/claimItemsSurfaceConfig.ts` (full-recomputation row reconciliation, matching job's Phase 4 fix); `DiagnosticsContextValue`/`ClaimContextValue` merged into one `ItemsContextValue` (`hooks/itemsManager/ItemsContext.tsx`), `DiagnosticsContext`/`ClaimContext` kept as two separate `React.Context` objects per the rationale above.

- **Step 6: done** (`SparePartsRow.tsx` + `ClaimSparePartsRow.tsx` → `ItemRow.tsx`, driven by `ItemRowSurfaceConfig` — see `modules/JobManagement/JobOverview/SparePartsRow/ItemRowSurfaceConfig.ts`, `jobItemRowSurfaceConfig.ts`, `modules/ClaimManagement/ClaimOverview/ClaimSparePartsRow/claimItemRowSurfaceConfig.ts`). Every divergence between the two pre-merge row components is a named field/resolver on `ItemRowSurfaceConfig`, documented inline in that file. Two things worth flagging explicitly:
  - **One deliberate additional behavior change for claim**, in the same spirit as Step 4's full-recomputation switch: `ItemRow.tsx`'s dirty-tracking effect mirrors `arePricesValidated` into a ref (`arePricesValidatedRef`) before checking it, exactly as job's pre-merge `SparePartsRow.tsx` already did to avoid re-firing `markRowDirty` on the false→true transition right after a successful validate. Claim's pre-merge `ClaimSparePartsRow.tsx` read `arePricesValidated` directly (in the effect's own dependency array), which means claim had the same latent "immediately re-dirties the row right after validate succeeds" bug job had already fixed for itself — unifying on job's ref-based approach fixes it for claim too. Flagged for QA rather than silently folded in.
  - `ItemRow.test.tsx` is a **real but deliberately-scoped** verification pass (not a 1:1 port of `SparePartsRow.test.tsx`'s 2037 lines + `ClaimSparePartsRow.test.tsx`'s 691 lines). It covers every divergence point named in `ItemRowSurfaceConfig.ts` (full-row disablement, delete-icon visibility, field-permission resolution, position-field options, the `extraEffects` gates) for both surfaces. Full historical-parity porting of every named case from both old test files remains an explicit open task before Step 10 can delete `SparePartsRow.test.tsx`/`ClaimSparePartsRow.test.tsx` — deferred rather than rushed, given this sandbox has no `vitest` execution access to verify a ~2700-line mechanical port beyond syntax-checking it.

- **Step 7: done** (`ArchivedSparePartsRow.tsx` + the inlined `ClaimArchivedSparePartsRow` function in `ClaimArchivedSparePartsArea.tsx` → `ArchivedItemRow.tsx`, driven by `ArchivedItemRowSurfaceConfig` — see `SparePartsRow/ArchivedItemRowSurfaceConfig.ts`, `jobArchivedItemRowSurfaceConfig.ts`, `ClaimSparePartsRow/claimArchivedItemRowSurfaceConfig.ts`). The two *area wrapper* components (`ArchivedSparePartsArea.tsx`, `ClaimArchivedSparePartsArea.tsx`) stay separate, as planned — only their confirmed-byte-identical `enrichArchivedFieldOptions` field-enrichment logic moved to `materialsDerivation.ts`, a genuine dedup with no behavior change. `ArchivedItemRow.test.tsx` is real but similarly scoped (not a full port of the three pre-existing test files, none of which are deleted yet).

- **Steps 8–10: not started.**
