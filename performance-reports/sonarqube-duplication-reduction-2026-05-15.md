# SonarQube — Duplication Reduction Session

**Project:** `com.bosch.pt.bass.web` (BASS-Next)
**Goal:** Reduce duplicated lines from 3.4% (1066 lines) to < 3% (< 829 lines)

---

## Session 2026-05-15 — reduce code duplication below 3%

### 1. Scope

**Changed files (5 new + 5 modified):**

| File                                                                                  | What changed                                                                                                                                   | Lines saved (est.) |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `src/utils/priceCalculator.ts`                                                        | Merged `distributeGrossToRows` + `distributeNetToRows` into private `distributeToRows` helper                                                  | ~76                |
| `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.shared.tsx`        | **Created** — `resolveDiscountFieldNames`, `useSparePartsRowCommon`, `SparePartsMainFields`, `SparePartsCollapsedSection`                      | —                  |
| `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`               | Use all 4 shared exports; replace 4 duplicate blocks (A: discount names, B: calc call + nonPriceInputKey, C: mainFields JSX, D: collapsed JSX) | ~80                |
| `src/modules/ClaimManagement/ClaimOverview/ClaimSparePartsRow/ClaimSparePartsRow.tsx` | Use all 4 shared exports; remove `getFieldBySubtype` useCallback; simplify `isFirstRowRender` guard to single condition                        | ~80                |
| `src/hooks/useListFilterHandlers.ts`                                                  | **Created** — shared `handleToggleFilter`, `applyAdvancedFilters`, `resetAdvancedFilters`                                                      | —                  |
| `src/modules/JobManagement/JobList/JobList.tsx`                                       | Use `useListFilterHandlers`; remove `useCallback` + `hasFilterValue` imports                                                                   | ~15                |
| `src/modules/ClaimManagement/ClaimList/ClaimList.tsx`                                 | Use `useListFilterHandlers`; remove `useCallback` + `hasFilterValue` imports                                                                   | ~15                |

**Total estimated savings: ~266 lines**
**Projected duplicated lines after: ~800 (≈ 2.89%) — below the 3% target**

**Verification:** `npm run typecheck` → EXIT 0; `npm run lint` → EXIT 0 (2 react-refresh warnings only, pre-existing pattern in codebase)

### 2. AI Agent Time Estimate

| Phase                                              | Time        |
| -------------------------------------------------- | ----------- |
| Context (reading SonarQube metrics, files, blocks) | ~25 min     |
| Implementation (shared file + 4 component updates) | ~20 min     |
| Verification (typecheck, lint fixes)               | ~8 min      |
| **Total**                                          | **~53 min** |

### 3. Developer Estimate (Senior, Codebase-Familiar)

| Work Item                                             | Estimate     |
| ----------------------------------------------------- | ------------ |
| Identify duplicate blocks via SonarQube + code review | ~30 min      |
| Design and implement SparePartsRow.shared.tsx         | ~30 min      |
| Refactor SparePartsRow.tsx + ClaimSparePartsRow.tsx   | ~25 min      |
| Extract useListFilterHandlers + update 2 list files   | ~15 min      |
| Fix lint/typecheck issues                             | ~10 min      |
| **Total**                                             | **~110 min** |

SonarQube heuristic (duplications): not measured per-issue; duplication metric improvement is the KPI.

### 4. AI vs Developer Comparison

| Metric      | AI Agent | Developer   |
| ----------- | -------- | ----------- |
| Time        | ~53 min  | ~110 min    |
| Speed ratio | —        | 2.1× slower |

- AI had complete recall of duplicate block locations from prior session analysis, skipping re-discovery.
- Developer would need to navigate SonarQube + cross-reference code; AI had the analysis cached in session context.
