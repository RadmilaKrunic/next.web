---
name: bass-api-domain
description: "BASS-Next API domain creation rules."
---

# BASS-Next API Domain Creation

## Required Structure

- Location: `src/api/services/<domain>/`
- `action.ts` (raw axiosClient calls, no React hooks)
- `hooks.ts` (useQuery/useMutation wrappers using `use<Verb><Resource>` naming)
- `<domain>.types.ts` (request/response interfaces, no module folder placement)

## Rules

- Use `src/api/axios-client/axiosClient.ts` and `VITE_API_BASE_URL` exclusively.
- Interfaces for structures; `unknown` for dynamic payloads.
- Cache keys: `["user"]`,`["jobs"]`,`["job",id]`,`["diagnostic",id]`,`["UIConfiguration",cc]`,`["countryConfiguration",cc]`,`["messages",id]`,`["autocomplete"]`.
