import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { useHasPermission } from "hooks/useHasPermission";
import Field from "components/generics/Field/GenericField.types";
import { getPositionAutofill } from "hooks/useDiagnosticsManager";
import {
  resolveDiscountFieldNames,
  useSparePartsRowCommon,
} from "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.shared";
import {
  SparePartsMainFields,
  SparePartsCollapsedSection,
} from "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.components";
import { PERMISSIONS } from "utils/Permissions";
import { useClaimContext } from "../ClaimContext";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.scss";

const TYPE_OPTIONS_DISABLED_FOR_INVALID_SPARE_PART = new Set(["WARRANTY", "SERVICE_OFFERING"]);

function ClaimSparePartsRow({
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
  const { allFields: allFormFields, sparePartNotBelongsToTool } = useContext(GenericFormContext);
  const {
    arePricesValidated,
    markRowDirty,
    allowedPositions,
    positionDropdownOptions,
    isResyncingRef,
    discountBase,
    canDeleteRows,
    automaticRows,
    materials,
    isClaimPending,
  } = useClaimContext();

  const [isRowCollapsed, setIsRowCollapsed] = useState(arePricesValidated);

  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();

  const collapsableFieldNames = new Set(
    fields
      .filter((field) => field.type === "price")
      .map((field) => field.fieldMapping?.originalName),
  );

  const areaNamePrefix = fields[0]?.fieldMapping?.nameStartsWith ?? "";
  const areaIndex = (() => {
    const match = /#(\d+)_/.exec(areaNamePrefix);
    return match ? Number.parseInt(match[1], 10) : 0;
  })();

  const positionField = fields.find((f) => f.subtype === "diagnosticPosition");
  const positionValue = positionField ? ((values[positionField.name] as string) ?? "") : "";
  const isAutomaticRow = (automaticRows ?? []).includes(positionValue);
  const isNewRow = materials[areaIndex]?.isNew === true;

  const partNumberField = fields.find((f) => f.subtype === "diagnosticPartNumber");
  const partNumberValue = partNumberField ? ((values[partNumberField.name] as string) ?? "") : "";
  const isSparePartTypeRestricted =
    positionValue.toUpperCase() === "SP" &&
    (partNumberValue.trim().length === 0 ||
      sparePartNotBelongsToTool?.current[partNumberField?.name ?? ""] === true);

  const descriptionField = fields.find((f) => f.subtype === "diagnosticDescription");
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
    if (partNumberField) void setFieldValue(partNumberField.name, autofill.partNumber);
    if (descriptionField) void setFieldValue(descriptionField.name, autofill.description);
  }, [positionValue, setFieldValue, t, partNumberField, descriptionField]);

  const applyFieldPermissions = (field: Field): Field => {
    if (isDisabled || isClaimPending) return { ...field, isDisabled: true };

    // The spare-part "type" dropdown stays editable for every row while the
    // claim is in edit mode, regardless of whether the row is newly added.
    if (field.subtype === "diagnosticType") return { ...field, isDisabled: false };

    if (isNewRow) {
      if (field.type === "price") return { ...field, isDisabled: true };
      return { ...field, isDisabled: false };
    }

    return { ...field, isDisabled: true };
  };

  const {
    discountHiddenFieldName,
    discountAmountHiddenFieldName,
    activeDiscountFieldName,
    discountSiblingFieldName,
  } = resolveDiscountFieldNames(fields, discountBase);

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

  const isFirstRowRender = useRef(true);
  useEffect(() => {
    if (isFirstRowRender.current) {
      isFirstRowRender.current = false;
      return;
    }
    if (isResyncingRef.current || !arePricesValidated) return;
    markRowDirty(areaIndex);
  }, [nonPriceInputKey, markRowDirty, areaIndex, isResyncingRef, arePricesValidated]);

  const mainFields = fields.filter(
    (field) => !collapsableFieldNames.has(field.fieldMapping?.originalName || ""),
  );

  const collapsableFields = fields.filter((field) =>
    collapsableFieldNames.has(field.fieldMapping?.originalName || ""),
  );

  const hasPricesPopulated = collapsableFields.some((field) => {
    const val = Number(values[field.name]);
    return Number.isFinite(val) && val !== null;
  });
  const hasExpandablePrices = hasPricesPopulated;

  const areaPrefix = hasExpandablePrices ? collapsableFields[0]?.fieldMapping?.nameStartsWith : "";

  useEffect(() => {
    if (!hasPriceViewPermission) return;
    setIsRowCollapsed(arePricesValidated);
  }, [arePricesValidated, hasPriceViewPermission]);

  const positionFieldsWithDisabledOptions = useMemo(() => {
    const allowedMap = new Map(allowedPositions.map((p) => [p.position, p]));
    return fields.map((field) => {
      if (field.subtype !== "diagnosticPosition") return field;

      // Use options from country config if UIConfig doesn't define them
      const baseOptions =
        (field.options ?? []).length > 0 ? (field.options ?? []) : positionDropdownOptions;
      if (!baseOptions.length) return field;

      const thisFieldName = field.name;
      const positionCounts: Record<string, number> = {};
      allFormFields
        .filter(
          (f) =>
            f.subtype === "diagnosticPosition" &&
            f.name !== thisFieldName &&
            f.name.startsWith("claims_"),
        )
        .forEach((f) => {
          const val = values[f.name] as string;
          if (val) positionCounts[val] = (positionCounts[val] ?? 0) + 1;
        });

      const updatedOptions = baseOptions.map((opt) => {
        const config = allowedMap.get(opt.value as string);
        if (!config) return opt;
        const usedElsewhere = positionCounts[opt.value as string] ?? 0;
        return { ...opt, disabled: usedElsewhere >= config.maxCount };
      });

      // Prepend a disabled "Select" placeholder so the user must pick a real position
      const withSelect = [{ value: "", name: "SelectAnOption", disabled: true }, ...updatedOptions];

      return { ...field, options: withSelect };
    });
  }, [fields, allFormFields, values, allowedPositions, positionDropdownOptions]);

  const fieldsWithTypeOptionsDisabled = useMemo(
    () =>
      positionFieldsWithDisabledOptions.map((field) => {
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
    [positionFieldsWithDisabledOptions, isSparePartTypeRestricted],
  );

  return (
    <div className="spare-parts-row-wrapper">
      <div className={`spare-parts-row ${hasPriceViewPermission ? "admin" : ""}`}>
        {hasPriceViewPermission && (
          <Icon
            iconName={`${isRowCollapsed ? "up" : "down"}`}
            className="arrow"
            data-testid={`${areaPrefix}arrow${isRowCollapsed ? "Up" : "Down"}`}
            aria-hidden="true"
            onClick={() => {
              if (!hasExpandablePrices) return;
              setIsRowCollapsed(!isRowCollapsed);
            }}
          />
        )}
        <SparePartsMainFields
          mainFields={mainFields}
          positionFieldsWithDisabledOptions={fieldsWithTypeOptionsDisabled}
          applyFieldPermissions={applyFieldPermissions}
        />
        {canDeleteRows && !isAutomaticRow && (
          <Icon
            className="spare-part-action"
            iconName="delete"
            title={t("delete")}
            onClick={() => onDeleteRow?.()}
          />
        )}
      </div>
      <SparePartsCollapsedSection
        isRowCollapsed={isRowCollapsed}
        hasPriceViewPermission={hasPriceViewPermission}
        collapsableFields={collapsableFields}
        applyFieldPermissions={applyFieldPermissions}
      />
    </div>
  );
}

export default ClaimSparePartsRow;
