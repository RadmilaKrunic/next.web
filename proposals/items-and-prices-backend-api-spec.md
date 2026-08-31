# Items & Prices — Backend API Specification

Companion to `items-and-prices-refactor.md`. Written at Jira-ticket grain: each section below is self-contained (purpose, request/response schema, validation rules, error semantics, examples, non-functional notes, acceptance criteria) so it can be pasted directly into a backend ticket. A suggested ticket breakdown is at the end.

All new endpoints follow this codebase's existing conventions:
- Base URL / auth: `VITE_API_BASE_URL`, JWT bearer token, cookie session — same as every other endpoint (`src/api/axios-client/axiosClient.ts`).
- Validation failures are reported **in-body on HTTP 200** (`errorMessages`), matching the existing `POST /v1/jobs/flow/validate-and-save` convention — **no new 422 handling** is requested; the axios client has no structured-validation-error branch today and adding one would be a bigger, unrelated change.
- `401`/`403` behave exactly as today (redirect-to-login / logout, no endpoint-specific handling needed).

---

## API-1: `GET /v1/countries/{countryCode}/item-policy`

**Revision note**: this was originally specified as `GET /v1/countries/{countryCode}/item-rules`, re-serving `automaticRows`/`allowedPositions`/`discountBase`/`addSpecialMaterialsAllowed` alongside the FE-policy fields. Reviewing real TR/ZA `GET /v1/countries/{cc}/country-configuration` payloads showed that data **already exists** as `diagnosticsConfiguration` on that endpoint — a new endpoint re-serving it would be pure duplication, and the originally-assumed shape (position rules as one flat, global list) doesn't match reality: `minCount`/`maxCount`/`quantitySource`/`unitPriceSource` genuinely vary per `(actionType, jobType)`, and PN/SP/FR/AC are only valid under specific action types, not everywhere. **Renamed and narrowed to `item-policy`**, covering only what has no backend representation today.

**Purpose**: Serve the frontend-policy overlay — position permissions/protection, editability-by-context rules, warranty gating, and claim-surface overrides — that today lives hardcoded in `SparePartsRow.tsx`'s `POSITION_PERMISSIONS` table and `materialPriceEditability.ts`. Supports FE Phase 2 of the items/prices refactor. **Does not include `automaticRows`, `allowedPositions`, `discountBase`, `addSpecialMaterialsAllowed`, or `enforceSparepartExists`** — the frontend already has that data from the existing `country-configuration` endpoint's `diagnosticsConfiguration` field.

**Request**: `GET`, path param `countryCode` (e.g. `TR`, `ZA`). No body, no query params.

**Response `200`**:
```ts
interface ItemPolicyConfigResponse {
  version: string;                 // monotonic (ISO date or semver) — FE no-ops re-render if unchanged
  countryCode: string;
  positions: {
    position: string;              // "LA" | "FR" | "PN" | "SP" | "AC" | "PC"? — see note below
    isProtected: boolean;
    permissions: {
      canView: string;             // permission key string, e.g. "DL_V"
      canDelete: string;
      canEditUnits: string;
      canEditUnitPrice: string;
      canEditDiscount: string;
      canEditTotal: string;
    };
  }[];
  editability: {
    contextType: "jobType" | "claimStatus";
    contextValue: string;          // e.g. "COMMERCIAL_GOODWILL" | "CHARGEABLE" | "REVISED" | "PENDING"
    appliesToProtectedPositionsOnly: boolean;
    isEditable: boolean;             // which of totalAmount/netAmount is exposed is derived
                                      // from discountBase client-side, not stored here
    controlledBySummary: boolean;
  }[];
  warrantyGating: { gatedTypes: string[]; disableTypeOptionsWhenInvalidSparePart: boolean };
  surfaceOverrides: {
    jobDiagnostics?: Partial<ItemPolicyConfigResponse>;
    claimDiagnosticsReadOnly?: Partial<ItemPolicyConfigResponse>;
    claimSpareParts?: Partial<ItemPolicyConfigResponse>;
  };
}
```

