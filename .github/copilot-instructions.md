# BASS-Next Web Application - AI Coding Agent Instructions

## Project Overview

BASS-Next (Bosch After Sales Service) is a React 19 SPA for tool repair management at Authorized Service Centers. Built with Vite, TypeScript, and deployed as containerized Helm charts on Azure.

## Response Style

### Style Rules

- No filler words.
- No pleasantries.
- Use short sentences.
- Use subject-verb-object only.
- Never use: "certainly", "of course", "I'd be happy to", "Let me explain".
- Do not restate question.
- Skip articles (`a`, `an`, `the`) where meaning survives.
- Prefer symbols: `&`, `>`, `<`, `=`, `->`.
- Lists > paragraphs.
- Max 1 sentence per bullet.
- Code speaks.
- Minimize prose around code.

### Tone

- Caveman.
- Short.
- Dense.
- No fluff.

### Example

- BAD: "Certainly! I'd be happy to help you understand how this function works."
- GOOD: "Function loops array. Returns first match. O(n)."

## Architecture

### Generic Form System (Core Pattern)

The app uses a **metadata-driven form architecture** with three levels:

- **Section** → **Area** → **Field** hierarchy (see `src/components/generics/`)
- Fields render dynamically based on type: `text`, `email`, `tel`, `price`, `number`, `button`, `radiogroup`, `checkbox`, `datepicker`, `dropdown`, `upload`, `textarea`, `autocomplete`
- Conditional visibility via `dependentFields` + `dependFieldCondition` ("AND"/"OR" logic in `utils.ts`)
- All generic components consume Formik context (`useFormikContext()`) - never prop-drill form state

**Example**: `CreateJob.tsx` clones section metadata and prefixes field names with indices to create multi-asset forms dynamically.

### State Management

- **React Query** (`@tanstack/react-query`) for server state — used in all feature modules via the `action.ts` + `hooks.ts` pattern (see API Layer below)
- **Formik** for all form state - wrap forms with `<Formik>`, consume via hooks in nested generics
- **Context API** for breadcrumbs (`BreadcrumbsContext`) - call `useBreadcrumbs()` hook in route components

### API Layer

- Centralized axios client: `src/api/axios-client/axiosClient.ts`
- JWT token from `localStorage.getItem("token")`, auto-injected via request interceptor
- `withCredentials: true` for cookie-based session alongside JWT
- 401 response: redirects to `${VITE_API_BASE_URL}/auth/login?redirect_uri=<currentPath>`
- 403 response on `/auth/me`: redirects to `${VITE_API_BASE_URL}/v1/auth/logout`
- 403 response on other paths: logs error, does not redirect
- Services in `src/api/services/` - organize by domain (orders, header, footer, etc.)
- API base URL from `VITE_API_BASE_URL` env var

**Per-domain service pattern** (mandatory):

```
src/api/services/yourDomain/
  action.ts     # raw axios calls using axiosClient
  hooks.ts      # useQuery / useMutation wrappers
  yourDomain.types.ts
```

### Component Libraries

- **@bosch/react-frok** (Bosch FROK components) - use for `Button`, `TextField`, `Dropdown`, `Icon`, etc.
- **@bosch/frontend.kit-npm** (CSS) - import at app root, provides `.complete.css`
- Custom UI wrappers in `src/components/ui/` for DatePicker, FileUpload, AutoComplete, etc.

### Routing & Layout

- React Router v7 (`react-router-dom`)
- Layout: `SideNav` | `BassHeader` + `Main` (routes) + `Footer`
- Wrap each route in `<ErrorBoundary>` (see `Routes.tsx`)
- Modules in `src/modules/` - each represents a feature/route

## Development Workflow

### Commands

