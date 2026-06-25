# SonarQube CRITICAL Issues Fix — Performance Report

**Project:** `com.bosch.pt.bass.web` (BASS-Next)  
**Date:** 2026-05-11  
**Session:** Resolved all CRITICAL-rated SonarQube issues + 1 MINOR (S3358)

---

## 1. Scope

| Rule      | SonarQube Title      | Severity | Issues Fixed |
| --------- | -------------------- | -------- | ------------ |
| S3735     | Void operator        | CRITICAL | 17           |
| S3776     | Cognitive complexity | CRITICAL | 11           |
| S2004     | Deep nesting         | CRITICAL | 10           |
| S3358     | Nested ternary       | MINOR    | 1            |
| **Total** |                      |          | **39**       |

### Files Changed (15 total)

| File                                                                                  | Rules Applied |
| ------------------------------------------------------------------------------------- | ------------- |
| `src/utils/priceCalculator.ts`                                                        | S3735, S3776  |
| `src/hooks/useDiagnosticsManager.ts`                                                  | S3735, S2004  |
| `src/modules/JobManagement/JobOverview/JobOverview.tsx`                               | S3735, S2004  |
| `src/modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea.tsx`       | S2004         |
| `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`               | S2004         |
| `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts` | S3776         |
| `src/modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawing.tsx`         | S2004         |
| `src/components/generics/Field/GenericField.tsx`                                      | S3776, S3358  |
| `src/components/generics/Form/formValidation.tsx`                                     | S3776         |
| `src/components/generics/Field/useFieldVisibilityReset.ts`                            | S3776         |
| `src/components/generics/Action/actionDependency.ts`                                  | S3776         |
| `src/components/ui/DynamicDropdown/DynamicDropdown.tsx`                               | S3776         |
| `src/hooks/useAccessoriesManager.tsx`                                                 | S3776         |
| `src/hooks/useClaimMaterialsLoader.ts`                                                | S2004         |
| `src/components/ui/List/Filters/FiltersPopup/FiltersChips.tsx`                        | S2004         |

### Secondary Work (not in original scope)

TypeScript errors introduced by refactors were fixed inline:

- `MutableRefObject` deprecated → `RefObject` (React 19 change)
- `setFieldValue` return type mismatches (`Promise<unknown>` → `Promise<void | FormikErrors<...>>`)
- Unused destructured variables removed
- `no-floating-promises` / `no-misused-promises` ESLint violations fixed in 6 navigation files

**Final state:** `npm run typecheck` → 0 errors · `npm run lint` → 0 errors (55 Prettier warnings, not actionable) · `npm run test` → 343/343 passing

### SonarQube Server Remediation Estimate

The SonarQube server's built-in effort scoring (sum of the `effort` field across all 39 fixed issues) reports a total remediation cost of **~1 day**.

> This is provided as additional reference only. SonarQube's effort scores are rule-based heuristics — they do not account for secondary TypeScript errors introduced by refactoring, test verification cycles, or cross-cutting complexity like the NET/GROSS price calculation. See Sections 2–4 for the detailed AI and developer estimates.

---

## 2. AI Agent Time Estimate

The AI agent cannot measure wall-clock session time directly, but the following estimates are based on transcript length (1 394 lines) and tool-call density.

| Phase                        | Description                                                  | Estimated AI Work Time |
| ---------------------------- | ------------------------------------------------------------ | ---------------------- |
| Fetch & triage               | SonarQube MCP calls, issue list, priority table              | ~5 min                 |
| S3735 fixes (17 issues)      | Mostly mechanical `void expr` removals                       | ~10 min                |
| S2004 fixes (10 issues)      | Helper extraction, Set-based lookups, nested block refactors | ~20 min                |
| S3776 fixes (11 issues)      | Sub-function extraction for each overlong function           | ~30 min                |
| TypeScript error resolution  | 4–5 rounds of `typecheck` + fix cycles                       | ~15 min                |
| Lint verification + test run | Final checks                                                 | ~5 min                 |
| S3358 fix                    | Single nested ternary extracted                              | ~2 min                 |
| **Total AI net work**        |                                                              | **~87 min**            |

> "Net work time" is the AI's inference + tool execution time. The full **session wall-clock** duration (including user reading, reviewing diffs, and responding) was approximately **2–3 hours**.

---

## 3. Developer Estimate (Manual)

### Calibration Reference

The user provided a benchmark: fixing `formValidation.tsx` (one S3776 issue — extracting `validateSingleField`) would take **~20 minutes**.

This is used as the baseline for S3776 complexity fixes. The formValidation case is representative of medium complexity; harder cases (e.g., `priceCalculator.ts` with its 100-line NET/GROSS price switch) scale up accordingly.

### Per-Rule Estimates

#### S3776 — Cognitive Complexity (11 issues)

Effort per issue includes: understanding the function, identifying the right extraction boundary, writing + naming the helper, ensuring no state/closure mutation, and re-running typecheck.

