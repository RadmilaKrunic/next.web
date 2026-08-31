# Items & Prices — Backend

> API contracts for the items & pricing redesign. See **Items & Prices — Overview** for context and **Items & Prices — Frontend** for the client-side implementation. Written at ticket grain — each endpoint section is self-contained enough to paste into a backend ticket.

## Conventions

- Base URL / auth: existing `VITE_API_BASE_URL`, JWT bearer token, cookie session — same as every other endpoint.
- Validation failures are reported **in-body on HTTP 200** (`errorMessages`), matching the existing `validate-and-save` convention. No new `422` handling.
- `401`/`403` behave exactly as today (redirect-to-login / logout).

---

## API-1: `GET /v1/countries/{countryCode}/item-policy`

**Purpose**: Serves the frontend-policy overlay — position permissions/protection, editability-by-context rules, warranty gating, claim-surface overrides. Does **not** include `automaticRows`, `allowedPositions`, `discountBase`, `addSpecialMaterialsAllowed`, or `enforceSparepartExists` — that data already exists on the `country-configuration` endpoint's `diagnosticsConfiguration` field and should not be duplicated.

**Request**: `GET`, path param `countryCode`. No body, no query params.

**Response `200`**:
```ts
interface ItemPolicyConfigResponse {
  version: string;                 // monotonic — frontend no-ops re-render if unchanged
  countryCode: string;
  positions: {
    position: string;              // "LA" | "FR" | "PN" | "SP" | "AC" | "PC"?
    isProtected: boolean;
    permissions: {
      canView: string;             // permission key, e.g. "DL_V"
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
    isEditable: boolean;           // which of totalAmount/netAmount is shown is derived from
                                    // discountBase client-side, not stored here
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

**Reference values this must reproduce** (today's frontend-hardcoded rules):

| Position | canView | canDelete | canEditUnits | canEditUnitPrice | canEditDiscount | canEditTotal |
|---|---|---|---|---|---|---|
| LA | `DL_V` | `DL_I` | `DLUE` | `DLPE` | `DLDE` | `DLTE` |
| FR | `DF_V` | `DF_I` | `DFUE` | `DFPE` | `DFDE` | `DFTE` |
| PN | `DT_V` | `DT_I` | `DTEU` | `DTEP` | `DTDE` | `DTTE` |
| SP | `DS_V` | `DS_I` | `DSUE` | `DSPE` | `DSDE` | `DSTE` |
| PC | `DS_V` | `DS_I` | `DSUE` | `DSPE` | `DSDE` | `DSTE` |

`isProtected: true` for `LA`, `FR`, `PC` (backend/automatic rows); `false` for `PN`, `SP`, `AC` (the "distributable" positions eligible for summary-level discount distribution). `PC` was never observed in real TR/ZA `diagnosticsConfiguration.rules` data — confirm with product whether it's still a live value before committing to it here.

Price-field editability rule today: a row's discount/total/net fields are editable only when `jobType === "COMMERCIAL_GOODWILL"`, or when `jobType === "CHARGEABLE"` **and** the position is protected.

**Errors**: `404` unknown `countryCode`. `401`/`403` per convention.

**Non-functional**: fetched once per country per session (`staleTime: Infinity` client-side); payload expected small (<20KB).

**Acceptance criteria**:
- [ ] `positions[]` covers at minimum LA, FR, PN, SP, AC with the permission-key values above; confirm PC before including it.
- [ ] `surfaceOverrides.claimSpareParts` encodes the claim-side "editable only for new rows, only while not pending" rule as `editability[]` entries.
- [ ] `version` changes whenever any policy value changes.
- [ ] Response contains no rule data (`automaticRows`/`allowedPositions`/`discountBase`/`addSpecialMaterialsAllowed`) — that stays on `country-configuration`.

---

## Shared pricing types (used by API-2, API-3, API-4)

```ts
interface Price {
  discount: number; suggestedNetPrice: number; taxAmount: number; unitPrice: number;
  netAmount: number; tax: number; taxTypes?: string[]; grossAmount: number;
  totalAmount: number; discountAmount?: number;
}

