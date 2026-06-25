# PTBASS-1183 — SonarQube critical + code-smell remediation

## Session 2026-05-18 — Gate-pass: all 25 open issues fixed

### 1. Scope

Changed files:

| File                          | Changes                                                                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SparePartsArea.scss`         | S4656: removed duplicate `align-items: flex-start`                                                                                                                              |
| `ExplosionDrawing.scss`       | S4656: removed duplicate `background`, `border`, `line-height`                                                                                                                  |
| `JobListColumns.config.tsx`   | S7735: flip negated ternary in `paymentType` getter                                                                                                                             |
| `SummaryArea.tsx`             | S7735: flip negated condition in `summaryFieldNames` + `summaryMaterialFieldNames`                                                                                              |
| `ClaimSparePartsRow.tsx`      | S7776: array→Set for `collapsableFieldNames`; S2004: Map lookup to eliminate level-5 `allowedPositions.find`                                                                    |
| `ClaimOverview.tsx`           | S2004: module-level `makeFieldGetter` eliminates level-5 `get` lambda in `sparePartsAreas.map`                                                                                  |
| `useClaimMaterialsManager.ts` | S3776: +2 module helpers remove 6 complexity points (19→13); S2004×2: Set lookup + named predicate; S3358×2: ternaries replaced by helpers; S3735: removed `void setFieldValue` |
| `useDiagnosticsManager.ts`    | S3776: `computeFinalSparePartsAreas` helper removes if/else/else (16→13); S2004: `keepDiagnosticArea` predicate eliminates level-5 filter lambda                                |
| `MultiSelectDropdown.tsx`     | S6848+S1082: `role="button"` + `tabIndex` + `onKeyDown` on dropdown row                                                                                                         |
| `DatePickerContent.tsx`       | S6848: `role="group"` + `tabIndex={-1}` on datepicker container                                                                                                                 |
| `ExplosionDrawing.tsx`        | S6848+S1082: `role="button"` + `tabIndex` + `onKeyDown` on explosion diagram rectangle                                                                                          |

Verification: `npm run typecheck` ✓ (0 errors) · `npm run lint` ✓ (0 errors, 0 warnings)

### 2. AI Agent Time Estimate

| Phase                      | Time        |
| -------------------------- | ----------- |
| Context restore + analysis | ~15 min     |
| Implementation (11 files)  | ~20 min     |
| Lint fix iteration         | ~5 min      |
| **Total**                  | **~40 min** |

### 3. Developer Estimate

| Phase                      | Time     |
| -------------------------- | -------- |
| Fetch + triage 25 issues   | ~30 min  |
| Read affected code         | ~45 min  |
| Implement fixes (11 files) | ~90 min  |
| Typecheck + lint fix       | ~15 min  |
| **Total**                  | **~3 h** |

SonarQube server estimate (heuristic): ~180 min / 0.4 days

### 4. AI vs Developer Comparison

| Metric      | AI Agent    | Developer |
| ----------- | ----------- | --------- |
| Total time  | ~40 min     | ~3 h      |
| Speed ratio | 4.5× faster | baseline  |

- Multi-file complexity analysis (S3776 cognitive complexity counting) was near-instant for the agent vs significant developer analysis time.
- Lint iteration resolved in 1 pass; typical dev would also be 1-2 passes.

---

## Session 2026-05-13 — Bulk SonarQube code-smell remediation (96 issues)

### 1. Scope

| Item            | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sonar source    | `com.bosch.pt.bass.web` latest master code-smell set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Issues targeted | 96 CODE_SMELL issues (10 CRITICAL, 28 MAJOR, 58 MINOR)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Rules addressed | `css:S4667`, `typescript:S107`, `typescript:S1301`, `typescript:S3358`, `typescript:S3626`, `typescript:S3735`, `typescript:S3776`, `typescript:S3863`, `typescript:S4165`, `typescript:S4325`, `typescript:S6478`, `typescript:S6479`, `typescript:S6582`, `typescript:S6759`, `typescript:S6819`, `typescript:S6845`, `typescript:S6848`, `typescript:S6852`, `typescript:S7735`, `typescript:S7748`, `typescript:S7750`, `typescript:S7754`, `typescript:S7755`, `typescript:S7764`, `typescript:S7773`, `typescript:S7776`, `typescript:S7780`, `typescript:S7781` |
| Files changed   | 39 files under `src/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Verification    | `npm run typecheck` PASS, `npm run lint` PASS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Tests           | Not run in this session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 2. AI Agent Time Estimate