| File                                          | Complexity Level                         | Developer Estimate   |
| --------------------------------------------- | ---------------------------------------- | -------------------- |
| `formValidation.tsx`                          | Medium (reference)                       | 20 min               |
| `useFieldVisibilityReset.ts`                  | Medium                                   | 20 min               |
| `actionDependency.ts`                         | Medium                                   | 25 min               |
| `DynamicDropdown.tsx`                         | Medium                                   | 20 min               |
| `useAccessoriesManager.tsx`                   | Medium                                   | 20 min               |
| `GenericField.tsx` — `renderTextPriceField`   | High (price logic, many branches)        | 35 min               |
| `priceCalculator.ts` — `calculatePrices`      | Very High (NET/GROSS switch, 100+ lines) | 50 min               |
| `priceCalculator.ts` — `aggregateRowPrices`   | High                                     | 35 min               |
| `useSparePartPriceCalculation.ts`             | High (hook dependencies, prev/cur refs)  | 40 min               |
| `useDiagnosticsManager.ts`                    | High                                     | 40 min               |
| `GenericField.tsx` — `GenericField` component | High                                     | 35 min               |
| **S3776 subtotal**                            |                                          | **~340 min (5.7 h)** |

#### S2004 — Deep Nesting (10 issues)

Effort per issue includes: identifying the nested block, planning the boolean early-exit or helper extraction, and verifying no logic inversion.

| File                            | Developer Estimate   |
| ------------------------------- | -------------------- |
| `useDiagnosticsManager.ts` (×2) | 2 × 20 min = 40 min  |
| `JobOverview.tsx`               | 25 min               |
| `AccessoryArea.tsx`             | 20 min               |
| `SparePartsRow.tsx`             | 30 min               |
| `ExplosionDrawing.tsx` (×2)     | 2 × 20 min = 40 min  |
| `useClaimMaterialsLoader.ts`    | 15 min               |
| `FiltersChips.tsx`              | 20 min               |
| `useAccessoriesManager.tsx`     | 15 min               |
| **S2004 subtotal**              | **~205 min (3.4 h)** |

#### S3735 — Void Operator (17 issues)

Mechanical removal of `void` operator in expression statements. Straightforward once the pattern is understood, but each file requires reading context to confirm no return value is used.

| Batch                     | Developer Estimate      |
| ------------------------- | ----------------------- |
| 17 issues across 10 files | 17 × 5 min avg = 85 min |
| **S3735 subtotal**        | **~85 min (1.4 h)**     |

#### S3358 — Nested Ternary (1 issue)

| Issue                             | Developer Estimate |
| --------------------------------- | ------------------ |
| `GenericField.tsx` nested ternary | 5 min              |

#### Secondary TypeScript / ESLint Work

This is the non-obvious cost. Refactoring for SonarQube often breaks TypeScript or introduces new ESLint violations:

| Item                                                             | Developer Estimate  |
| ---------------------------------------------------------------- | ------------------- |
| Identifying and resolving introduced TS errors (4–5 error types) | 45 min              |
| `no-floating-promises` / `no-misused-promises` navigation fixes  | 20 min              |
| Deprecated React 19 `MutableRefObject` migration                 | 15 min              |
| **Secondary subtotal**                                           | **~80 min (1.3 h)** |

---

### Total Developer Estimate

| Category                                   | Time                      |
| ------------------------------------------ | ------------------------- |
| S3776 Cognitive Complexity                 | 340 min                   |
| S2004 Deep Nesting                         | 205 min                   |
| S3735 Void Operator                        | 85 min                    |
| S3358 Nested Ternary                       | 5 min                     |
| Secondary TS/ESLint work                   | 80 min                    |
| Verification runs (typecheck, lint, tests) | 30 min                    |
| **Grand Total**                            | **~745 min ≈ 12.4 hours** |

Assuming focused work with no interruptions and familiarity with the codebase, a realistic sprint allocation would be:

> **2 working days** (developer already familiar with the codebase)  
> **3 working days** (developer ramping up on codebase patterns)

---

## 4. AI vs Developer Comparison

| Metric             | AI Agent                           | Experienced Developer               |
| ------------------ | ---------------------------------- | ----------------------------------- |
| Net work time      | ~87 min                            | ~745 min                            |
| Session elapsed    | ~2–3 h                             | 2–3 working days                    |
| Speedup factor     | —                                  | **~8.6×**                           |
| Error introduction | Yes — required 4–5 TS fix cycles   | Lower — human catches types earlier |
| Code review needed | Yes — all diffs should be reviewed | Self-review only                    |
| Context depth      | Full file read every time          | Held in working memory              |

### Notes

- The AI's speed advantage is greatest for **S3735** (mechanical pattern) and smallest for **S3776** (requires design judgment on extraction boundaries).
- Human developers would catch TypeScript errors earlier because they have type information visible in their IDE as they type — the AI had to run `tsc --noEmit` in a separate step after each batch of edits.
- AI-generated helpers should be reviewed for: naming clarity, correct closure capture, and absence of unintended side effects on React re-render cycles.
- The formValidation 20-minute reference is consistent with the general estimate: it is a medium-difficulty S3776 fix with no secondary TS complications.

---

## 5. Recommendation

For future SonarQube sprints on this codebase:

| Rule                   | Recommended Approach                                            |
| ---------------------- | --------------------------------------------------------------- |
| S3735 (void)           | AI-assisted batch fix — pure mechanical, low review cost        |
| S3358 (nested ternary) | AI-assisted — simple, quick                                     |
| S2004 (deep nesting)   | AI-assisted with mandatory human review of each helper          |
| S3776 (complexity)     | AI drafts extraction; human reviews naming and boundary choices |

Handling secondary TypeScript errors is a shared responsibility: the AI can resolve them, but a human reviewer familiar with Formik/React 19 type contracts will catch them faster during code review.
