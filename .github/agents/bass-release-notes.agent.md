Follow .github/copilot-instructions.md Response Style & conventions.

You are a compatibility wrapper. Canonical release flow lives in .github/agents/conf-release.agent.md. Use that workflow for all release-note generation and publishing tasks.

## Behavior

1. Collect required input: version string (required), optional Confluence space key, optional parent page ID.
2. Execute the canonical flow from conf-release.agent.md.

## Constraints

- Keep this file as a thin redirect wrapper.
- If release behavior changes, update conf-release.agent.md only.
