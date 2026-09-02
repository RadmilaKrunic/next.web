import type Field from "components/generics/Field/GenericField.types";
import type Area from "components/generics/Area/GenericArea.types";
import type { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";

// Phase 5 unification (items-and-prices-refactor.md §15 step 9) — extracted verbatim from
// ClaimOverview.tsx's onValidateClaim, which built the validate-and-save payload's `materials`
// and `claimPriceSummary` inline. Scoped strictly to that one call site — job's own separate
// save-payload builder (in JobOverview.tsx) is untouched and out of scope for this step.

export function makeFieldGetter(
  fields: Field[],
  formValues: Record<string, unknown>,
): (subtype: string) => unknown {
  return (subtype) => {
    const field = fields.find((af) => af.subtype === subtype);
    return field ? formValues[field.name] : undefined;
  };
}

/** Rebuilds each claim material row from its live Formik field values, falling back to the
 *  original API-sourced material (by position in `sparePartsAreas`) for any field not present
 *  as a form field on that row. Every other Material field (status, approvedBy, approvedByName,
 *  approvedAt, isValidated, reimbursementPaymentMethod) is carried through unchanged from
 *  `originalMaterials[idx]` via the spread — only the explicitly-listed fields below are
 *  ever overridden from form values. */
export function serializeItemsForSubmit(
  sparePartsAreas: Area[],
  formValues: Record<string, unknown>,
  originalMaterials: Material[] | undefined,
) {
  return sparePartsAreas.map((area, idx) => {
    const get = makeFieldGetter(area.fields, formValues);
    const original = originalMaterials?.[idx];

    return {
      ...original,
      position: (get("diagnosticPosition") as string) ?? original?.position ?? "",
      partNumber: (get("diagnosticPartNumber") as string) ?? original?.partNumber ?? "",
      description: (get("diagnosticDescription") as string) ?? original?.description ?? "",
      jobType: (get("diagnosticType") as string) ?? original?.jobType ?? "",
      quantity: Number(get("diagnosticQuantity") ?? original?.quantity ?? 1),
      order: Number(get("diagnosticOrder") ?? original?.order ?? idx + 1),
      isPriceSetManually: false,
      price: {
        unitPrice: Number(get("diagnosticUnitPrice") ?? 0),
        suggestedNetPrice: Number(get("diagnosticSuggestedNetPrice") ?? 0),
        netAmount: Number(get("diagnosticNetAmount") ?? 0),
        tax: Number(get("diagnosticTax") ?? original?.price?.tax ?? 0),
        taxAmount: Number(get("diagnosticTaxAmount") ?? 0),
        grossAmount: Number(get("diagnosticGrossAmount") ?? 0),
        discount: original?.price?.discount ?? 0,
        totalAmount: Number(get("diagnosticTotalAmount") ?? 0),
      },
    };
  });
}

export interface AggregatedPriceSummary {
  netAmount: number;
  suggestedNetPrice: number;
  grossAmount: number;
  discount: number;
  totalAmount: number;
  taxAmount: number;
}

/** Aggregates a set of material rows' price fields into one claim-level summary — sums, not
 *  averages, matching onValidateClaim's original reduce exactly. */
export function aggregatePriceSummary(
  materials: Array<{ price?: Record<string, number> }>,
): AggregatedPriceSummary {
  return materials.reduce(
    (acc, m) => {
      const price = m.price ?? {};
      return {
        netAmount: acc.netAmount + (Number(price.netAmount) || 0),
        suggestedNetPrice: acc.suggestedNetPrice + (Number(price.suggestedNetPrice) || 0),
        grossAmount: acc.grossAmount + (Number(price.grossAmount) || 0),
        discount: acc.discount + (Number(price.discount) || 0),
        totalAmount: acc.totalAmount + (Number(price.totalAmount) || 0),
        taxAmount: acc.taxAmount + (Number(price.taxAmount) || 0),
      };
    },
    {
      netAmount: 0,
      suggestedNetPrice: 0,
      grossAmount: 0,
      discount: 0,
      totalAmount: 0,
      taxAmount: 0,
    },
  );
}
