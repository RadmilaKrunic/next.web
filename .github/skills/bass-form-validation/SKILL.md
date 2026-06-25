---
name: bass-form-validation
description: "Validation pipeline for mandatory fields, dependencies, and autocomplete checks."
---

# Form Validation (Compact)

Use when changing mandatory fields, action validation, dependency checks, or scroll-to-error behavior.

## Core Files

- src/components/generics/Form/formValidation.tsx
- src/hooks/useFormValidation.ts
- src/utils/scrollToError.ts

## Pipeline

1. startValidation(actionName)
2. validateByAction(actionName, values)
3. getVisibleFieldsWithErrors(allFields, errors, values)
4. setErrors + setTouched
5. scrollToFirstError(visibleErrors)
6. stopValidation() on success path

## Required Rules

- Use useFormValidation hook; do not reimplement.
- mandatoryFields compare using fieldMapping.originalName.
- requiredDependentFields entries use original field names.
- Always filter hidden fields before scrolling.
- Keep autocompleteValidationRef stable (module-level ref).

## Common Failure Modes

- Missing stopValidation leaves stale errors.
- Using computed names in requiredDependentFields breaks after rename.
- Scrolling raw Object.keys(errors) targets hidden fields.

## Verification

- Action-level mandatory enforcement works.
- Conditional required groups (byValueOr/byValueAnd/allEmpty) behave as expected.
- Autocomplete unresolved values block submission with expected messages.
