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

## API-2: `POST /v1/diagnostic/{jobId}/prices/validate`

**Purpose**: The core backend-source-of-truth pricing call. Replaces client-side price calculation as the authority for what's rendered; the frontend renders the response directly with no re-derivation. Supports FE Phase 3.

**Trigger/cadence**: Debounced 500ms client-side, coalesced by row. Called with only the rows the user actually edited since the last confirmed response (`changedRows`), plus the IDs of unchanged rows still in scope for summary recomputation (`unchangedRowIds`).

**Request**:
```ts
interface PriceValidateRequest {
  jobId: string;
  actionType: string;
  jobType: string;
  requestId: string;               // client-generated UUID, echoed back verbatim
  changedRows: {
    rowId: string;                 // stable client-generated UUID, not a form-field-derived name
    position: string;
    changedField: "quantity" | "unitPrice" | "netAmount" | "suggestedNetPrice"
                | "taxPercent" | "grossAmount" | "discountPercent" | "totalAmount";
    values: {
      quantity: number; unitPrice: number; taxPercent: number; discountPercent: number;
      suggestedNetPrice: number; netAmount: number; grossAmount: number;
      totalAmount: number; taxAmount: number;
    };
  }[];
  unchangedRowIds: string[];
}
```

**Response `200`**:
```ts
interface PriceValidateResponse {
  requestId: string;               // must equal request.requestId
  rows: {
    rowId: string;
    status: "confirmed" | "error";
    prices: {
      quantity: number; unitPrice: number; suggestedNetPrice: number; netAmount: number;
      taxPercent: number; taxAmount: number; grossAmount: number;
      discountPercent: number; discountAmount: number; totalAmount: number;
    };
    errorMessage?: string;
  }[];
  summary: { type: string; /* ...same price fields as rows[].prices */ };
  summaryMaterial: { type: string; positions: string[]; /* ...same price fields */ };
  errorMessages?: { rowId?: string; field?: string; message: string }[];
}
```

