# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BASS-Next (Bosch After Sales Service) is a React 19 SPA for managing tool repair workflows at Authorized Service Centers. Built with Vite, TypeScript, styled-components, and deployed as containerized Helm charts on Azure.

## Essential Commands

### Development
```bash
npm run dev          # Start Vite dev server
npm run start        # Alias for dev
npm run typecheck    # TypeScript validation
npm run lint         # ESLint check
```

### Testing
```bash
npm run test                                      # Run all tests
npm run test src/path/to/Component.test.tsx      # Single file
npm run test:watch                                # Watch mode
npm run test:cov                                  # Coverage report
npm run test:ui                                   # Vitest UI
```

### Building
```bash
npm run build        # Production build (default)
npm run build:dev    # Build targeting dev environment
npm run build:qa     # Build targeting QA environment
npm run build:prod   # Build targeting production environment
```

### Commits
```bash
npm run commit       # REQUIRED - Commitizen interactive commit
```

**CRITICAL**: Always use `npm run commit`. Direct `git commit` will fail pre-commit hooks.

Format: `type(scope): PTBASS-#### short summary`
- Must include PTBASS Jira ticket number
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Example: `feat(auth): PTBASS-1234 implement JWT refresh token`

## Architecture

### Core Pattern: Metadata-Driven Forms

The application uses a **metadata-driven form system** with a three-level hierarchy:

**Section → Area → Field**

Forms are defined as JSON metadata and rendered dynamically by generic components in `src/components/generics/`:
- `GenericForm` → `GenericSection` → `GenericArea` → `GenericField`
- 13 supported field types: `text`, `email`, `tel`, `price`, `number`, `button`, `radiogroup`, `checkbox`, `datepicker`, `dropdown`, `upload`, `textarea`, `autocomplete`
- Conditional visibility via `dependentFields` + `dependFieldCondition` ("AND"/"OR" logic)
- All generic components consume Formik context (`useFormikContext()`) - **never prop-drill form state**

### Two Static Form Configurations

Exported from `src/components/generics/Form/GenericForm.data.ts`:
1. `createJobForm` - Used by `CreateJob` and `edit-order/:orderId` routes
2. `jobOverview` - Used by `JobOverview` (`/job-overview/:jobId`)

**Production**: Forms are fetched from UIConfiguration API (`GET /v1/countries/{countryCode}/ui-configuration`) and cached in React Query under `["UIConfiguration", countryCode]`.

### State Management

- **React Query** (`@tanstack/react-query`) for all server state
- **Formik** for all form state - wrap forms with `<Formik>`, consume via hooks
- **Context API** for breadcrumbs (`BreadcrumbsContext`) - call `useBreadcrumbs()` in route components
- **GenericFormContext** for shared state between modules and nested generic components

### API Layer Pattern (MANDATORY)

Every domain must follow this structure in `src/api/services/`:

```
src/api/services/yourDomain/
  action.ts              # Raw axios calls using axiosClient
  hooks.ts               # useQuery / useMutation wrappers
  yourDomain.types.ts    # Request/response types
```

**Centralized axios client** (`src/api/axios-client/axiosClient.ts`):
- JWT token from `localStorage.getItem("token")`, auto-injected via interceptor
- `withCredentials: true` for cookie-based session alongside JWT
- 401 response: redirects to `${VITE_API_BASE_URL}/auth/login?redirect_uri=<currentPath>`
- 403 on `/auth/me`: redirects to `${VITE_API_BASE_URL}/v1/auth/logout`
- 403 on other paths: logs error, does not redirect

### Component Libraries

- **@bosch/react-frok** - Bosch FROK components (`Button`, `TextField`, `Dropdown`, `Icon`, etc.)
- **@bosch/frontend.kit-npm** - Global CSS (`.complete.css`)
- **Custom UI wrappers** in `src/components/ui/` for `DatePicker`, `FileUpload`, `AutoComplete`, `DynamicDropdown`, etc.

### Routing & Layout

- **React Router v7** (`react-router-dom`)
- Layout: `SideNav` | `BassHeader` + `Main` (routes) + `Footer`
- Wrap each route in `<ErrorBoundary>` (see `Routes.tsx`)
- Modules in `src/modules/` - each represents a feature/route