| Phase                        | Description                                                                                    | Estimated AI Time |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| Fetch & triage               | MCP connectivity check, issue retrieval, prioritization, rule grouping                         | ~12 min           |
| Implementation batch 1       | Critical + infrastructure-safe changes (`void`, `globalThis`, routing, promise handling)       | ~20 min           |
| Implementation batch 2       | Accessibility/semantic JSX, Set/Number/API/style refactors                                     | ~32 min           |
| Implementation batch 3       | Validation/diagnostics/price utility refactors (`S107`, `S3358`, `S4165`, readability helpers) | ~30 min           |
| Verification & stabilization | Typecheck/lint cycles, regressions fixed, formatting normalization                             | ~16 min           |
| **Total AI**                 |                                                                                                | **~110 min**      |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                              | Developer Estimate |
| ---------------------------------------------------------------------- | ------------------ |
| Sonar triage and fix design across 39 files                            | ~150 min           |
| Accessibility and semantic JSX refactors across feature modules        | ~90 min            |
| Validation/diagnostics utility refactors with regression-safe behavior | ~120 min           |
| Typecheck/lint stabilization and formatting                            | ~40 min            |
| **Total Developer**                                                    | **~400 min**       |

**SonarQube server estimate (heuristic):** `~404 min / 0.84 days` — sum of `effort` across all 96 fixed issues. Note: this score does not account for secondary TypeScript errors, test runs, or refactor complexity.

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~110 min | ~400 min              |
| Speedup factor | —        | ~3.6x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: high-volume repetitive remediation (`Set.has`, `Number.*`, role/semantic replacements) across many files.
- AI disadvantage: lint/Sonar rule conflicts (notably `void` vs `no-floating-promises`) required iterative correction.
- Human advantage: faster intent validation for behavior-sensitive diagnostics flows and a11y semantics trade-offs.

---

## Session 2026-05-14 — Restore visual styles broken by semantic button migration

### 1. Scope

- Restored pre-existing visual styling for action and icon controls that were migrated to semantic `button` elements by adding explicit native-button reset styles.
- Updated styles in:
  - `src/modules/JobManagement/JobList/JobListTable/JobAction/JobAction.scss`
  - `src/modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea.scss`
  - `src/components/ui/DatePicker/DatePickerContent.scss`
  - `src/modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawing.scss`
  - `src/modules/ClaimManagement/ApprovalList/ApprovalListTable/ApprovalAction/ApprovalAction.scss`
  - `src/modules/ClaimManagement/ClaimList/ClaimListTable/ClaimAction/ClaimAction.scss`
- Verified no diagnostics errors in all edited files via editor diagnostics.
- `typecheck`: not run
- `lint`: not run
- `test`: not run

### 2. AI Agent Time Estimate

| Phase             | Description                                                        | Estimated AI Time |
| ----------------- | ------------------------------------------------------------------ | ----------------- |
| Context gathering | Inspected changed button migrations and corresponding SCSS targets | ~4 min            |
| Implementation    | Added targeted reset styles preserving prior component visuals     | ~5 min            |
| Verification      | Checked diagnostics for all edited files                           | ~2 min            |
| **Total AI**      |                                                                    | **~11 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                      | Developer Estimate |
| -------------------------------------------------------------- | ------------------ |
| Identify all non-button to button migrations affecting visuals | ~10 min            |
| Apply and validate style resets across affected SCSS files     | ~15 min            |
| Verification runs                                              | ~5 min             |
| **Total Developer**                                            | **~30 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~11 min  | ~30 min               |
| Speedup factor | —        | ~2.7x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast cross-file diff scanning for migrated element patterns.
- AI advantage: consistent mechanical style resets across multiple SCSS files.
- AI disadvantage: final visual parity still benefits from human UI spot-check in browser.

