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

**Revision note**: API-2 and API-3 were originally specified with two unrelated shapes — API-2 as a lean `changedRows[]` diff array keyed by `rowId`, API-3 as the claim's existing full-`materials[]` payload (itself using different field names from the job side's `JobDiagnostic`, e.g. `jobType` per material instead of `type`). Reviewing the real `JobDiagnostic` type (`JobList.types.ts:174-229`) and the real `onValidateClaim` payload (`ClaimOverview.tsx:346-444`) shows: (a) diagnostic and claim materials are both edited through the same metadata-driven Formik fields, with the same `attributeMapping`-based field→API mapping (`mapValuesToAPI`) producing the same shape either way; (b) `POST /v1/jobs/flow/validate-and-save` already sends/receives the **full** `materials[]` array on every call — there is no existing "send only what changed" endpoint to diverge from; and (c) claim's `jobDiagnostic` field is already, today, a verbatim pass-through of the parent `JobDiagnostic` object (`ClaimOverview.tsx:443`). Given that, API-2 keeping a bespoke diff shape would mean the frontend maintains two different row representations — and two different mapping paths — for what is functionally the same edit. **API-2, API-3, and the existing validate-and-save endpoint (API-4) now share one payload shape**, differing only in the small envelope each needs.

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
                                  // used to correlate a request row to its response row/error
                                  // and to name rows in changedRowIds/changedFields below.
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
                                  // with status: "confirmed". A row the user just added has
                                  // nothing to diff against yet, so it must not be treated the
                                  // same as an edit to a row that already has a confirmed price —
                                  // see the changedRowIds/changedFields rule below.
  price: Price | null;           // null = "not yet priced, please calculate" (existing contract
                                  // — see buildDiagnosticPayload's price?.unitPrice === null
                                  // check in JobOverview.tsx)
}

// Same field set as today's ValidateAndSaveResponse.priceSummary (JobList.types.ts:220-228).
// priceSummaryMaterial is a new addition needed for the summaryMaterial concept from
// items-and-prices-refactor.md §6 — JobDiagnostic has no per-position-group summary today.
type PriceSummary = Omit<Price, "unitPrice" | "tax"> & { discountAmount: number };
type SummaryFieldName = keyof PriceSummary;

