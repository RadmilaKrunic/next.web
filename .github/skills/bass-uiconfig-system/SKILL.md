---
name: bass-uiconfig-system
description: "UIConfiguration lifecycle and validation states."
---

# UIConfiguration System

## Structure Flow

- Data Key: `["UIConfiguration", countryCode]`.
- Lifecycle: Loaded once at App level → modules access cache values directly via `queryClient.getQueryData`.
- Hierarchy metadata: Section → Area → Field.

## Operations Constraints

- Always construct `fieldMapping` properties before using fields.
- `setInitalSectionsAreasFields` mutates references in place. Deep clone cache baselines inside test scopes.
- Map `mandatoryFields` and `requiredDependentFields` logic matching the target `originalName` metadata.
