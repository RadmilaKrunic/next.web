import { Filter } from "./List.types";

export const hasFilterValue = (filter: Filter): boolean => {
  if (Array.isArray(filter.value)) return filter.value.length > 0;
  return filter.value !== "" && filter.value != null;
};

export const matchesFilter = (
  filterValue: Filter["value"],
  actual: string | null | undefined,
): boolean => {
  if (Array.isArray(filterValue)) return filterValue.includes(actual ?? "");
  return actual === filterValue;
};
