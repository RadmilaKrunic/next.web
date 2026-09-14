import type { MaterialItem } from "./materialItem.types";

export const SPARE_PARTS_PREFIX = "diagnosticData_diagnosticsSpareParts#";
export const RESETTABLE_MATERIAL_STATUSES = new Set(["REVISED", "REJECTED"]);

/**
 * Overlays each row's latest Formik field values onto its MaterialItem. Shared by job
 * (`diagnosticData_diagnosticsSpareParts#`, the default) and claim
 * (`claims_claimSpareParts#`, passed explicitly) — the field suffix set and row-indexing
 * scheme are identical between the two surfaces, only the area-name prefix differs.
 */
export const syncMaterialsWithForm = (
  materials: MaterialItem[],
  formValues: Record<string, unknown>,
  prefix: string = SPARE_PARTS_PREFIX,
): MaterialItem[] =>
  materials.map((materialItem, index) => ({
    ...materialItem,
    description:
      (formValues[`${prefix}${index}_description`] as string) ?? materialItem.description,
    discount: Number(formValues[`${prefix}${index}_discount`]) || materialItem.discount,
    totalAmount: Number(formValues[`${prefix}${index}_totalAmount`]) || materialItem.totalAmount,
    grossAmount: Number(formValues[`${prefix}${index}_grossAmount`]) || materialItem.grossAmount,
    partNumber:
      (formValues[`${prefix}${index}_sparePartNumber`] as string) ?? materialItem.partNumber,
    position: (formValues[`${prefix}${index}_position`] as string) ?? materialItem.position,
    quantity: Number(formValues[`${prefix}${index}_quantity`]) || materialItem.quantity,
    tax: Number(formValues[`${prefix}${index}_tax`]) || materialItem.tax,
    netAmount: Number(formValues[`${prefix}${index}_netAmount`]) || materialItem.netAmount,
    type: (formValues[`${prefix}${index}_type`] as string) ?? materialItem.type,
    unitPrice: Number(formValues[`${prefix}${index}_unitPrice`]) || materialItem.unitPrice,
  }));
