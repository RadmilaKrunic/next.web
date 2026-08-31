import { Button, Dialog } from "@bosch/react-frok";
import "./AddSpecialMaterialModal.scss";
import SpecialMaterialItem, { SpecialMaterial } from "./SpecialMeterialItem/SpecialMaterialItem";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useClickOutside } from "hooks/useClickOutside";
import { useSpecialMaterials } from "api/services/jobs/hooks";
import { useQueryClient } from "@tanstack/react-query";

interface AddSpecialMaterialModalProps {
  jobId: string | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddMaterials?: (materials: SpecialMaterial[]) => void;
  existingPartNumbers?: Set<string>;
}
export default function AddSpecialMaterialModal({
  isOpen,
  setIsOpen,
  onAddMaterials,
  existingPartNumbers,
}: Readonly<AddSpecialMaterialModalProps>) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [selectedMaterials, setSelectedMaterials] = useState<SpecialMaterial[]>([]);
  const queryClient = useQueryClient();

  const userData = queryClient.getQueryData<{ countryCode?: string }>(["user"]);

  const { data: materials = [] } = useSpecialMaterials(userData?.countryCode);

  // Pre-select materials that already exist in the spare parts list
  useEffect(() => {
    if (isOpen && materials.length > 0 && existingPartNumbers && existingPartNumbers.size > 0) {
      const preSelected = materials.filter((m) => existingPartNumbers.has(m.partNumber));
      setSelectedMaterials(preSelected);
    }
  }, [isOpen, materials, existingPartNumbers]);

  const handleMaterialToggle = (material: SpecialMaterial, checked: boolean) => {
    setSelectedMaterials((prev) =>
      checked ? [...prev, material] : prev.filter((m) => m.id !== material.id),
    );
  };

  const close = (reset = false) => {
    if (reset) setSelectedMaterials([]);
    setIsOpen(false);
  };

  const handleClose = () => close(true);

  const handleAdd = () => {
    if (onAddMaterials) {
      onAddMaterials(selectedMaterials);
    }
    close();
  };

  useClickOutside(modalRef as React.RefObject<HTMLElement>, close, isOpen);

  return (
    <Dialog
      ref={modalRef}
      open={isOpen}
      title={t("pleaseSelectASpecialMaterial")}
      modal={true}
      onClose={handleClose}
      className="add-special-material-modal"
    >
      <div className="modal-content-wrapper">
        <div className="items">
          {materials.map((material, index) => (
            <SpecialMaterialItem
              key={`${material.partNumber}-${index}`}
              material={material}
              isSelected={selectedMaterials.includes(material)}
              onToggle={handleMaterialToggle}
            />
          ))}
        </div>
        <div className="button-section">
          <Button
            mode="secondary"
            onClick={handleClose}
            data-testid="cancel-add-special-material-button"
          >
            {t("cancel")}
          </Button>

          <Button onClick={handleAdd} data-testid="add-special-material-button">
            {t("add")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
