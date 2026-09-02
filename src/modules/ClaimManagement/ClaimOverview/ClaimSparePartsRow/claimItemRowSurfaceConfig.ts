import type Field from "components/generics/Field/GenericField.types";
import type {
  DeleteIconContext,
  FieldPermissionContext,
  IsRowFullyDisabledContext,
  ItemRowSurfaceConfig,
  PositionOptionsContext,
} from "modules/JobManagement/JobOverview/SparePartsRow/ItemRowSurfaceConfig";

function resolveIsRowFullyDisabled(ctx: IsRowFullyDisabledContext): boolean {
  return ctx.isDisabled || ctx.isClaimPending;
}

function resolveFieldPermissions(field: Field, ctx: FieldPermissionContext): Field {
  if (ctx.isRowFullyDisabled) return { ...field, isDisabled: true };

  // The spare-part "type" dropdown stays editable for every row while the
  // claim is in edit mode, regardless of whether the row is newly added.
  if (field.subtype === "diagnosticType") return { ...field, isDisabled: false };

  if (ctx.isNewRow) {
    if (field.type === "price") return { ...field, isDisabled: true };
    return { ...field, isDisabled: false };
  }

  return { ...field, isDisabled: true };
}

function resolvePositionFieldOptions(fields: Field[], ctx: PositionOptionsContext): Field[] {
  const allowedMap = new Map(ctx.allowedPositions.map((p) => [p.position, p]));
  return fields.map((field) => {
    if (field.subtype !== "diagnosticPosition") return field;

    // Use options from country config if UIConfig doesn't define them
    const baseOptions = (field.options ?? []).length > 0 ? (field.options ?? []) : ctx.positionDropdownOptions;
    if (!baseOptions.length) return field;

    const thisFieldName = field.name;
    const positionCounts: Record<string, number> = {};
    ctx.allFormFields
      .filter(
        (f) =>
          f.subtype === "diagnosticPosition" &&
          f.name !== thisFieldName &&
          f.name.startsWith("claims_"),
      )
      .forEach((f) => {
        const val = ctx.values[f.name] as string;
        if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
      });

    const updatedOptions = baseOptions.map((opt) => {
      const posConfig = allowedMap.get(opt.value as string);
      if (!posConfig) return opt;
      const usedElsewhere = positionCounts[opt.value as string] ?? 0;
      return { ...opt, disabled: usedElsewhere >= posConfig.maxCount };
    });

    // Prepend a disabled "Select" placeholder so the user must pick a real position
    const withSelect = [{ value: "", name: "SelectAnOption", disabled: true }, ...updatedOptions];

    return { ...field, options: withSelect };
  });
}

function resolveCanShowDeleteIcon(ctx: DeleteIconContext): boolean {
  return ctx.canDeleteRows && !ctx.isAutomaticRow;
}

export const claimItemRowSurfaceConfig: ItemRowSurfaceConfig = {
  surface: "claimSpareParts",
  resolveIsRowFullyDisabled,
  resolveFieldPermissions,
  resolvePositionFieldOptions,
  resolveCanShowDeleteIcon,
  hasExchangeAutoRowGate: false,
  hasApprovalFlyout: false,
  extraEffects: {
    discountHiddenSync: false,
    partNumberReset: false,
    pricePreservationOnTypeToggle: false,
    jobTypeDiscountRepopulation: false,
  },
  areaIndexOneSharedRefGuard: false,
  hasExpandablePricesIncludesMaterialId: false,
  hasWarrantyGating: false,
  hasOnChangeRevisedRejectedReset: false,
};