// The full diagnostic payload — same shape validate-and-save already sends/returns today
// (JobDiagnostic in JobList.types.ts:174-229), typed here as the one shape every pricing call
// (validate and validate-and-save alike) reuses.
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
```

**What "validate" adds on top of "validate-and-save"**: both send/receive the same `DiagnosticPricingPayload`. The debounced, non-persisting "validate" calls (API-2, and the claim equivalent in API-3) additionally carry small fields identifying what triggered the call, instead of the backend having to diff the full row set itself:

```ts
interface ChangeTrigger {
  changedRowIds: string[];                   // rowId(s) touched since the last confirmed response —
                                               // only rows where isValidated === true belong here (see below)
  changedFields: { rowId: string; field: "quantity" | "unitPrice" | "netAmount"
    | "suggestedNetPrice" | "tax" | "grossAmount" | "discount" | "totalAmount" }[];
  changedSummaryFields: { target: "priceSummary" | "priceSummaryMaterial"; field: SummaryFieldName }[];
}
```

`field` reuses the frontend's row-level calculation engine's field vocabulary (`FieldName` in `src/utils/priceCalculator.ts`), but aligned to the persisted `Price` type's names (`tax`/`discount`) rather than the calculator's internal `taxPercent`/`discountPercent` — one vocabulary now serves both the wire contract and the persisted shape.

**Editing the summary rows directly** (`onSummaryDiscountChange` et al., today backed by client-side `distributeGrossToRows`/`distributeNetToRows` — see `items-and-prices-refactor.md` §6): the user can edit `priceSummaryMaterial`'s (and `priceSummary`'s) own fields directly — e.g. changing the material summary's discount% redistributes it across the distributable rows. This is **not** a `MaterialRow` edit, so it can't be named via `changedFields`'s `rowId`. `changedSummaryFields` names it instead: `{ target: "priceSummaryMaterial", field: "discount" }`. The request still carries the frontend's locally-redistributed `diagnostic.priceSummaryMaterial` **and** the affected rows' `diagnostic.materials[]` (same client-side `distributeGrossToRows`/`distributeNetToRows` output the frontend already renders optimistically today) — the backend recomputes authoritatively from `changedSummaryFields` rather than trusting the client's distribution, exactly like a row-level edit is recomputed from `changedFields` rather than trusted as-is.

**`isValidated` gates what counts as "changed"**: a row with `isValidated: false` (just added by the user, never yet confirmed by the backend) is priced for the first time on every call it's part of — there's no prior confirmed value to diff against, so it must never appear in `changedRowIds`/`changedFields`. It's still present in `diagnostic.materials[]` (the backend needs to price it), just not flagged as an edit. Only rows with `isValidated: true` — i.e. already confirmed at least once — can legitimately appear in `changedRowIds`/`changedFields`, since only those have a "before" state for the flag to mean anything against. The backend sets `isValidated: true` on a row in its response once that row comes back `status: "confirmed"`; the frontend persists that flag onto the row going forward.

---

## API-2: `POST /v1/diagnostic/{jobId}/prices/validate`

**Purpose**: The core backend-source-of-truth pricing call for the job diagnostics tab. Replaces client-side price calculation as the authority for what's rendered; the frontend renders the response directly with no re-derivation. Supports FE Phase 3.

**Trigger/cadence**: Debounced 500ms client-side. Called with the diagnostic's full current material set — same as validate-and-save would send — plus `changedRowIds`/`changedFields` identifying what the user just edited, so the backend knows what to prioritize without diffing.

**Request**:
```ts
interface PriceValidateRequest extends ChangeTrigger {
  requestId: string;               // client-generated UUID, echoed back verbatim
  diagnostic: DiagnosticPricingPayload;
}
```

**Response `200`**:
```ts
interface PriceValidateResponse {
  requestId: string;               // must equal request.requestId
  diagnostic: Omit<DiagnosticPricingPayload, "materials" | "archivedMaterials"> & {
    materials: (MaterialRow & { status: "confirmed" | "error"; errorMessage?: string })[];
    archivedMaterials?: (MaterialRow & { status: "confirmed" | "error"; errorMessage?: string })[];
  };
  errorMessages?: { rowId?: string; field?: string; message: string }[];
}
```

**Validation rules (backend-side)**:
- Every row's `price` must be internally consistent for the country's `discountBase` mode — the backend becomes the single implementation of the GROSS_PRICE/NET_PRICE math currently duplicated on the frontend (frontend keeps a copy only for optimistic preview; see `src/utils/priceCalculator.ts` for the exact formulas to match).
- `priceSummaryMaterial` aggregates only rows whose `position` is in the distributable set (`SP`, `PN`, `AC` today; should be driven by API-1's `positions[].isProtected === false`, not hardcoded independently).
- Every row with `isValidated: false` must be (re)computed on every call it appears in, regardless of `changedRowIds` — it has no prior confirmed state. A row with `isValidated: false` must never appear in `changedRowIds`/`changedFields`; reject the request (`400`) if one does, since that combination is meaningless (nothing to have changed from).
- Beyond that, only rows named in `changedRowIds`, or referenced by `changedSummaryFields` (which can imply redistribution across distributable rows), strictly need recomputation; other rows may be echoed back with whatever `status` reflects their last-known state (informational, not authoritative for unedited rows).
- When `changedSummaryFields` names `priceSummaryMaterial` (or `priceSummary`), the backend recomputes that summary's redistribution independently of the client-sent value — the request's `diagnostic.priceSummaryMaterial` is the frontend's optimistic preview, not authoritative.
- Reject (`status: "error"` on that row) rather than silently clamp, whenever a computed value would be negative or a required price lookup fails (mirrors today's "price not available" behavior on validate-and-save).

**Errors**: always HTTP `200` for validation-level failures (per-row `status: "error"` + `errorMessage`, and/or top-level `errorMessages[]`). `400` only for structurally malformed requests (missing `jobId`, empty `diagnostic.materials`). `401`/`403` per existing convention.

**Non-functional**:
- Target p95 < 400ms — the debounce + round-trip should not feel laggier than today's instant client-side math. Flag for backend capacity planning; this is the primary UX risk of moving pricing authority server-side. Sending the full material set (not just a diff) on every call makes payload size, not row count, the thing to capacity-plan against — flag if a diagnostic can realistically have enough rows for this to matter.
- Must tolerate out-of-order delivery: the frontend discards any response whose `requestId` isn't the latest one it issued; no server-side ordering guarantee is required.
- Idempotent for the same `requestId` — safe to retry on client network failure. This is the one behavioral difference from validate-and-save/API-4: this endpoint has no side effects beyond computing/returning prices — it does not persist anything.

**Example 1 — a row-level edit (existing, already-validated row)**:
```json
// Request
{
  "requestId": "b1e7...",
  "changedRowIds": ["row-3f2a"],
  "changedFields": [{ "rowId": "row-3f2a", "field": "quantity" }],
  "changedSummaryFields": [],
  "diagnostic": {
    "jobId": "J-1001", "actionType": "REPAIR", "jobType": "CHARGEABLE", "status": "IN_DIAGNOSTICS",
    "typeOfUsage": "PRIVATE", "faultCode": "F1", "faultCodeDescription": "...", "faultCodeLabourQuantity": 1,
    "materials": [
      { "rowId": "row-3f2a", "id": "M-1", "position": "SP", "partNumber": "1609888887",
        "description": "...", "type": "CHARGEABLE", "quantity": 2, "isPriceSetManually": false, "isValidated": true,
        "price": { "unitPrice": 45.5, "suggestedNetPrice": 45.5, "netAmount": 45.5, "tax": 20,
                   "taxAmount": 9.1, "grossAmount": 54.6, "discount": 10, "totalAmount": 49.14 } },
      { "rowId": "row-9c11", "id": "M-2", "position": "LA", "partNumber": "", "description": "Labour",
        "type": "CHARGEABLE", "quantity": 1, "isPriceSetManually": false, "isValidated": true,
        "price": { "unitPrice": 20, "suggestedNetPrice": 20, "netAmount": 20, "tax": 20,
                   "taxAmount": 4, "grossAmount": 24, "discount": 0, "totalAmount": 24 } }
    ],
    "priceSummary": { "suggestedNetPrice": 65.5, "netAmount": 65.5, "taxAmount": 13.1, "grossAmount": 78.6,
                       "discount": 10, "discountAmount": 10.92, "totalAmount": 73.14 }
  }
}
// Response
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

