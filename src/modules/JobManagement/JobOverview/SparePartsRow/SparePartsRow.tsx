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
import { PERMISSIONS } from "utils/Permissions";
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
]);

const EXCHANGE_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);
const EDITABLE_WITH_CONDITION_TYPES = new Set(["CHARGEABLE"]);
const EDITABLE_TYPES = new Set(["COMMERCIAL_GOODWILL"]);
const SUMMARY_DISCOUNT_TARGET_TYPES = new Set(["CHARGEABLE"]);
const RESET_TO_ZERO_SOURCE_TYPES = new Set(["WARRANTY", "COMMERCIAL_GOODWILL", "SERVICE_OFFERING"]);
const TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART = new Set(["WARRANTY", "SERVICE_OFFERING"]);
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
): GenericOptionProps {
  const optPerms = POSITION_PERMISSIONS[opt.value as keyof typeof POSITION_PERMISSIONS] ?? null;
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
  const { allFields: allFormFields, sparePartBelongsToTool } = useContext(GenericFormContext);
  const {
    arePricesValidated,
    markRowDirty,
    allowedPositions,
    isResyncingRef,
    setRevisedRowPending,
    canArchiveOnDelete,
    resyncMaterialsFromAPI,
    jobStatus,
    discountBase,
    automaticRows,
  } = useDiagnosticsContext();
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
  const positionValue = positionField ? ((values[positionField.name] as string) ?? "") : "";
  const rowTypeValue = typeField ? ((values[typeField.name] as string) ?? "") : "";
  const materialIdField = fields.find(
    (field) =>
      field.subtype === "diagnosticMaterialId" || field.fieldMapping?.originalName === "materialId",
  );
  const materialId = materialIdField
    ? (values[materialIdField.name] as string | undefined)
    : undefined;

  const isAutomaticRow = PROTECTED_POSITIONS.has(positionValue);
  const isPnRow = positionValue === "PN";
  const normalizedRowTypeValue = rowTypeValue.toUpperCase();
  const isEditableWithConditionType = EDITABLE_WITH_CONDITION_TYPES.has(normalizedRowTypeValue);
  const isEditableType = EDITABLE_TYPES.has(normalizedRowTypeValue);
  const hasHardcodedAutofill = !!getPositionAutofill(t)[positionValue];
  const isJobOnHold = values["isOnHold"] === true;
  const positionPerms =
    POSITION_PERMISSIONS[positionValue as keyof typeof POSITION_PERMISSIONS] ?? null;
  const canDeleteRow = positionPerms ? hasPermission(positionPerms.canDelete) : true;
  const canEditQuantity = positionPerms ? hasPermission(positionPerms.canEditUnits) : true;

  const isApproved = values[statusField?.name ?? ""] === "APPROVED";
  const isPending = values[statusField?.name ?? ""] === "PENDING";
  const isStatusDisabled = STATUSES_DISABLING_ROW.has(jobStatus ?? "");
  const isRowFullyDisabled = isDisabled || isApproved || isStatusDisabled;

  const isNetPrice = discountBase === "NET_PRICE";
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
      sparePartBelongsToTool?.current[partNumberFieldName] !== true);
  const mappedPositionOptions: Record<string, boolean> = {
    diagnosticPosition: Boolean((values[partNumberFieldName] as string) !== ""),
    diagnosticQuantity: !canEditQuantity,
    diagnosticUnitPrice: true,
    diagnosticDiscount: !isEditableWithConditionType && !isEditableType,
    diagnosticTotalAmount: !isAutomaticRow,
    diagnosticNetAmount: !isAutomaticRow,
    diagnosticPartNumber: (isAutomaticRow || isPnRow) && hasHardcodedAutofill,
    diagnosticDescription: (isAutomaticRow || isPnRow) && hasHardcodedAutofill,
  };
  const applyFieldPermissions = (field: Field): Field => {
    if (isRowFullyDisabled) {
      return { ...field, isDisabled: true };
    }

    if (isEditableWithConditionType && field.subtype) {
      if (
        field.subtype === "diagnosticDiscount" ||
        (field.subtype === "diagnosticNetAmount" && isNetPrice) ||
        (field.subtype === "diagnosticTotalAmount" && !isNetPrice)
      ) {
        return { ...field, isDisabled: !isAutomaticRow };
      }
    }
    if (isEditableType && field.subtype && !isRowFullyDisabled) {
      if (
        field.subtype === "diagnosticDiscount" ||
        (field.subtype === "diagnosticNetAmount" && isNetPrice) ||
        (field.subtype === "diagnosticTotalAmount" && !isNetPrice)
      ) {
        return { ...field, isDisabled: false };
      }
    }
    const isDisabledBySubtype = field.subtype
      ? (mappedPositionOptions[field.subtype] ?? false)
      : false;

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

  const prevTypeRef = useRef<string | null>(null);
  useEffect(() => {
    const currentType = rowTypeValue;
    const normalizedCurrentType = currentType.toUpperCase();
    const normalizedPositionValue = positionValue.toUpperCase();

    if (prevTypeRef.current === null) {
      prevTypeRef.current = currentType;
      return;
    }

    const previousType = prevTypeRef.current;
    const normalizedPreviousType = previousType.toUpperCase();
    prevTypeRef.current = currentType;

    if (previousType === currentType) return;
    if (isResyncingRef.current) return;

    const isEnteringTargetType = SUMMARY_DISCOUNT_TARGET_TYPES.has(normalizedCurrentType);
    const isEnteringResetSource = RESET_TO_ZERO_SOURCE_TYPES.has(normalizedCurrentType);
    const isLeavingTargetToReset = normalizedPreviousType === "CHARGEABLE" && isEnteringResetSource;
    const isTargetPosition = !PROTECTED_POSITIONS.has(normalizedPositionValue);

    if (!isTargetPosition) return;
    if (!isEnteringTargetType && !isLeavingTargetToReset) return;

    const summaryHiddenDiscountField = allFormFields.find(
      (field) => field.subtype === "diagnosticSummaryDiscountMaterialHidden",
    );
    const summaryModeDiscountField = allFormFields.find(
      (field) =>
        field.subtype ===
          (discountBase === "NET_PRICE"
            ? "diagnosticSummaryDiscountNetMaterial"
            : "diagnosticSummaryDiscountMaterial") &&
        field.dependentFields?.some((df) => df.fieldValue === (discountBase ?? "GROSS_PRICE")),
    );

    const summaryDiscount = Number(
      values[summaryHiddenDiscountField?.name ?? ""] ??
        values[summaryModeDiscountField?.name ?? ""] ??
        0,
    );

    const shouldResetToZero = isLeavingTargetToReset;
    const nextDiscount = shouldResetToZero ? 0 : summaryDiscount;

    void setFieldValue(activeDiscountFieldName, nextDiscount);
    if (discountSiblingFieldName) void setFieldValue(discountSiblingFieldName, nextDiscount);
    if (discountHiddenFieldName) void setFieldValue(discountHiddenFieldName, nextDiscount);
  }, [
    rowTypeValue,
    isResyncingRef,
    allFormFields,
    values,
    discountBase,
    activeDiscountFieldName,
    discountSiblingFieldName,
    discountHiddenFieldName,
    setFieldValue,
    positionValue,
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
    if (!arePricesValidatedRef.current) return;
    markRowDirty(areaIndex);
  }, [
    areaName,
    setRevisedRowPending,
    nonPriceInputKey,
    markRowDirty,
    areaIndex,
    statusField,
    isResyncingRef,
  ]);

  const fieldsWithTypeOptionsDisabled = useMemo(
    () =>
      fields.map((field) => {
        if (field.subtype !== "diagnosticType" || !field.options?.length) return field;
        if (!isSparePartTypeRestricted) return field;

        return {
          ...field,
          options: field.options.map((option) => {
            const optionValue = String(option.value ?? "").toUpperCase();
            if (!TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART.has(optionValue)) return option;
            return { ...option, disabled: true };
          }),
        };
      }),
    [fields, isSparePartTypeRestricted],
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
        computePositionOption(opt, positionCounts, allowedPositions, userPermissions),
      );
      return { ...field, options: updatedOptions };
    });
  }, [fieldsWithTypeOptionsDisabled, allFormFields, values, allowedPositions, userPermissions]);

  const isDeletionBlocked = jobStatus ? STATUSES_BLOCKING_DELETION.has(jobStatus) : false;
  const actionType = (values["actionType"] as string) ?? "";
  const isExchangeAutoRow =
    EXCHANGE_ACTION_TYPES.has(actionType) && (automaticRows ?? []).includes(positionValue);

  const renderRowActions = () => {
    if (isExchangeAutoRow) return null;
    if (hasApproveCommercialGoodwillPermission) {
      if (!isPending) return null;
      return (
        <ApprovalActionsFlyout
          jobId={jobId}
          materialId={materialId}
          showJobDetailsAction={false}
          onBeforeInvalidate={resyncMaterialsFromAPI}
        />
      );
    }
    return (
      !isJobOnHold &&
      canDeleteRow &&
      (!isDisabled || canArchiveOnDelete) &&
      !isDeletionBlocked &&
      positionValue !== "LA" && (
        <Icon
          className="spare-part-action"
          iconName="delete"
          title={t("delete")}
          onClick={() => onDeleteRow?.()}
        />
      )
    );
  };
  return (
    <div
      className="spare-parts-row-wrapper"
      onChange={() => {
        if (statusField && values[statusField.name] === "REVISED") {
          setRevisedRowPending(areaName);
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
