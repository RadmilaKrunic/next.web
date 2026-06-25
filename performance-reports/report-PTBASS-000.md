# PTBASS-000 - agent and skill diagnostics alignment

## Session 2026-05-15 - align diagnostics agent and skill docs with current code

### 1. Scope

- Audited diagnostics-related agent and skill instructions against current implementation symbols.
- Updated naming from `priceCalculationMode` to `discountBase` in agent and skill guidance where applicable.
- Updated subtype naming from `diagnosticsuggestedNetPrice` to `diagnosticSuggestedNetPrice`.
- Updated protected positions guidance from `["LA", "FR", "PR", "PC"]` to `["LA", "FR", "PC"]`.
- Removed stale guidance referencing `effectivePriceCalculationMode` and replaced with mode-gating guidance used in current callbacks.
- Updated files: `.github/agents/bass-diagnostics.agent.md`, `.github/agents/bass-dev.agent.md`, `.github/agents/bass-reviewer.agent.md`, `.github/agents/bass-planner.agent.md`, `.github/skills/bass-diagnostics/SKILL.md`, `.github/skills/bass-diagnostics/references/price-calculation.md`, `.github/skills/bass-country-config/SKILL.md`.
- Verification: targeted grep checks completed for stale tokens in `.github/agents/*.md` and `.github/skills/**/*.md`.

### 2. AI Agent Time Estimate

| Phase             | Description                                                      | Estimated AI Time |
| ----------------- | ---------------------------------------------------------------- | ----------------- |
| Context gathering | Read agent/skill docs and source-of-truth diagnostics code paths | ~9 min            |
| Implementation    | Edited 7 markdown instruction files                              | ~7 min            |
| Verification      | Ran targeted grep sweeps for stale tokens                        | ~4 min            |
| **Total AI**      |                                                                  | **~20 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                           | Developer Estimate |
| --------------------------------------------------- | ------------------ |
| Audit docs vs code symbols and behavior             | ~20 min            |
| Apply instruction-file updates across affected docs | ~15 min            |
| Verification grep sweep and final consistency pass  | ~10 min            |
| **Total Developer**                                 | **~45 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~20 min  | ~45 min               |
| Speedup factor | —        | ~2.3x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast cross-file symbol checks and mechanical consistency updates.
- AI disadvantage: semantic judgment for stale behavioral guidance still needs human confirmation when behavior is intentionally transitional.

## Session 2026-05-15 - reduce .github prompt footprint by 20%+

### 1. Scope

- Analyzed `.github/` file sizes and line counts to identify highest token-cost documentation and agent prompts.
- Compressed high-overlap guide docs to concise references: `.github/AGENTS_GUIDE.md`, `.github/IMPLEMENTATION_SUMMARY.md`, `.github/NEW_AGENTS_QUICK_START.md`, `.github/README.md`.
- Compressed large agent prompts while preserving operational constraints: `.github/agents/bass-dev.agent.md`, `.github/agents/bass-sonarqube.agent.md`, `.github/agents/bass-diagnostics.agent.md`.
- Retained critical behavior guardrails (architecture constraints, diagnostics rules, Sonar workflow, commit command policy).
- Measured total `.github/` size reduction from `380,767` bytes to `281,079` bytes.
- Final reduction achieved: `99,688` bytes (`26.18%`), exceeding 20% target.

### 2. AI Agent Time Estimate

| Phase             | Description                                      | Estimated AI Time |
| ----------------- | ------------------------------------------------ | ----------------- |
| Context gathering | Measured file sizes/lines and reviewed top files | ~8 min            |
| Implementation    | Rewrote 7 high-cost markdown files               | ~12 min           |
| Verification      | Recomputed totals and sanity-checked outputs     | ~5 min            |
| **Total AI**      |                                                  | **~25 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                               | Developer Estimate |
| ------------------------------------------------------- | ------------------ |
| Audit `.github/` footprint and select reduction targets | ~20 min            |
| Rewrite docs/prompts while preserving constraints       | ~30 min            |
| Re-measure and validate reduction outcome               | ~10 min            |
| **Total Developer**                                     | **~60 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~25 min  | ~60 min               |
| Speedup factor | —        | ~2.4x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: rapid size-based targeting and bulk markdown rewriting.
- AI disadvantage: human review still needed to confirm compressed prompts keep intended intent coverage.