```bash
npm run dev          # Vite dev server
npm run build        # Production build (default)
npm run build:dev    # Build targeting dev environment
npm run build:qa     # Build targeting QA environment
npm run build:prod   # Build targeting production environment
npm run test         # Run all tests (Vitest)
npm run test:watch   # Vitest in watch mode
npm run test:cov     # Coverage report
npm run test:ui      # Vitest UI
npm run commit       # Commitizen (REQUIRED for commits)
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation
```

### Testing

- **Vitest** with **@testing-library/react** - config in `vite.config.ts`
- Run single file: `npm run test src/path/to/Component.test.tsx`
- Setup file: `src/setupTests.ts` — imports `@testing-library/jest-dom` matchers
- **MSW 2** is available as a dev dependency for mocking API calls in tests

### Commit Conventions

**CRITICAL**: Use `npm run commit` (Commitizen) - direct `git commit` will fail pre-commit hooks.

Format: `type(scope): PTBASS-#### short summary`

- Must include PTBASS Jira ticket number
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
- Example: `feat(auth): PTBASS-1234 implement JWT refresh token`

See `COMMIT_CONVENTIONS.md` for details. Husky + lint-staged enforce linting on commit.

## Code Patterns

### Internationalization (i18n)

- **react-i18next** with JSON files in `/i18n/`
- **Source file: `/i18n/source/bass-en-US.json`** — this is the **only** file you ever edit to add or modify translation keys
- All other files under `/i18n/` (e.g. `en-US.json`, `en-ZA.json`, `de-DE.json`, etc.) are **synced automatically by Crowdin** — **never edit them directly**
- Use hook: `const { t } = useTranslation("translation", { keyPrefix: "app" })`
- Always translate UI strings: `{t("labelKey")}`

### Styling

- **SCSS Modules** per component + global styles in `src/styles/`
- Global SCSS variables auto-injected: `@use "@/styles/variables.scss" as *;` (Vite config)
- BEM-like naming: `.generic-area`, `.area-title`, `.area-fields`

### TypeScript Patterns

- Interfaces for data structures (not types) - see generics `.types.ts` files
- `Field`, `Area`, `Section` interfaces define form metadata shape
- Use `unknown` for dynamic form values, cast with type guards
- Path aliases: `@/` maps to `src/`; bare names `components/`, `modules/`, `hooks/`, `api/`, `utils/`, `types/` also resolve via `vite-tsconfig-paths`

### Conditional Rendering in Generics

Fields/Areas check visibility before render using utilities from `src/components/generics/utils.ts`:

```tsx
// Single field visibility check:
if (!isFieldVisible(field, allFields, formValues)) return null;

// Dependent-field logic (used inside GenericArea/GenericField):
if (!isDependedAndVisible(formValues, allFields, dependentFields, dependFieldCondition)) {
  return null;
}
```

### Custom Areas/Fields

- `getCustomArea(area)` in `CustomAreasMapper.tsx` returns custom JSX for named areas, `null` for default rendering
- Five named custom areas (see Custom Areas section below)

## Form Metadata & UIConfiguration

### Two Static Form Objects

- `createJobForm` — used by `CreateJob` and `edit-order/:orderId` routes
- `jobOverview` — used by `JobOverview` (`/job-overview/:jobId`)
- Both exported from `src/components/generics/Form/GenericForm.data.ts`

### UIConfiguration (Production Source)

- On login, `App.tsx` calls `getUIConfiguration(countryCode)` → GET `/v1/countries/{countryCode}/ui-configuration`
- Response: `{ forms: GenericForm[] }` stored in React Query cache under key `["UIConfiguration", countryCode]`
- **`GenericForm.data.ts` is the static dev-time reference.** The UIConfiguration API drives the production form structure.
- To override for testing, retrieve with `queryClient.getQueryData<{ forms: GenericForm[] }>(["UIConfiguration", countryCode])`

### Form Initialization Pattern

`useFormInitialization(formConfig: GenericForm)` (defined in CreateJob, re-usable):

