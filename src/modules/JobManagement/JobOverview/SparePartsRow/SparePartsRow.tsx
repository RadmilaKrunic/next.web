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
import { SparePartsMainFields, SparePartsCollapsedSection } from "./SparePartsRow.components";
import { getPriceFieldEditability } from "./materialPriceEditability";
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
  "MULTIPLE_APPROVAL_PENDING",
]);

const EXCHANGE_ACTION_TYPES = new Set([
  "NEW_TOOL_EXCHANGE",
  "SPARE_PARTS_EXCHANGE",
  "ACCESSORIES_EXCHANGE",
]);
const SPARE_PARTS_EXCHANGE_ACTION_TYPES = new Set(["SPARE_PARTS_EXCHANGE"]);
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

const buildPositionCounts =(
  allFormFields: Field[],
  thisFieldName: string,
  values: Record<string, unknown>,
): Record<string, number> => {
  const positionCounts: Record<string, number> = {};
  allFormFields
    .filter((f) => f.subtype === "diagnosticPosition" && f.name !== thisFieldName)
    .forEach((f) => {
      const val = values[f.name] as string;
      if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
    });
  return positionCounts;
};

const computePositionOption = (
  opt: GenericOptionProps,
  positionCounts: Record<string, number>,
  allowedPositions: { position: string; maxCount: number }[],
  userPermissions: string[],
): GenericOptionProps => {
  const optPerms = POSITION_PERMISSIONS[opt.value as keyof typeof POSITION_PERMISSIONS] ?? null;
  if (optPerms && !userPermissions.includes(optPerms.canDelete)) {
    return { ...opt, disabled: true };
  }
  const config = allowedPositions.find((p) => p.position === opt.value);
  if (!config) return opt;
  const usedElsewhere = positionCounts[opt.value as string] ?? 0;
  return { ...opt, disabled: usedElsewhere >= config.maxCount };
};

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
  const partNumberField = fields.find((field) => field.subtype === "diagnosticPartNumber");
  const partNumberFieldName = partNumberField?.name || "";

  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const positionValue = (values[positionField?.name || ""] as string) ?? "";
  const rowTypeValue = (values[typeField?.name || ""] as string) ?? "";
  const partNumberValue = (values[partNumberFieldName] as string) ?? "";
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
    POSITION_PERMISSIONS[positionValue as keyof typeof POSITION_PERMISSIONS] ?? null;
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
  
  const isSparePartTypeRestricted =
    positionValue.toUpperCase() === "SP" &&
    (partNumberValue.trim().length === 0 ||
      sparePartNotBelongsToTool?.current[partNumberFieldName] === true);
  const priceFieldEditability = getPriceFieldEditability(
    positionValue,
    rowTypeValue,
    discountBase ?? "GROSS_PRICE",
  );

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

  const prevPositionRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevPositionRef.current === null) {
      prevPositionRef.current = positionValue;
      return;
    }
    if (prevPositionRef.current === positionValue) return;
    prevPositionRef.current = positionValue;

    const autofill = getPositionAutofill(t)[positionValue];
    if (autofill) {
      const descriptionFieldName = getFieldBySubtype("diagnosticDescription");
      if (partNumberFieldName) void setFieldValue(partNumberFieldName, autofill.partNumber);
      if (descriptionFieldName) void setFieldValue(descriptionFieldName, autofill.description);
    }
    if (areaIndex === 1 && !isResyncingRef.current) {
      isResyncingRef.current = true;
    }
    setMaterials((prev) =>
      prev.map((m, i) =>
        i === areaIndex
          ? {
              ...m,
              position: positionValue,
            }
          : m,
      ),
    );
  }, [
    positionValue,
    setFieldValue,
    t,
    getFieldBySubtype,
    partNumberFieldName,
    setMaterials,
    areaIndex,
    statusField,
    values,
    isResyncingRef,
  ]);

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
    markRowDirty,
    areaIndex,
    statusField,
    isResyncingRef,
    isValidating,
  ]);

  const isWarrantyIneligible = Boolean(
    warrantyPanelInfo?.isIneligible || !warrantyPanelInfo?.hasPurchaseDate,
  );
  const actionType = (values["actionType"] as string) ?? "";
  const isSparepartExchangeRow = SPARE_PARTS_EXCHANGE_ACTION_TYPES.has(actionType);
  const fieldsWithTypeOptionsDisabled = useMemo(
    () =>
      fields.map((field) => {
        if (field.subtype !== "diagnosticType" || !field.options?.length) return field;
        if (!isSparePartTypeRestricted && !isWarrantyIneligible) return field;

        return {
          ...field,
          options: field.options.map((option) => {
            const optionValue = String(option.value ?? "").toUpperCase();
            if (
              !TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART.has(optionValue) ||
              isSparepartExchangeRow
            )
              return option;
            return { ...option, disabled: true };
          }),
        };
      }),
    [fields, isSparePartTypeRestricted, isWarrantyIneligible, isSparepartExchangeRow],
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
        if (
          target?.name === typeField?.name ||
          target?.name === partNumberFieldName ||
          target?.name === positionField?.name
        )
          return;

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