// A material/spare-part row — shared by diagnostic and claim materials/archivedMaterials.
interface MaterialRow {
  rowId: string;                 // stable client-generated id, not array-index-derived —
                                  // correlates a request row to its response row/error
  id?: string;                   // absent for a brand-new, not-yet-saved row
  order?: number;
  position: string;
  partNumber: string;
  description: string;
  type: string;
  quantity: number;
  status?: string;                // the row's real approval status ("APPROVED"/"PENDING"/
                                   // "REVISED"/"REJECTED"/...), as already returned by the API
                                   // today. Not related to price-validation confirmation —
                                   // that's MaterialRowResult.changeStatus below, a different field.
  notBelongsToTool?: boolean;
  isPriceSetManually: boolean;
  isValidated: boolean;          // false until this row has received one "confirmed" response.
                                  // Distinguishes "never priced, nothing to show" from "has a
                                  // last-known price, now being revalidated." Does NOT gate
                                  // whether a row belongs in a validate request (see below) —
                                  // every dirty row goes in regardless.
  price: Price | null;           // null = "not yet priced, please calculate"
}

type PriceSummary = Omit<Price, "unitPrice" | "tax"> & { discountAmount: number };
type SummaryFieldName = keyof PriceSummary;
type PriceFieldName = "quantity" | "unitPrice" | "netAmount" | "suggestedNetPrice"
  | "tax" | "grossAmount" | "discount" | "totalAmount";

// The full diagnostic payload — sent as validate-and-save's request, and what every
// pricing call's response is built from.
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
  priceSummaryMaterial?: PriceSummary;
}

type MaterialRowResult = MaterialRow & { changeStatus: "confirmed" | "error"; errorMessage?: string };

interface PriceValidateErrorMessage {
  rowId?: string;
  field?: string;
  message: string;
}

// Returned identically by validate (API-2) and validate-and-save (API-4) — one response
// shape, one frontend rendering path, regardless of which call produced it. Always the FULL
// current diagnostic, not just the rows the request touched.
interface DiagnosticPricingResult {
  requestId?: string;              // present on validate's response; absent on validate-and-save's
  diagnostic: Omit<DiagnosticPricingPayload, "materials" | "archivedMaterials"> & {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
  };
  errorMessages?: PriceValidateErrorMessage[];
}

// The lean "what changed since the last save" request a validate call sends.
interface ChangedMaterialRow {
  rowId: string;
  row: MaterialRow;                  // this row's full current (post-edit) values
  changedField?: PriceFieldName;     // set only on the row that triggered THIS call; omitted
                                      // on other rows still dirty from an earlier edit
}