---

## Session 2026-05-14 — Step 2 high-priority Sonar fixes (critical + major)

### 1. Scope

| Item            | Details                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sonar source    | `com.bosch.pt.bass.web` open issues filtered to changed `src/` files                                                                                                                  |
| Issues targeted | 5 highest-priority issues from triage set (1 CRITICAL, 4 MAJOR)                                                                                                                       |
| Rules targeted  | `typescript:S3776`, `typescript:S6582`, `typescript:S107`                                                                                                                             |
| Files changed   | `src/hooks/useDiagnosticsManager.ts`, `src/modules/JobManagement/JobOverview/JobOverview.tsx`                                                                                         |
| Key fixes       | Reduced cognitive complexity by extracting row-value and SP-option helpers in diagnostics manager; simplified tab-hash selection logic in JobOverview to avoid redundant guard chains |
| Verification    | `npm run typecheck` PASS, `npm run lint` PASS                                                                                                                                         |
| Tests           | Not run in this session                                                                                                                                                               |

### 2. AI Agent Time Estimate

| Phase          | Description                                                                    | Estimated AI Time |
| -------------- | ------------------------------------------------------------------------------ | ----------------- |
| Fetch & triage | Queried Sonar for CRITICAL/MAJOR issues and mapped exact file/line contexts    | ~8 min            |
| Implementation | Applied targeted refactor in diagnostics manager and JobOverview logic cleanup | ~16 min           |
| Verification   | Ran typecheck/lint and checked diagnostics on touched files                    | ~6 min            |
| **Total AI**   |                                                                                | **~30 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                        | Developer Estimate |
| ---------------------------------------------------------------- | ------------------ |
| Triage top-priority Sonar issues and inspect affected code paths | ~20 min            |
| Refactor high-complexity diagnostics effect safely               | ~35 min            |
| Optional-chain/readability cleanups and verification runs        | ~15 min            |
| **Total Developer**                                              | **~70 min**        |

**SonarQube server estimate (heuristic):** `~57 min / 0.12 days` — sum of `effort` across all 5 targeted issues. Note: this score does not account for secondary TypeScript errors, test runs, or refactor complexity.

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~30 min  | ~70 min               |
| Speedup factor | —        | ~2.3x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast issue-to-line mapping and focused mechanical refactors.
- AI advantage: efficient extraction of helper functions to reduce complexity without broad rewrites.

---

## Session 2026-05-18 — Full project coverage report

### 1. Scope

- No source files changed.
- Ran `npm run test:cov` on branch `fix/PTBASS-1183-sonarqube-critical`.
- Results: **377 tests, 19 test files, all passing**.
- Overall coverage: **19.87% statements, 61.07% branches, 40.87% functions**.

Key per-category results (targets in parentheses):

