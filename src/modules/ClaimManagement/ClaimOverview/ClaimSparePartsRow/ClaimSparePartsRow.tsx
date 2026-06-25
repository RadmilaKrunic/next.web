import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { useHasPermission } from "hooks/useHasPermission";
import Field from "components/generics/Field/GenericField.types";
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
  const { allFields: allFormFields } = useContext(GenericFormContext);
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
  } = useClaimContext();

  const [isRowCollapsed, setIsRowCollapsed] = useState(arePricesValidated);

  const { values } = useFormikContext<Record<string, unknown>>();

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

  const applyFieldPermissions = (field: Field): Field => {
    if (isDisabled) return { ...field, isDisabled: true };

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
          positionFieldsWithDisabledOptions={positionFieldsWithDisabledOptions}
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
