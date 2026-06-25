---
name: bass-uiconfig-system
description: "UIConfiguration lifecycle and hazards for BASS-Next forms."
---

# UIConfiguration System (Compact)

Use for any change touching UIConfiguration load/transform/render path.

## Source of Truth

- Loader: src/api/services/uiConfiguration/action.ts
- Cache key: ["UIConfiguration", countryCode]
- Init hook: src/hooks/useFormInitialization.ts
- Mutating util: src/components/generics/utils.ts -> setInitalSectionsAreasFields

## Runtime Flow

1. App loads user.
2. App fetches UIConfiguration + country configuration.
3. Modules read cached forms with queryClient.getQueryData.
4. useFormInitialization builds sections/allFields/initialValues/mandatoryFields.
5. Generic components render via Formik + GenericFormContext.

## Required Rules

- Do not refetch UIConfiguration in modules when cache already populated.
- Always compute fieldMapping before using fields.
- Use actionCallbacks in GenericFormContext; no callback prop-drilling.
- Keep Section -> Area -> Field metadata hierarchy.

## Critical Hazard

setInitalSectionsAreasFields mutates form objects in place.

- Never call it repeatedly on same mutable reference without safeguards.
- In tests, deep clone cached form data before each scenario.
- For isMultiple updates, verify prefixing/index logic remains stable.

## Naming and Mapping

- mandatoryFields and requiredDependentFields depend on originalName mapping.
- mapValuesToAPI/convertAPIDataToFormValues rely on attributeMapping + fieldMapping.
- Preserve computed names in duplicated sections/areas.

## Cache Patterns

- user: ["user"]
- UI config: ["UIConfiguration", countryCode]
- country config: ["countryConfiguration", countryCode]

## Verification Checklist

- Form renders with expected sections/tabs.
- allFields contains fieldMapping for every field.
- initial values include expected computed names.
- mandatory action validation still resolves field original names.
