import { Icon, Divider } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import GenericField from "components/generics/Field/GenericField";
import { useState } from "react";
import { useFormikContext } from "formik";
import { useHasPermission } from "hooks/useHasPermission";
import "../SparePartsRow/SparePartsRow.scss";
import Field from "components/generics/Field/GenericField.types";
import { PERMISSIONS } from "utils/Permissions";
import { useDiagnosticsContext } from "../DiagnosticsContext";

const STATUSES_DISABLING_ROW = new Set([
  "RETURN_UNASSEMBLY",
  "RETURN_ASSEMBLY",
  "REPAIR_DONE",
  "IN_REPAIR",
  "READY_FOR_REPAIR",
  "EXCHANGE",
  "SCRAP_TOOL",
  "DELIVERED",
]);

function ArchivedSparePartsRow({
  fields,
  onRestoreRow,
}: Readonly<{
  fields: Field[];
  onDeleteRow?: () => void;
  onRestoreRow?: () => void;
  isDisabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const { jobStatus } = useDiagnosticsContext();
  const [isRowCollapsed, setIsRowCollapsed] = useState(false);
  const { values } = useFormikContext<Record<string, unknown>>();
  const showRevertButton = !STATUSES_DISABLING_ROW.has(jobStatus ?? "");

  const collapsableFieldNames = new Set(
    fields
      .filter((field) => field.type === "price")
      .map((field) => field.fieldMapping?.originalName),
  );

  const mainFields = fields.filter(
    (field) => !collapsableFieldNames.has(field.fieldMapping?.originalName || ""),
  );

  const collapsableFields = fields.filter((field) =>
    collapsableFieldNames.has(field.fieldMapping?.originalName || ""),
  );

  const hasPricesPopulated = collapsableFields.some((field) => {
    const val = Number(values[field.name]);
    return Number.isFinite(val);
  });

  return (
    <div className="spare-parts-row-wrapper">
      <div className={`spare-parts-row ${hasPriceViewPermission ? "admin" : ""}`}>
        {hasPriceViewPermission && (
          <Icon
            iconName={`${isRowCollapsed ? "up" : "down"}`}
            className="arrow"
            aria-hidden="true"
            onClick={() => {
              if (!hasPricesPopulated) {
                return;
              }
              setIsRowCollapsed(!isRowCollapsed);
            }}
          />
        )}
        {mainFields
          .toSorted((a, b) => (a.position || 0) - (b.position || 0))
          .map((field) => {
            return (
              <GenericField
                field={field}
                key={field.name}
                className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
              />
            );
          })}
        {showRevertButton && (
          <Icon
            className="spare-part-action"
            iconName="reset"
            title={t("revert")}
            onClick={() => onRestoreRow?.()}
          />
        )}
      </div>
      {isRowCollapsed && hasPriceViewPermission && (
        <>
          <Divider />
          <div className="spare-parts-row-collapsed">
            {collapsableFields
              .toSorted((a, b) => (a.position || 0) - (b.position || 0))
              .map((field) => (
                <GenericField
                  field={field}
                  key={field.name}
                  className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ArchivedSparePartsRow;