1. Calls `setInitalSectionsAreasFields(formConfig)` to build initial Section state
2. Flattens all fields via `getAllFieldsFromSection(section)`
3. Runs `mapFieldToFieldMapping(field)` on each field to compute `fieldMapping`
4. Calls `getInitialFieldValues(fields)` and `getMandatoryFields(formConfig)`
5. Returns `{ sections, setSections, initialFormValues, allFields, mandatoryFields, isInitialized, reset }`

## Field System Deep Dive

### Field Interface Key Properties (`src/components/generics/Field/GenericField.types.ts`)

| Property                  | Purpose                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`                    | Rendering type — one of the 13 supported types listed above                                                                                                            |
| `attributeMapping`        | Dot-notation API path used by `mapValuesToAPI()` (e.g. `"order.customer.firstName"`, `"diagnostic.materials#.partNumber"`)                                             |
| `subtype`                 | Special behavior flag: `diagnosticPosition`, `diagnosticPartNumber`, `diagnosticFaultCode`                                                                             |
| `autoFillFields`          | Array of sibling field names to auto-populate when an autocomplete selects an option                                                                                   |
| `sameDataFieldAs`         | Copies this field's value to the named target field when the source becomes hidden (used for customer-type transitions)                                                |
| `requiredDependentFields` | Conditional required validation: `{ byValueOr?, byValueAnd?, allEmpty?, errorMessageByValue?, errorMessageAllEmpty? }`                                                 |
| `optionsEndpoint`         | `{ url, method, queryParams: [{key, value}] }` — dynamic dropdown options from API; `value` paths that match form field paths are resolved against current form values |
| `dependentFields`         | Array of `{ fieldName, fieldValue }` — `fieldValue: "-"` is a wildcard (matches any non-empty value)                                                                   |
| `dependFieldCondition`    | `"AND"` or `"OR"` — how `dependentFields` are combined                                                                                                                 |
| `hiddenForStatuses`       | Array of job statuses where this field/section/tab is hidden                                                                                                           |
| `permissions`             | `string[]` — checked by `useHasPermission()`; empty array = always visible                                                                                             |
| `fieldMapping`            | **Computed, not in UIConfig** — added by `mapFieldToFieldMapping()`: `{ originalName, map, parentMap, prefixes }`                                                      |
| `isSubArea`               | Marks an area as a sub-area (nested within another area)                                                                                                               |
| `isTab`                   | Section displays as a tab (used in JobOverview)                                                                                                                        |

## Permission System

### PERMISSIONS Constant

Defined in `src/utils/Permissions.ts` — namespaced object:

```typescript
PERMISSIONS.ACCESS.*
PERMISSIONS.APPROVAL.*
PERMISSIONS.FEATURE_FLAGS.*
PERMISSIONS.DIAGNOSTICS.CAN_VIEW_NET_DEALER_PRICE      // "D_NV"
PERMISSIONS.DIAGNOSTICS.CAN_VIEW_DIAGNOSTICS_ON_JOBS_AND_CLAIMS  // "D__V"
// ... more granular keys
```

### useHasPermission Hook

- `useHasPermission(permissions: string[])` — reads user from React Query cache `["user"]`
- Returns `true` if user has **any** of the listed permissions; always `true` if the array is empty
- Checked at Field, Area, Section, and Action levels in generic components

### Action-Level Permissions

```typescript
// In GenericActions metadata:
dependency: {
  showAction: { permissions: ["PERM_KEY"], statuses: [...], modes: [...] },
  enableAction: { permissions: ["PERM_KEY"], isChargeable: true }
}
```

## Diagnostics System

The `diagnosticData` tab is the most complex part of `jobOverview`. It is entirely absent from `createJobForm`.

### Tab Structure

- Section name: `diagnosticData`, `isTab: true`, `hiddenForStatuses: ["READY_FOR_DIAGNOSTIC"]`
- Three areas: `diagnosticData` (core inputs), `diagnosticsSpareParts` (materials), `diagnosticsSummary` (totals)

### Core Fields (diagnosticData area)

| Field                     | Type     | Notes                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actionType`              | dropdown | 6 options: REPAIR, NEW_TOOL_EXCHANGE, SPAREPARTS_EXCHANGE, ACCESSORIES_EXCHANGE, RETURN, RECYCLE                                                                                                                                                                                                                                      |
| `jobType`                 | dropdown | 5 options: WARRANTY, CHARGEABLE, SERVICE_OFFERING, SPECIAL_CONTRACT, COMMERCIAL_GOODWILL                                                                                                                                                                                                                                              |
| `typeOfUse`               | dropdown | 8 options (professional/consumer variants)                                                                                                                                                                                                                                                                                            |
| `faultCodeDropdown`       | dropdown | `subtype: "diagnosticFaultCode"`, `optionsEndpoint` calls `/fault-codes` with queryParams resolved from form values (partNumber, countryCode, languageCode, brand). **Option value is plain `faultCode` string** (e.g. `"E001"`). `buildFaultCodeDropdowns()` reconstructs this value from the hidden `faultCode` field on form load. |
| `faultCode`               | text     | **hidden** — auto-filled when fault code is selected                                                                                                                                                                                                                                                                                  |
| `faultCodeDescription`    | text     | **hidden** — auto-filled                                                                                                                                                                                                                                                                                                              |
| `faultCodeLabourQuantity` | number   | **hidden** — auto-filled                                                                                                                                                                                                                                                                                                              |

