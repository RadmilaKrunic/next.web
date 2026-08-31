import { Button, Dialog } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import "./DeliveryAddressConfirmModal.scss";

interface DeliveryAddressConfirmModalProps {
  isOpen: boolean;
  missingFieldLabels: string[];
  isAddressCompletelyEmpty: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeliveryAddressConfirmModal({
  isOpen,
  missingFieldLabels,
  isAddressCompletelyEmpty,
  onConfirm,
  onCancel,
}: Readonly<DeliveryAddressConfirmModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const cancelButtonLabelKey = isAddressCompletelyEmpty
    ? "addDeliveryAddress"
    : "completeDeliveryAddress";

  return (
    <Dialog
      modal
      open={isOpen}
      title={t("deliveryAddressConfirmModalTitle")}
      className="delivery-address-confirm-modal"
      data-testid="delivery-address-confirm-modal"
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        onCancel();
      }}
    >
      <div className="delivery-address-confirm-modal__body">
        <p
          id="delivery-address-confirm-modal-description"
          className="delivery-address-confirm-modal__description"
        >
          {t("deliveryAddressConfirmModalText")}
        </p>

        {missingFieldLabels.length > 0 && (
          <>
            <p className="delivery-address-confirm-modal__missing-label">
              {t("deliveryAddressConfirmModalMissingFieldsLabel")}
            </p>
            <ul
              className="delivery-address-confirm-modal__missing-list"
              data-testid="delivery-address-confirm-missing-list"
            >
              {missingFieldLabels.map((labelKey) => (
                <li key={labelKey}>{t(labelKey)}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="delivery-address-confirm-modal__actions modal-actions">
        <Button
          mode="secondary"
          onClick={onCancel}
          data-testid="delivery-address-confirm-cancel-button"
        >
          {t(cancelButtonLabelKey)}
        </Button>
        <Button
          mode="primary"
          onClick={onConfirm}
          data-testid="delivery-address-confirm-yes-button"
        >
          {t("yes")}
        </Button>
      </div>
    </Dialog>
  );
}

export default DeliveryAddressConfirmModal;
