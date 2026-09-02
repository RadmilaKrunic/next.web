import type {
  AllowedPosition,
  discountBase,
} from "api/services/countryConfiguration/countryConfiguration";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import Field from "components/generics/Field/GenericField.types";
import Area from "components/generics/Area/GenericArea.types";
import { setDuplicatedArea, mapFieldToFieldMapping } from "components/generics/utils";
import { calculatePrices } from "utils/priceCalculator";
import type { TFunction } from "i18next";
import type { MaterialItem } from "./itemsManager.types";

// Pure material-row derivation helpers shared by the job (useDiagnosticsManager.ts) and
// claim (useClaimMaterialsManager.ts, Phase 5) item-row managers. Moved out of
// useDiagnosticsManager.ts verbatim — see items-and-prices-refactor.md §15 (Phase 5 unification
// plan, step 2) for why: claim never adopted job's Phase-4 full-recomputation fix and had its
// own near-duplicate copies of several of these (getOrderValue/normalizeMaterialOrders/
// sortMaterialsByOrder), which is what this extraction is meant to end.

export const getPositionAutofill = (
  t: TFunction<"translation", "app">,
): Record<string, { partNumber: string; description: string }> => ({
  LA: { partNumber: "1609888887", description: t("labourCost") },
  FR: { partNumber: "1609888888", description: t("freightCost") },
});

export const POSITION_ORDER: Record<string, number> = {
  LA: 0,
  PN: 1,
  SP: 2,
  AC: 3,
  FR: 4,
  PC: 5,
};

