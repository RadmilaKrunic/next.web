import Field from "components/generics/Field/GenericField.types";
import Area from "components/generics/Area/GenericArea.types";
import { mapFieldToFieldMapping } from "components/generics/utils";
import type { MaterialItem } from "./materialItem.types";

export const SPARE_PARTS_PREFIX = "diagnosticData_diagnosticsSpareParts#";
export const RESETTABLE_MATERIAL_STATUSES = new Set(["REVISED", "REJECTED"]);

/**
 * Returns the shifted key after deleting row `deletedIndex`.
 * Returns null  → key belonged to the deleted row (drop it).
 * Returns same  → key index < deletedIndex (keep as-is).
 * Returns new   → key index > deletedIndex (shift down by 1).
 */
export const shiftSparePartsKey = (key: string, deletedIndex: number): string | null => {
  if (!key.startsWith(SPARE_PARTS_PREFIX)) return key;
  const tail = key.slice(SPARE_PARTS_PREFIX.length);

  let i = 0;
  while (i < tail.length && tail[i] >= "0" && tail[i] <= "9") i++;
  if (i === 0) return key;

  const currentIndex = Number(tail.slice(0, i));
  const rest = tail.slice(i);

  if (currentIndex === deletedIndex) return null;
  if (currentIndex < deletedIndex) return key;
  return `${SPARE_PARTS_PREFIX}${currentIndex - 1}${rest}`;
};

export const shiftSparePartsArea = (area: Area, deletedIndex: number): Area => {
  const shiftedAreaName = shiftSparePartsKey(area.name, deletedIndex);
  if (!shiftedAreaName || shiftedAreaName === area.name) return area;
  const shiftedFields = area.fields.map((field) => {
    const shifted = shiftSparePartsKey(field.name, deletedIndex);
    if (!shifted || shifted === field.name) return field;
    return mapFieldToFieldMapping({ ...field, name: shifted });
  });
  return {
    ...area,
    name: shiftedAreaName,
    index: area.index !== undefined && area.index > deletedIndex ? area.index - 1 : area.index,
    fields: shiftedFields,
  };
};

/** Re-keys every spare-parts form value, dropping the deleted row. */
export const reindexSparePartsValues = (
  values: Record<string, unknown>,
  deletedIndex: number,
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  Object.entries(values).forEach(([key, value]) => {
    const shifted = shiftSparePartsKey(key, deletedIndex);
    if (shifted !== null) next[shifted] = value;
  });
  return next;
};

export const syncMaterialsWithForm = (
  materials: MaterialItem[],
  formValues: Record<string, unknown>,
) => {
  const syncedMaterials = materials.map((materialItem, index) => {
    return {
      ...materialItem,
      description:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_description`] as string) ??
        materialItem.description,
      discount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_discount`]) || materialItem.discount,
      totalAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_totalAmount`]) || materialItem.totalAmount,
      grossAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_grossAmount`]) || materialItem.grossAmount,
      partNumber:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_sparePartNumber`] as string) ??
        materialItem.partNumber,
      position:
        (formValues[`${SPARE_PARTS_PREFIX}${index}_position`] as string) ?? materialItem.position,
      quantity:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_quantity`]) || materialItem.quantity,
      tax: Number(formValues[`${SPARE_PARTS_PREFIX}${index}_tax`]) || materialItem.tax,
      netAmount:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_netAmount`]) || materialItem.netAmount,
      type: (formValues[`${SPARE_PARTS_PREFIX}${index}_type`] as string) ?? materialItem.type,
      unitPrice:
        Number(formValues[`${SPARE_PARTS_PREFIX}${index}_unitPrice`]) || materialItem.unitPrice,
    };
  });
  return syncedMaterials;
};
