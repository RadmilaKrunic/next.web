import type Field from "components/generics/Field/GenericField.types";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import { resolvePositionPermissions } from "utils/itemRulesResolver";
import { POSITION_PERMISSIONS } from "./ItemRow";
import type {
  DeleteIconContext,
  FieldPermissionContext,
  IsRowFullyDisabledContext,
  ItemRowSurfaceConfig,
  PositionOptionsContext,
} from "./ItemRowSurfaceConfig";

// Ported verbatim from SparePartsRow.tsx's PRICE_FIELD_SUBTYPE_TO_EDITABILITY_KEY.
const PRICE_FIELD_SUBTYPE_TO_EDITABILITY_KEY = {
  diagnosticDiscount: "discount",
  diagnosticTotalAmount: "totalAmount",
  diagnosticNetAmount: "netAmount",
} as const;

function resolveIsRowFullyDisabled(ctx: IsRowFullyDisabledContext): boolean {
  return ctx.isDisabled || ctx.isApproved || ctx.isStatusDisabled || ctx.isValidating;
}

function resolveFieldPermissions(field: Field, ctx: FieldPermissionContext): Field {
  if (ctx.isRowFullyDisabled) {
    return { ...field, isDisabled: true };
  }

  if (!field.subtype) {
    return field;
  }

  const editabilityKey =
    PRICE_FIELD_SUBTYPE_TO_EDITABILITY_KEY[
      field.subtype as keyof typeof PRICE_FIELD_SUBTYPE_TO_EDITABILITY_KEY
    ];
  if (editabilityKey) {
    return { ...field, isDisabled: !ctx.priceFieldEditability[editabilityKey] };
  }

  const isDisabledBySubtype = ctx.mappedPositionOptions[field.subtype] ?? false;
  if (isDisabledBySubtype) {
    return { ...field, isDisabled: true };
  }

  return field;
}

function buildPositionCounts(
  allFormFields: Field[],
  thisFieldName: string,
  values: Record<string, unknown>,
): Record<string, number> {
  const positionCounts: Record<string, number> = {};
  allFormFields
    .filter((f) => f.subtype === "diagnosticPosition" && f.name !== thisFieldName)
    .forEach((f) => {
      const val = values[f.name] as string;
      if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
    });
  return positionCounts;
}

function computePositionOption(
  opt: GenericOptionProps,
  positionCounts: Record<string, number>,
  allowedPositions: { position: string; maxCount: number }[],
  userPermissions: string[],
  itemPolicy: PositionOptionsContext["itemPolicy"],
): GenericOptionProps {
  // Prefer the config-driven policy once loaded; fall back to the hardcoded table
  // otherwise (today's behavior — the backing endpoint doesn't exist in production yet).
  const optPerms =
    (itemPolicy ? resolvePositionPermissions(itemPolicy, opt.value as string) : null) ??
    (POSITION_PERMISSIONS[opt.value as keyof typeof POSITION_PERMISSIONS] ?? null);
  if (optPerms && !userPermissions.includes(optPerms.canDelete)) {
    return { ...opt, disabled: true };
  }
  const config = allowedPositions.find((p) => p.position === opt.value);
  if (!config) return opt;
  const usedElsewhere = positionCounts[opt.value as string] ?? 0;
  return { ...opt, disabled: usedElsewhere >= config.maxCount };
}

function resolvePositionFieldOptions(fields: Field[], ctx: PositionOptionsContext): Field[] {
  return fields.map((field) => {
    if (field.subtype !== "diagnosticPosition" || !field.options?.length) return field;

    const positionCounts = buildPositionCounts(ctx.allFormFields, field.name, ctx.values);

    return {
      ...field,
      options: field.options.map((opt) =>
        computePositionOption(
          opt,
          positionCounts,
          ctx.allowedPositions,
          ctx.userPermissions,
          ctx.itemPolicy,
        ),
      ),
    };
  });
}

function resolveCanShowDeleteIcon(ctx: DeleteIconContext): boolean {
  return (
    !ctx.isRepairAnswerLocked &&
    !ctx.isJobOnHold &&
    !ctx.isApproved &&
    ctx.canDeleteRow &&
    (!ctx.isDisabled || ctx.canArchiveOnDelete) &&
    !ctx.isDeletionBlocked &&
    ctx.positionValue !== "LA"
  );
}

export const jobItemRowSurfaceConfig: ItemRowSurfaceConfig = {
  surface: "jobDiagnostics",
  resolveIsRowFullyDisabled,
  resolveFieldPermissions,
  resolvePositionFieldOptions,
  resolveCanShowDeleteIcon,
  hasExchangeAutoRowGate: true,
  hasApprovalFlyout: true,
  extraEffects: {
    discountHiddenSync: true,
    partNumberReset: true,
    pricePreservationOnTypeToggle: true,
    jobTypeDiscountRepopulation: true,
  },
  areaIndexOneSharedRefGuard: true,
  hasExpandablePricesIncludesMaterialId: true,
  hasWarrantyGating: true,
  hasOnChangeRevisedRejectedReset: true,
};
