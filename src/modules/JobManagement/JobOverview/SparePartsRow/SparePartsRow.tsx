import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import GenericField from "components/generics/Field/GenericField";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { getPositionAutofill } from "hooks/useDiagnosticsManager";
import { useParams } from "react-router-dom";
import { useHasPermission } from "hooks/useHasPermission";
import { useQueryClient } from "@tanstack/react-query";
import CustomerMessageModal from "../CustomerMessageModal/CustomerMessageModal";
import ApprovalActionsFlyout from "../../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout";
import "./SparePartsRow.scss";
import Field from "components/generics/Field/GenericField.types";
import type { GenericOptionProps } from "components/generics/Field/GenericField.types";
import { resolveDiscountFieldNames, useSparePartsRowCommon } from "./SparePartsRow.shared";
import { SparePartsMainFields, SparePartsCollapsedSection } from "./SparePartsRow.components";
import { getPriceFieldEditability } from "./materialPriceEditability";
import { resolveDiscountOnJobTypeChange } from "./jobTypeDiscountRepopulation";
import { resolvePartNumberChangeAction } from "./partNumberUtils";
import { PERMISSIONS } from "utils/Permissions";
import {
  ENABLE_ITEM_RULES_RESOLVER,
  resolveEditability,
  resolvePositionPermissions,
} from "utils/itemRulesResolver";
import type { ItemPolicyConfig } from "api/services/itemPolicy/itemPolicy.types";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import type { User } from "types/user.type";

const PROTECTED_POSITIONS = new Set(["LA", "FR", "PC"]);

const STATUSES_BLOCKING_DELETION = new Set([
  "IN_REPAIR",
  "REPAIR_DONE",
  "DELIVERED",
  "COMPLETED",
  "READY_FOR_REPAIR",
  "CUSTOMER_APPROVAL_PENDING",
]);

const STATUSES_DISABLING_ROW = new Set([
  "RETURN_UNASSEMBLY",
  "RETURN_ASSEMBLY",
  "CUSTOMER_APPROVAL_PENDING",
  "MULTIPLE_APPROVAL_PENDING",
]);

const EXCHANGE_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);

const EDITABLE_WITH_CONDITION_TYPES = new Set(["CHARGEABLE"]);
const EDITABLE_TYPES = new Set(["COMMERCIAL_GOODWILL"]);
const TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART = new Set(["WARRANTY", "SERVICE_OFFERING"]);
const RESETTABLE_ROW_STATUSES = new Set(["REVISED", "REJECTED"]);
const POSITION_PERMISSIONS = {
  LA: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_LABOUR_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_LABOUR_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_LABOUR,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_LABOUR,
  },
  FR: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FREIGHT_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FREIGHT_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_FREIGHT,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_FREIGHT,
  },
  PN: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FULL_TOOLS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FULL_TOOLS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FULL_TOOLS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FULL_TOOLS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_FULL_TOOLS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_FULL_TOOLS,
  },
  SP: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_SPARE_PARTS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS,
  },
  PC: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_SPARE_PARTS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS,
  },
} as const;

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
  itemPolicy?: ItemPolicyConfig,
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

