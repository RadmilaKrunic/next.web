---
name: bass-uiconfiguration-local
description: "UIConfiguration local file selection strategies."
---

# UIConfiguration Local Strategy

## Branching Pattern

- Context evaluation routes entirely inside `getUIConfiguration`:
  - `import.meta.env.DEV === true` → imports local tracking files `data/data<UPPERCASE_CC>.json` via `import.meta.glob`.
  - Production deployments → executes standard backend endpoint: `GET /v1/countries/{cc}/ui-configuration`.

## Consumption Constants

- Always normalize target key variables using `.toUpperCase()` formats.
- Fallback parameters: Log a standard `console.warn` upon local file lookup errors and request standard data endpoints directly.
- Stale policies: App-level layer stores queries with an explicit `Infinity` threshold configuration.