**Reference values to preserve** (current FE-hardcoded rules this endpoint must reproduce, from `src/utils/Permissions.ts` `PERMISSIONS.DIAGNOSTICS` and `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`'s `POSITION_PERMISSIONS`):

| Position | canView | canDelete | canEditUnits | canEditUnitPrice | canEditDiscount | canEditTotal |
|---|---|---|---|---|---|---|
| LA | `DL_V` | `DL_I` | `DLUE` | `DLPE` | `DLDE` | `DLTE` |
| FR | `DF_V` | `DF_I` | `DFUE` | `DFPE` | `DFDE` | `DFTE` |
| PN | `DT_V` | `DT_I` | `DTEU` | `DTEP` | `DTDE` | `DTTE` |
| SP | `DS_V` | `DS_I` | `DSUE` | `DSPE` | `DSDE` | `DSTE` |

`PC` maps to the same `DS_*` keys as `SP` in current FE code but was never observed as a `position` value in either TR's or ZA's real `diagnosticsConfiguration.rules` — confirm with backend/product whether it's a live value for some other country/flow, or dead, before committing to it in this endpoint's `positions[]`.

**Real `AllowedPosition`/`Quantity` enum values observed** (for reference when building/consuming the *existing* `country-configuration` endpoint's `diagnosticsConfiguration.rules[].rule.allowedPositions[]` — not part of this new endpoint, but frequently confused with it): `unitPriceSource` ∈ `{ "SAP", "ASC", null }`; `quantitySource` ∈ `{ "FAULT_CODES", "DEFAULT", "SPO", null }` (`"SPO"` seen only on ZA's `SP` position under `WARRANTY`/`SERVICE_OFFERING`/`CHARGEABLE`); `actionType` ∈ `{ "REPAIR", "NEW_TOOL_EXCHANGE", "SPARE_PARTS_EXCHANGE", "ACCESSORIES_EXCHANGE" }` (no generic `"EXCHANGE"`); `jobType` additionally includes `"SPECIAL_CONTRACT"` (ZA-only in the samples reviewed, absent from TR).
| PC | `DS_V` | `DS_I` | `DSUE` | `DSPE` | `DSDE` | `DSTE` |

`isProtected: true` for `LA`, `FR`, `PC` (backend-driven/automatic rows); `false` for `PN`, `SP`, `AC` (the "distributable" positions eligible for summary-level discount distribution). Price-field editability today (`materialPriceEditability.ts`): a row's discount/total/net fields are editable only when `jobType === "COMMERCIAL_GOODWILL"`, or when `jobType === "CHARGEABLE"` **and** the position is protected; `totalAmount` is only meaningful in `GROSS_PRICE` mode, `netAmount` only in `NET_PRICE` mode.

**Errors**: `404` unknown `countryCode`. `401`/`403` per existing convention.

**Non-functional**: fetched once per country per session (`staleTime: Infinity` client-side); payload expected small (<20KB); no pagination needed.

**Acceptance criteria**:
- [ ] `positions[]` covers at minimum LA, FR, PN, SP, AC with the permission-key values in the table above; confirm with backend/product whether PC is a live value before including it.
- [ ] `surfaceOverrides.claimSpareParts` encodes the claim-side "editable only for new rows, only while not pending" rule as `editability[]` entries.
- [ ] `version` changes whenever any policy value changes.
- [ ] Response contains no `automaticRows`/`allowedPositions`/`discountBase`/`addSpecialMaterialsAllowed` fields — that data stays on the existing `country-configuration` endpoint; this endpoint does not duplicate it.

---

## API-2/API-3/API-4: one shared payload shape for diagnostic + claim pricing

**Revision note**: API-2 and API-3 were originally specified with two unrelated shapes — API-2 as a lean `changedRows[]` diff array keyed by `rowId`, API-3 as the claim's existing full-`materials[]` payload (itself using different field names from the job side's `JobDiagnostic`, e.g. `jobType` per material instead of `type`). Reviewing the real `JobDiagnostic` type (`JobList.types.ts:174-229`) and the real `onValidateClaim` payload (`ClaimOverview.tsx:346-444`) shows: (a) diagnostic and claim materials are both edited through the same metadata-driven Formik fields, with the same `attributeMapping`-based field→API mapping (`mapValuesToAPI`) producing the same shape either way; (b) `POST /v1/jobs/flow/validate-and-save` already sends/receives the **full** `materials[]` array on every call — there is no existing "send only what changed" endpoint to diverge from; and (c) claim's `jobDiagnostic` field is already, today, a verbatim pass-through of the parent `JobDiagnostic` object (`ClaimOverview.tsx:443`). Given that, API-2 keeping a bespoke diff shape would mean the frontend maintains two different row representations — and two different mapping paths — for what is functionally the same edit. **API-2, API-3, and the existing validate-and-save endpoint (API-4) now share one response shape and one row/summary shape.**

**Revision note 2 — leaning out the validate request**: the first pass of this alignment still had `validate` resend the diagnostic's **entire** `materials[]` array on every call, just with `changedRowIds`/`changedFields`/`changedSummaryFields` markers layered on top. In practice, a `validate` call fires once per field edit (500ms debounce, one field at a time) — resending every untouched row on every keystroke is unnecessary bandwidth, and it duplicates data the backend already has: `validate` is scoped to a known `jobId`/`diagnosticId`, so the backend already knows every row's last-saved state. **`validate`'s request now carries only the rows that are actually dirty** — edited or newly added since the diagnostic's last save — not the full row set; the backend merges these onto its last-saved baseline before recomputing. `validate-and-save` (API-4) is unaffected by this — it is a full persist, so it keeps sending everything, same as today. See "Backend merge semantics" below for the statelessness argument, and "Leaning out `validate`'s request" for the exact shape.