**Example 2 — a summary-level discount edit that redistributes across rows, alongside a brand-new unvalidated row**: the user directly edits `priceSummaryMaterial`'s discount%, which the frontend optimistically redistributes across `SP row-3f2a` and `PN row-7bd1`; `row-7bd1` was just added this session and has never been confirmed, so it rides along in `materials[]` but is absent from `changedRowIds`/`changedFields`.
```json
// Request (abbreviated — only the fields relevant to this example)
{
  "requestId": "c2f9...",
  "changedRowIds": ["row-3f2a"],
  "changedFields": [],
  "changedSummaryFields": [{ "target": "priceSummaryMaterial", "field": "discount" }],
  "diagnostic": {
    "...": "envelope fields as above",
    "materials": [
      { "rowId": "row-3f2a", "id": "M-1", "position": "SP", "...": "as above", "isValidated": true,
        "price": { "...": "frontend's optimistic redistribution result" } },
      { "rowId": "row-7bd1", "position": "PN", "partNumber": "", "description": "", "type": "CHARGEABLE",
        "quantity": 1, "isPriceSetManually": false, "isValidated": false,
        "price": null }
    ],
    "priceSummary": { "...": "..." },
    "priceSummaryMaterial": { "...": "frontend's optimistic redistribution result — not authoritative" }
  }
}
// Response
{
  "requestId": "c2f9...",
  "diagnostic": {
    "...": "envelope fields echoed back",
    "materials": [
      { "rowId": "row-3f2a", "...": "backend-recomputed redistribution", "isValidated": true, "status": "confirmed" },
      { "rowId": "row-7bd1", "...": "priced for the first time", "isValidated": true, "status": "confirmed" }
    ],
    "priceSummary": { "...": "..." },
    "priceSummaryMaterial": { "...": "backend-authoritative redistribution" }
  }
}
```

