import { useContext, useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { useTranslation } from "react-i18next";
import Area from "components/generics/Area/GenericArea.types";
import Field from "components/generics/Field/GenericField.types";
import GenericField from "components/generics/Field/GenericField";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import { useClaimContext } from "../ClaimContext";
import "modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.scss";

const CLAIM_ROW_AREA_NAME = "claimSpareParts";
const EDITABLE_SUMMARY_TYPES = new Set(["chargeable"]);

const toCamelCase = (s: string) =>
  s.toLowerCase().replaceAll(/_([a-z])/g, (_, c: string) => c.toUpperCase());

const isMaterialField = (field: Field) => field.subtype?.endsWith("Material") ?? false;

const bySortedPosition = (a: Field, b: Field) => (a.position ?? 0) - (b.position ?? 0);

/**
 * Claim price summary. Field values come from the claim `priceSummary` (mapped by the
 * UIConfiguration attributeMapping and refreshed after "validate"), so this area only
 * decides which fields are visible/editable. It does not depend on the job-only
 * DiagnosticsContext or on `priceSummaryDetailed`.
 */
function ClaimSummaryArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { allFields } = useContext(GenericFormContext);
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { hasPricesPopulated, setSummaryTypeOptions, discountBase } = useClaimContext();
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const canEditDiscount = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_DISCOUNT]);

  const scopedFields = useMemo(
    () =>
      (allFields ?? []).filter((f) => {
        const ns = f.fieldMapping?.nameStartsWith ?? "";
        return !ns || ns.includes(CLAIM_ROW_AREA_NAME);
      }),
    [allFields],
  );

  const summaryTypeField = useMemo(
    () => area.fields.find((f) => f.type === "radiogroup"),
    [area.fields],
  );
  const currentSummaryType = summaryTypeField
    ? (values[summaryTypeField.name] as string) || "chargeable"
    : "chargeable";

  const summaryTypeOptions = useMemo(() => {
    const seen = new Map<string, { label: string; value: string }>();
    const typeFieldOptions =
      scopedFields.find((f) => f.subtype === "diagnosticType")?.options ?? [];
    scopedFields
      .filter((f) => f.subtype === "diagnosticType")
      .forEach((field) => {
        const value = values[field.name] as string;
        const option = value ? typeFieldOptions.find((o) => o.value === value) : undefined;
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

  const applyFieldPermissions = (field: Field): Field => {
    const isEditable = EDITABLE_SUMMARY_TYPES.has(currentSummaryType);
    const isNet = discountBase === "NET_PRICE";
    switch (field.subtype) {
      case "diagnosticSummaryDiscountNetMaterial":
        return { ...field, isDisabled: !canEditDiscount || !isEditable };
      case "diagnosticSummaryNetAmountMaterial":
        return { ...field, isDisabled: !isNet || !isEditable };
      case "diagnosticSummaryDiscountMaterial":
      case "diagnosticSummaryTotalAmountMaterial":
        // Only editable while a job is waiting for approval; claims never are.
        return { ...field, isDisabled: true };
      default:
        return field;
    }
  };

  const renderField = (field: Field) => (
    <GenericField
      field={applyFieldPermissions(field)}
      key={field.name}
      className={`spare-parts-field ${field.size === "2" ? "small" : ""}`}
    />
  );

  return (
    <>
      <div className="summary-row summary-radio-row">
        {area.fields
          .filter((field) => field.type === "radiogroup")
          .map((field) => (
            <GenericField
              field={{ ...field, isDisabled: false, disabledForStatuses: undefined }}
              key={field.name}
            />
          ))}
      </div>
      <div className="summary-row summary-fields-row">
        {area.fields
          .filter((field) => field.type !== "radiogroup" && !isMaterialField(field))
          .toSorted(bySortedPosition)
          .map(renderField)}
      </div>
      {EDITABLE_SUMMARY_TYPES.has(currentSummaryType) && (
        <div className="summary-fields-row summary-material-row">
          <div className="summary-material-label">{t("SummaryOfMaterialItems")}</div>
          <div className="summary-material-fields">
            {area.fields.filter(isMaterialField).toSorted(bySortedPosition).map(renderField)}
          </div>
        </div>
      )}
    </>
  );
}

export default ClaimSummaryArea;
