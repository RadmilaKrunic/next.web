---
name: bass-form-validation
description: "Validation pipeline constraints."
---

# Form Validation

## Pipeline Lifecycle

1. startValidation(actionName)
2. validateByAction(actionName, values)
3. getVisibleFieldsWithErrors(allFields, errors, values)
4. setErrors + setTouched
5. scrollToFirstError(visibleErrors) (Filter hidden fields first)
6. stopValidation()

## Critical Rules

- `mandatoryFields` and `requiredDependentFields` evaluations must map through `fieldMapping.originalName`.
- Keep `autocompleteValidationRef` stable as a module-level ref.