function SparePartsRow({
  fields,
  onDeleteRow,
  isDisabled = false,
}: Readonly<{
  fields: Field[];
  onDeleteRow?: () => void;
  isDisabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const hasApproveCommercialGoodwillPermission = useHasPermission([
    PERMISSIONS.APPROVAL.CAN_APPROVE_COMMERCIAL_GOODWILL_ITEMS,
  ]);
  const {
    allFields: allFormFields,
    sparePartNotBelongsToTool,
    warrantyPanelInfo,
    isRepairAnswerLocked,
  } = useContext(GenericFormContext);
  const {
    arePricesValidated,
    markRowDirty,
    setMaterials,
    allowedPositions,
    isResyncingRef,
    setRevisedRejectedRowPending,
    canArchiveOnDelete,
    resyncMaterialsFromAPI,
    jobStatus,
    discountBase,
    automaticRows,
    isValidating,
    itemPolicy: rawItemPolicy,
  } = useDiagnosticsContext();
  // Single gate for every resolver-driven code path in this component — see
  // ENABLE_ITEM_RULES_RESOLVER in itemRulesResolver.ts.
  const itemPolicy = ENABLE_ITEM_RULES_RESOLVER ? rawItemPolicy : undefined;
  const [isRowCollapsed, setIsRowCollapsed] = useState(arePricesValidated);

  const queryClient = useQueryClient();
  const userPermissions = useMemo(
    () => queryClient.getQueryData<User>(["user"])?.permissions ?? [],
    [queryClient],
  );
  const hasPermission = (permission: string): boolean => userPermissions.includes(permission);
  const [isCustomerMessageModalOpen, setIsCustomerMessageModalOpen] = useState(false);
  const { jobId } = useParams<{ jobId: string }>();

  const positionField = fields.find((field) => field.subtype === "diagnosticPosition");
  const statusField = fields.find((field) => field.subtype === "diagnosticMaterialStatus");
  const typeField = fields.find((field) => field.subtype === "diagnosticType");

  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const positionValue = (values[positionField?.name || ""] as string) ?? "";
  const rowTypeValue = (values[typeField?.name || ""] as string) ?? "";

  const materialIdField = fields.find(
    (field) =>
      field.subtype === "diagnosticMaterialId" || field.fieldMapping?.originalName === "materialId",
  );
  const materialId = values[materialIdField?.name || ""] as string | undefined;

  const isAutomaticRow = PROTECTED_POSITIONS.has(positionValue);
  const isPnRow = positionValue === "PN";
  const hasHardcodedAutofill = !!getPositionAutofill(t)[positionValue];
  const isJobOnHold = values["isOnHold"] === true;
  const positionPerms =
    (itemPolicy ? resolvePositionPermissions(itemPolicy, positionValue) : null) ??
    (POSITION_PERMISSIONS[positionValue as keyof typeof POSITION_PERMISSIONS] ?? null);
  const canDeleteRow = positionPerms ? hasPermission(positionPerms.canDelete) : true;
  const canEditQuantity = positionPerms ? hasPermission(positionPerms.canEditUnits) : true;

  const isApproved = values[statusField?.name ?? ""] === "APPROVED";
  const isPending = values[statusField?.name ?? ""] === "PENDING";
  const isStatusDisabled = STATUSES_DISABLING_ROW.has(jobStatus ?? "");
  const isRowFullyDisabled = isDisabled || isApproved || isStatusDisabled || isValidating;

  const collapsableFieldNames = fields
    .filter((field) => field.type === "price")
    .map((field) => field.fieldMapping?.originalName);
  const collapsableFieldNamesSet = new Set(collapsableFieldNames);

  const getFieldBySubtype = useCallback(
    (subtype: string) => fields.find((f) => f.subtype === subtype)?.name || "",
    [fields],
  );

  const partNumberFieldName = getFieldBySubtype("diagnosticPartNumber");
  const partNumberValue = partNumberFieldName
    ? ((values[partNumberFieldName] as string) ?? "")
    : "";
  const isSparePartTypeRestricted =
    positionValue.toUpperCase() === "SP" &&
    (partNumberValue.trim().length === 0 ||
      sparePartNotBelongsToTool?.current[partNumberFieldName] === true);
  const priceFieldEditability = itemPolicy
    ? resolveEditability(
        itemPolicy,
        { position: positionValue, context: "jobType", contextValue: rowTypeValue },
        discountBase ?? "GROSS_PRICE",
      )
    : getPriceFieldEditability(positionValue, rowTypeValue, discountBase ?? "GROSS_PRICE");

  const mappedPositionOptions: Record<string, boolean> = {
    diagnosticPosition: Boolean((values[partNumberFieldName] as string) !== ""),
    diagnosticQuantity: !canEditQuantity,
    diagnosticUnitPrice: true,
    diagnosticPartNumber: (isAutomaticRow || isPnRow) && hasHardcodedAutofill,
    diagnosticDescription: (isAutomaticRow || isPnRow) && hasHardcodedAutofill,
  };

  const PRICE_FIELD_SUBTYPE_TO_EDITABILITY_KEY = {
    diagnosticDiscount: "discount",
    diagnosticTotalAmount: "totalAmount",
    diagnosticNetAmount: "netAmount",
  } as const;

  const applyFieldPermissions = (field: Field): Field => {
    if (isRowFullyDisabled) {
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
      return { ...field, isDisabled: !priceFieldEditability[editabilityKey] };
    }

    const isDisabledBySubtype = mappedPositionOptions[field.subtype] ?? false;
    if (isDisabledBySubtype) {
      return { ...field, isDisabled: true };
    }

    return field;
  };

  const areaNamePrefix = fields[0]?.fieldMapping?.nameStartsWith ?? "";
  const areaName = areaNamePrefix ? areaNamePrefix.slice(0, -1) : "";
  const areaIndex = (() => {
    const match = /#(\d+)_/.exec(areaNamePrefix);
    return match ? Number.parseInt(match[1], 10) : 0;
  })();

  const {
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    activeDiscountFieldName,
    discountSiblingFieldName,
  } = resolveDiscountFieldNames(fields, discountBase);

  // On initial load (isResyncingRef = true): sync the active visible discount field from the
  // hidden discount field (which has attributeMapping and is populated from API data).
  // The visible discount fields have no attributeMapping so default to 0 in Formik;
  // buildRowValues also sets them, but this is a safeguard for any edge case where they remain 0.
  const prevDiscountHiddenRef = useRef<number>(0);
  useEffect(() => {
    if (!isResyncingRef.current) return;
    if (!discountBase || !discountHiddenFieldName || !activeDiscountFieldName) return;
    const hiddenVal = Number(values[discountHiddenFieldName]) || 0;
    if (hiddenVal === prevDiscountHiddenRef.current) return;
    prevDiscountHiddenRef.current = hiddenVal;
    if (hiddenVal === 0) return;
    const activeVal = Number(values[activeDiscountFieldName]) || 0;
    if (Math.abs(activeVal - hiddenVal) < 0.0001) return;
    void setFieldValue(activeDiscountFieldName, hiddenVal);
    // also sync sibling so both modes are correct
    const siblingName = fields.find(
      (f) =>
        f.subtype === "diagnosticDiscount" &&
        !f.dependentFields?.some((df) => df.fieldValue === (discountBase ?? "GROSS_PRICE")),
    )?.name;
    if (siblingName) void setFieldValue(siblingName, hiddenVal);
  }, [
    discountBase,
    discountHiddenFieldName,
    activeDiscountFieldName,
    values,
    setFieldValue,
    isResyncingRef,
    fields,
  ]);

  const prevPositionRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPositionRef.current === null) {
      prevPositionRef.current = positionValue;
      return;
    }
    if (prevPositionRef.current === positionValue) return;
    prevPositionRef.current = positionValue;
    const autofill = getPositionAutofill(t)[positionValue];
    if (!autofill) return;
    const descriptionFieldName = getFieldBySubtype("diagnosticDescription");
    if (partNumberFieldName) void setFieldValue(partNumberFieldName, autofill.partNumber);
    if (descriptionFieldName) void setFieldValue(descriptionFieldName, autofill.description);
  }, [positionValue, setFieldValue, t, getFieldBySubtype, partNumberFieldName]);

  // Clear price fields when part number changes in a validated row
  const prevPartNumberRef = useRef<string | null>(null);
  const prevMaterialIdRef = useRef<string | undefined>(undefined);

  // Nulls the row's entire price object plus materialId — extracted out of the effect
  // below so its own logic doesn't add to that effect's cognitive complexity. A genuine
  // part number change means the old price data and materialId belong to a different
  // part; nulling (not zeroing) matches the backend contract where price: null signals
  // "not yet priced, please calculate" — see buildDiagnosticPayload's
  // `price?.unitPrice === null` check in JobOverview.tsx.
  const resetPartNumberDependentFields = useCallback(() => {
    const fieldNames = [
      getFieldBySubtype("diagnosticUnitPrice"),
      getFieldBySubtype("diagnosticTax"),
      getFieldBySubtype("diagnosticNetAmount"),
      getFieldBySubtype("diagnosticGrossAmount"),
      getFieldBySubtype("diagnosticTotalAmount"),
      getFieldBySubtype("diagnosticTaxAmount"),
      getFieldBySubtype("diagnosticSuggestedNetPrice"),
      activeDiscountFieldName,
      discountSiblingFieldName,
      discountHiddenFieldName,
      discountAmountHiddenFieldName,
      materialIdField?.name,
    ].filter((name): name is string => !!name);

    isResyncingRef.current = true;
    void Promise.all(fieldNames.map((name) => setFieldValue(name, null))).finally(() => {
      isResyncingRef.current = false;
    });

    const currentStatusValue = statusField ? values[statusField.name] : undefined;
    const wasRevisedOrRejected =
      typeof currentStatusValue === "string" && RESETTABLE_ROW_STATUSES.has(currentStatusValue);

    setMaterials((prev) =>
      prev.map((m, i) =>
        i === areaIndex
          ? {
              ...m,
              partNumber: partNumberValue,
              unitPrice: 0,
              tax: 0,
              netAmount: 0,
              grossAmount: 0,
              totalAmount: 0,
              taxAmount: 0,
              suggestedNetPrice: 0,
              discount: 0,
              discountAmount: 0,
              materialId: undefined,
              ...(wasRevisedOrRejected ? { status: "PENDING" } : {}),
            }
          : m,
      ),
    );
  }, [
    getFieldBySubtype,
    setFieldValue,
    isResyncingRef,
    activeDiscountFieldName,
    discountSiblingFieldName,
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    materialIdField,
    setMaterials,
    areaIndex,
    partNumberValue,
    statusField,
    values,
  ]);

  // Holds the latest resetPartNumberDependentFields without putting it in the effect's
  // own dependency array below. resetPartNumberDependentFields' reference depends on
  // getFieldBySubtype, which depends on the `fields` prop — if the parent doesn't
  // memoize that array, this callback gets a new reference on every render, which would
  // make the effect below re-run (and re-invoke resolvePartNumberChangeAction) on every
  // render of this row, not just when partNumberValue/materialId actually change.
  const resetPartNumberDependentFieldsRef = useRef(resetPartNumberDependentFields);
  resetPartNumberDependentFieldsRef.current = resetPartNumberDependentFields;

  useEffect(() => {
    const action = resolvePartNumberChangeAction(
      prevPartNumberRef.current,
      partNumberValue,
      isResyncingRef.current,
    );

    if (action === "none") {
      prevMaterialIdRef.current = materialId;
      return;
    }

    prevPartNumberRef.current = partNumberValue;
    prevMaterialIdRef.current = materialId;

    if (action === "reset") {
      resetPartNumberDependentFieldsRef.current();
    }
  }, [partNumberValue, materialId, isResyncingRef]);

  const preserveFields = useMemo(
    () => [
      getFieldBySubtype("diagnosticDiscountHidden"),
      getFieldBySubtype("diagnosticDiscountNetHidden"),
      getFieldBySubtype("diagnosticDiscount"),
      getFieldBySubtype("diagnosticTotalAmountHidden"),
      getFieldBySubtype("diagnosticTotalAmount"),
      getFieldBySubtype("diagnosticNetAmount"),
    ],
    [getFieldBySubtype],
  );
  const prevPriceRef = useRef<Record<string, any> | null>(null);
  const prevTypeRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      EDITABLE_WITH_CONDITION_TYPES.has(prevTypeRef.current ?? "") ||
      EDITABLE_TYPES.has(prevTypeRef.current ?? "")
    ) {
      if (prevPriceRef.current !== null) return;
      prevPriceRef.current = preserveFields.map((field) => ({
        name: field,
        value: values[field] ?? null,
      }));
      return;
    }
    if (prevPriceRef.current === null) return;

    prevPriceRef.current.forEach((field: any) => {
      void setFieldValue(field.name, field.value);
    });
    prevPriceRef.current = null;
  }, [preserveFields, values, setFieldValue]);

  useEffect(() => {
    // Collects discount % from other material-position (PN/SP/AC) rows currently set to
    // CHARGEABLE — the source rule 1 of resolveDiscountOnJobTypeChange reads from when a
    // material row enters CHARGEABLE. Protected positions (LA/FR/PC) are intentionally
    // excluded as a source, per the confirmed rule.
    const buildSiblingChargeableDiscounts = (): number[] => {
      const discountHiddenFields = allFormFields.filter(
        (field) =>
          field.subtype === "diagnosticDiscountHidden" &&
          field.fieldMapping?.nameStartsWith &&
          field.fieldMapping?.nameStartsWith !== areaNamePrefix,
      );

      const result: number[] = [];
      for (const field of discountHiddenFields) {
        const siblingPrefix = field.fieldMapping?.nameStartsWith;
        const siblingTypeField = allFormFields.find(
          (f) => f.fieldMapping?.nameStartsWith === siblingPrefix && f.subtype === "diagnosticType",
        );
        const siblingPositionField = allFormFields.find(
          (f) =>
            f.fieldMapping?.nameStartsWith === siblingPrefix && f.subtype === "diagnosticPosition",
        );
        const siblingType = siblingTypeField
          ? ((values[siblingTypeField.name] as string) ?? "")
          : "";
        const siblingPosition = siblingPositionField
          ? ((values[siblingPositionField.name] as string) ?? "")
          : "";
        if (
          siblingType.toUpperCase() === "CHARGEABLE" &&
          !PROTECTED_POSITIONS.has(siblingPosition)
        ) {
          result.push(Number(values[field.name] ?? 0));
        }
      }
      return result;
    };

    const currentType = rowTypeValue;

    if (prevTypeRef.current === null) {
      prevTypeRef.current = currentType;
      return;
    }

    const previousType = prevTypeRef.current;
    prevTypeRef.current = currentType;

    if (!previousType || previousType === currentType) return;
    if (isResyncingRef.current) return;

    const discountPercent = resolveDiscountOnJobTypeChange(
      previousType,
      currentType,
      positionValue,
      buildSiblingChargeableDiscounts(),
    );

    const currentStatusValue = statusField ? values[statusField.name] : undefined;
    const wasRevisedOrRejected =
      typeof currentStatusValue === "string" && RESETTABLE_ROW_STATUSES.has(currentStatusValue);

    if (discountPercent === null) {
      if (wasRevisedOrRejected) {
        setMaterials((prev) =>
          prev.map((m, i) =>
            i === areaIndex ? { ...m, type: currentType, status: "PENDING" } : m,
          ),
        );
      }
      return;
    }

    const grossAmountFieldName = getFieldBySubtype("diagnosticGrossAmount");
    const grossAmount = grossAmountFieldName ? Number(values[grossAmountFieldName]) || 0 : 0;
    const discountAmount = (grossAmount * discountPercent) / 100;

    prevPriceRef.current = null;

    void setFieldValue(activeDiscountFieldName, discountPercent);
    if (discountSiblingFieldName) void setFieldValue(discountSiblingFieldName, discountPercent);
    if (discountHiddenFieldName) void setFieldValue(discountHiddenFieldName, discountPercent);
    if (discountAmountHiddenFieldName)
      void setFieldValue(discountAmountHiddenFieldName, discountAmount);

    setMaterials((prev) =>
      prev.map((m, i) =>
        i === areaIndex
          ? {
              ...m,
              discount: discountPercent,
              type: currentType,
              ...(wasRevisedOrRejected ? { status: "PENDING" } : {}),
            }
          : m,
      ),
    );
  }, [
    rowTypeValue,
    isResyncingRef,
    allFormFields,
    values,
    activeDiscountFieldName,
    discountSiblingFieldName,
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    setFieldValue,
    positionValue,
    areaNamePrefix,
    getFieldBySubtype,
    setMaterials,
    areaIndex,
    statusField,
  ]);

  const nonPriceInputKey = useSparePartsRowCommon({
    fields,
    activeDiscountFieldName,
    discountSiblingFieldName,
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    areaNamePrefix,
    isResyncingRef,
    discountBase,
    values,
    markRowDirty,
    areaIndex,
    isValidating,
  });

  // Mirror arePricesValidated into a ref so the dirty-tracking effect below is not
  // triggered by the false→true transition that happens immediately after validate
  // succeeds. Without this, arePricesValidated flipping to true re-fires the effect,
  // which calls markRowDirty and immediately resets arePricesValidated back to false.
  const arePricesValidatedRef = useRef(arePricesValidated);
  arePricesValidatedRef.current = arePricesValidated;

  const isFirstRowRender = useRef(true);
  useEffect(() => {
    if (isFirstRowRender.current) {
      isFirstRowRender.current = false;
      return;
    }
    // Skip during API-driven reinitialization (e.g. after validateAndSave resync) to
    // prevent incorrectly marking rows dirty when Formik reinitializes with fresh API data.
    if (isResyncingRef.current) return;
    // Bug 1 fix: also skip if validation is currently in flight
    if (isValidating) return;
    if (!arePricesValidatedRef.current) return;
    markRowDirty(areaIndex);
  }, [
    areaName,
    setRevisedRejectedRowPending,
    nonPriceInputKey,
    markRowDirty,
    areaIndex,
    statusField,
    isResyncingRef,
    isValidating,
  ]);

  const isWarrantyIneligible = Boolean(
    warrantyPanelInfo?.isIneligible || !warrantyPanelInfo?.hasPurchaseDate,
  );

  const fieldsWithTypeOptionsDisabled = useMemo(
    () =>
      fields.map((field) => {
        if (field.subtype !== "diagnosticType" || !field.options?.length) return field;
        if (!isSparePartTypeRestricted && !isWarrantyIneligible) return field;

        return {
          ...field,
          options: field.options.map((option) => {
            const optionValue = String(option.value ?? "").toUpperCase();
            if (!TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART.has(optionValue)) return option;
            return { ...option, disabled: true };
          }),
        };
      }),
    [fields, isSparePartTypeRestricted, isWarrantyIneligible],
  );

  const mainFields = fieldsWithTypeOptionsDisabled.filter(
    (field) =>
      !collapsableFieldNamesSet.has(field.fieldMapping?.originalName || "") &&
      field.fieldMapping?.originalName !== "preApprovalCheckbox",
  );

  const checkboxField = fieldsWithTypeOptionsDisabled.find(
    (field) => field.fieldMapping?.originalName === "preApprovalCheckbox",
  );

  const collapsableFields = fieldsWithTypeOptionsDisabled.filter((field) =>
    collapsableFieldNamesSet.has(field.fieldMapping?.originalName || ""),
  );

  const hasPricesPopulated = collapsableFields.some((field) => {
    const val = Number(values[field.name]);
    return Number.isFinite(val);
  });
  const hasExpandablePrices = hasPricesPopulated || Boolean(materialId);

  const areaPrefix = hasExpandablePrices ? collapsableFields[0]?.fieldMapping?.nameStartsWith : "";
  useEffect(() => {
    if (!hasPriceViewPermission) return;
    if (materialId) {
      setIsRowCollapsed(true);
      return;
    }
    setIsRowCollapsed(arePricesValidated);
  }, [arePricesValidated, hasPriceViewPermission, materialId]);

  const positionFieldsWithDisabledOptions = useMemo(() => {
    return fieldsWithTypeOptionsDisabled.map((field) => {
      if (field.subtype !== "diagnosticPosition" || !field.options?.length) return field;
      const positionCounts = buildPositionCounts(allFormFields, field.name, values);
      const updatedOptions = field.options.map((opt) =>
        computePositionOption(opt, positionCounts, allowedPositions, userPermissions, itemPolicy),
      );
      return { ...field, options: updatedOptions };
    });
  }, [
    fieldsWithTypeOptionsDisabled,
    allFormFields,
    values,
    allowedPositions,
    userPermissions,
    itemPolicy,
  ]);

  const isDeletionBlocked = jobStatus ? STATUSES_BLOCKING_DELETION.has(jobStatus) : false;
  const actionType = (values["actionType"] as string) ?? "";
  const isExchangeAutoRow =
    EXCHANGE_ACTION_TYPES.has(actionType) && (automaticRows ?? []).includes(positionValue);

  const canShowDeleteIcon = () => {
    return (
      !isRepairAnswerLocked &&
      !isJobOnHold &&
      !isApproved &&
      canDeleteRow &&
      (!isDisabled || canArchiveOnDelete) &&
      !isDeletionBlocked &&
      positionValue !== "LA"
    );
  };

  const renderRowActions = () => {
    if (isExchangeAutoRow) return null;

    if (hasApproveCommercialGoodwillPermission) {
      return isPending ? (
        <ApprovalActionsFlyout
          jobId={jobId}
          materialId={materialId}
          showJobDetailsAction={false}
          onBeforeInvalidate={resyncMaterialsFromAPI}
        />
      ) : null;
    }

    if (canShowDeleteIcon()) {
      return (
        <Icon
          className="spare-part-action"
          iconName="delete"
          title={t("delete")}
          onClick={() => onDeleteRow?.()}
        />
      );
    }

    return null;
  };
  return (
    <div
      className="spare-parts-row-wrapper"
      onChange={(e: React.FormEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement & { name?: string };
        if (target?.name === typeField?.name || target?.name === partNumberFieldName) return;

        const rowStatus = statusField ? values[statusField.name] : undefined;
        if (typeof rowStatus === "string" && RESETTABLE_ROW_STATUSES.has(rowStatus)) {
          setRevisedRejectedRowPending(areaName);
        }
      }}
    >
      <div className={`spare-parts-row ${hasPriceViewPermission ? "admin" : ""}`}>
        {checkboxField && (
          <GenericField
            field={{
              ...checkboxField,
              isDisabled: !isPending,
            }}
          />
        )}
        {hasPriceViewPermission && (
          <Icon
            iconName={`${isRowCollapsed ? "up" : "down"}`}
            className="arrow"
            data-testid={`${areaPrefix}arrow${isRowCollapsed ? "Up" : "Down"}`}
            aria-hidden="true"
            onClick={() => {
              if (!hasExpandablePrices) {
                return;
              }
              setIsRowCollapsed(!isRowCollapsed);
            }}
          />
        )}
        <SparePartsMainFields
          mainFields={mainFields}
          positionFieldsWithDisabledOptions={positionFieldsWithDisabledOptions}
          applyFieldPermissions={applyFieldPermissions}
        />
        {renderRowActions()}
      </div>
      <SparePartsCollapsedSection
        isRowCollapsed={isRowCollapsed}
        hasPriceViewPermission={hasPriceViewPermission}
        collapsableFields={collapsableFields}
        applyFieldPermissions={applyFieldPermissions}
      />
      {jobId && (
        <CustomerMessageModal
          jobId={jobId}
          isOpen={isCustomerMessageModalOpen}
          onClose={() => setIsCustomerMessageModalOpen(false)}
          title={t("areYouSureYouWantToRejectThisRepair?")}
          placeholder={t("ReasonForRejection")}
        />
      )}
    </div>
  );
}

export default SparePartsRow;
