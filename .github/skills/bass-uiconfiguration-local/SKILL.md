---
name: bass-uiconfiguration-local
description: "UIConfiguration local-file strategy: dev-vs-deployed split in getUIConfiguration, data/data<CC>.json naming, Vite import.meta.glob pattern, countryCode casing, adding countries, downstream cache consumers."
---

# UIConfiguration Local-File Strategy

## Core Principle

`getUIConfiguration` (`src/api/services/uiConfiguration/action.ts`) is the **single environment branch point**.

- `import.meta.env.DEV` true (`npm run dev`) → `data/data<CC>.json` via `import.meta.glob`
- All builds (`vite build *`) → `GET /v1/countries/{cc}/ui-configuration`

Use `import.meta.env.DEV` — never branch on `MODE === "development"`.

## File Naming

- Pattern: `data/data<UPPERCASE_CC>.json` at **project root** — never in `src/` or `public/`
- `user.countryCode` is lowercase → always `.toUpperCase()` when building the lookup key
- JSON root: `{ "forms": GenericForm[] }`

Examples: `data/dataTR.json` (`"tr"`), `data/dataZA.json` (`"za"`)

## Implementation Rules (`action.ts`)

- `import.meta.glob` path (relative to `action.ts`): `"../../../../data/data*.json"`
- Glob is resolved at build time; runtime key: `` `../../../../data/data${countryCode.toUpperCase()}.json` ``
- Missing local file → `console.warn` and fall through to API (no hard error in dev)
- `staleTime: Infinity` in App.tsx query — never refetches after initial load

## Adding a New Country

1. Create `data/data<CC>.json` (uppercase CC, project root)
2. Copy shape from existing file; set `{ "forms": [...] }`
3. No code change needed — glob picks it up automatically on next `npm run dev`

## Downstream Consumers

All read `queryClient.getQueryData(["UIConfiguration", countryCode])` — never call `getUIConfiguration` directly.
Consumers: `JobList.tsx`, `ClaimList.tsx`, `JobOverview.tsx`, `ClaimOverview.tsx`, `CreateJob.tsx`

## Environment Reference

| Command          | `import.meta.env.DEV` | Source               |
| ---------------- | --------------------- | -------------------- |
| `npm run dev`    | `true`                | `data/data<CC>.json` |
| any `vite build` | `false`               | API                  |

## Testing

Seed cache directly — do not call `getUIConfiguration` in unit tests:

```typescript
queryClient.setQueryData(["UIConfiguration", "tr"], { forms: mockForms });
// To test DEV branch:
vi.stubEnv("DEV", "true");
/* ... */ vi.unstubAllEnvs();
```

## Checklist

- [ ] `data/data<CC>.json` exists for all locally used countries
- [ ] Missing file falls through to API — no hard error
- [ ] No hardcoded country codes in `action.ts`
- [ ] `import.meta.glob` path unchanged: `../../../../data/data*.json`
- [ ] `npm run typecheck` and `npm run test` pass
