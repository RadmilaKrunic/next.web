import Area from "../../../../components/generics/Area/GenericArea.types";
import "./SparePartsArea.scss";
import GenericField from "../../../../components/generics/Field/GenericField";
import { useFormikContext } from "formik";
import { useContext, useEffect, useMemo } from "react";

import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import { useHasPermission } from "hooks/useHasPermission";
import { getChargeablePendingInfo } from "hooks/useDiagnosticsManager";
import { PERMISSIONS } from "utils/Permissions";
import Field from "components/generics/Field/GenericField.types";
import { useTranslation } from "react-i18next";

const toCamelCase = (s: string) =>
  s.toLowerCase().replaceAll(/_([a-z])/g, (_, c: string) => c.toUpperCase());

function SummaryArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { allFields } = useContext(GenericFormContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { hasPricesPopulated, setSummaryTypeOptions, discountBase, isValidating, jobStatus } =
    useDiagnosticsContext();
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const canEditdiscount = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT]);
  const canEditTotalAmount = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_AMOUNT]);
  const isWaitingForApproval = jobStatus === "WAITING_FOR_APPROVAL";
  const types = new Set(["chargeable"]);

  const rowAreaNameContains = useMemo(() => {
    if (area.name.includes("claimDiagnosticsSummary")) return "claimSpareParts";
    return "diagnosticsSpareParts";
  }, [area.name]);

  const scopedFields = useMemo(() => {
    if (!allFields) return [];
    return allFields.filter((f) => {
      const ns = f.fieldMapping?.nameStartsWith ?? "";
      // Non-row fields (summary fields, discountBase, etc.) have no nameStartsWith — keep them.
      if (!ns) return true;
      return ns.includes(rowAreaNameContains);
    });
  }, [allFields, rowAreaNameContains]);

  const { hasChargeablePending } = useMemo(
    () => getChargeablePendingInfo(scopedFields, values),
    [scopedFields, values],
  );

  const applyFieldPermissions = (field: Field, activeSummaryType: string): Field => {
    const subtype = field.subtype || "";
    if (!subtype) return field;
    const isEditableSummaryType = types.has(activeSummaryType);
    const isNet = discountBase === "NET_PRICE";
    if (subtype === "diagnosticSummaryDiscountNetMaterial") {
      return { ...field, isDisabled: !canEditdiscount || !isEditableSummaryType || isValidating };
    }

    if (subtype === "diagnosticSummaryNetAmountMaterial") {
      return { ...field, isDisabled: !isNet || !isEditableSummaryType || isValidating };
    }

    if (subtype === "diagnosticSummaryDiscountMaterial") {
      return {
        ...field,
        isDisabled:
          !isWaitingForApproval ||
          !hasChargeablePending ||
          !canEditdiscount ||
          !isEditableSummaryType ||
          isValidating,
      };
    }

    if (subtype === "diagnosticSummaryTotalAmountMaterial") {
      return {
        ...field,
        isDisabled:
          !isWaitingForApproval ||
          !hasChargeablePending ||
          isNet ||
          !canEditTotalAmount ||
          !isEditableSummaryType ||
          isValidating,
      };
    }
    return field;
  };

  const summaryTypeField = useMemo(
    () => area.fields.find((f) => f.type === "radiogroup"),
    [area.fields],
  );

  const currentSummaryType = summaryTypeField
    ? (values[summaryTypeField.name] as string) || "chargeable"
    : "chargeable";

  const summaryTypeOptions = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>();
    const templateTypeField = scopedFields.find((f) => f.subtype === "diagnosticType");
    const typeFieldOptions = templateTypeField?.options ?? [];
    scopedFields
      .filter((f) => f.subtype === "diagnosticType")
      .forEach((field) => {
        const value = values[field.name] as string;
        if (!value) return;
        const option = typeFieldOptions.find((o) => o.value === value);
        if (!option) return;
        const summaryValue = toCamelCase(String(option.value));
        if (!seen.has(summaryValue))
          seen.set(summaryValue, { value: summaryValue, label: option.name });
      });
    return [{ value: "totalSummary", label: "totalSummary" }, ...seen.values()];
  }, [scopedFields, values]);

  useEffect(() => {
    if (!summaryTypeField) return;
    const current = values[summaryTypeField.name] as string;
    if (!summaryTypeOptions.some((o) => o.value === current)) {
      void setFieldValue(summaryTypeField.name, "totalSummary");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryTypeOptions]);

  useEffect(() => {
    setSummaryTypeOptions(summaryTypeOptions);
  }, [summaryTypeOptions, setSummaryTypeOptions]);

  if (hasPriceViewPermission && !hasPricesPopulated) return null;

  const isMaterialField = (field: Field) => field.subtype?.endsWith("Material") ?? false;
  const summaryRadioField = (field: Field): Field => ({
    ...field,
    isDisabled: false,
    disabledForStatuses: undefined,
  });

  return (
    <>
      <div className="summary-row summary-radio-row">
        {area.fields
          .filter((field) => field.type === "radiogroup")
          .map((field) => (
            <GenericField field={summaryRadioField(field)} key={field.name} />
          ))}
      </div>
      <div className="summary-row summary-fields-row">
        {area.fields
          .filter((field) => field.type !== "radiogroup" && !isMaterialField(field))
          .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((field) => {
            return (
              <GenericField
                field={applyFieldPermissions(field, currentSummaryType)}
                key={field.name}
                className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
              />
            );
          })}
      </div>
      {types.has(currentSummaryType) && (
        <div className="summary-fields-row summary-material-row">
          <div className="summary-material-label">{t("SummaryOfMaterialItems")}</div>
          <div className="summary-material-fields">
            {area.fields
              .filter((field) => isMaterialField(field))
              .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((field) => (
                <GenericField
                  field={applyFieldPermissions(field, currentSummaryType)}
                  key={field.name}
                  className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
                />
              ))}
          </div>
        </div>
      )}
    </>
  );
}

export default SummaryArea;
