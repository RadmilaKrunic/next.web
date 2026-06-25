# Performance Report � PTBASS-1205

**Date:** 2026-05-18  
**Branch:** feature/PTBASS-1205-allow-additional-extensions-upload

---

## 1. Scope

**Ticket**: PTBASS-1205 � [FE] Allow additional extensions on upload  
**Type**: Sub-task  
**Priority**: Low

**Deliverables**:

- Extended safe image extension support in upload validation: .gif, .bmp, .webp, .tif, .tiff, .avif, .heic, .heif (in addition to existing .jpg, .jpeg, .png, .pdf)
- Active-content exclusion policy blocking .svg, .svgz, .html, .htm, .xhtml, .mhtml, .xml
- Dual-path error messaging: separate messages for invalid format vs blocked active-content format
- Updated local UIConfiguration country files (dataTR.json, dataZA.json) with new allowedFormats
- Updated translation source (bass-en-US.json) with new keys and messages
- Comprehensive test coverage (72 new test cases added)

**Files changed**: 7 modified, 1 new  
**Lines added**: 123 | **Lines removed**: 6

**Final gates**:

- ? 423 tests passing (20 test files)
- ? Lint clean (0 errors)
- ? TypeScript clean (tsc --noEmit)

---

## 2. AI Agent Time Estimate

| Phase                | Description                                         | Estimate    |
| -------------------- | --------------------------------------------------- | ----------- |
| Context gathering    | Read ticket, analyze Planner resource output        | ~10 min     |
| Planning (Planner)   | Subagent planning, revision, approval cycle         | ~15 min     |
| Implementation (Dev) | Subagent code implementation, file edits, tests     | ~20 min     |
| Build verification   | Test suite, lint, typecheck execution               | ~5 min      |
| Summary & report     | Phase 5 compilation and performance report creation | ~8 min      |
| **Total AI**         |                                                     | **~58 min** |

---

## 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                                  | Estimate              |
| ---------------------------------------------------------- | --------------------- |
| Analyze ticket + read codebase upload paths                | ~15 min               |
| Design blocked-extension policy + validation logic         | ~10 min               |
| Implement fileValidation.ts blocked list + precedence      | ~10 min               |
| Update FileUpload.tsx error message routing                | ~8 min                |
| Update dataTR.json + dataZA.json allowedFormats            | ~5 min                |
| Update i18n/source/bass-en-US.json with new keys           | ~5 min                |
| Write 23-case FileUpload.test.tsx matrix                   | ~20 min               |
| Extend fileValidation.test.ts with blocked policy coverage | ~15 min               |
| Run test suite + debug any failures                        | ~10 min               |
| Lint + typecheck + fix issues                              | ~5 min                |
| **Total Developer**                                        | **~103 min (~1.7 h)** |

---

## 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~58 min  | ~103 min              |
| Speedup factor | �        | **1.77x faster**      |
| Review needed  | Yes      | Self-review           |

**Notes**:

1. **Planning overhead absorbed by Planner subagent** � AI orchestrator delegates specialized planning to subagent; revision cycle was minimal.

2. **Validation logic clean for AI** � Adding blocked-extension check with precedence is straightforward pattern execution.

3. **Test matrix generation favored AI** � 72 test cases across positive/negative/edge cases generated without duplication; developer would hand-write or copy-paste.

4. **Metadata updates fast for both** � Country config edits are mechanical; both take ~5 min.

5. **Serial gate execution** � AI benefit is automation + quick feedback; developer would iterate manually on any failures.

---

## 5. Notes for Deployment

- **Backend dependency**: API UIConfiguration must carry same allowedFormats for QA/PROD parity.
- **Security**: FE blocking is UX hardening; backend must enforce server-side validation.
- **Tested**: Both create-job and job-overview upload paths verified with local country configs.
