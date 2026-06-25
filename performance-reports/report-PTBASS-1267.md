# PTBASS-1267 - agent and skill diagnostics alignment

## Session 2026-05-27 - remove validate diagnostics refetch & gate customer-approval actions

### 1. Scope

- Updated `src/modules/JobManagement/JobOverview/JobOverview.tsx` validate success flow to reuse validate response diagnostic payload, set React Query `"diagnostic"` cache, and stop validate-time diagnostic refetch.
- Added normalize helper for validate response shapes (`diagnostic` nested or top-level diagnostic fields).
- Kept validate success `job` refetch only.
- Added status gate to disable validate when status is `CUSTOMER_APPROVAL_PENDING` or `MULTIPLE_APPROVAL_PENDING`.
- Updated customer-answer action visibility/enabled logic to be true on those statuses from first load.
- Updated `src/api/services/jobs/action.ts` `ValidateAndSaveResponse` typing to include optional diagnostic payload fields used by UI merge.
- Verification: `npm run typecheck` passed.

### 2. AI Agent Time Estimate

| Phase             | Description                                                     | Estimated AI Time |
| ----------------- | --------------------------------------------------------------- | ----------------- |
| Context gathering | Traced validate flow, diagnostics manager resync, status gating | ~14 min           |
| Implementation    | Edited JobOverview + jobs action response typing                | ~14 min           |
| Verification      | TS diagnostics + full typecheck run                             | ~6 min            |
| **Total AI**      |                                                                 | **~34 min**       |

### 3. Developer Estimate

| Work Item                                                     | Developer Estimate |
| ------------------------------------------------------------- | ------------------ |
| Trace async state race in validate->refetch->reinit flow      | ~30 min            |
| Implement response-driven cache merge and status action gates | ~25 min            |
| Verify compile/test baseline and edge-case behavior           | ~15 min            |
| **Total Developer**                                           | **~70 min**        |

SonarQube server estimate (heuristic): ~0 min / 0 days.

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~34 min  | ~70 min               |
| Speedup factor | —        | ~2.1x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast cross-file tracing of async refetch/resync interactions.
- AI disadvantage: behavior under real slow-network timing still needs manual UI validation.
