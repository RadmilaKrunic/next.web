# Performance Report — BASS-Next Autonomous Jira/Confluence Agents

**Date:** 2026-05-13  
**File:** `performance-reports/report-bass-agents-jira-confluence-2026-05-13.md`

---

## 1. Scope

Deliverables created:

- **`agents/` — standalone TypeScript ESM package** that replicates the mcp-jira-confluence agent pattern for BASS-Next
- `agents/src/jira/client.ts` — `JiraClient` class: `getIssue`, `createIssue`, `updateIssue`, `transitionIssue`, `searchIssues`, `getIssuesByDateRange`, `getSprintIssues`, `getVersionIssues`, `listSprints`, `getVersions`, `addComment`, `getTransitions`
- `agents/src/jira/tools.ts` — `handleJiraTool()` dispatcher + `formatIssue()` helper (11 tools)
- `agents/src/confluence/client.ts` — `ConfluenceClient` class: `getPage`, `getPageByTitle`, `createPage`, `updatePage`, `searchPages`, `listPages`, `deletePage`, `addLabel`, `getPageUrl`; built-in `markdownToStorage()` converter
- `agents/src/confluence/tools.ts` — `handleConfluenceTool()` dispatcher (8 tools)
- `agents/src/agents/agent-helpers.ts` — `makeClients()` factory reads all env vars; `ADAPTIVE_THINKING` constant
- `agents/src/agents/agent-tools.ts` — `makeAgentTools()` returns 19 Anthropic `Tool[]`; `executeTool()` unified dispatcher
- `agents/src/agents/bass-sprint-monitor.ts` — scans active PTBASS sprint for stale/blocked/unassigned issues, posts Jira comments
- `agents/src/agents/bass-triage.ts` — analyzes untriaged PTBASS tickets, suggests/applies priority, type, labels, story points
- `agents/src/agents/bass-release.ts` — full release workflow: generate notes → publish Confluence → comment resolved tickets
- `agents/src/agents/bass-changelog.ts` — extracts `PTBASS-\d+` keys from git commits, fetches details, generates changelog
- `agents/src/agents/run.ts` — unified CLI entrypoint with `switch(agent)` dispatch
- `agents/package.json` — `"type": "module"`, scripts: `build`, `agent`, `agent:sprint-monitor`, `agent:release`, `agent:triage`, `agent:changelog`
- `agents/tsconfig.json` — ES2022, ESNext modules, `moduleResolution: bundler`, strict
- `agents/.env.example` — all required environment variables documented
- `agents/README.md` — full usage guide, architecture diagram, troubleshooting

**Verification:** `npm install` (52 packages, 0 vulnerabilities) + `npm run build` (clean — zero TypeScript errors, all 12 JS output files emitted).

---

## 2. AI Agent Time Estimate

| Phase                | Description                                                                                          | Estimated AI Time |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| Context gathering    | Read mcp-jira-confluence reference project; compare structure, patterns, and tools                   | ~5 min            |
| Jira layer           | `client.ts` + `tools.ts` adapted for PTBASS                                                          | ~6 min            |
| Confluence layer     | `client.ts` + `tools.ts` adapted for BASS                                                            | ~5 min            |
| Agent infrastructure | `agent-helpers.ts`, `agent-tools.ts` (19 tool definitions)                                           | ~5 min            |
| Four agent scripts   | `bass-sprint-monitor`, `bass-triage`, `bass-release`, `bass-changelog` with BASS-Next system prompts | ~10 min           |
| CLI + package config | `run.ts`, `package.json`, `tsconfig.json`, `.env.example`                                            | ~3 min            |
| Documentation        | `agents/README.md`                                                                                   | ~3 min            |
| Build verification   | `npm install` + `npm run build`                                                                      | ~2 min            |
| **Total AI**         |                                                                                                      | **~39 min**       |

---

## 3. Developer Estimate (Experienced, Codebase-Familiar)