## Session 2026-05-15 - second-pass skill compression

### 1. Scope

- Re-read updated agent files before changes: `.github/agents/bass-dev.agent.md` and `.github/agents/bass-diagnostics.agent.md`.
- Compressed six largest remaining skill/reference docs while preserving critical constraints:
  - `.github/skills/bass-uiconfig-system/SKILL.md`
  - `.github/skills/bass-multiple-sections/SKILL.md`
  - `.github/skills/bass-form-validation/SKILL.md`
  - `.github/skills/bass-country-config/SKILL.md`
  - `.github/skills/bass-diagnostics/SKILL.md`
  - `.github/skills/bass-diagnostics/references/price-calculation.md`
- Kept key hazards and non-negotiables (mutation risk, discountBase naming, pricing/distribution guards, validation pipeline).
- Recomputed `.github/` total size: `164,907` bytes from baseline `380,767` bytes.
- Cumulative reduction achieved: `215,860` bytes (`56.69%`).

### 2. AI Agent Time Estimate

| Phase             | Description                                               | Estimated AI Time |
| ----------------- | --------------------------------------------------------- | ----------------- |
| Context gathering | Re-measured remaining hotspots and revalidated drift      | ~6 min            |
| Implementation    | Rewrote 6 skill/reference files to compact rule sheets    | ~14 min           |
| Verification      | Recomputed totals and checked remaining heavy-file spread | ~4 min            |
| **Total AI**      |                                                           | **~24 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                               | Developer Estimate |
| ------------------------------------------------------- | ------------------ |
| Analyze largest remaining skill docs for safe reduction | ~15 min            |
| Rewrite and cross-check critical hazard coverage        | ~35 min            |
| Re-measure and validate cumulative reduction            | ~10 min            |
| **Total Developer**                                     | **~60 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~24 min  | ~60 min               |
| Speedup factor | —        | ~2.5x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: high-throughput doc compression with measurable outcomes.
- AI disadvantage: compacted docs may need domain-owner review for preferred narrative depth.

## Session 2026-05-15 - enforce response-style inheritance across agents

### 1. Scope

- Added explicit inheritance line to agent prompts missing reference to `.github/copilot-instructions.md`.
- Standardized line used: `Follow .github/copilot-instructions.md Response Style & conventions.`
- Updated 11 files in `.github/agents/` to reduce style drift risk between agents.
- Verification: reran agent scan; all agent files now reference `copilot-instructions.md`.

### 2. AI Agent Time Estimate

| Phase             | Description                                               | Estimated AI Time |
| ----------------- | --------------------------------------------------------- | ----------------- |
| Context gathering | Scanned agent set for missing inheritance                 | ~3 min            |
| Implementation    | Applied bulk text insertion for missing files             | ~4 min            |
| Verification      | Rechecked all agents and spot-validated updated file tops | ~3 min            |
| **Total AI**      |                                                           | **~10 min**       |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                           | Developer Estimate |
| --------------------------------------------------- | ------------------ |
| Identify missing inheritance across all agent files | ~6 min             |
| Apply and review consistent updates                 | ~8 min             |
| Verify all files include the reference              | ~4 min             |
| **Total Developer**                                 | **~18 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~10 min  | ~18 min               |
| Speedup factor | —        | ~1.8x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast bulk consistency update across many files.
- AI disadvantage: still requires human review for preferred phrasing style.

## Session 2026-05-15 - compact performance report instructions

### 1. Scope

- Reduced verbosity in `Performance Reports` section of `.github/copilot-instructions.md`.
- Kept required structure: session heading + 4 required subsections.
- Kept SonarQube `effort` add-on rule.
- Added concise "keep short" guardrails to reduce token usage in future reports.

### 2. AI Agent Time Estimate

| Phase             | Description                                     | Estimated AI Time |
| ----------------- | ----------------------------------------------- | ----------------- |
| Context gathering | Read existing section and constraints           | ~2 min            |
| Implementation    | Rewrote section to compact format               | ~4 min            |
| Verification      | Reviewed resulting structure and required rules | ~2 min            |
| **Total AI**      |                                                 | **~8 min**        |

