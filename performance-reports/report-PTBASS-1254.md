# PTBASS-1254 — Bring test coverage to 50% statement coverage

## Session 2025-05-22 — Add tests to reach 50% statement coverage

### 1. Scope

**Test files created/modified:**

- `src/modules/ClaimManagement/ApprovalList/ApprovalListTable/ApprovalAction/ApprovalAction.test.tsx` (new — 3 tests)
- `src/modules/ClaimManagement/ClaimList/ClaimListTable/ClaimAction/ClaimAction.test.tsx` (new — 3 tests)
- `src/modules/JobManagement/JobList/FiltersBar/FilterOptionsPopup/ExportJobListPopup/ExportJobListPopup.test.tsx` (new — 2 tests)
- `src/modules/ClaimManagement/ApprovalList/FiltersBar/FilterOptionsPopup/ExportApprovalListPopup/ExportApprovalListPopup.test.tsx` (new — 2 tests)
- `src/modules/JobManagement/JobList/JobListTable/JobAction/JobAction.test.tsx` (new — 4 tests)

Plus prior session work (session 1+2 combined ~115 test files):

- API services: jobs, claims, orders, header, bareSalesRelation, uiConfiguration, dynamicOptions, customers, file
- UI components: StatusIndicator, Filters, Table, FiltersOptionsPopup, NotesLegend
- Hooks: useActionWithValidation, useSectionEditing, useFormInitialization
- Modules: ClaimManagement, ClaimList, ApprovalList, JobList + column configs
- Utils: getApiErrorMessage

**Coverage delta:** 35.68% (start) → **50.28%** (final)

### 2. AI Agent Time Estimate

| Phase                                               | Time         |
| --------------------------------------------------- | ------------ |
| Context gathering (reading source + existing tests) | ~15 min      |
| Planning test cases per file                        | ~10 min      |
| Writing ~115 test files across 3 sessions           | ~90 min      |
| Fixing failures (hook names, mock patterns)         | ~20 min      |
| Running coverage + iteration                        | ~15 min      |
| **Total**                                           | **~150 min** |

### 3. Developer Estimate

| Work item                                      | Estimate                |
| ---------------------------------------------- | ----------------------- |
| API service tests (9 domains × action + hooks) | ~120 min                |
| UI component tests (10 components)             | ~90 min                 |
| Hook tests (3 hooks)                           | ~40 min                 |
| Module/column tests (6 modules)                | ~90 min                 |
| Small component tests (5 files)                | ~30 min                 |
| Fix failures + coverage runs                   | ~30 min                 |
| **Total**                                      | **~400 min (~6.7 hrs)** |

### 4. AI vs Developer Comparison

| Metric         | AI Agent                                | Developer |
| -------------- | --------------------------------------- | --------- |
| Net work time  | ~150 min                                | ~400 min  |
| Speedup factor | ~2.7×                                   | baseline  |
| Review needed  | Yes — verify mock accuracy + edge cases |

- AI excels at repetitive mock setup and boilerplate across many similar files.
- Developer would likely write fewer but more thorough tests; AI quantity-over-depth trade-off needs review.