Key routes:
- `/create-job` - Create mode (uses `createJobForm`)
- `/edit-order/:orderId` - Edit mode (DRAFT jobs only, uses `createJobForm`)
- `/job-overview/:jobId` - Full job detail with tabs (uses `jobOverview`)
- `/job-list` - Main job table
- `/claim-list` - Claim list view
- `/approval-list` - Approval workflow

## Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:
- `@/` → `src/`
- Bare names also work: `components/`, `modules/`, `hooks/`, `api/`, `utils/`, `types/`

## Key Field System Properties

From `src/components/generics/Field/GenericField.types.ts`:

| Property | Purpose |
|----------|---------|
| `type` | Rendering type (text, dropdown, autocomplete, etc.) |
| `attributeMapping` | Dot-notation API path used by `mapValuesToAPI()` (e.g. `"order.customer.firstName"`) |
| `subtype` | Special behavior flag: `diagnosticPosition`, `diagnosticPartNumber`, `diagnosticFaultCode` |
| `autoFillFields` | Array of sibling field names to auto-populate on autocomplete selection |
| `dependentFields` | Array of `{ fieldName, fieldValue }` - `fieldValue: "-"` is wildcard (any non-empty value) |
| `dependFieldCondition` | `"AND"` or `"OR"` - how `dependentFields` are combined |
| `optionsEndpoint` | `{ url, method, queryParams }` - dynamic dropdown options from API |
| `hiddenForStatuses` | Array of job statuses where field/section/tab is hidden |
| `permissions` | `string[]` - checked by `useHasPermission()`; empty array = always visible |
| `requiredDependentFields` | Conditional required validation |

## Permission System

Defined in `src/utils/Permissions.ts` as namespaced object:
```typescript
PERMISSIONS.ACCESS.*
PERMISSIONS.APPROVAL.*
PERMISSIONS.FEATURE_FLAGS.*
PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE      // "D_NV"
PERMISSIONS.DIAGNOSTICS.CAN_VIEW_DIAGNOSTICS_ON_JOBS_AND_CLAIMS  // "D__V"
```

`useHasPermission(permissions: string[])` reads user from React Query cache `["user"]`:
- Returns `true` if user has **any** of the listed permissions
- Always `true` if the array is empty
- Checked at Field, Area, Section, and Action levels

## Custom Areas

`CustomAreasMapper.tsx` routes by area name:

| Area name | Component | Notes |
|-----------|-----------|-------|
| `accessory` | `AccessoryArea` | Editable accessory rows in create mode; disabled in view mode |
| `documentList` | `DocumentTabArea` | File upload + document list with modal preview |
| `notesList` | `NotesList` | Notes thread display/input |
| `diagnosticsSpareParts` | `SparePartsArea` | Dynamic spare-part rows |
| `diagnosticsSummary` | `SummaryArea` | Aggregated price totals |

Returns `null` for unrecognized names → default `GenericArea` rendering applies.

## Internationalization (i18n)

**CRITICAL**: Only edit `/i18n/source/bass-en-US.json` for translation keys.

All other files under `/i18n/` (e.g. `en-US.json`, `de-DE.json`) are synced automatically by Crowdin - **NEVER edit them directly**.

Usage:
```typescript
const { t } = useTranslation("translation", { keyPrefix: "app" })
// Always translate UI strings:
{t("labelKey")}
```

## Styling

- **SCSS Modules** per component + global styles in `src/styles/`
- Global SCSS variables auto-injected: `@use "@/styles/variables.scss" as *;` (Vite config)
- BEM-like naming: `.generic-area`, `.area-title`, `.area-fields`

## TypeScript Patterns

- Interfaces for data structures (not types) - see generics `.types.ts` files
- `Field`, `Area`, `Section` interfaces define form metadata shape
- Use `unknown` for dynamic form values, cast with type guards
- Never use `any` - linter enforces this strictly

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL (used by `axiosClient.ts`) |
| `VITE_STALE_TIME` | React Query stale time (ms) |
| `VITE_GC_TIME` | React Query garbage-collection time (ms) |

## Testing

- **Vitest** with **@testing-library/react**
- Setup file: `src/setupTests.ts` - imports `@testing-library/jest-dom` matchers
- **MSW 2** available for API mocking
- Config in `vite.config.ts`