Selecting a fault code fires `handleFaultCodeSelection()` which populates the three hidden fields. `findRawOption()` and `mapDropdownOptions()` in `DynamicDropdown.helper.ts` use the plain `faultCode` string as the option value.

### diagnosticsSpareParts Area

- `isSubArea: true`
- Visibility: uses wildcard `"-"` in all four `dependentFields.fieldValue` entries with `dependFieldCondition: "AND"` — visible only when `actionType`, `jobType`, `typeOfUse`, and `faultCodeDropdown` all have values
- Rendered by `SparePartsArea` (custom area)
- Key fields: `position` (`subtype: "diagnosticPosition"`), `sparePartNumber` (autocomplete, `subtype: "diagnosticPartNumber"`, `autoFillFields: ["description", "unitPrice"]`), quantity, unitPrice, suggestedNetPrice (`diagnosticsuggestedNetPrice`), discount (`diagnosticDiscount`), netAmount (`diagnosticNetAmount`), tax, taxAmount (`diagnosticTaxAmount`), grossAmount (`diagnosticGrossAmount`), totalAmount (`diagnosticTotalAmount`)

### diagnosticsSummary Area

- Rendered by `SummaryArea` (custom area)
- Computes aggregated price totals from all spare-part rows

### Diagnostics Hooks

