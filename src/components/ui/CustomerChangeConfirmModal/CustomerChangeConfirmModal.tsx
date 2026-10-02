import { Button, Dialog } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import "./CustomerChangeConfirmModal.scss";
import {
  formatFieldValue,
  getComparisonSections,
  type CustomerChangeFieldComparison,
} from "./CustomerChangeConfirmModal.utils";

interface CustomerChangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onCreate: () => void;
  fieldComparisons: CustomerChangeFieldComparison[];
}

function CustomerChangeConfirmModal({
  isOpen,
  onClose,
  onEdit,
  onCreate,
  fieldComparisons,
}: Readonly<CustomerChangeConfirmModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const comparisonSections = getComparisonSections(fieldComparisons);

  return (
    <Dialog
      modal
      open={isOpen}
      title={t("customerChangeConfirmModalTitle")}
      className="customer-change-confirm-modal"
      data-testid="customer-change-confirm-modal"
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        onClose();
      }}
    >
      <div className="customer-change-confirm-modal__body">
        <p
          id="customer-change-confirm-modal-description"
          className="customer-change-confirm-modal__description"
        >
          {t("customerChangeConfirmModalText")}
        </p>
        <div
          className="customer-change-confirm-modal__sections"
          aria-label={t("customerChangeComparisonTableLabel")}
        >
          {comparisonSections.map((section) => (
            <section key={section.titleKey} className="customer-change-confirm-modal__section">
              <h3 className="customer-change-confirm-modal__section-title">
                {t(section.titleKey)}
              </h3>
              <table className="customer-change-confirm-modal__table" role="table">
                <thead className="customer-change-confirm-modal__table-header">
                  <tr role="row">
                    <th role="columnheader">{t("customerChangeField")}</th>
                    <th role="columnheader">{t("customerChangeOriginalValue")}</th>
                    <th role="columnheader">{t("customerChangeNewValue")}</th>
                    <th role="columnheader">{t("customerChangeStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.comparisons.map((comparison) => (
                    <tr
                      key={comparison.fieldName}
                      className="customer-change-confirm-modal__table-row"
                      role="row"
                    >
                      <td className="customer-change-confirm-modal__field-name">
                        {t(comparison.fieldLabel)}
                      </td>
                      <td>{formatFieldValue(comparison.originalValue, t)}</td>
                      <td>{formatFieldValue(comparison.currentValue, t)}</td>
                      <td className="customer-change-confirm-modal__status">
                        {t("customerChangeChanged")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
      <div className="customer-change-confirm-modal__actions modal-actions">
        <Button mode="secondary" onClick={onClose} data-testid="customer-change-confirm-cancel">
          {t("cancel")}
        </Button>
        <Button mode="primary" onClick={onEdit} data-testid="customer-change-confirm-edit">
          {t("editCustomer")}
        </Button>
        <Button mode="primary" onClick={onCreate} data-testid="customer-change-confirm-create">
          {t("createCustomer")}
        </Button>
      </div>
    </Dialog>
  );
}
export default CustomerChangeConfirmModal;