| Category                   | Target | Actual                                                                                                                     |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/`               | ≥ 90%  | 69.38% ⚠️ (dragged by uncovered `priceCalculator`, `dateFormatter`)                                                        |
| `src/hooks/`               | ≥ 75%  | 5.92% ⚠️ (only `useHasPermission` above target)                                                                            |
| `src/components/generics/` | ≥ 70%  | ~70% mixed (`GenericArea/Action/Section/Field` above; `ActionDependency`, `utils.ts` below)                                |
| `src/components/ui/`       | ≥ 70%  | ~0% ⚠️ (no UI component tests)                                                                                             |
| `src/modules/`             | ≥ 60%  | mixed (`AccessoryArea`, `SparePartsArea`, `SparePartsRow`, `CreateJob` above; `JobOverview`, all claim/list modules at 0%) |

### 2. AI Agent Time Estimate

| Phase                    | Time       |
| ------------------------ | ---------- |
| Run coverage command     | ~2 min     |
| Parse + structure report | ~5 min     |
| **Total**                | **~7 min** |

### 3. Developer Estimate

| Phase                                | Time        |
| ------------------------------------ | ----------- |
| Run coverage + read output           | ~5 min      |
| Tabulate per-category results        | ~20 min     |
| Write gap analysis + recommendations | ~20 min     |
| **Total Developer**                  | **~45 min** |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~7 min   | ~45 min               |
| Speedup factor | —        | ~6× faster            |
| Review needed  | No       | Self-review           |

- AI advantage: instant structured table generation from raw coverage output.
- Coverage baseline now established for the branch; future test sessions can track delta.
- Human advantage: deeper business-flow validation for diagnostics behavior after structural refactors.

---

## Session 2026-05-15 — Merge conflict resolution in diagnostics manager

### 1. Scope

- Resolved active merge conflict in [src/hooks/useDiagnosticsManager.ts](src/hooks/useDiagnosticsManager.ts) by combining incoming functional changes with existing SonarQube-focused refactors.
- Preserved extracted helper flow (`buildMaterialsRowValues`, `withSpecialMaterialSpOption`) while restoring functional `setAllFields` and `setTabs` updates to avoid shared-state overwrite races.
- Removed invalid post-merge reference to `updatedTabs` in Effect 3.
- Marked conflict as resolved in git index.
- Verification:
  - `npm run typecheck`: PASS.

### 2. AI Agent Time Estimate

| Phase             | Description                                                          | Estimated AI Time |
| ----------------- | -------------------------------------------------------------------- | ----------------- |
| Context gathering | Inspected merge state, compared conflict stages, reviewed hook logic | ~8 min            |
| Implementation    | Applied targeted merge-resolution edit in diagnostics Effect 3       | ~7 min            |
| Verification      | Checked diagnostics and ran `npm run typecheck`                      | ~4 min            |
| **Total AI**      |                                                                      | **~19 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                          | Developer Estimate |
| ------------------------------------------------------------------ | ------------------ |
| Analyze conflict intent and compare both versions                  | ~15 min            |
| Reconcile helper refactors with functional updater behavior safely | ~12 min            |
| Resolve index + run typecheck                                      | ~6 min             |
| **Total Developer**                                                | **~33 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~19 min  | ~33 min               |
| Speedup factor | —        | ~1.7x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast stage-by-stage merge comparison and focused patching.
- AI advantage: quick safety verification via file diagnostics and typecheck.
- Human advantage: final confidence review on diagnostics business behavior under edge workflows.

---

## Session 2026-05-19 — Reduce duplicated validation logic in overviews

### 1. Scope

- Extracted shared action-validation flow from both overview modules into `src/hooks/useActionWithValidation.ts`.
- Updated `src/modules/JobManagement/JobOverview/JobOverview.tsx` to use shared hook and removed duplicated local callback implementation.
- Updated `src/modules/ClaimManagement/ClaimOverview/ClaimOverview.tsx` to use shared hook and removed duplicated local callback implementation.
- Verification status: editor diagnostics clean on touched files.
- Verification commands: `npm run typecheck` not run, `npm run lint` not run.

### 2. AI Agent Time Estimate

| Phase          | Time        |
| -------------- | ----------- |
| Context scan   | ~8 min      |
| Implementation | ~10 min     |
| Verification   | ~3 min      |
| **Total**      | **~21 min** |

### 3. Developer Estimate

| Phase                                             | Time        |
| ------------------------------------------------- | ----------- |
| Find duplicate logic across both overview modules | ~15 min     |
| Extract hook and integrate in both modules        | ~20 min     |
| Verify type compatibility and diagnostics         | ~10 min     |
| **Total Developer**                               | **~45 min** |

SonarQube server estimate (heuristic): ~30 min / 0.06 days

### 4. AI vs Developer Comparison

| Metric      | AI Agent | Developer |
| ----------- | -------- | --------- |
| Total time  | ~21 min  | ~45 min   |
| Speed ratio | ~2.1x    | baseline  |

- Shared hook keeps validation pipeline consistent with `startValidation -> validateByAction -> visible errors -> setTouched -> scroll -> stopValidation`.
- Refactor is low-risk because behavior was moved, not redesigned.