| Hook                      | Purpose                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDiagnosticsConfig`    | Reads `CountryConfig.diagnosticsConfiguration` from query cache; returns `allowedPositions`, `automaticRows`, `positionDropdownOptions`, `getQuantityForPosition` |
| `useDiagnosticData`       | Fetches `JobDiagnostic` based on job status; skips if `hiddenForStatuses` applies                                                                                 |
| `useDiagnosticMaterials`  | Populates diagnostic spare-parts rows from API response                                                                                                           |
| `usePositionDropdownSync` | Syncs position dropdown options and enforces row limits across all spare-part rows                                                                                |

### Country-Driven Rules

`CountryConfig.diagnosticsConfiguration.rules[]` drives which positions/quantities are allowed per `actionType` + `jobType` combination. `useDiagnosticsConfig` resolves this at runtime.

### Price Calculation

`useSparePartPriceCalculation` hook (in `SparePartsRow`) + `src/utils/priceCalculator.ts` utility handle per-row and total price logic.

The mode is controlled by `CountryConfig.diagnosticsConfiguration.priceCalculationMode: "GROSS_PRICE" | "NET_PRICE"`, defaulting to `"GROSS_PRICE"` if absent.

- **GROSS_PRICE mode**: `suggestedNetPrice = netAmount = qty×unitPrice` → `grossAmount = netAmount + taxAmount` → `totalAmount = grossAmount − discountAmount (gross × disc%)`
- **NET_PRICE mode**: `suggestedNetPrice = qty×unitPrice` → `netAmount = suggestedNetPrice − discountAmount (suggested × disc%)` → `grossAmount = totalAmount = netAmount + taxAmount`
- **Negative discounts are not allowed.** `priceCalculator.ts` clamps all discount calculations to ≥0. Back-calculated discounts that would go negative are clamped to 0 and the affected amount is reset to its maximum valid value.
- **Stale price detection**: both `useDiagnosticsManager` and `useSparePartPriceCalculation` detect when the backend returned stale downstream prices (comparing `roundToTwo(qty * unitPrice) !== roundToTwo(suggestedNetPrice)`). When stale, a full recalculation is triggered even if `grossAmount !== 0`.
- **Commercial Goodwill rows** always use GROSS_PRICE regardless of country mode — `SparePartsRow` forces this via `effectivePriceCalculationMode`.
- Summary writebacks use `distributeGrossToRows` / `distributeNetToRows` to apply a calculated discount percent to eligible rows.
- Distribution targets only `SP`, `PN`, `AC` positions; all other positions are excluded.
- Read `priceCalculationMode` from `useDiagnosticsContext()` — never prop-drill or hardcode mode.

## GenericFormContext

Defined in `src/components/generics/Form/GenericForm.context.ts`. Provides shared state between a module (e.g. `JobOverview`, `CreateJob`) and all nested generic components.

```typescript
interface GenericFormContextType {
  allFields: Field[];
  setAllFields: Dispatch<SetStateAction<Field[]>>;
  mandatoryFields: Record<string, ActionMandatoryFields> | null;
  setMandatoryFields: Dispatch<...>;
  actionCallbacks: Record<string, ActionCallback>;  // keyed by onAction string
  onDeleteStart?: () => void;   // called when file deletion begins (disables save buttons)
  onDeleteEnd?: () => void;     // called when file deletion completes
  autocompleteValidation?: MutableRefObject<Record<string, boolean>>;
}

type ActionCallback = (...args: unknown[]) => void | boolean | Promise<void>;
```

`actionCallbacks` are registered by the parent module and consumed by `GenericSection`/`GenericArea` when a `GenericAction` fires with an `onAction` key.

## Action System

### GenericAction Metadata

```typescript
// In GenericForm / Section actions array:
{
  label: "app.saveAsDraft",
  onAction: "onSaveAsDraft",       // key into GenericFormContext.actionCallbacks
  mode: "secondary",               // "primary" | "secondary" | "tertiary" | "integrated"
  dependency: {
    showAction: {
      permissions: ["PERM"],
      statuses: ["DRAFT"],
      modes: ["create", "edit"],
    },
    enableAction: {
      nonEmpty: ["fieldName"],     // enable only when these fields are non-empty
    },
  },
  mandatoryFields: ["field1"],     // field names that gate action availability
}
```

### Action Flow in Modules

1. Module registers `actionCallbacks` in `GenericFormContext`
2. Generic component calls `context.actionCallbacks[onAction](formValues, helpers)`
3. Module handler calls `validateByAction(actionName, values)`, scrolls to errors if any, then calls the appropriate API mutation

## Custom Areas

`CustomAreasMapper.tsx` (`src/components/generics/Area/CustomAreasMapper.tsx`) routes by area name:

| Area name               | Component         | Notes                                                                     |
| ----------------------- | ----------------- | ------------------------------------------------------------------------- |
| `accessory`             | `AccessoryArea`   | Create mode: `assetData#N` — editable accessory rows; read mode: disabled |
| `documentList`          | `DocumentTabArea` | File upload + document list with modal preview                            |
| `notesList`             | `NotesList`       | Notes thread display/input                                                |
| `diagnosticsSpareParts` | `SparePartsArea`  | Dynamic spare-part rows                                                   |
| `diagnosticsSummary`    | `SummaryArea`     | Aggregated price totals                                                   |