interface ChangedSummary {
  target: "priceSummary" | "priceSummaryMaterial";
  summary: PriceSummary;             // frontend's optimistic redistribution result
  changedField: SummaryFieldName;
}
```

### Backend merge semantics

The debounced validate calls (API-2, and the claim equivalent under API-3) stay **stateless and idempotent** while still sending a lean request, via one rule: **the backend always starts from the diagnostic's/claim's last-saved state and merges the request's dirty rows on top of it** before recomputing.

1. The frontend tracks which rows are **dirty** — edited, or newly added, since the last successful save.
2. Every validate call sends the full current values of every dirty row (usually just one) — not the whole row set. This is safe precisely because the frontend keeps resending every still-dirty row on each call, not just the newest edit.
3. The backend loads its own last-saved copy (by `jobId`+`diagnosticId`, or `claimId`), overlays the request's dirty rows on top by `rowId` (matched to `id` where already saved), recomputes every row's price and both summaries against that merged set, and returns the **whole** result — not just the rows sent.
4. A brand-new row (`isValidated: false`, no `id`) has no baseline at all — it exists purely because it's in the request. It must be resent on every call until it's saved.

This is why the response is always the full diagnostic/claim even though the request is lean: the frontend needs `priceSummary`/`priceSummaryMaterial` across *all* rows, and only the backend knows both the saved baseline and the incoming changes.

---

## API-2: `POST /v1/diagnostic/{jobId}/prices/validate`

**Purpose**: The core backend-source-of-truth pricing call for the job diagnostics tab. Replaces client-side price calculation as the authority for what's rendered.

**Trigger/cadence**: Debounced 500ms client-side, one call per field edit in the common case. Sends only the rows dirty since the diagnostic's last save.

**Request**:
```ts
interface PriceValidateRequest {
  requestId: string;                   // client-generated UUID, echoed back verbatim
  changedRows: ChangedMaterialRow[];   // every row dirty since the last save — usually 1 entry
  changedSummary?: ChangedSummary;     // set when priceSummary/priceSummaryMaterial was edited directly
}
```

**Response `200`**: `DiagnosticPricingResult` (shared type above) — the full current diagnostic, `requestId` echoed.

**Validation rules**:
- Load the diagnostic's last-saved state by `jobId` (+ `diagnosticId`), overlay `changedRows`/`changedSummary` on top, recompute against the **merged** set — never against `changedRows` alone.
- Every row's price must be internally consistent for the country's `discountBase` mode (`GROSS_PRICE`/`NET_PRICE`) — this is the single implementation of that math, replacing the frontend's duplicate (which becomes optimistic-preview-only).
- `priceSummaryMaterial` aggregates only rows in the distributable position set (`SP`/`PN`/`AC` today — should be driven by API-1's `isProtected === false`, not hardcoded independently).
- When `changedSummary` names `priceSummary`/`priceSummaryMaterial`, recompute that summary's redistribution independently of the client-sent value — it's the frontend's preview, not authoritative.
- Reject via row-level `changeStatus: "error"` (not silent clamping) whenever a computed value would be negative or a price lookup fails.
- A row returned `changeStatus: "confirmed"` always comes back with `isValidated: true`.

**Errors**: always `200` for validation-level failures. `400` only for structurally malformed requests (missing `jobId`, or both `changedRows` empty and `changedSummary` absent). `401`/`403` per convention.

**Non-functional**:
- Target p95 < 400ms — this is the primary UX risk of moving pricing authority server-side.
- Request payload is `O(dirty rows)`, not `O(total rows)` — the point of the lean design, especially for mobile ASC connectivity. Response stays `O(total rows)` intentionally (see merge semantics).
- Tolerates out-of-order delivery: the frontend discards any response whose `requestId` isn't the latest it issued.
- Idempotent for the same `requestId`. No side effects beyond computing prices — does not persist anything.

**Example — a single field edit**:
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
// Response — every row, including untouched rows the backend already had saved
{
  "requestId": "b1e7...",
  "diagnostic": {
    "jobId": "J-1001", "actionType": "REPAIR", "jobType": "CHARGEABLE", "status": "IN_DIAGNOSTICS",
    "typeOfUsage": "PRIVATE", "faultCode": "F1", "faultCodeDescription": "...", "faultCodeLabourQuantity": 1,
    "materials": [
      { "rowId": "row-3f2a", "id": "M-1", "position": "SP", "partNumber": "1609888887",
        "description": "...", "type": "CHARGEABLE", "quantity": 2, "isPriceSetManually": false, "isValidated": true, "changeStatus": "confirmed",
        "price": { "unitPrice": 45.5, "suggestedNetPrice": 91.0, "netAmount": 91.0, "tax": 20,
                   "taxAmount": 18.2, "grossAmount": 109.2, "discount": 10, "totalAmount": 98.28 } },
      { "rowId": "row-9c11", "id": "M-2", "position": "LA", "partNumber": "", "description": "Labour",
        "type": "CHARGEABLE", "quantity": 1, "isPriceSetManually": false, "isValidated": true, "changeStatus": "confirmed",
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

**Acceptance criteria**:
- [ ] Response prices match the frontend's existing calculation output to 2 decimal places, in both `discountBase` modes.
- [ ] `priceSummary`/`priceSummaryMaterial` match the frontend's aggregation for the equivalent full row set.
- [ ] A row omitted from `changedRows` is returned unchanged from the backend's last-saved state — never missing.
- [ ] A row returned `changeStatus: "confirmed"` always has `isValidated: true`.
- [ ] Stale `requestId` responses are safely ignorable by the client.
- [ ] Response shape (`DiagnosticPricingResult`) is identical, field-for-field, to API-4's response.

---

## API-3: `PUT /v1/claims/{claimId}/prices` + `POST /v1/claims/{claimId}/prices/validate`

**Purpose**: Same authority shift as API-2, scoped to claims. The claim owns its own editable material rows (shaped identically to the diagnostic's), plus a read-only mirror of the parent diagnostic (`jobDiagnostic`).

Two calls, same split as API-2/API-4:
- **`PUT /v1/claims/{claimId}/prices`** (existing route) — full save, sends the claim's complete `materials[]`.
- **`POST /v1/claims/{claimId}/prices/validate`** (net-new, mirrors API-2's URL pattern) — lean, non-persisting, debounced.

**Shared response** (both calls return this):
```ts
interface ClaimPricingResult {
  requestId?: string;              // present on validate's response; absent on PUT's
  claim: {
    materials: MaterialRowResult[];
    archivedMaterials?: MaterialRowResult[];
    priceSummary: PriceSummary;
    priceSummaryMaterial?: PriceSummary;
  };
  errorMessages?: PriceValidateErrorMessage[];
}
```

**Validate request** — same lean shape as API-2's, scoped to the claim's own rows. `jobDiagnostic` is **not** resent here — it's read-only from the claim's perspective and doesn't change from claim edits:
```ts
interface ClaimPriceValidateRequest {
  requestId: string;
  jobId: string;
  diagnosticId: string;
  changedRows: ChangedMaterialRow[];
  changedSummary?: ChangedSummary;
}
```

**Full save request**:
```ts
interface PutClaimPricesRequest {
  id: string; jobId: string; ascId: string; customerId: string; ascName: string;
  diagnosticId: string; countryCode: string; actionType: string; jobType: string;
  typeOfUsage: string; faultCode: string; faultCodeDescription: string;
  faultCodeLabourQuantity: number; exchangeReason: string; claimStatus: string;
  claimNotes: unknown; customer: unknown; job: unknown;
  materials: MaterialRow[];
  archivedMaterials: MaterialRow[];
  priceSummary: PriceSummary;
  priceSummaryMaterial?: PriceSummary;
  jobDiagnostic: DiagnosticPricingPayload;   // same shape as API-2's diagnostic, passed through
}
```

**Alignment needed on the frontend** (tracked separately, not blocking):
- `materials[].jobType` → `materials[].type` — today's field name collides with the claim's own top-level `jobType`.
- `claimPriceSummary` → `priceSummary` — key rename for parity with the diagnostic shape.

**Errors**: same in-body convention as API-2.

**Acceptance criteria**:
- [ ] `claim.materials[]` uses the exact same `MaterialRow` shape as API-2's `diagnostic.materials[]` — field names match, including `type` (not `jobType`) and `isValidated`.
- [ ] `claim.priceSummary`/`priceSummaryMaterial` use the exact same `PriceSummary` shape.
- [ ] The validate route follows the same merge semantics as API-2, scoped to the claim's last-saved materials.
- [ ] `jobDiagnostic` (sent only on the full `PUT`) is structurally identical to API-2's diagnostic shape.
- [ ] `ClaimPricingResult` is field-for-field identical to `DiagnosticPricingResult`'s `diagnostic` sub-shape, just nested under `claim`.

---

## API-4: `POST /v1/jobs/flow/validate-and-save`

**Purpose**: No route change. This is the reference implementation `DiagnosticPricingPayload`/`DiagnosticPricingResult` above are modeled on — API-2's lean request merges onto exactly the state this endpoint last persisted.

**Requested contract tightening**: whenever `errorMessages` is empty (success), `materials[]` and `priceSummary` must be fully populated and internally consistent, so the frontend can delete its defensive client-side re-derivation.

**New**: add `priceSummaryMaterial` to the response (and accept it on the request, if sent) — this endpoint has no per-distributable-position summary today.

**Acceptance criteria**:
- [ ] A `200` with no `errorMessages` always includes complete, authoritative `materials[].price` and `priceSummary`.
- [ ] `priceSummaryMaterial` added, aggregating distributable positions only.
- [ ] Every row in a successful response comes back with `isValidated: true`.
- [ ] Response is structurally identical to `DiagnosticPricingResult` used by API-2.

---

## Suggested ticket breakdown & sequencing

1. **Item Policy Config endpoint** — API-1. Independent, low risk.
2. **Align validate-and-save on `DiagnosticPricingPayload`/`DiagnosticPricingResult`** — API-4. Do this **first**: everything else is typed against — and, for API-2, literally merges onto — this endpoint's persisted state.
3. **Diagnostic price validate endpoint** — API-2. Net-new, reuses the response type from #2. The merge-onto-last-saved-state behavior is the one piece of logic here beyond pure math — flag it for backend design review.
4. **Confirm current PUT claim prices shape** — contract confirmation only, no code change expected. Can start immediately.
5. **Align claim prices to the shared shape + add the claim validate route** — depends on #2/#3, follows #4.

Ticket 1 is independent. Ticket 4 has no dependency. Tickets 2, 3, 5 follow the order above.