### Shared types

```ts
// Already defined and shipped (Part B of the companion refactor doc) — src/types/price.types.ts.
// Reused as-is; no new price shape is introduced by this revision.
interface Price {
  discount: number; suggestedNetPrice: number; taxAmount: number; unitPrice: number;
  netAmount: number; tax: number; taxTypes?: string[]; grossAmount: number;
  totalAmount: number; discountAmount?: number;
}

// A material/spare-part row, shared by diagnostic and claim materials/archivedMaterials.
// Matches JobDiagnostic["materials"][number] (JobList.types.ts:188-204) field-for-field, plus
// one addition: rowId. Claim's material today names this field's type "jobType" instead of
// "type" — aligned here to the diagnostic name since both hold the same values
// (CHARGEABLE/WARRANTY/...) and "jobType" already means something else at the top level (the
// claim's/diagnostic's own jobType) — see the claim migration notes under API-3 below.
interface MaterialRow {
  rowId: string;                 // NEW — stable client-generated id (not array-index-derived),
                                  // used to correlate a request row to its response row/error.
  id?: string;                   // absent for a brand-new, not-yet-saved row
  order?: number;
  position: string;
  partNumber: string;
  description: string;
  type: string;
  quantity: number;
  status?: string;
  notBelongsToTool?: boolean;
  isPriceSetManually: boolean;
  isValidated: boolean;          // NEW — wire-level exposure of the frontend's existing
                                  // MaterialItem.isValidated/isNew concept (useDiagnosticsManager.ts).
                                  // false until this exact row has received one "confirmed"
                                  // response; the backend flips it true when it returns the row
                                  // with status: "confirmed". Distinguishes "never priced yet, has
                                  // nothing to show" from "has a last-known price, now being
                                  // revalidated" — see "Leaning out validate's request" below for
                                  // why this no longer gates request membership the way the first
                                  // pass of this revision had it.
  price: Price | null;           // null = "not yet priced, please calculate" (existing contract
                                  // — see buildDiagnosticPayload's price?.unitPrice === null
                                  // check in JobOverview.tsx)
}

// Same field set as today's ValidateAndSaveResponse.priceSummary (JobList.types.ts:220-228).
// priceSummaryMaterial is a new addition needed for the summaryMaterial concept from
// items-and-prices-refactor.md §6 — JobDiagnostic has no per-position-group summary today.
type PriceSummary = Omit<Price, "unitPrice" | "tax"> & { discountAmount: number };
type SummaryFieldName = keyof PriceSummary;
type PriceFieldName = "quantity" | "unitPrice" | "netAmount" | "suggestedNetPrice"
  | "tax" | "grossAmount" | "discount" | "totalAmount";

// The full diagnostic payload — same shape validate-and-save already sends/returns today
// (JobDiagnostic in JobList.types.ts:174-229). This is what validate-and-save (API-4) sends
// as its request, and what every pricing call's *response* is built from (see
// DiagnosticPricingResult below) — validate (API-2) no longer sends this shape as its
// request, only ever returns it.
interface DiagnosticPricingPayload {
  jobId: string;
  diagnosticId?: string;
  ascId?: string;
  actionType: string;
  jobType: string;
  exchangeReason?: string;
  status: string;
  customerAnswer?: string;
  typeOfUsage: string;
  faultCode: string;
  faultCodeDescription: string;
  faultCodeLabourQuantity: number;
  technicianNote?: string;
  materials: MaterialRow[];
  archivedMaterials?: MaterialRow[];
  priceSummary: PriceSummary;
  priceSummaryMaterial?: PriceSummary;   // NEW — see items-and-prices-refactor.md §6
}

type MaterialRowResult = MaterialRow & { status: "confirmed" | "error"; errorMessage?: string };

interface PriceValidateErrorMessage {
  rowId?: string;
  field?: string;
  message: string;
}

// Returned identically by API-2 (validate) and API-4 (validate-and-save) — one response
// shape, one frontend rendering path, regardless of which call produced it. Always the FULL
// current diagnostic (every row, not just the ones the request touched), since the backend
// merges whatever the request sent onto its last-saved baseline before recomputing — see
// "Backend merge semantics" below.
interface DiagnosticPricingResult {
  requestId?: string;              // present (and echoed) on API-2 responses; absent on API-4's,
                                    // whose request has no requestId
  diagnostic: Omit<DiagnosticPricingPayload, "materials" | "archivedMaterials"> & {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
  };
  errorMessages?: PriceValidateErrorMessage[];
}
```