Returns `null` for unrecognized names → default `GenericArea` rendering applies.

## Custom UI Components

All in `src/components/ui/`:

| Component             | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `AutoComplete`        | Debounced search input with API-driven option list                                 |
| `DatePicker`          | Custom calendar with optional range support (`CalendarConfig` type)                |
| `DynamicDropdown`     | Fetches options from `optionsEndpoint` via `useDynamicOptions` hook at render time |
| `FileUpload`          | Multi-file selector with file-type dropdown                                        |
| `DocumentFile`        | Single-file viewer with download/delete actions                                    |
| `DocumentsModal`      | Modal listing multiple attachments                                                 |
| `Flyout`              | Generic flyout panel (not FROK Popover)                                            |
| `NumberInputField`    | Increment/decrement number input                                                   |
| `Pagination`          | Page navigation with configurable page-size dropdown                               |
| `RadioGroup`          | Wraps FROK `RadioButton`; reads/writes Formik context directly                     |
| `ScrollablePopover`   | FROK `Popover` that auto-closes on scroll                                          |
| `StatusIndicator`     | Colored badge component for job status strings                                     |
| `InfoIconWithTooltip` | Info icon with tooltip via `react-tooltip`                                         |

## Hooks Catalog

All in `src/hooks/`:

| Hook                      | Purpose                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `useAccessoriesManager`   | Manages dynamic accessory field-set duplication for single/multi-asset forms; syncs with API data on edit mode               |
| `useBreadcrumbs`          | Sets `BreadcrumbsContext` on mount — call in every route component                                                           |
| `useClickOutside`         | `mousedown` listener; fires callback when click occurs outside the provided ref                                              |
| `useDebouncedValue<T>`    | Returns debounced value (default 300ms)                                                                                      |
| `useDiagnosticData`       | Fetches `JobDiagnostic` for a job; respects `hiddenForStatuses`                                                              |
| `useDiagnosticMaterials`  | Populates spare-part rows from fetched diagnostic data                                                                       |
| `useDiagnosticsConfig`    | Returns `allowedPositions`, `automaticRows`, `positionDropdownOptions`, `getQuantityForPosition` from cached `CountryConfig` |
| `useFormInitialization`   | One-time form setup: sections → fields → initial values → mandatory fields                                                   |
| `useHasPermission`        | Checks user permissions from React Query cache `["user"]`                                                                    |
| `usePopoverScroll`        | Tracks scroll to flip popover direction (top/bottom)                                                                         |
| `usePositionDropdownSync` | Syncs position options and enforces quantity limits across all spare-part rows                                               |
| `usePrivacySettings`      | Injects Bosch Dock privacy scripts into `<head>`                                                                             |
| `useSectionEditing`       | Toggles `isDisabled` on all fields in a section (view → edit transitions)                                                    |

## Routes Catalog

All routes defined in `src/routes/Routes.tsx`, each wrapped in `<ErrorBoundaryWrapper>`:

