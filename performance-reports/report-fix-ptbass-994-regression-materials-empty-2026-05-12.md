## Scope

- Added API-derived empty-state tracking in [src/hooks/useDiagnosticsManager.ts](src/hooks/useDiagnosticsManager.ts) via new boolean state `apiMaterialsEmpty`.
- Reset API material flags on job change and set `apiMaterialsEmpty` when diagnostic payload arrives (`undefined` or `[]` => true).
- Extended diagnostics context contract/default with `apiMaterialsEmpty` in [src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx](src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx).
- Wired `apiMaterialsEmpty` through Job Overview provider in [src/modules/JobManagement/JobOverview/JobOverview.tsx](src/modules/JobManagement/JobOverview/JobOverview.tsx).
- Kept claim flow unchanged by setting `apiMaterialsEmpty: false` literal in [src/modules/ClaimManagement/ClaimOverview/ClaimOverview.tsx](src/modules/ClaimManagement/ClaimOverview/ClaimOverview.tsx).
- Updated diagnostics spare-parts visibility guard to use API-empty state in [src/modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.tsx](src/modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.tsx).
- Updated tests in [src/modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.test.tsx](src/modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.test.tsx) and context mock in [src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx](src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx).
- Verification run:
  - `npm run test src/modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.test.tsx src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx`
  - Result: 2 files passed, 6 tests passed, 0 failed.

## AI Agent Time Estimate

| Phase             | Description                                                                | Estimated AI Time |
| ----------------- | -------------------------------------------------------------------------- | ----------------- |
| Context gathering | Read diagnostics skill and inspected manager/context/component/test wiring | ~8 min            |
| Implementation    | Applied focused state, context, and guard changes with minimal diff        | ~9 min            |
| Verification      | Type/error checks and targeted Vitest run                                  | ~4 min            |
| **Total AI**      |                                                                            | **~21 min**       |

## Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                               | Developer Estimate |
| ----------------------------------------------------------------------- | ------------------ |
| Implement API-empty state and reset/update lifecycle                    | ~18 min            |
| Wire context and consumers (JobOverview, ClaimOverview, SparePartsArea) | ~15 min            |
| Update tests and context mocks                                          | ~15 min            |
| Verification runs                                                       | ~8 min             |
| **Total Developer**                                                     | **~56 min**        |

## AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~21 min  | ~56 min               |
| Speedup factor | —        | ~2.7x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: quick multi-file wiring with low-risk mechanical edits.
- AI advantage: immediate focused regression coverage with context mock updates.
- AI disadvantage: initial test command ran in watch mode output before completion confirmation.
