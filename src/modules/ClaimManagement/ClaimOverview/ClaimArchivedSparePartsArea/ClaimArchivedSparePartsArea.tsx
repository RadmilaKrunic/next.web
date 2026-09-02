import { useCallback, useContext } from "react";
import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import Area from "components/generics/Area/GenericArea.types";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { useClaimContext } from "../ClaimContext";
import { enrichArchivedFieldOptions } from "hooks/itemsManager/materialsDerivation";
import ArchivedItemRow from "modules/JobManagement/JobOverview/SparePartsRow/ArchivedItemRow";
import { claimArchivedItemRowSurfaceConfig } from "../ClaimSparePartsRow/claimArchivedItemRowSurfaceConfig";
import "modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.scss";
import "modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea.scss";

function ClaimArchivedSparePartsArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { isArchivedExpanded, setIsArchivedExpanded, onDeleteArchivedRow, onRestoreRow } =
    useClaimContext();
  const { allFields } = useContext(GenericFormContext);
  const title = area.label.trim();
  const nameOfFirstField = area.fields[0]?.name || "";
  const isFirstArea = nameOfFirstField.includes("#0");

  const enrichedFields = enrichArchivedFieldOptions(area.fields, allFields);

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
        <ArchivedItemRow
          key={nameOfFirstField}
          fields={enrichedFields}
          onRestoreRow={handleRestoreRow}
          config={claimArchivedItemRowSurfaceConfig}
        />
      )}
    </>
  );
}

export default ClaimArchivedSparePartsArea;
