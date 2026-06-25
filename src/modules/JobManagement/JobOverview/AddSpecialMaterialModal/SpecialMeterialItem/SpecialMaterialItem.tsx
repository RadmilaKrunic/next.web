import { Checkbox } from "@bosch/react-frok";
import "./SpecialMaterialItem.scss";
import { useTranslation } from "react-i18next";
import { useHasPermission } from "hooks/useHasPermission";
import { PERMISSIONS } from "utils/Permissions";

export interface SpecialMaterial {
  id: string;
  positionType: string;
  partName: string;
  partNumber: string;
  unitPrice: number;
  hsnCode: string;
  chargeableOnly: boolean;
}

interface SpecialMaterialItemProps {
  material: SpecialMaterial;
  isSelected: boolean;
  onToggle: (material: SpecialMaterial, checked: boolean) => void;
}

export default function SpecialMaterialItem({
  material,
  isSelected,
  onToggle,
}: Readonly<SpecialMaterialItemProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const hasPriceViewPermission = useHasPermission([PERMISSIONS.DIAGNOSTICS.CAN_VIEW_PRICES]);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onToggle(material, event.target.checked);
  };

  return (
    <div className="special-material-item">
      <Checkbox
        id={`material-${material.partNumber}`}
        checked={isSelected}
        onChange={handleCheckboxChange}
      />
      <div className="item-data">
        <p className="data-title">{t("position")}</p>
        <p className="data-text">{material.positionType}</p>
      </div>
      <div className="item-data">
        <p className="data-title">{t("partNumber")}</p>
        <p className="data-text">{material.partNumber}</p>
      </div>
      <div className="item-data">
        <p className="data-title">{t("description")}</p>
        <p className="data-text">{material.partName}</p>
      </div>
      {hasPriceViewPermission && (
        <div className="item-data">
          <p className="data-title">{t("unitPrice")}</p>
          <p className="data-text">{material.unitPrice}</p>
        </div>
      )}
    </div>
  );
}