| Path                    | Module                | Notes                                            |
| ----------------------- | --------------------- | ------------------------------------------------ |
| `/` (index)             | `Dashboard`           |                                                  |
| `/dashboard`            | `Dashboard`           |                                                  |
| `/job-list`             | `JobList`             | Main job table                                   |
| `/create-job`           | `CreateJob`           | Create mode (`isEditMode = false`)               |
| `/edit-order/:orderId`  | `CreateJob`           | Edit mode (`isEditMode = true`); only DRAFT jobs |
| `/job-overview/:jobId`  | `JobOverview`         | Full job detail with tabs                        |
| `/reports`              | `Reports`             | Placeholder shell                                |
| `/clients`              | `Clients`             | Placeholder shell                                |
| `/reimbursement`        | `Reimbursement`       | Placeholder shell                                |
| `/system-configuration` | `SystemConfiguration` | Placeholder shell                                |
| `/user-management`      | `UserManagement`      | Placeholder shell                                |
| `/claim-list`           | `ClaimManagement`     | Claim list view                                  |
| `/approval-list`        | `ApprovalList`        | Approval workflow                                |
| `*`                     | `NotFound`            | Catch-all                                        |

### Job Status Navigation

- **DRAFT** → editable via `/edit-order/:orderId`
- **READY_FOR_DIAGNOSTIC / IN_DIAGNOSTICS** → `/job-overview/:jobId` with `diagnosticData` tab active
- **All others** → `/job-overview/:jobId` (view mode)
- `postJobStatus` mutation transitions status between states

## Environment & Deployment

### Docker

Build requires `.npmrc` with Bosch Artifactory credentials:

```bash
DOCKER_BUILDKIT=1 docker build --secret id=npmrc,src=<path-to-.npmrc> -t ptdpacr.azurecr.io/com.bosch.pt/bass-web:latest .
```

### Kubernetes/Helm

- Charts in `/charts/` - templates for deployment, ingress, configmaps, secrets
- Values files: `values.yaml` (base), `values-dev.yaml`/`values-qa.yaml`/`values-prod.yaml` for env overrides
- Azure Pipelines: `devops/azure-pipelines.yaml` (CI/CD)

### Environment Variables

| Variable            | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `VITE_API_BASE_URL` | Backend API base URL (used by `axiosClient.ts`) |
| `VITE_STALE_TIME`   | React Query stale time (ms)                     |
| `VITE_GC_TIME`      | React Query garbage-collection time (ms)        |

### Configuration

- `.npmrc` required for `@bosch` scoped packages - **NEVER commit this file**
- `legacy-peer-deps=true` and `engine-strict=true` set in package.json config

## ESLint/Prettier

- Flat config in `eslint.config.js` - separate rules for app code vs tests
- App code uses `tsconfig.app.json`, tests use `tsconfig.test.json`
- Prettier integrated as ESLint plugin, auto-fixes on save
- Ignores: `.d.ts` files allow `any`, test files have relaxed rules

## Key Directories

- `src/components/generics/` - Metadata-driven form components (Section/Area/Field/Action)
- `src/components/ui/` - Custom UI wrappers (DatePicker, FileUpload, AutoComplete, etc.)
- `src/modules/` - Feature modules (each is a route)
- `src/api/services/` - API service functions organized by domain (`action.ts` + `hooks.ts`)
- `src/contexts/` - React contexts (breadcrumbs)
- `src/hooks/` - Shared custom hooks
- `src/utils/` - Pure utilities (priceCalculator, Permissions, dateFormatter, etc.)
- `src/styles/` - Global SCSS (\_variables.scss, \_images.scss)

## Skills

The following skill files contain deep, code-verified knowledge for specific subsystems. Load the relevant SKILL.md **before** working on any task in that domain. Reading the skill first is not optional — these files contain hazards and constraints not repeated in this document.

