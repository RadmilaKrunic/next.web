---
name: bass-api-domain
description: "BASS-Next API domain creation. Use when: adding new API service domain, creating action.ts/hooks.ts/types, adding endpoint, integrating backend service."
---

# BASS-Next API Domain Creation

## Required Structure

```
src/api/services/<domain>/
├── action.ts           # raw axios — no React, no hooks
├── hooks.ts            # useQuery/useMutation wrappers
└── <domain>.types.ts   # request/response interfaces
```

Types never in module folders. Modules import from `src/api/services/<domain>/<domain>.types.ts`.

## Rules

| Rule               | Detail                                                                              |
| ------------------ | ----------------------------------------------------------------------------------- |
| `axiosClient` only | `import axiosClient from "api/axios-client/axiosClient"` — never new axios instance |
| Base URL           | From `VITE_API_BASE_URL` via axiosClient — never hardcode                           |
| Errors             | `console.error` in catch; rethrow for React Query to handle                         |
| Shapes             | `interface` (not `type`) for all request/response structures                        |
| No `any`           | Use `unknown` for dynamic payloads                                                  |
| Hook names         | `use<Verb><Resource>` — `useJobById`, `usePostValidateAndSave`                      |

## Templates

### `action.ts`

```typescript
import axiosClient from "api/axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { MyResourceResponse, MyResourcePayload } from "./myDomain.types";

export const fetchMyResource = async (id: string): Promise<MyResourceResponse> => {
  try {
    const response: AxiosResponse<MyResourceResponse> = await axiosClient.get(
      `/v1/my-resource/${id}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching my-resource ${id}:`, error);
    throw error;
  }
};
```

### `hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { fetchMyResource, postMyResource } from "./action";
import { MyResourceResponse, MyResourcePayload } from "./myDomain.types";

export const useMyResourceById = (
  id: string,
  options?: Partial<UseQueryOptions<MyResourceResponse>>,
) =>
  useQuery<MyResourceResponse>({
    queryKey: ["myResource", id],
    queryFn: () => fetchMyResource(id),
    enabled: !!id,
    ...options,
  });

export const usePostMyResource = (callbacks?: {
  onSuccess?: (data: MyResourceResponse) => void;
  onError?: (error: unknown) => void;
}) =>
  useMutation({
    mutationFn: (payload: MyResourcePayload) => postMyResource(payload),
    ...callbacks,
  });
```

### `<domain>.types.ts`

```typescript
export interface MyResourceResponse {
  id: string /* fields */;
}
export interface MyResourcePayload {
  /* fields */
}
```

## Established Cache Keys

| Key                            | Domain          |
| ------------------------------ | --------------- |
| `["user"]`                     | Logged-in user  |
| `["jobs"]`                     | Job list        |
| `["job", jobId]`               | Single job      |
| `["diagnostic", jobId]`        | Job diagnostics |
| `["UIConfiguration", cc]`      | Form metadata   |
| `["countryConfiguration", cc]` | Country config  |
| `["messages", jobId]`          | Job notes       |
| `["autocomplete"]`             | Autocomplete    |

New key format: `["resourceName", parameterValue]`

## Cache Invalidation

```typescript
onSuccess: () => {
  void queryClient.invalidateQueries({ queryKey: ["myResource", id] });
};
```

Never `console.log` in `onSuccess`/`onError`. `console.error` in `onError` is OK.

## Checklist

- [ ] `action.ts` with axiosClient calls
- [ ] `hooks.ts` with useQuery/useMutation
- [ ] `<domain>.types.ts` with interfaces
- [ ] All three in `src/api/services/<domain>/`
- [ ] No types in module folders
- [ ] No hardcoded URLs
- [ ] Query keys follow convention
- [ ] `npm run commit` (not `git commit`)
