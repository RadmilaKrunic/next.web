---
name: bass-multiple-sections
description: "isMultiple section/area duplication rules and hazards."
---

# Multiple Sections (Compact)

Use for CreateJob/isMultiple duplication, accessory rows, and indexed field names.

## Core Files

- src/components/generics/utils.ts
- src/hooks/useAccessoriesManager.tsx
- src/modules/JobManagement/CreateJob/CreateJob.tsx

## Required Rules

- Clone template before setDuplicatedSection/setDuplicatedArea.
- addNewMultipleSection must use baseline template (index 0), not last mutated section.
- Keep index and computed naming consistent during add/delete.
- Do not mutate shared template references.

## Deletion/Compaction

- deleteSection reindexes section indexes.
- API payload must compact sparse arrays before submit.
- Ensure accessory mapping runs before mapValuesToAPI.

## Accessory Constraints

- Accessory operations route through CreateJobContext state.
- Avoid GenericFormContext misuse for accessory list state.

## Validation Checks

- Field names remain unique after add/delete cycles.
- requiredDependentFields references still point to originalName logic.
- API payload includes all duplicated section values.