| Skill                        | File                                                 | Load when...                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bass-api-domain`            | `.github/skills/bass-api-domain/SKILL.md`            | Adding a new `src/api/services/` domain, creating `action.ts` / `hooks.ts` / `.types.ts`, or adding a new endpoint                                                                                                                                                                           |
| `bass-uiconfig-system`       | `.github/skills/bass-uiconfig-system/SKILL.md`       | Anything that touches UIConfiguration loading, `useFormInitialization`, `setInitalSectionsAreasFields`, `mapFieldToFieldMapping`, `mapValuesToAPI`, `convertAPIDataToFormValues`, field naming, or `GenericFormContext`                                                                      |
| `bass-uiconfiguration-local` | `.github/skills/bass-uiconfiguration-local/SKILL.md` | Adding a new country data file to `data/`, debugging the `getUIConfiguration` dev-vs-deployed split, or modifying `src/api/services/uiConfiguration/action.ts`                                                                                                                               |
| `bass-form-validation`       | `.github/skills/bass-form-validation/SKILL.md`       | Implementing or debugging form validation: `useFormValidation`, `validateByAction`, `requiredDependentFields`, `autocompleteValidation`, `scrollToFirstError`, or action-gated mandatory fields                                                                                              |
| `bass-multiple-sections`     | `.github/skills/bass-multiple-sections/SKILL.md`     | Working with `isMultiple` sections/areas, `setDuplicatedSection`, `addNewMultipleSection`, `deleteSection`, `AccessoryArea`, `useAccessoriesManager`, or multi-asset form patterns in `CreateJob`                                                                                            |
| `bass-diagnostics`           | `.github/skills/bass-diagnostics/SKILL.md`           | Working on the `diagnosticData` tab, `useDiagnosticsManager`, `SparePartsArea`, `SparePartsRow`, `SummaryArea`, price calculation, position dropdown, `validateAndSave`, or `DiagnosticsContext`                                                                                             |
| `bass-country-config`        | `.github/skills/bass-country-config/SKILL.md`        | Anything touching `CountryConfig`, `diagnosticsConfiguration`, `rules[]`, `allowedPositions`, `automaticRows`, `discountBase`, `addSpecialMaterialsAllowed`, `currencySymbol`, `usePositionDropdownSync`, `getQuantityForPosition`, or the `["countryConfiguration", countryCode]` cache key |

---

## Common Tasks

**Add a new route:**

1. Create module in `src/modules/YourFeature/`
2. Add route in `src/routes/Routes.tsx` wrapped in `<ErrorBoundaryWrapper>`
3. Update SideNav items if needed

**Add a form field:**

- Extend `Field` interface in `GenericField.types.ts` for new properties
- Add rendering logic in `GenericField.tsx` if-chain
- Add field metadata to the relevant form in `GenericForm.data.ts`

**Add API integration:**

1. Create `src/api/services/yourDomain/action.ts` with raw axios calls using `axiosClient`
2. Create `src/api/services/yourDomain/hooks.ts` with `useQuery`/`useMutation` wrappers
3. Create `src/api/services/yourDomain/yourDomain.types.ts` for response/request types
4. Consume hooks in module components

---

## Performance Reports

Update report for non-trivial tasks in `performance-reports/`.

### When

- Update: multi-file edits, feature/fix/refactor, or verification runs.
- Skip: pure Q&A/chat turns.

### File

- One file per ticket: `performance-reports/report-<TICKET>.md`
- Derive `<TICKET>` from branch name.
- If file exists: append session.
- If missing: create file with ticket heading.

### Session format (required)

Use this heading:

```markdown
## Session YYYY-MM-DD — <short description>
```

Include exactly 4 sections:

- `### 1. Scope`
- `### 2. AI Agent Time Estimate`
- `### 3. Developer Estimate`
- `### 4. AI vs Developer Comparison`

Keep each section concise.

### Minimum content

- `Scope`: changed files + what changed + verification status (if run).
- `AI Agent Time Estimate`: compact table with `Context`, `Implementation`, `Verification`, `Total`.
- `Developer Estimate`: compact table, senior familiar developer baseline, no ramp-up.
- `AI vs Developer Comparison`: compact table + up to 2 short notes.

### SonarQube add-on

- Sum `effort` from fixed Sonar issues.
- Add one line below Developer table:
  - `SonarQube server estimate (heuristic): ~X min / X days`.

### Keep short

- No per-file timing tables for <5 changed files.
- No recommendations section unless explicitly needed.
- No padded estimates (use real `~N min`).
