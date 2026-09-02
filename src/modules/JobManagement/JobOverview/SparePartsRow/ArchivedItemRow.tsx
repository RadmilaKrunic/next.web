import { Icon, Divider } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import GenericField from "components/generics/Field/GenericField";
import { useContext, useState } from "react";
import { useFormikContext } from "formik";
import { useHasPermission } from "hooks/useHasPermission";
import "./SparePartsRow.scss";
import Field from "components/generics/Field/GenericField.types";
import { PERMISSIONS } from "utils/Permissions";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import { useClaimContext } from "../../../ClaimManagement/ClaimOverview/ClaimContext";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import type { ArchivedItemRowSurfaceConfig } from "./ArchivedItemRowSurfaceConfig";

function ArchivedItemRow({
  fields,
  onRestoreRow,
  config,
}: Readonly<{
  fields: Field[];
  onRestoreRow?: () => void;
  config: ArchivedItemRowSurfaceConfig;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  // Both hooks are called unconditionally (rules of hooks) and one is selected by
  // config.surface — safe even when this component isn't wrapped in the other surface's
  // real provider, since DiagnosticsContext/ClaimContext each fall back to their own inert
  // default value rather than throwing (see ItemRow.tsx for the same pattern).
  const { jobStatus } = useDiagnosticsContext();
  const { canDeleteRows } = useClaimContext();
  const { isRepairAnswerLocked } = useContext(GenericFormContext);
  const [isRowCollapsed, setIsRowCollapsed] = useState(false);
  const { values } = useFormikContext<Record<string, unknown>>();
  const showRevertButton = config.resolveShowRevertButton({
    jobStatus,
    isRepairAnswerLocked,
    canDeleteRows: Boolean(canDeleteRows),
  });

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
          .map((field) => (
            <GenericField
              field={field}
              key={field.name}
              className={`spare-parts-field ${field?.size === "2" ? "small" : ""}`}
            />
          ))}
        {showRevertButton ? (
          <Icon
            className="spare-part-action"
            iconName="reset"
            title={t("revert")}
            onClick={() => onRestoreRow?.()}
          />
        ) : (
          config.renderPlaceholderWhenHidden && (
            <div className="spare-part-action" aria-hidden="true" />
          )
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

export default ArchivedItemRow;
