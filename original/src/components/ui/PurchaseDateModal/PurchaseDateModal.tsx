import { Button, Dialog } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useContext, useRef, useState } from "react";
import { Formik } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import DatePicker from "components/ui/DatePicker/DatePicker";
import { usePostPurchaseDate } from "api/services/jobs/hooks";
import { useClickOutside } from "hooks/useClickOutside";
import { MessagesContext } from "contexts/messagescontext";
import { getApiErrorMessage } from "utils/getApiErrorMessage";
import { format } from "date-fns";
import "./PurchaseDateModal.scss";

interface PurchaseDateModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PurchaseDateFormValues {
  purchaseDate: string | null;
}

const calendarConfig = {
  maxDate: "",
  minDate: "",
  defaultDate: "",
  startYear: 2000,
  endYear: new Date().getFullYear(),
  startMonth: 1,
  endMonth: 12,
  useDateInput: true,
  useDatePicker: true,
  dateFormat: "dd.MM.yyyy",
  allowDateRange: false,
  setDefaultToday: false,
  startOfTheDay: false,
  endOfTheDay: false,
};

function PurchaseDateModal({ jobId, isOpen, onClose }: Readonly<PurchaseDateModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const modalRef = useRef<HTMLDialogElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { setMessages } = useContext(MessagesContext);

  const purchaseDateMutation = usePostPurchaseDate({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      setErrorMessage(null);
      setMessages((prev) => [
        ...prev,
        { text: t("purchaseDateAppliedSuccess"), type: "success", duration: 5000 },
      ]);
      onClose();
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error, t, "errorUpdatePurchaseDate"));
    },
  });

  useClickOutside(modalRef, onClose, isOpen);

  const handleSubmit = (values: PurchaseDateFormValues) => {
    if (!values.purchaseDate) return;
    const formatted = format(new Date(values.purchaseDate), "yyyy-MM-dd");
    purchaseDateMutation.mutate({ jobId, purchaseDate: formatted });
  };

  const handleCancel = () => {
    setErrorMessage(null);
    onClose();
  };

  return (
    <Formik<PurchaseDateFormValues> initialValues={{ purchaseDate: null }} onSubmit={handleSubmit}>
      {({ values, submitForm }) => (
        <Dialog
          ref={modalRef}
          modal
          open={isOpen}
          className="purchase-date-modal"
          data-testid="purchase-date-modal"
          onClose={(event) => {
            if (event) {
              event.stopPropagation();
              event.preventDefault();
            }
            onClose();
          }}
        >
          <div className="modal-header">
            <div className="modal-title">{t("verifyPurchaseDateModalTitle")}</div>
            <div className="modal-subtitle">{t("verifyPurchaseDateModalSubtitle")}</div>
          </div>

          <div className="modal-datepicker">
            <DatePicker name="purchaseDate" label={t("purchaseDate")} calendar={calendarConfig} />
            {errorMessage && (
              <div className="text-input-error-message" role="alert">
                {errorMessage}
              </div>
            )}
          </div>
          <div className="modal-actions action-buttons">
            <Button
              mode="secondary"
              onClick={handleCancel}
              data-testid="purchase-date-cancel-button"
              disabled={purchaseDateMutation.isPending}
              type="button"
            >
              {t("cancel")}
            </Button>
            <Button
              mode="primary"
              type="button"
              onClick={() => {
                void submitForm();
              }}
              data-testid="purchase-date-submit-button"
              disabled={!values.purchaseDate || purchaseDateMutation.isPending}
            >
              {t("checkEligibility")}
            </Button>
          </div>
        </Dialog>
      )}
    </Formik>
  );
}

export default PurchaseDateModal;