| Work Item                                              | Developer Estimate     |
| ------------------------------------------------------ | ---------------------- |
| Study mcp-jira-confluence reference patterns           | ~15 min                |
| `JiraClient` class (copy + adapt from reference)       | ~20 min                |
| `ConfluenceClient` class (copy + adapt from reference) | ~20 min                |
| `agent-helpers.ts` + `agent-tools.ts` (19 tool defs)   | ~25 min                |
| `bass-sprint-monitor.ts` with BASS system prompt       | ~20 min                |
| `bass-triage.ts` with BASS domain knowledge            | ~20 min                |
| `bass-release.ts` full release workflow                | ~20 min                |
| `bass-changelog.ts` with git log integration           | ~20 min                |
| `run.ts` CLI + `package.json` + `tsconfig.json`        | ~10 min                |
| `agents/README.md`                                     | ~15 min                |
| Install deps + build + fix errors                      | ~10 min                |
| **Total Developer**                                    | **~195 min (~3.25 h)** |

---

## 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~39 min  | ~195 min              |
| Speedup factor | —        | ~5x faster            |
| Review needed  | Yes      | Self-review           |

**Notes:**

1. **Mechanical code generation strongly favoured AI** — the four agent scripts follow an identical agentic loop pattern; once the template is established, instantiating it four times with different system prompts and tool subsets is pure boilerplate that the AI handles without fatigue.
2. **System prompt authoring was the creative challenge** — embedding accurate BASS-Next domain knowledge (PTBASS project key, module names, React 19 SPA context, diagnostics system) into each system prompt required careful reading of the copilot instructions; a developer unfamiliar with the BASS domain would have taken significantly longer.
3. **Build-time zero-error result** — strict TypeScript + ESM module resolution with `moduleResolution: bundler` can produce unexpected import errors; achieving a clean first build without iteration was an AI advantage due to pattern consistency.

---

## Session 2026-05-18 — align Jira/Confluence MCP docs

### 1. Scope

Updated `.vscode/mcp.json` comment text and `README.md` setup docs to point Jira/Confluence agents at `mcp-jira-confluence` instead of `mcp-atlassian`. Verified no `mcp-atlassian` references remain in repo search results.

### 2. AI Agent Time Estimate

| Phase             | Estimate |
| ----------------- | -------- |
| Context gathering | ~5 min   |
| Implementation    | ~5 min   |
| Verification      | ~3 min   |
| Total             | ~13 min  |

### 3. Developer Estimate

| Work Item                        | Estimate |
| -------------------------------- | -------- |
| Review MCP wiring and agent docs | ~5 min   |
| Update docs/comments             | ~5 min   |
| Validate search results          | ~3 min   |
| Total                            | ~13 min  |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~13 min  | ~13 min               |
| Speedup factor | ~1x      | ~1x                   |
| Review needed  | Low      | Low                   |

Notes:

1. Change was small and local.
2. No source behavior changed; only docs/config comments.

---

## Session 2026-05-18 — add VS Code MCP fallback wording

### 1. Scope

Updated `.vscode/mcp.json` and `README.md` to describe VS Code user-level `jira` and `confluence` MCP servers as the fallback path for Jira/Confluence agents. Verified the updated wording in repo search output.

### 2. AI Agent Time Estimate

| Phase             | Estimate |
| ----------------- | -------- |
| Context gathering | ~4 min   |
| Implementation    | ~4 min   |
| Verification      | ~3 min   |
| Total             | ~11 min  |

### 3. Developer Estimate

| Work Item                  | Estimate |
| -------------------------- | -------- |
| Review current MCP wording | ~4 min   |
| Update comments/docs       | ~4 min   |
| Validate search output     | ~3 min   |
| Total                      | ~11 min  |

### 4. AI vs Developer Comparison

| Metric         | AI Agent | Experienced Developer |
| -------------- | -------- | --------------------- |
| Net work time  | ~11 min  | ~11 min               |
| Speedup factor | ~1x      | ~1x                   |
| Review needed  | Low      | Low                   |

Notes:

1. Only prose changed.
2. No runtime configuration changed in repo.
