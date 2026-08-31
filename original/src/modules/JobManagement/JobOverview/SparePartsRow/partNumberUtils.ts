/**
 * Normalizes a part number for equality comparison and API submission: strips every
 * non-alphanumeric character (spaces, dots, hyphens, slashes, etc.), which is
 * formatting-only and should not be treated as a different part number.
 * E.g. "160 9888887", "160.9888887", "160-9888887", and "1609888887" all normalize to
 * "1609888887". Matches the stripping already used for search queries in
 * AutoComplete.helper.ts's getAutocompleteOptions.
 */
export function normalizePartNumber(value: string | undefined | null): string {
  if (!value) return "";
  return value.replaceAll(/[^a-zA-Z0-9]/g, "");
}

/**
 * True when two part number strings represent the same part, ignoring spaces/dots/etc.
 * formatting differences (case-sensitive — part numbers are typically alphanumeric codes
 * where case is significant, unlike free-text fields).
 */
export function isSamePartNumber(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  return normalizePartNumber(a) === normalizePartNumber(b);
}

export type PartNumberChangeAction = "none" | "sync" | "reset";

/**
 * Decides what should happen to a row's price data when its part number field changes.
 * - "none": formatting-only edit (normalized value unchanged) — leave everything as-is.
 * - "sync": first render, or an API-driven (resyncing) update — just track the new
 *   value, don't touch any fields. This matters most on initial load: a row mounts with
 *   an empty/placeholder partNumberValue, then the API response populates the real part
 *   number — that transition looks identical to a genuine change (different normalized
 *   values) unless isResyncing tells us it's backend data arriving, not a user edit.
 *   Without this, initial load nulls every row's just-arrived price data immediately.
 * - "reset": a genuine, user-driven part number change — the row's price object and
 *   materialId must be nulled, since the old saved data belongs to a different part.
 */
export function resolvePartNumberChangeAction(
  prevPartNumber: string | null,
  currentPartNumber: string,
  isResyncing: boolean,
): PartNumberChangeAction {
  if (prevPartNumber === null) return "sync";
  if (isSamePartNumber(prevPartNumber, currentPartNumber)) return "none";
  if (isResyncing) return "sync";
  return "reset";
}