export const sortByPositionOrder = (positions: string[]): string[] =>
  [...positions].sort(
    (a, b) =>
      (POSITION_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
      (POSITION_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
  );

export const getOrderValue = (item: MaterialItem, fallbackIndex: number): number => {
  const parsed = Number(item.order);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackIndex + 1;
  return parsed;
};

export const normalizeMaterialOrders = (items: MaterialItem[]): MaterialItem[] =>
  items.map((item, index) => ({ ...item, order: getOrderValue(item, index) }));

export const sortMaterialsByOrder = (items: MaterialItem[]): MaterialItem[] =>
  [...normalizeMaterialOrders(items)].sort((a, b) => {
    const byOrder = getOrderValue(a, 0) - getOrderValue(b, 0);
    if (byOrder !== 0) return byOrder;
    return (
      (POSITION_ORDER[a.position] ?? Number.MAX_SAFE_INTEGER) -
      (POSITION_ORDER[b.position] ?? Number.MAX_SAFE_INTEGER)
    );
  });

export const computePricesForItem = (item: MaterialItem, mode?: discountBase): MaterialItem => {
  if (item.unitPrice <= 0) return item;
  const result = calculatePrices(
    {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPercent: item.tax,
      discountPercent: item.discount,
      grossAmount: 0,
      netAmount: 0,
      suggestedNetPrice: 0,
      totalAmount: 0,
      taxAmount: 0,
    },
    "unitPrice",
    item.unitPrice,
    mode,
  );
  return {
    ...item,
    netAmount: result.netAmount,
    suggestedNetPrice: result.suggestedNetPrice,
    tax: result.taxPercent,
    taxAmount: result.taxAmount,
    grossAmount: result.grossAmount,
    discount: result.discountPercent,
    discountAmount: result.discountAmount,
    totalAmount: result.totalAmount,
  };
};

export const buildEmptyMaterial = (
  position: string,
  jobType: string,
  quantity: number,
  t: TFunction<"translation", "app">,
  mode?: discountBase,
): MaterialItem => {
  const autofill = getPositionAutofill(t)[position];
  const base: MaterialItem = {
    position,
    partNumber: autofill?.partNumber ?? "",
    description: autofill?.description ?? "",
    type: jobType,
    quantity,
    unitPrice: 0,
    netAmount: 0,
    suggestedNetPrice: 0,
    tax: 0,
    taxAmount: 0,
    grossAmount: 0,
    discount: 0,
    totalAmount: 0,
    order: 0,
    isPriceSetManually: false,
  };
  return computePricesForItem(base, mode);
};

/** Write a MaterialItem's values into the duplicate area's fields via subtype. */
export const buildRowValues = (
  areaFields: Field[],
  item: MaterialItem,
): Record<string, unknown> => {
  const mappingSubtype: Record<string, unknown> = {
    diagnosticPosition: item.position,
    archivedPosition: item.position,
    diagnosticPartNumber: item.partNumber,
    archivedPartNumber: item.partNumber,
    diagnosticDescription: item.description,
    archivedDescription: item.description,
    diagnosticType: item.type,
    archivedType: item.type,
    diagnosticQuantity: item.quantity,
    archivedQuantity: item.quantity,
    diagnosticUnitPrice: item.unitPrice,
    archivedUnitPrice: item.unitPrice,
    diagnosticNetAmount: item.netAmount,
    archivedNetAmount: item.netAmount,
    diagnosticSuggestedNetPrice: item.suggestedNetPrice || item.quantity * item.unitPrice,
    archivedSuggestedNetPrice: item.suggestedNetPrice || item.quantity * item.unitPrice,
    diagnosticTax: item.tax,
    archivedTax: item.tax,
    diagnosticTaxAmount: item.taxAmount,
    archivedTaxAmount: item.taxAmount,
    diagnosticGrossAmount: item.grossAmount,
    archivedGrossAmount: item.grossAmount,
    diagnosticDiscount: item.discount ?? 0,
    diagnosticDiscountHidden: item.discount ?? 0,
    diagnosticDiscountAmountHidden: item.discountAmount ?? 0,
    archivedDiscount: item.discount ?? 0,
    archivedDiscountAmountHidden: item.discountAmount ?? 0,
    diagnosticTotalAmount: item.totalAmount ?? 0,
    archivedTotalAmount: item.totalAmount ?? 0,
    diagnosticMaterialStatus: item.status ?? "PENDING",
    archivedMaterialStatus: item.status ?? "ARCHIVED",
    diagnosticMaterialId: item.materialId ?? "",
    notBelongsToTool: item.notBelongsToTool ?? "",
  };
  return areaFields.reduce(
    (acc, field) => {
      acc[field.name] = mappingSubtype[field.subtype ?? ""] ?? field.defaultValue ?? "";
      return acc;
    },
    {} as Record<string, unknown>,
  );
};

/** Overlay status and type fields onto an existing values map from the current form state. */
function applyStatusAndTypeOverrides(
  baseValues: Record<string, unknown>,
  areaFields: Field[],
  item: Pick<MaterialItem, "status" | "type">,
  faultCodeDropdown: unknown,
): Record<string, unknown> {
  const result = { ...baseValues };
  const statusField = areaFields.find((f) => f.subtype === "diagnosticMaterialStatus");
  if (statusField && item.status !== undefined) {
    result[statusField.name] = item.status;
  }
  const typeField = areaFields.find((f) => f.subtype === "diagnosticType");
  if (typeField && !faultCodeDropdown) {
    result[typeField.name] = item.type;
  }
  return result;
}

function shouldReuseExistingRowValues(params: {
  rowIndex: number;
  currentCount: number;
  livePosition: string;
  expectedPosition: string;
  forceRebuild: boolean;
  rowHasNoPrices: boolean;
}): boolean {
  const { rowIndex, currentCount, livePosition, expectedPosition, forceRebuild, rowHasNoPrices } =
    params;
  if (rowIndex >= currentCount) return false;
  if (livePosition !== expectedPosition) return false;
  if (forceRebuild) return false;
  return !rowHasNoPrices;
}

export function buildMaterialsRowValues(params: {
  materials: MaterialItem[];
  areas: Area[];
  fields: Field[];
  formValues: Record<string, unknown>;
  currentCount: number;
  forceRebuild: boolean;
}): Record<string, unknown> {
  const { materials, areas, fields, formValues, currentCount, forceRebuild } = params;
  let rowValues: Record<string, unknown> = {};

  materials.forEach((item, idx) => {
    const area = areas[idx];
    if (!area) return;

    const areaFieldNameSet = new Set(area.fields.map((af) => af.name));
    const areaFields = fields.filter((f) => areaFieldNameSet.has(f.name));
    const positionField = areaFields.find((f) => f.subtype === "diagnosticPosition");
    const livePosition = positionField ? ((formValues[positionField.name] as string) ?? "") : "";
    const hasApiPrices = item.netAmount > 0 || item.grossAmount > 0 || item.totalAmount > 0;
    const rowHasNoPrices =
      Boolean(item.materialId) &&
      hasApiPrices &&
      areaFields
        .filter(
          (f) =>
            f.subtype === "diagnosticNetAmount" ||
            f.subtype === "diagnosticGrossAmount" ||
            f.subtype === "diagnosticTotalAmount" ||
            f.subtype === "diagnosticSuggestedNetPrice",
        )
        .every((f) => !Number(formValues[f.name]));

    const reuseExistingValues = shouldReuseExistingRowValues({
      rowIndex: idx,
      currentCount,
      livePosition,
      expectedPosition: item.position,
      forceRebuild,
      rowHasNoPrices,
    });

    if (reuseExistingValues) {
      const baseValues = Object.fromEntries(
        areaFields.filter((f) => f.name in formValues).map((f) => [f.name, formValues[f.name]]),
      );
      const existingValues = applyStatusAndTypeOverrides(
        baseValues,
        areaFields,
        item,
        formValues.faultCodeDropdown,
      );
      const descriptionField = areaFields.find((f) => f.subtype === "diagnosticDescription");
      if (descriptionField) {
        const currentDescription = existingValues[descriptionField.name];
        if (
          (typeof currentDescription !== "string" || !currentDescription.trim()) &&
          item.description
        ) {
          existingValues[descriptionField.name] = item.description;
        }
      }
      if (item.position === "LA") {
        const qtyField = areaFields.find((f) => f.subtype === "diagnosticQuantity");
        if (qtyField) {
          existingValues[qtyField.name] = item.quantity;
        }
      }
      rowValues = { ...rowValues, ...existingValues };
      return;
    }

    rowValues = { ...rowValues, ...buildRowValues(areaFields, item) };
  });

  return rowValues;
}

export function withSpecialMaterialSpOption(params: {
  fields: Field[];
  rowValues: Record<string, unknown>;
  allowedPositions: AllowedPosition[];
  addSpecialMaterialsAllowed: boolean;
}): Field[] {
  const { fields, rowValues, allowedPositions, addSpecialMaterialsAllowed } = params;
  const spInAllowed = allowedPositions.some((p) => p.position === "SP");
  if (spInAllowed || !addSpecialMaterialsAllowed) {
    return fields;
  }

  const spPositionFieldNames = new Set(
    Object.entries(rowValues)
      .filter(([, v]) => v === "SP")
      .map(([k]) => k),
  );

  if (spPositionFieldNames.size === 0) {
    return fields;
  }

  const spOption: GenericOptionProps = { value: "SP", name: "SP" };
  return fields.map((f) => {
    if (f.subtype !== "diagnosticPosition" || !spPositionFieldNames.has(f.name)) return f;
    return { ...f, options: [...(f.options ?? []), spOption] };
  });
}

/**
 * Rebuilds the full set of spare-parts Areas + Fields for `count` rows from a single
 * pristine template, every time — rather than incrementally cloning only the rows added
 * since the last pass and trimming only the rows removed from the end (the previous
 * design). Field names stay index-based (`#{i}_...`), same as today — `mapValuesToAPI`'s
 * numeric-index parsing (src/components/generics/utils.ts) is untouched. This is what lets
 * a delete-from-the-middle collapse into "remove the item from `materials`, recompute
 * everything" instead of "remove one area, then separately shift every subsequent area's
 * name/fields/values down by one" (see items-and-prices-refactor.md §7 for the full
 * rationale, including why field names stay index-based rather than a stable per-row id).
 */
export function deriveSparePartsAreasAndFields(
  templateArea: Area,
  count: number,
  sectionName: string,
): { areas: Area[]; fields: Field[] } {
  const areas: Area[] = [];
  let fields: Field[] = [];
  for (let i = 0; i < count; i++) {
    const cloned = structuredClone(templateArea);
    if (i !== 0) cloned.label = "";
    const area = setDuplicatedArea(cloned, i, sectionName);
    area.fields = area.fields.map((f) => mapFieldToFieldMapping(f));
    areas.push(area);
    fields = [...fields, ...area.fields];
  }
  return { areas, fields };
}

// Confirmed byte-identical (Phase 5 unification, items-and-prices-refactor.md §15 step 7)
// between ArchivedSparePartsArea.tsx (job) and ClaimArchivedSparePartsArea.tsx (claim) —
// area.fields in tabs state are separate objects from allFields context; options are
// stamped only on the allFields copies, so the archivedPosition dropdown's options must be
// merged in here for the dropdown to render.
export function enrichArchivedFieldOptions(areaFields: Field[], allFields: Field[] | undefined): Field[] {
  return areaFields.map((f) => {
    if (f.subtype !== "archivedPosition") return f;
    const contextField = allFields?.find((cf) => cf.name === f.name);
    if (!contextField?.options?.length) return f;
    return { ...f, options: contextField.options };
  });
}