### Backend merge semantics

`validate` (API-2/API-3) stays stateless and idempotent (no server-side session, safe to retry) while still sending a lean request, by relying on one rule: **the backend always starts from the diagnostic's/claim's last-*saved* state** (from the last `validate-and-save`/`PUT .../prices` call, or from creation) **and merges the request's dirty rows on top of it** before recomputing anything. Concretely:

1. The frontend keeps its own current, full row state in memory (it always has — that's what renders the form). It tracks which rows are **dirty**: edited, or newly added, since the last successful save.
2. Every `validate` call sends the **full current values of every dirty row** (not just the single field that changed) — see "Leaning out `validate`'s request" below. This is why a lean request is still correct even though the endpoint has no memory of previous `validate` calls: each call is self-contained, because the frontend keeps resending every row that's still dirty, not just the newest edit.
3. The backend loads its own last-saved copy of the diagnostic/claim (by `jobId`+`diagnosticId`, or `claimId`), overlays the request's dirty rows on top (by `rowId`, or `id` where already saved), recomputes every row's price and both summaries against that merged working set, and returns the **whole** merged-and-recomputed result — not just the rows that were sent.
4. A brand-new row (`isValidated: false`, no `id` yet) has no baseline in the backend's saved copy at all — it exists only because it's present in the request's dirty-row list. It must be sent on every `validate` call for as long as it stays unsaved, exactly like an edited existing row.

This is why the response must always be the full diagnostic/claim (point 3) even though the request is lean: the frontend needs the recomputed `priceSummary`/`priceSummaryMaterial` across *all* rows, dirty or not, and the backend is the only side that knows both the saved baseline and the incoming dirty rows.

### Leaning out `validate`'s request

```ts
interface ChangedMaterialRow {
  rowId: string;
  row: MaterialRow;                  // this row's full current (post-edit) values — the backend
                                      // needs the whole row, not just the one field's new value
  changedField?: PriceFieldName;     // set only on the row whose edit triggered *this* call;
                                      // omitted on other entries that are still dirty from an
                                      // earlier edit in the same unsaved session (included only
                                      // so priceSummary/priceSummaryMaterial stay accurate)
}

interface ChangedSummary {
  target: "priceSummary" | "priceSummaryMaterial";
  summary: PriceSummary;             // the summary's full current (post-edit, client-redistributed) values
  changedField: SummaryFieldName;
}
```

In the common case — the user edits one field, which triggers one `validate` call — `changedRows` has exactly one entry, with `changedField` set. It grows past one entry only when more than one row is still dirty (unsaved) at the time of the call, or `changedSummary` is set instead of/alongside it when the user edited `priceSummary`/`priceSummaryMaterial` directly (redistribution) rather than a row. Reusing `Price`'s field names (`tax`/`discount`), not the calculator's internal `taxPercent`/`discountPercent` — one vocabulary serves both the wire contract and the persisted shape.

**Why `isValidated` no longer gates request membership**: the first pass of this revision said a row with `isValidated: false` must never appear in the request's "changed" markers. Under the lean request, that rule doesn't carry over — a brand-new row has no way to reach the backend *except* by being in `changedRows` (there's no separate full-`materials[]` array anymore that would already include it). `isValidated` still matters, just for a narrower purpose: it tells the backend a row has no confirmed-price baseline to speak of (price it outright, no delta assumptions), and tells the frontend whether to show a pending state or a last-known value while a row revalidates.

---

## API-2: `POST /v1/diagnostic/{jobId}/prices/validate`

**Purpose**: The core backend-source-of-truth pricing call for the job diagnostics tab. Replaces client-side price calculation as the authority for what's rendered; the frontend renders the response directly with no re-derivation. Supports FE Phase 3.

**Trigger/cadence**: Debounced 500ms client-side, one call per field edit in the common case. Sends only the rows dirty since the diagnostic's last save (see "Backend merge semantics" above) — not the full material set.

**Request**:
```ts
interface PriceValidateRequest {
  requestId: string;                    // client-generated UUID, echoed back verbatim
  changedRows: ChangedMaterialRow[];    // every row dirty since the last save — usually 1 entry
  changedSummary?: ChangedSummary;      // set when priceSummary/priceSummaryMaterial was edited directly
}
```

**Response `200`**: `DiagnosticPricingResult` (shared type above) — the full current diagnostic, `requestId` echoed back.

**Validation rules (backend-side)**:
- Load the diagnostic's last-saved state by the `jobId` path param (+ `diagnosticId` if the diagnostic itself isn't uniquely resolvable from `jobId` alone), overlay `changedRows`/`changedSummary` on top (by `rowId`, matched to `id` where the row was already saved), and recompute against that merged set — never against `changedRows` alone.
- Every row's `price` must be internally consistent for the country's `discountBase` mode — the backend becomes the single implementation of the GROSS_PRICE/NET_PRICE math currently duplicated on the frontend (frontend keeps a copy only for optimistic preview; see `src/utils/priceCalculator.ts` for the exact formulas to match).
- `priceSummaryMaterial` aggregates only rows whose `position` is in the distributable set (`SP`, `PN`, `AC` today; should be driven by API-1's `positions[].isProtected === false`, not hardcoded independently).
- When `changedSummary.target` is `priceSummaryMaterial`/`priceSummary`, the backend recomputes that summary's redistribution across the merged row set independently of the client-sent value — `changedSummary.summary` is the frontend's optimistic preview, not authoritative.
- Reject (`status: "error"` on that row) rather than silently clamp, whenever a computed value would be negative or a required price lookup fails (mirrors today's "price not available" behavior on validate-and-save).
- Every row in the response — sent this call or merged in from the saved baseline — comes back with a `status`; a row returned `"confirmed"` always has `isValidated: true`.

**Errors**: always HTTP `200` for validation-level failures (per-row `status: "error"` + `errorMessage`, and/or top-level `errorMessages[]`). `400` only for structurally malformed requests (missing `jobId`, or both `changedRows` empty and `changedSummary` absent). `401`/`403` per existing convention.

**Non-functional**:
- Target p95 < 400ms — the debounce + round-trip should not feel laggier than today's instant client-side math. Flag for backend capacity planning; this is the primary UX risk of moving pricing authority server-side.
- Request payload size is now `O(dirty rows)`, not `O(total rows)` — this is the point of the lean request, and matters most for diagnostics with many rows and mobile ASC connectivity. Response payload stays `O(total rows)` (see "Backend merge semantics") — that asymmetry is intentional: the frontend needs the full recomputed state to render, but doesn't need to *upload* rows it didn't touch.
- Must tolerate out-of-order delivery: the frontend discards any response whose `requestId` isn't the latest one it issued; no server-side ordering guarantee is required.
- Idempotent for the same `requestId` — safe to retry on client network failure. This endpoint has no side effects beyond computing/returning prices — unlike validate-and-save, it does not persist anything, so "merge onto the last-saved baseline" (not onto some other `validate` call's result) is what keeps repeated/retried calls safe.

**Example 1 — a single field edit on an existing row** (the common case):
```json
// Request
{
  "requestId": "b1e7...",
  "changedRows": [
    { "rowId": "row-3f2a", "changedField": "quantity",
      "row": { "rowId": "row-3f2a", "id": "M-1", "position": "SP", "partNumber": "1609888887",
        "description": "...", "type": "CHARGEABLE", "quantity": 2, "isPriceSetManually": false, "isValidated": true,
        "price": { "unitPrice": 45.5, "suggestedNetPrice": 45.5, "netAmount": 45.5, "tax": 20,
                   "taxAmount": 9.1, "grossAmount": 54.6, "discount": 10, "totalAmount": 49.14 } } }
  ]
}
// Response — every row, including the untouched row-9c11 the backend already had saved
{
  "requestId": "b1e7...",
  "diagnostic": {
    "jobId": "J-1001", "actionType": "REPAIR", "jobType": "CHARGEABLE", "status": "IN_DIAGNOSTICS",
    "typeOfUsage": "PRIVATE", "faultCode": "F1", "faultCodeDescription": "...", "faultCodeLabourQuantity": 1,
    "materials": [
      { "rowId": "row-3f2a", "id": "M-1", "position": "SP", "partNumber": "1609888887",
        "description": "...", "type": "CHARGEABLE", "quantity": 2, "isPriceSetManually": false, "isValidated": true, "status": "confirmed",
        "price": { "unitPrice": 45.5, "suggestedNetPrice": 91.0, "netAmount": 91.0, "tax": 20,
                   "taxAmount": 18.2, "grossAmount": 109.2, "discount": 10, "totalAmount": 98.28 } },
      { "rowId": "row-9c11", "id": "M-2", "position": "LA", "partNumber": "", "description": "Labour",
        "type": "CHARGEABLE", "quantity": 1, "isPriceSetManually": false, "isValidated": true, "status": "confirmed",
        "price": { "unitPrice": 20, "suggestedNetPrice": 20, "netAmount": 20, "tax": 20,
                   "taxAmount": 4, "grossAmount": 24, "discount": 0, "totalAmount": 24 } }
    ],
    "priceSummary": { "suggestedNetPrice": 111.0, "netAmount": 111.0, "taxAmount": 22.2, "grossAmount": 133.2,
                       "discount": 10, "discountAmount": 10.92, "totalAmount": 122.28 },
    "priceSummaryMaterial": { "suggestedNetPrice": 91.0, "netAmount": 91.0, "taxAmount": 18.2, "grossAmount": 109.2,
                               "discount": 10, "discountAmount": 10.92, "totalAmount": 98.28 }
  }
}
```

**Example 2 — a summary-level discount edit, with a still-dirty new row from an earlier edit this session**: the user directly edits `priceSummaryMaterial`'s discount%; a `PN` row (`row-7bd1`) was added moments earlier in the same session and is still unsaved, so it's included in `changedRows` too (with no `changedField`, since it's not what triggered this particular call) — otherwise the backend's recompute would silently drop it from the summary.
```json
// Request
{
  "requestId": "c2f9...",
  "changedRows": [
    { "rowId": "row-7bd1",
      "row": { "rowId": "row-7bd1", "position": "PN", "partNumber": "", "description": "",
        "type": "CHARGEABLE", "quantity": 1, "isPriceSetManually": false, "isValidated": false, "price": null } }
  ],
  "changedSummary": {
    "target": "priceSummaryMaterial", "field": "discount",
    "summary": { "suggestedNetPrice": 91.0, "netAmount": 82.0, "taxAmount": 16.4, "grossAmount": 98.4,
                 "discount": 15, "discountAmount": 16.38, "totalAmount": 91.02 }
  }
}
// Response
{
  "requestId": "c2f9...",
  "diagnostic": {
    "...": "envelope fields from the saved baseline",
    "materials": [
      { "rowId": "row-3f2a", "...": "backend-recomputed redistribution", "isValidated": true, "status": "confirmed" },
      { "rowId": "row-7bd1", "...": "priced for the first time, included in the redistribution", "isValidated": true, "status": "confirmed" }
    ],
    "priceSummary": { "...": "..." },
    "priceSummaryMaterial": { "...": "backend-authoritative redistribution, not the client's preview" }
  }
}
```

**Acceptance criteria**:
- [ ] Response `diagnostic.materials[].price` for rows in `changedRows` matches the frontend's existing calculation output to 2 decimal places, for the same inputs, in both `discountBase` modes — verified via a shared fixture/contract test during the Phase-3 feature-flag rollout.
- [ ] `priceSummary`/`priceSummaryMaterial` match the frontend's existing aggregation output for the equivalent full row set (saved baseline merged with the request's dirty rows), including when redistribution was triggered via `changedSummary` rather than a row edit.
- [ ] A row omitted from `changedRows` is returned unchanged from the backend's last-saved state for it — the response is never missing a row the backend already knew about.
- [ ] A row returned with `status: "confirmed"` always comes back with `isValidated: true`, regardless of what the request sent for that row.
- [ ] Stale `requestId` responses are safely ignorable by the client.
- [ ] Row-level `status: "error"` used for negative-amount/lookup-failure cases instead of silent clamping.
- [ ] Response shape (`DiagnosticPricingResult`) is identical, field-for-field, to API-4's (`POST /v1/jobs/flow/validate-and-save`) response — one frontend type renders either.

---

## API-3: `PUT /v1/claims/{claimId}/prices` (aligned to the shared diagnostic shape, plus a lean validate variant)

**Purpose**: Same authority shift as API-2, scoped to claims. The claim owns its own editable material rows — separate from, but now shaped identically to, the parent diagnostic's — plus a read-only mirror of the parent diagnostic (`jobDiagnostic`) that today is already passed through verbatim (`ClaimOverview.tsx:443`). This revision aligns the claim's own `materials`/summary to the same `MaterialRow[]`/`PriceSummary` types API-2 uses, and gives claims the same lean, debounced validate call job diagnostics gets.

Two calls, same split as API-2/API-4:
- **`PUT /v1/claims/{claimId}/prices`** (existing route) — full save, unchanged shape/semantics from what Part B already shipped (`PutClaimPricesRequest` in `claims.types.ts`, sends the claim's complete `materials[]`), except its response is now `ClaimPricingResult` (below) instead of the unused placeholder.
- **`POST /v1/claims/{claimId}/prices/validate`** (net-new, mirrors API-2's URL pattern) — the lean, non-persisting, debounced call.

**Shared claim types**:
```ts
// Returned identically by the claim validate call and PUT .../prices — same principle as
// DiagnosticPricingResult above.
interface ClaimPricingResult {
  requestId?: string;              // present on the validate response; absent on PUT's
  claim: {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
    priceSummary: PriceSummary;
    priceSummaryMaterial?: PriceSummary;
  };
  errorMessages?: PriceValidateErrorMessage[];
}
```

**`POST /v1/claims/{claimId}/prices/validate` request** — same lean shape as API-2's, scoped to the claim's own rows; `jobDiagnostic` is **not** resent here (it's read-only from the claim's perspective and doesn't change from claim edits — the backend already has `diagnosticId`/`jobId` to look it up if needed for cross-checks):
```ts
interface ClaimPriceValidateRequest {
  requestId: string;
  jobId: string;
  diagnosticId: string;
  changedRows: ChangedMaterialRow[];    // dirty rows in the claim's own materials, since the claim's last save
  changedSummary?: ChangedSummary;
}
```

**`PUT /v1/claims/{claimId}/prices` request** (full save — unchanged from what Part B shipped, just now typed against the shared `MaterialRow`/`PriceSummary`):
```ts
interface PutClaimPricesRequest {
  id: string; jobId: string; ascId: string; customerId: string; ascName: string;
  diagnosticId: string; countryCode: string; actionType: string; jobType: string;
  typeOfUsage: string; faultCode: string; faultCodeDescription: string;
  faultCodeLabourQuantity: number; exchangeReason: string; claimStatus: string;
  claimNotes: unknown; customer: unknown; job: unknown;
  materials: MaterialRow[];
  archivedMaterials: MaterialRow[];
  priceSummary: PriceSummary;            // renamed from today's claimPriceSummary — see migration notes
  priceSummaryMaterial?: PriceSummary;   // NEW — parity with DiagnosticPricingPayload; claims didn't have
                                          // a distributable-positions summary before this revision, but
                                          // items-and-prices-refactor.md §6 already has ClaimSummaryArea
                                          // bridging into the same summary/summaryMaterial pair job's
                                          // SummaryArea renders
  jobDiagnostic: DiagnosticPricingPayload;   // same shape as API-2's diagnostic, passed through
}
```

**Migration notes** (supersedes this section's original "Migration note"/acceptance criteria, and is a larger contract than the Part B FE-only typing pass already shipped — see below):
- **`materials[].jobType` → `materials[].type`**: today's shipped claim payload (`ClaimOverview.tsx:376`, `src/api/services/claims/claims.types.ts`) names this field `jobType`, which collides in meaning with the diagnostic side's `type` (both hold values like `CHARGEABLE`/`WARRANTY`) and with the claim's own top-level `jobType`. Rename to `type` to match `MaterialRow`. Small, isolated frontend follow-up — not blocking this proposal.
- **`claimPriceSummary` → `priceSummary`**: a key rename for parity with `DiagnosticPricingPayload.priceSummary`; same field set already, except `discountAmount` becomes required (today's shipped `ClaimPriceSummary` has no `discountAmount` field at all — it's computed and sent as part of the summary object per-field today, confirm this is a strict superset before dropping the old shape).
- **This is a bigger contract than the Part B FE-only typing pass shipped** (`PutClaimPricesRequest` in `claims.types.ts`, which typed today's *existing* untyped endpoint as-is, zero behavior change). Adopting the shapes above is new backend + frontend work — track as a distinct ticket from the already-shipped Part B pass, not a revision of it.
- The net-new validate route needs no backward-compat decision the way the original API-3 draft's "same route vs. new route" question did — it's additive alongside the existing `PUT .../prices`, which keeps its URL and full-save semantics.

**Errors**: same in-body convention as API-2 (no 422).

**Acceptance criteria**:
- [ ] `claim.materials[]`/`claim.archivedMaterials[]` use the exact same `MaterialRow` shape as API-2's `diagnostic.materials[]` — field names, not just field sets, match (in particular `type`, not `jobType`; `isValidated` included).
- [ ] `claim.priceSummary`/`claim.priceSummaryMaterial` use the exact same `PriceSummary` shape as `DiagnosticPricingPayload.priceSummary`/`.priceSummaryMaterial`.
- [ ] `claim.priceSummaryMaterial` aggregates only the claim's own distributable-position rows, same rule as API-2's `priceSummaryMaterial`.
- [ ] The validate route follows the same merge semantics as API-2 ("Backend merge semantics" above), scoped to the claim's own last-saved `materials[]` rather than the diagnostic's.
- [ ] `jobDiagnostic` (sent only on the full `PUT`) is structurally identical to API-2's `diagnostic` response shape — no claim-specific fields leak into it.
- [ ] `ClaimPricingResult` is identical, field-for-field, to `DiagnosticPricingResult`'s `diagnostic` sub-shape, just nested under `claim` instead — one frontend rendering path for both surfaces.
- [ ] Confirm with backend whether `claim.id`/`ascId`/`customerId`/`ascName`/`countryCode` are still needed in-body on the full `PUT` given they're derivable from `claimId` (path) plus the claim record backend already holds, or can be dropped as redundant.

---

## API-4: `POST /v1/jobs/flow/validate-and-save` — the reference implementation of `DiagnosticPricingPayload`

**Purpose**: No route change. This ticket (a) confirms the behavioral invariant from the original spec (a successful response always includes complete `materials[]`/`priceSummary`), and (b) formalizes that this endpoint's request *is* the reference shape `DiagnosticPricingPayload` above is modeled on, and its response *is* `DiagnosticPricingResult` — API-2's lean request merges onto exactly the state this endpoint last persisted.

**Current response** (unchanged, now named): `errorMessages: Record<string, string>[]`, plus the fields of `DiagnosticPricingPayload` — today flattened at the top level (`diagnostic?`/`materials?`/`archivedMaterials?`/`actionType?`/`jobType?`/...) rather than nested under a `diagnostic` key the way API-2 nests it. Not required to change just for nesting consistency — the field *names and shapes* aligning is what matters for one shared frontend type to serve both endpoints.

**Requested contract tightening** (unchanged from the original spec): whenever `errorMessages` is empty (success), `materials[]` and `priceSummary` **must** be fully populated and internally consistent. Today the frontend cannot trust this and re-derives via client-side calculation as a defensive measure; this ticket asks the backend to confirm/guarantee that invariant so the frontend can delete the re-derivation step. This invariant is also what API-2 depends on for correctness — it's the "last-saved baseline" API-2 merges onto.

**New in this revision**: add `priceSummaryMaterial` to the response (and accept it, if sent, on the request) — matching `DiagnosticPricingPayload.priceSummaryMaterial`. This endpoint has no per-distributable-position summary today; the frontend currently derives it entirely client-side (`aggregateRowPrices`). Same "summary/summaryMaterial move to backend-computed" change described in `items-and-prices-refactor.md` §6, landing here (not only on the new API-2 endpoint) since validate-and-save is the endpoint that actually persists the confirmed summary.

**Acceptance criteria**:
- [ ] Backend confirms (or fixes) that a `200` response with no `errorMessages` always includes complete, authoritative `materials[].price` and `priceSummary`.
- [ ] `priceSummaryMaterial` added to the response, aggregating the distributable positions only (see API-1's `isProtected === false`).
- [ ] Every row in a successful response comes back with `isValidated: true` — a successful save confirms every row it persists, whether or not that row was `isValidated: true` going into the request.
- [ ] No frontend-visible request shape change beyond optionally sending `priceSummaryMaterial`/`isValidated` (additive, ignorable by backend if unused).
- [ ] Field names for `materials[]`/`priceSummary` match `MaterialRow`/`PriceSummary` above exactly (this is largely already true — this criterion exists to catch drift, not to request a rename).
- [ ] Response is structurally identical to `DiagnosticPricingResult` used by API-2 — same field names, same nesting, so one frontend type/rendering path serves both.

---

## Suggested Jira ticket breakdown

1. **[BE] Item Policy Config endpoint** — API-1 (`GET /v1/countries/{cc}/item-policy`, policy overlay only — no rule-data duplication). Independent, low risk. Supports FE Phase 2.
2. **[BE] Align validate-and-save on `DiagnosticPricingPayload`/`DiagnosticPricingResult`** — API-4. Confirms the existing success invariant and adds `priceSummaryMaterial` to the response. Low risk, no request shape change. Do this **first** among 2–5: API-2/API-3 are typed against — and, for API-2, literally merge onto — this endpoint's persisted state, so confirming/adjusting it first avoids rework.
3. **[BE] Diagnostic price validate endpoint** — API-2 (`POST /v1/diagnostic/{jobId}/prices/validate`). Net-new endpoint, lean dirty-rows-only request, reuses `DiagnosticPricingResult` from #2 as its response. Supports FE Phase 3; FE work can proceed against a local simulator until this lands. The merge-onto-last-saved-state behavior is the one piece of backend logic this ticket needs to get right beyond pure math — flag it explicitly for backend design review.
4. **[BE] Confirm current PUT claim prices shape** — API-3, migration-notes acceptance criteria only (contract confirmation of what's already shipped — `PutClaimPricesRequest` in `claims.types.ts` — no code change expected). Already unblocked the frontend typing work from Part B.
5. **[BE] Align claim prices to the shared `MaterialRow`/`PriceSummary`/`jobDiagnostic` shape, and add the claim validate route** — API-3's full revision: rename `materials[].jobType`→`type`, `claimPriceSummary`→`priceSummary` on the existing `PUT`, and add the net-new `POST /v1/claims/{claimId}/prices/validate` (same lean shape and merge semantics as #3, scoped to the claim). Depends on #2/#3 (reuses their types and merge-semantics design) and follows #4 (don't touch the existing `PUT` shape until it's confirmed). Larger than the original "upgrade the response" ticket — this also adds a route.

Ticket 1 can be scheduled independently of 2–5. Ticket 4 can start immediately (no dependency); tickets 2, 3, 5 have the dependency order noted above.