**Acceptance criteria**:
- [ ] Response `diagnostic.materials[].price` for rows in `changedRowIds` matches the frontend's existing calculation output to 2 decimal places, for the same inputs, in both `discountBase` modes — verified via a shared fixture/contract test during the Phase-3 feature-flag rollout.
- [ ] `priceSummary`/`priceSummaryMaterial` match the frontend's existing aggregation output for the same row set, including when redistribution was triggered via `changedSummaryFields` rather than a row edit.
- [ ] A row with `isValidated: false` is always (re)computed, and is rejected (`400`) if it appears in `changedRowIds`/`changedFields`.
- [ ] A row returned with `status: "confirmed"` always comes back with `isValidated: true`, regardless of what the request sent for that row.
- [ ] Stale `requestId` responses are safely ignorable by the client.
- [ ] Row-level `status: "error"` used for negative-amount/lookup-failure cases instead of silent clamping.
- [ ] Request/response `diagnostic` shape is structurally identical to API-4's (`POST /v1/jobs/flow/validate-and-save`) request/response — the only allowed differences are the added `rowId`/`isValidated`/`status`/`errorMessage` fields on each row, and the top-level `changedRowIds`/`changedFields`/`changedSummaryFields`/`requestId`.

---

## API-3: `PUT /v1/claims/{claimId}/prices` (aligned to the shared diagnostic shape)

**Purpose**: Same authority shift as API-2, scoped to claims. The claim owns its own editable material rows — separate from, but now shaped identically to, the parent diagnostic's — plus a read-only mirror of the parent diagnostic (`jobDiagnostic`) that today is already passed through verbatim (`ClaimOverview.tsx:443`). This revision aligns the claim's own `materials`/summary to the same `MaterialRow[]`/`PriceSummary` types API-2 uses; only the envelope differs (claim-specific fields, plus `jobDiagnostic`).

**Request**:
```ts
interface ClaimPriceValidateRequest extends ChangeTrigger {
  requestId: string;
  jobId: string;
  diagnosticId: string;
  claim: {
    id: string;                    // claimId — also in the URL path; kept here too, matching
                                    // today's shipped payload, until confirmed path-only suffices
    ascId: string;
    customerId: string;
    ascName: string;
    countryCode: string;
    claimStatus: string;
    claimNotes: unknown;
    customer: unknown;
    job: unknown;
    materials: MaterialRow[];
    archivedMaterials?: MaterialRow[];
    priceSummary: PriceSummary;            // renamed from today's claimPriceSummary — see migration notes
    priceSummaryMaterial?: PriceSummary;   // NEW — parity with DiagnosticPricingPayload; claims didn't
                                            // have a distributable-positions summary before this revision,
                                            // but items-and-prices-refactor.md §6 already has
                                            // ClaimSummaryArea bridging into the same summary/
                                            // summaryMaterial pair job's SummaryArea renders
  };
  jobDiagnostic: DiagnosticPricingPayload;   // same shape as API-2's diagnostic, passed through
}
```

`ChangeTrigger`'s `changedRowIds`/`changedFields`/`changedSummaryFields` here refer to the **claim's own** `claim.materials`/`claim.priceSummaryMaterial` — never to `jobDiagnostic`'s rows, which are read-only on this endpoint. The same `isValidated` rule applies: a claim material row the user just added is present in `claim.materials[]` but excluded from `changedRowIds`/`changedFields` until it's been confirmed once.