## Docker Build

Requires `.npmrc` with credentials:
```bash
DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=<path-to-.npmrc> -t ptdpacr.azurecr.io/com.bosch.pt/bass-web:latest .
```

## Skills System

The following skill files contain deep, code-verified knowledge for specific subsystems. **Load the relevant SKILL.md before working on any task in that domain** - reading the skill first is not optional:

| Skill | File | Load when... |
|-------|------|-------------|
| `bass-api-domain` | `.github/skills/bass-api-domain/SKILL.md` | Adding a new `src/api/services/` domain, creating `action.ts` / `hooks.ts` / `.types.ts`, or adding a new endpoint |
| `bass-uiconfig-system` | `.github/skills/bass-uiconfig-system/SKILL.md` | Touching UIConfiguration loading, `useFormInitialization`, `setInitalSectionsAreasFields`, `mapFieldToFieldMapping`, `mapValuesToAPI`, `convertAPIDataToFormValues`, field naming, or `GenericFormContext` |
| `bass-uiconfiguration-local` | `.github/skills/bass-uiconfiguration-local/SKILL.md` | Adding country data files to `data/`, debugging `getUIConfiguration` dev-vs-deployed split, or modifying `src/api/services/uiConfiguration/action.ts` |
| `bass-form-validation` | `.github/skills/bass-form-validation/SKILL.md` | Implementing or debugging form validation: `useFormValidation`, `validateByAction`, `requiredDependentFields`, `autocompleteValidation`, `scrollToFirstError`, or action-gated mandatory fields |
| `bass-multiple-sections` | `.github/skills/bass-multiple-sections/SKILL.md` | Working with `isMultiple` sections/areas, `setDuplicatedSection`, `addNewMultipleSection`, `deleteSection`, `AccessoryArea`, `useAccessoriesManager`, or multi-asset form patterns |
| `bass-diagnostics` | `.github/skills/bass-diagnostics/SKILL.md` | Working on the `diagnosticData` tab, `useDiagnosticsManager`, `SparePartsArea`, `SparePartsRow`, `SummaryArea`, price calculation, position dropdown, `validateAndSave`, or `DiagnosticsContext` |
| `bass-country-config` | `.github/skills/bass-country-config/SKILL.md` | Touching `CountryConfig`, `diagnosticsConfiguration`, `rules[]`, `allowedPositions`, `automaticRows`, `discountBase`, `addSpecialMaterialsAllowed`, `currencySymbol`, or `["countryConfiguration", countryCode]` cache key |

## Common Tasks

### Add a new route
1. Create module in `src/modules/YourFeature/`
2. Add route in `src/routes/Routes.tsx` wrapped in `<ErrorBoundaryWrapper>`
3. Update SideNav items if needed

### Add a form field
1. Extend `Field` interface in `GenericField.types.ts` for new properties
2. Add rendering logic in `GenericField.tsx` if-chain
3. Add field metadata to the relevant form in `GenericForm.data.ts`

### Add API integration
1. Create `src/api/services/yourDomain/action.ts` with raw axios calls using `axiosClient`
2. Create `src/api/services/yourDomain/hooks.ts` with `useQuery`/`useMutation` wrappers
3. Create `src/api/services/yourDomain/yourDomain.types.ts` for types
4. Consume hooks in module components

## Key Directories

- `src/components/generics/` - Metadata-driven form components (Section/Area/Field/Action)
- `src/components/ui/` - Custom UI wrappers (DatePicker, FileUpload, AutoComplete, etc.)
- `src/modules/` - Feature modules (each is a route)
- `src/api/services/` - API service functions organized by domain (`action.ts` + `hooks.ts`)
- `src/contexts/` - React contexts (breadcrumbs)
- `src/hooks/` - Shared custom hooks
- `src/utils/` - Pure utilities (priceCalculator, Permissions, dateFormatter, etc.)
- `src/styles/` - Global SCSS (`_variables.scss`, `_images.scss`)

## Code Conventions

- Prefer editing existing files to creating new ones
- No `any` type usage - linter enforces this
- No `console.log` in production code
- Keep responses short and concise
- Use subject-verb-object sentence structure
- Prefer code over prose
- Default to no comments unless WHY is non-obvious