### 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                      | Developer Estimate |
| ---------------------------------------------- | ------------------ |
| Edit instructions to shorter equivalent format | ~8 min             |
| Verify required fields/rules still present     | ~4 min             |
| **Total Developer**                            | **~12 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~8 min   | ~12 min               |
| Speedup factor | —        | ~1.5x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast structural rewrite with rule retention.
- AI disadvantage: final wording preference still subjective.

## Session 2026-05-18 - consolidate Jira/Confluence agent prompts

### 1. Scope

- Reduced duplicated prompt logic across Jira/Confluence agents in `.github/agents/`.
- Converted `jira-triage.agent.md`, `jira-sprint-monitor.agent.md`, and `jira-changelog.agent.md` to thin orchestration wrappers.
- Established `conf-release.agent.md` as canonical release workflow prompt.
- Converted `bass-release-notes.agent.md` into compatibility redirect wrapper to canonical release prompt.
- Goal: keep detailed automation logic in MCP project (`mcp-jira-confluence`) and keep workspace prompts lightweight.
- Verification: reviewed updated files for delegation wording and approval-gate constraints.

### 2. AI Agent Time Estimate

| Phase             | Description                                       | Estimated AI Time |
| ----------------- | ------------------------------------------------- | ----------------- |
| Context gathering | Compared overlapping agents across both repos     | ~8 min            |
| Implementation    | Rewrote 5 workspace agent prompt files            | ~12 min           |
| Verification      | Readback checks for wrapper/canonical consistency | ~4 min            |
| **Total AI**      |                                                   | **~24 min**       |

### 3. Developer Estimate

| Work Item                                             | Developer Estimate |
| ----------------------------------------------------- | ------------------ |
| Cross-repo overlap audit for prompt/automation layers | ~20 min            |
| Rework prompts with compatibility safeguards          | ~18 min            |
| Consistency verification and final cleanup            | ~7 min             |
| **Total Developer**                                   | **~45 min**        |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~24 min  | ~45 min               |
| Speedup factor | —        | ~1.9x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: fast cross-repo deduplication and prompt consolidation.
- AI disadvantage: final ownership boundaries (prompt vs MCP logic) still benefit from maintainer confirmation.

## Session 2026-05-26 - raise test coverage above 65 and keep gates green

### 1. Scope

- Added and stabilized 13 new test files targeting low-coverage hooks/components in DatePicker, DynamicDropdown, document/message modals, flyouts, diagnostics summary, and claim/job row UIs.
- Updated existing newly-added tests to fix failing assertions, selector brittleness, and mock shape mismatches.
- Coverage moved from 57.44% to 65.91% statements (full run with v8 coverage).
- Verification run: targeted vitest batches + full `vitest --coverage`; `npm run lint`; `npm run typecheck`.

### 2. AI Agent Time Estimate

| Phase             | Description                                              | Estimated AI Time |
| ----------------- | -------------------------------------------------------- | ----------------- |
| Context gathering | Parsed LCOV hotspots and selected high-yield files       | ~18 min           |
| Implementation    | Added/iterated 13 test files and fixed failing scenarios | ~70 min           |
| Verification      | Re-ran targeted tests, full coverage, lint, typecheck    | ~22 min           |
| **Total AI**      |                                                          | **~110 min**      |

### 3. Developer Estimate

| Work Item                                                       | Developer Estimate |
| --------------------------------------------------------------- | ------------------ |
| Analyze coverage hotspots and design test plan                  | ~35 min            |
| Implement and debug equivalent test suite additions/fixes       | ~150 min           |
| Run/triage coverage + lint/typecheck and finalize quality gates | ~35 min            |
| **Total Developer**                                             | **~220 min**       |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~110 min | ~220 min              |
| Speedup factor | —        | ~2.0x faster          |
| Review needed  | Yes      | Self-review           |

- AI advantage: quick hotspot iteration loop with fast mock/test refactors.
- AI disadvantage: coverage warnings/act-noise still require human judgment on strictness level.
