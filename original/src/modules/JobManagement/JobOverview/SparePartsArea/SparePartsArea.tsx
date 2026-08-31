import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import Area from "../../../../components/generics/Area/GenericArea.types";
import "./SparePartsArea.scss";
import SparePartsRow from "../SparePartsRow/SparePartsRow";
import { useDiagnosticsContext } from "../DiagnosticsContext";

function SparePartsArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const {
    apiMaterialsLoaded,
    apiMaterialsEmpty,
    hasExistingDiagnostic,
    onDeleteRow,
    setIsArchivedExpanded,
  } = useDiagnosticsContext();
  const title = area.label.trim();
  const nameOfFirstField = area.fields[0]?.name || "";
  const showAreaTitle = nameOfFirstField.includes("#0");
  const shouldHideDiagnosticsSpareParts =
    area.name.includes("diagnosticsSpareParts") &&
    hasExistingDiagnostic &&
    apiMaterialsLoaded &&
    apiMaterialsEmpty;

  const handleDeleteRow = useCallback(() => {
    onDeleteRow(area.name);
    setIsArchivedExpanded(true);
  }, [onDeleteRow, setIsArchivedExpanded, area.name]);

  return (
    <>
      {showAreaTitle && (
        <div className="spare-parts-title">
          {title && <div className="area-title">{t(title)}</div>}
        </div>
      )}
      {shouldHideDiagnosticsSpareParts ? (
        showAreaTitle && (
          <div className="spare-parts-empty-message">{t("diagnosticsNoItemsToShow")}</div>
        )
      ) : (
        <SparePartsRow
          key={nameOfFirstField}
          fields={area.fields}
          onDeleteRow={handleDeleteRow}
          isDisabled={area.isDisabled}
        />
      )}
    </>
  );
}

export default SparePartsArea;
