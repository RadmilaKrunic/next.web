import { useCallback, useContext, useState } from "react";
import { Icon, Divider } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import Area from "components/generics/Area/GenericArea.types";
import Field from "components/generics/Field/GenericField.types";
import GenericField from "components/generics/Field/GenericField";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useClaimContext } from "../ClaimContext";
import "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.scss";
import "modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea.scss";

interface ClaimArchivedSparePartsRowProps {
  fields: Field[];
  onRestoreRow?: () => void;
}

function ClaimArchivedSparePartsRow({
  fields,
  onRestoreRow,
}: Readonly<ClaimArchivedSparePartsRowProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);
  const { canDeleteRows } = useClaimContext();
  const [isRowCollapsed, setIsRowCollapsed] = useState(false);
  const { values } = useFormikContext<Record<string, unknown>>();
  const showRevertButton = canDeleteRows;

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
            iconName={isRowCollapsed ? "up" : "down"}
            className="arrow"
            aria-hidden="true"
            onClick={() => {
              if (hasPricesPopulated) setIsRowCollapsed((prev) => !prev);
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
          <div className="spare-part-action" aria-hidden="true" />
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

function ClaimArchivedSparePartsArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { isArchivedExpanded, setIsArchivedExpanded, onDeleteArchivedRow, onRestoreRow } =
    useClaimContext();
  const { allFields } = useContext(GenericFormContext);
  const title = area.label.trim();
  const nameOfFirstField = area.fields[0]?.name || "";
  const isFirstArea = nameOfFirstField.includes("#0");

  // Enrich area.fields with options from GenericFormContext (needed for position dropdown).
  const enrichedFields = area.fields.map((f) => {
    if (f.subtype !== "archivedPosition") return f;
    const contextField = allFields?.find((cf) => cf.name === f.name);
    if (!contextField?.options?.length) return f;
    return { ...f, options: contextField.options };
  });

  const handleDeleteRow = useCallback(() => {
    onDeleteArchivedRow(area.name);
  }, [onDeleteArchivedRow, area.name]);

  const handleRestoreRow = useCallback(() => {
    onRestoreRow(area.name);
  }, [onRestoreRow, area.name]);

  return (
    <>
      {isFirstArea && (
        <div className="archived-parts-title">
          <button
            type="button"
            className="archived-parts-header"
            onClick={() => setIsArchivedExpanded((prev) => !prev)}
          >
            <div className="archived-parts-header-left">
              <Icon
                iconName="delete"
                title={t("delete")}
                className="archived-parts-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRow();
                }}
              />
              {title && <div className="area-title">{t(title)}</div>}
            </div>
            <Icon
              iconName={isArchivedExpanded ? "up" : "down"}
              className="archived-parts-arrow"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
      {isArchivedExpanded && (
        <ClaimArchivedSparePartsRow
          key={nameOfFirstField}
          fields={enrichedFields}
          onRestoreRow={handleRestoreRow}
        />
      )}
    </>
  );
}

export default ClaimArchivedSparePartsArea;
