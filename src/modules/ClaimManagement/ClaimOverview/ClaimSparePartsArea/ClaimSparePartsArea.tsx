import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import Area from "components/generics/Area/GenericArea.types";
import "modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea.scss";
import ClaimSparePartsRow from "../ClaimSparePartsRow/ClaimSparePartsRow";
import { useClaimContext } from "../ClaimContext";

function ClaimSparePartsArea({ area }: Readonly<{ area: Area }>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { onDeleteRow } = useClaimContext();
  const title = area.label.trim();
  const nameOfFirstField = area.fields[0]?.name || "";

  const handleDeleteRow = useCallback(() => {
    onDeleteRow(area.name);
  }, [onDeleteRow, area.name]);

  return (
    <>
      {nameOfFirstField.includes("#0") && (
        <div className="spare-parts-title">
          {title && <div className="area-title">{t(title)}</div>}
        </div>
      )}
      <ClaimSparePartsRow
        key={nameOfFirstField}
        fields={area.fields}
        onDeleteRow={handleDeleteRow}
        isDisabled={area.isDisabled}
      />
    </>
  );
}

export default ClaimSparePartsArea;