**Response `200`**:
```ts
interface ClaimPriceValidateResponse {
  requestId: string;
  claim: {
    materials: (MaterialRow & { status: "confirmed" | "error"; errorMessage?: string })[];
    archivedMaterials?: (MaterialRow & { status: "confirmed" | "error"; errorMessage?: string })[];
    priceSummary: PriceSummary;
    priceSummaryMaterial?: PriceSummary;
  };
  errorMessages?: { rowId?: string; field?: string; message: string }[];
}
```

**Migration notes** (supersedes this section's original "Migration note"/acceptance criteria, and is a larger contract than the Part B FE-only typing pass already shipped — see below):
- **`materials[].jobType` → `materials[].type`**: today's shipped claim payload (`ClaimOverview.tsx:376`, `src/api/services/claims/claims.types.ts`) names this field `jobType`, which collides in meaning with the diagnostic side's `type` (both hold values like `CHARGEABLE`/`WARRANTY`) and with the claim's own top-level `jobType`. Rename to `type` to match `MaterialRow`. Small, isolated frontend follow-up — not blocking this proposal.
- **`claimPriceSummary` → `priceSummary`**: a key rename for parity with `DiagnosticPricingPayload.priceSummary`; same field set already, except `discountAmount` becomes required (today's shipped `ClaimPriceSummary` has no `discountAmount` field at all — it's computed and sent as part of the summary object per-field today, confirm this is a strict superset before dropping the old shape).
- **This is a bigger contract than the Part B FE-only typing pass shipped** (`PutClaimPricesRequest` in `claims.types.ts`, which typed today's *existing* untyped endpoint as-is, zero behavior change). Adopting `ClaimPriceValidateRequest` above is new backend + frontend work — track as a distinct ticket from the already-shipped Part B pass, not a revision of it.
- Two adoption paths, either acceptable: (a) backend accepts this aligned shape at the existing `PUT /v1/claims/{claimId}/prices` route, retiring today's shape entirely; or (b) if backend prefers not to change the existing persisting route, introduce a new `POST /v1/claims/{claimId}/prices/validate` for the debounced, non-persisting case (mirroring API-2's URL pattern) and keep today's `PUT .../prices` for the final save — recommended if claims should keep the same "validate never persists, save always does" split that job diagnostics has between API-2 and API-4.

**Errors**: same in-body convention as API-2 (no 422).

**Acceptance criteria**:
- [ ] `claim.materials[]`/`claim.archivedMaterials[]` use the exact same `MaterialRow` shape as API-2's `diagnostic.materials[]` — field names, not just field sets, match (in particular `type`, not `jobType`; `isValidated` included).
- [ ] `claim.priceSummary`/`claim.priceSummaryMaterial` use the exact same `PriceSummary` shape as `DiagnosticPricingPayload.priceSummary`/`.priceSummaryMaterial`.
- [ ] `claim.priceSummaryMaterial` aggregates only the claim's own distributable-position rows, same rule as API-2's `priceSummaryMaterial`.
- [ ] A claim material row with `isValidated: false` is rejected (`400`) if it appears in `changedRowIds`/`changedFields`, and always comes back `isValidated: true` once confirmed — same rule as API-2.
- [ ] `jobDiagnostic` is structurally identical to API-2's `diagnostic` request/response shape — no claim-specific fields leak into it.
- [ ] Confirm with backend whether `claim.id`/`ascId`/`customerId`/`ascName`/`countryCode` are still needed in-body given they're derivable from `claimId` (path) plus the claim record backend already holds, or can be dropped as redundant.

---

## API-4: `POST /v1/jobs/flow/validate-and-save` — the reference implementation of `DiagnosticPricingPayload`

**Purpose**: No route change. This ticket (a) confirms the behavioral invariant from the original spec (a successful response always includes complete `materials[]`/`priceSummary`), and (b) formalizes that this endpoint's request/response *is* the reference shape `DiagnosticPricingPayload` above is modeled on — API-2/API-3's `diagnostic`/`jobDiagnostic` are typed to match this endpoint, not the reverse, since this endpoint already exists and already sends/returns the full row set today.

**Current response** (unchanged, now named): `errorMessages: Record<string, string>[]`, plus the fields of `DiagnosticPricingPayload` — today flattened at the top level (`diagnostic?`/`materials?`/`archivedMaterials?`/`actionType?`/`jobType?`/...) rather than nested under a `diagnostic` key the way API-2/API-3 nest it. Not required to change just for nesting consistency — the field *names and shapes* aligning is what matters for one shared frontend type to serve all three endpoints.

**Requested contract tightening** (unchanged from the original spec): whenever `errorMessages` is empty (success), `materials[]` and `priceSummary` **must** be fully populated and internally consistent. Today the frontend cannot trust this and re-derives via client-side calculation as a defensive measure; this ticket asks the backend to confirm/guarantee that invariant so the frontend can delete the re-derivation step.

**New in this revision**: add `priceSummaryMaterial` to the response (and accept it, if sent, on the request) — matching `DiagnosticPricingPayload.priceSummaryMaterial`. This endpoint has no per-distributable-position summary today; the frontend currently derives it entirely client-side (`aggregateRowPrices`). Same "summary/summaryMaterial move to backend-computed" change described in `items-and-prices-refactor.md` §6, landing here (not only on the new API-2 endpoint) since validate-and-save is the endpoint that actually persists the confirmed summary.

**Acceptance criteria**:
- [ ] Backend confirms (or fixes) that a `200` response with no `errorMessages` always includes complete, authoritative `materials[].price` and `priceSummary`.
- [ ] `priceSummaryMaterial` added to the response, aggregating the distributable positions only (see API-1's `isProtected === false`).
- [ ] Every row in a successful response comes back with `isValidated: true` — a successful save confirms every row it persists, whether or not that row was `isValidated: true` going into the request.
- [ ] No frontend-visible request shape change beyond optionally sending `priceSummaryMaterial`/`isValidated` (additive, ignorable by backend if unused).
- [ ] Field names for `materials[]`/`priceSummary` match `MaterialRow`/`PriceSummary` above exactly (this is largely already true — this criterion exists to catch drift, not to request a rename).

---

## Suggested Jira ticket breakdown

1. **[BE] Item Policy Config endpoint** — API-1 (`GET /v1/countries/{cc}/item-policy`, policy overlay only — no rule-data duplication). Independent, low risk. Supports FE Phase 2.
2. **[BE] Align validate-and-save on `DiagnosticPricingPayload`** — API-4. Confirms the existing success invariant and adds `priceSummaryMaterial` to the response. Low risk, no request shape change. Do this **first** among 2–5: API-2/API-3 are typed against this endpoint's shape, so confirming/adjusting it first avoids rework.
3. **[BE] Diagnostic price validate endpoint** — API-2 (`POST /v1/diagnostic/{jobId}/prices/validate`). Net-new endpoint, reuses `DiagnosticPricingPayload` from #2. Supports FE Phase 3; FE work can proceed against a local simulator until this lands.
4. **[BE] Confirm current PUT claim prices shape** — API-3, migration-notes acceptance criteria only (contract confirmation of what's already shipped — `PutClaimPricesRequest` in `claims.types.ts` — no code change expected). Already unblocked the frontend typing work from Part B.
5. **[BE] Align claim prices to the shared `MaterialRow`/`PriceSummary`/`jobDiagnostic` shape** — API-3's full revision (rename `materials[].jobType`→`type`, `claimPriceSummary`→`priceSummary`, decide the "same route vs. new `/validate` route" question). Depends on #2 (reuses `DiagnosticPricingPayload` for `jobDiagnostic`) and follows #4 (don't touch the shape until the current one is confirmed). Larger than the original "upgrade the response" ticket — this also touches the request.

Ticket 1 can be scheduled independently of 2–5. Ticket 4 can start immediately (no dependency); tickets 2, 3, 5 have the dependency order noted above.
