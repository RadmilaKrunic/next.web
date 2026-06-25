import { useTranslation } from "react-i18next";
import { useCallback, useContext } from "react";
import { Icon } from "@bosch/react-frok";
import Area from "../../../../components/generics/Area/GenericArea.types";
import "../SparePartsArea/SparePartsArea.scss";
import "./ArchivedSparePartsArea.scss";
import { useDiagnosticsContext } from "../DiagnosticsContext";
import ArchivedSparePartsRow from "../ArchivedSparePartsRow/ArchivedSparePartsRow";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";

function ArchivedSparePartsArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { onDeleteRow, isArchivedExpanded, setIsArchivedExpanded, onRestoreRow } =
    useDiagnosticsContext();
  const { allFields } = useContext(GenericFormContext);
  const title = area.label.trim();
  const nameOfFirstField = area.fields[0]?.name || "";
  const isFirstArea = nameOfFirstField.includes("#0");

  // Enrich area.fields with options from allFields context.
  // area.fields in tabs state are separate objects from allFields; options are stamped
  // only on the allFields copies, so we must merge them here for the dropdown to render.
  const enrichedFields = area.fields.map((f) => {
    if (f.subtype !== "archivedPosition") return f;
    const contextField = allFields?.find((cf) => cf.name === f.name);
    if (!contextField?.options?.length) return f;
    return { ...f, options: contextField.options };
  });

  const handleDeleteRow = useCallback(() => {
    onDeleteRow(area.name);
  }, [onDeleteRow, area.name]);

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
        <ArchivedSparePartsRow
          key={nameOfFirstField}
          fields={enrichedFields}
          onDeleteRow={handleDeleteRow}
          onRestoreRow={handleRestoreRow}
          isDisabled={true}
        />
      )}
    </>
  );
}

export default ArchivedSparePartsArea;