**Validation rules (backend-side)**:
- Every field in a row's `prices` must be internally consistent for the country's `discountBase` mode — the backend becomes the single implementation of the GROSS_PRICE/NET_PRICE math currently duplicated on the frontend (frontend keeps a copy only for optimistic preview; see the reference implementation in `src/utils/priceCalculator.ts` for the exact formulas to match).
- `summaryMaterial` aggregates only rows whose `position` is in the distributable set (`SP`, `PN`, `AC` today; should be driven by API-1's `positions[].isProtected === false`, not hardcoded independently).
- A row not present in `changedRows` or `unchangedRowIds` must not appear in the response.
- Reject (`status: "error"` on that row) rather than silently clamp, whenever a computed value would be negative or a required price lookup fails (mirrors today's "price not available" behavior on `validate-and-save`).

**Errors**: always HTTP `200` for validation-level failures (per-row `status: "error"` + `errorMessage`, and/or top-level `errorMessages[]`). `400` only for structurally malformed requests (missing `jobId`; both `changedRows` and `unchangedRowIds` empty). `401`/`403` per existing convention.

**Non-functional**:
- Target p95 < 400ms — the debounce + round-trip should not feel laggier than today's instant client-side math. Flag for backend capacity planning; this is the primary UX risk of moving pricing authority server-side.
- Must tolerate out-of-order delivery: the frontend discards any response whose `requestId` isn't the latest one it issued for that row; no server-side ordering guarantee is required.
- Idempotent for the same `requestId` — safe to retry on client network failure. This endpoint has no side effects beyond computing/returning prices; it does not persist anything (persistence remains a separate save/validate-and-save call).

**Example**:
```json
// Request
{
  "jobId": "J-1001", "actionType": "REPAIR", "jobType": "CHARGEABLE", "requestId": "b1e7...",
  "changedRows": [{
    "rowId": "row-3f2a", "position": "SP", "changedField": "quantity",
    "values": { "quantity": 2, "unitPrice": 45.5, "taxPercent": 20, "discountPercent": 10,
                "suggestedNetPrice": 45.5, "netAmount": 45.5, "grossAmount": 54.6, "totalAmount": 49.14, "taxAmount": 9.1 }
  }],
  "unchangedRowIds": ["row-9c11", "row-4b02"]
}
// Response
{
  "requestId": "b1e7...",
  "rows": [{ "rowId": "row-3f2a", "status": "confirmed",
    "prices": { "quantity": 2, "unitPrice": 45.5, "suggestedNetPrice": 91.0, "netAmount": 91.0,
                "taxPercent": 20, "taxAmount": 18.2, "grossAmount": 109.2,
                "discountPercent": 10, "discountAmount": 10.92, "totalAmount": 98.28 } }],
  "summary": { "type": "chargeable", "quantity": 0, "unitPrice": 0, "suggestedNetPrice": 91.0, "netAmount": 91.0,
               "taxPercent": 20, "taxAmount": 18.2, "grossAmount": 109.2, "discountPercent": 10,
               "discountAmount": 10.92, "totalAmount": 98.28 },
  "summaryMaterial": { "type": "chargeable", "positions": ["SP", "PN", "AC"], "quantity": 0, "unitPrice": 0,
                        "suggestedNetPrice": 91.0, "netAmount": 91.0, "taxPercent": 20, "taxAmount": 18.2,
                        "grossAmount": 109.2, "discountPercent": 10, "discountAmount": 10.92, "totalAmount": 98.28 }
}
```

**Acceptance criteria**:
- [ ] Response `rows[].prices` matches the frontend's existing calculation output to 2 decimal places, for the same inputs, in both `discountBase` modes — verified via a shared fixture/contract test during the Phase-3 feature-flag rollout.
- [ ] `summary`/`summaryMaterial` match the frontend's existing aggregation output for the same row set.
- [ ] Stale `requestId` responses are safely ignorable by the client.
- [ ] Row-level `status: "error"` used for negative-amount/lookup-failure cases instead of silent clamping.

---

## API-3: `PUT /v1/claims/{claimId}/prices` (formalize existing endpoint)

**Purpose**: Same authority shift as API-2, scoped to claims. Currently untyped in both directions; its response body is unused today by the frontend (success is inferred purely from a subsequent `GET /v1/claims/{claimId}`). This ticket both confirms the existing request contract (frontend-only change, already shipped — see §"Shipped now" in the companion doc) **and** proposes an upgraded response so the frontend can reach parity with API-2 without an extra round trip.

**Request** (current shape, now typed on the frontend):
```ts
interface PutClaimPricesRequest {
  id: string; jobId: string; ascId: string; customerId: string; ascName: string;
  diagnosticId: string; countryCode: string; actionType: string; jobType: string;
  typeOfUsage: string; faultCode: string; faultCodeDescription: string;
  faultCodeLabourQuantity: number; exchangeReason: string; claimStatus: string;
  claimNotes: unknown; customer: unknown; job: unknown;
  materials: {
    position: string; partNumber: string; description: string; jobType: string;
    quantity: number; order: number; isPriceSetManually: boolean;
    price: { unitPrice: number; suggestedNetPrice: number; netAmount: number; tax: number;
              taxAmount: number; grossAmount: number; discount: number; totalAmount: number };
  }[];
  archivedMaterials: /* same material shape */[];
  claimPriceSummary: { netAmount: number; suggestedNetPrice: number; grossAmount: number;
                        discount: number; totalAmount: number; taxAmount: number };
  jobDiagnostic: unknown;
}
```

**Response `200` — proposed upgrade** (target state, not required to unblock the frontend typing pass already shipped):
```ts
interface PutClaimPricesResponse {
  requestId?: string;
  rows: RowPriceResult[];          // same shape as API-2's rows[]
  summary: PriceResults & { type: string };
  summaryMaterial: PriceResults & { type: string; positions: string[] };
}
```

**Migration note**: today's response is discarded by the frontend, which just invalidates its claim cache and refetches via `GET /v1/claims/{claimId}`. Two valid paths, either acceptable:
(a) keep the current response; frontend keeps refetching via GET (zero backend change needed); or
(b) adopt the upgraded response shape above so the frontend can render immediately without the extra GET (recommended follow-up, not blocking).

**Errors**: same in-body convention as API-2 (no 422).

**Acceptance criteria**:
- [ ] (Blocking, already needed) Confirm the current response shape/fields so the frontend's typed placeholder (`Record<string, unknown>`) can be tightened.
- [ ] (Non-blocking follow-up) Adopt the upgraded response shape, reusing the same `Price`/`RowPriceResult` contract as API-2 to eliminate the job/claim field-name drift (`tax` vs `taxPercent`, `isPriceManuallySet` vs `isPriceSetManually` — standardize on job's existing names, since the frontend's shared `Price` type already does).

---

## API-4: Tightened semantics on existing `POST /v1/jobs/flow/validate-and-save`

**Purpose**: No shape change — a behavioral contract clarification so the frontend can safely stop re-deriving prices client-side after this call succeeds (Phase 3 cleanup item).

**Current response** (unchanged): `errorMessages`, `diagnostic?`, `materials?`, `archivedMaterials?`, `priceSummary?`.

**Requested contract tightening**: whenever `errorMessages` is empty (success), `materials[]` and `priceSummary` **must** be fully populated and internally consistent. Today the frontend cannot trust this and re-derives via client-side calculation as a defensive measure; this ticket asks the backend to confirm/guarantee that invariant so the frontend can delete the re-derivation step. `priceSummary`'s field set should match API-2's `prices` shape so one frontend type serves both endpoints.

**Acceptance criteria**:
- [ ] Backend confirms (or fixes) that a `200` response with no `errorMessages` always includes complete, authoritative `materials[].price` and `priceSummary`.
- [ ] No frontend-visible request shape change.

---

## Suggested Jira ticket breakdown

1. **[BE] Item Policy Config endpoint** — API-1 (`GET /v1/countries/{cc}/item-policy`, policy overlay only — no rule-data duplication). Independent, low risk. Supports FE Phase 2.
2. **[BE] Diagnostic price validate endpoint** — API-2. Net-new endpoint, no dependencies. Supports FE Phase 3; FE work can proceed against a local simulator until this lands.
3. **[BE] Confirm/type PUT claim prices response** — API-3, acceptance criterion 1 only (contract confirmation, no code change expected). Already unblocked the frontend typing work.
4. **[BE] Upgrade PUT claim prices to return confirmed row prices** — API-3's proposed response upgrade, follow-up to #3.
5. **[BE] Guarantee validate-and-save success invariant** — API-4, small low-risk contract confirmation.

Tickets 1–2 can be scheduled independently of 3–5.
