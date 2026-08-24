---
name: bass-multiple-sections
description: "isMultiple section/area duplication rules."
---

# Multiple Sections

## Duplication & Templates

- Clone data models cleanly before calling `setDuplicatedSection/setDuplicatedArea`.
- `addNewMultipleSection` must execute from the base template reference (index zero), never from the last mutated item.

## Deletion & Pipelines

- `deleteSection` handles sequential visual re-indexing.
- API payload: Run array compaction before `mapValuesToAPI` submission.
- Route accessory array transactions strictly through `CreateJobContext`.
