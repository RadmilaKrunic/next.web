# BASS-Next AI Agents Guide

Purpose: fast agent selection with minimal tokens.

## Agent Matrix

| Agent                   | Primary Use                            | Key Tools                                       |
| ----------------------- | -------------------------------------- | ----------------------------------------------- |
| BASS-Next Orchestrator  | ticket-driven workflow coordination    | execute, agent, todo, jira/\*                   |
| BASS-Next Developer     | feature/fix implementation             | read, edit, search, execute, todo               |
| BASS-Next Planner       | implementation planning                | read, search, todo                              |
| BASS-Next Reviewer      | compliance/code review                 | read, search, todo                              |
| BASS-Next Tester        | test strategy and execution            | read, execute, todo                             |
| BASS-Next SonarQube     | Sonar issue triage and fixes           | read, edit, search, execute, todo, sonarqube/\* |
| BASS-Next Diagnostics   | diagnostics pricing/material workflows | read, search, execute, todo                     |
| BASS-Next Validator     | data/form validation workflows         | read, search, execute, todo                     |
| BASS-Next Reporter      | report/export generation               | read, search, execute, todo                     |
| BASS-Next Data Audit    | consistency/integrity audits           | read, search, execute, todo                     |
| BASS-Next Release Notes | release docs/changelog summaries       | read, search, execute, todo                     |

## Selection Rules

1. Use Orchestrator for Jira-first flow and approval gates.
2. Use Developer for code changes.
3. Use Planner before large multi-file work.
4. Use Reviewer for review-only requests.
5. Use Tester when user asks tests/coverage/quality checks.
6. Use SonarQube for rule-based static analysis issues.
7. Use Diagnostics for job-overview pricing and materials.
8. Use Validator for mandatory fields/dependencies/schema checks.
9. Use Reporter for summaries and exports.
10. Use Data Audit for anomaly/orphan/duplicate checks.

## Shared Constraints

- Follow .github/copilot-instructions.md.
- Follow matching .github/skills/\*/SKILL.md before domain edits.
- Keep edits minimal and pattern-consistent.
- Use npm run commit (never git commit directly).

## Key Skills

- .github/skills/bass-diagnostics/SKILL.md
- .github/skills/bass-country-config/SKILL.md
- .github/skills/bass-form-validation/SKILL.md
- .github/skills/bass-uiconfig-system/SKILL.md
- .github/skills/bass-multiple-sections/SKILL.md
- .github/skills/bass-api-domain/SKILL.md
