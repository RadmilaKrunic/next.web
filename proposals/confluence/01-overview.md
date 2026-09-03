# Items & Prices — Overview

> Source of truth for the diagnostic/claim items & pricing redesign. Companion pages: **Items & Prices — Backend**, **Items & Prices — Frontend**.

## Why this exists

Item (spare-part/material) rendering and price computation — for the Job Overview diagnostics tab, the read-only diagnostic mirror on Claim Overview, and the editable claim spare-parts tab — is the hardest part of BASS-Next to reason about and change safely today:

- **The frontend is the source of truth for prices, not the backend.** `priceCalculator.ts` is a well-tested pure math engine, but it's treated as authoritative. Even after `POST /v1/jobs/flow/validate-and-save` responds, the frontend discards the backend's numbers and re-derives everything client-side again.
- **Row/position rules are scattered across four places**: `UIConfiguration` field metadata, `CountryConfig.diagnosticsConfiguration`, hardcoded frontend tables (`POSITION_PERMISSIONS`, `materialPriceEditability.ts`), and a fourth, divergent rule on the claim side (`isNewRow && !isClaimPending`).
- **Claim pricing is untyped.** `PUT /v1/claims/{claimId}/prices` sends and receives `Record<string, unknown>`, and its payload is hand-built outside the shared field-mapping pipeline the job side uses.
- **Job and claim data shapes have quietly diverged** — different field names for the same concept (`isPriceSetManually` vs `isPriceManuallySet`), different summary field sets.
- **`useDiagnosticsManager.ts` (1600+ lines) and `useClaimMaterialsManager.ts` (800+ lines) mostly exist to keep Formik happy**, not to manage pricing — dynamically cloning/removing Formik field definitions every time a row is added or removed.

## Goals

1. One items/price **configuration model** instead of three-plus scattered rule sources.
2. The **backend as the source of truth** for prices — nothing rendered that isn't backend-confirmed.
3. Concrete, **typed API contracts** for every price change, at a sensible request granularity.
4. A rethought **summary / summaryMaterial** approach — backend-computed, not derived-and-written-back into the form on every render.
5. Cut the refs/effects/re-renders around diagnostic items by replacing incremental row reconciliation with full recomputation on every change — not by pulling items out of Formik.
6. A **simplified, unified implementation shared between Job and Claim**, with strong test coverage.

## Guiding principles

- **Reuse the math, change the authority.** `priceCalculator.ts` stays — it becomes the client-side *optimistic preview* engine, not the source of truth.
- **One config model, three consumers.** Job diagnostics, the read-only claim diagnostic mirror, and editable claim spare parts all resolve rules through the same functions, parameterized by context — not three hand-rolled tables.
- **Formik stays for item rows too — fix the reconciliation strategy, not row ownership.** Row field names stay position-based, but instead of incrementally patching (add N missing rows, trim excess ones, leaving existing rows untouched), the row list is fully recomputed from the materials array on every change. `GenericField` and the shared value-to-API mapping engine are untouched.
- **Backend confirms, client previews.** Every priced value carries a tri-state: `pending` (optimistic) → `confirmed` (backend-authoritative) → `error`. The UI always renders the confirmed value once it exists.

## The two-config split

Item rules split cleanly into two sources rather than one new all-in-one config:

| | What it covers | Where it lives |
|---|---|---|
| **Rule data** | `automaticRows`, `allowedPositions`, `discountBase`, `addSpecialMaterialsAllowed`, `enforceSparepartExists` — varies per `(actionType, jobType)` | Already exists: `CountryConfig.diagnosticsConfiguration`, served by the existing `GET /v1/countries/{cc}/country-configuration`. No new endpoint. |
| **Policy overlay** | Per-position permissions, the protected-position flag, editability-by-context rules, warranty gating, per-surface (job/claim) overrides | New, small `ItemPolicyConfig`, served by `GET /v1/countries/{cc}/item-policy` (see **Backend** page, API-1) |

Both are consumed through pure resolver functions (`resolvePositionPermissions`, `resolveEditability`, `resolveAllowedPositions`, `selectConfigForSurface`, …) so Job's `SparePartsRow`, Claim's `ClaimSparePartsRow`, and the read-only claim mirror all call the *same* functions with a different context slice — this is what makes eventually unifying the two surfaces possible.

## Backend as source of truth

Full contracts are on the **Backend** page. In short:

- A new debounced **validate** call (`POST /v1/diagnostic/{jobId}/prices/validate`) fires once per field edit and sends only the rows that actually changed since the diagnostic's last save — not the whole row set. The backend merges that onto its last-saved state and returns the full recomputed diagnostic.
- The existing **validate-and-save** call (`POST /v1/jobs/flow/validate-and-save`) is unchanged in shape — full row set, persists — but its response is now typed to match validate's exactly, so the frontend has **one rendering path** for both.
- Claims get the same split: the existing `PUT /v1/claims/{claimId}/prices` (full save) plus a new, equivalent debounced validate call.
- `summary`/`summaryMaterial` move to backend-computed values (`priceSummary`/`priceSummaryMaterial`), replacing today's client-side `aggregateRowPrices` + dirty-diff-guarded Formik writeback in `SummaryArea.tsx`.

## Row rendering (later phase)

Today, row count is owned by an imperative reconciler in `useDiagnosticsManager.ts` that *incrementally* clones/trims Formik field definitions to match the materials array — appending new rows or removing excess ones, but never touching the rows that already existed. That's why deleting a row requires a separate, manual pass to rename and re-sync every row after it. The fix: recompute the entire row/field/value set fresh from the materials array on every change, instead of patching a previous one. Row field names stay position-based (a stable non-numeric row id would conflict with the shared value-to-API mapping engine every UIConfiguration-driven form depends on, not just this one — investigated and deliberately not pursued). Formik and the existing `GenericField` component stay exactly as they are. Not yet implemented — see phasing below.

## Phasing & current status

| Phase | Scope | Status |
|---|---|---|
| 1 | Type the claim pricing contract, reconcile job/claim `Price` shape drift | **Shipped** |
| 2 | `ItemPolicyConfig` + resolvers, wired into existing components behind a feature flag | **Shipped, flag off by default** |
| 3 | New `/prices/validate` endpoint; stop client-side price re-derivation | Proposed — spec finalized, local dev simulator built; blocked on the real backend endpoint |
| 4 | Replace the incremental Area-cloning row reconciler with full recomputation from the materials array on every change (Formik/`GenericField`/field naming untouched) | **Shipped** |
| 5 | Unify Job/Claim shared hook, context, row component, archived-row rendering | **Shipped** |
| 6 | Cleanup / remove the feature flag | Proposed, not started |

Phases 1–2 are pure typing/config additions with no behavior change, shipped independently of backend work. Phase 3 is the one phase genuinely blocked on the backend team; phases 4–5 can proceed in parallel against the already-agreed contract, using the local mock/simulator described on the **Frontend** page, so frontend work isn't idle waiting on the backend.

## Related pages

- **Items & Prices — Backend**: full API contracts (shared types, endpoint specs, ticket breakdown)
- **Items & Prices — Frontend**: what's implemented today, key files, feature flag, local mocking, testing approach
