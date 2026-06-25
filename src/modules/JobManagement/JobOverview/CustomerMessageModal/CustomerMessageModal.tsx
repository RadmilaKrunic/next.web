import { Button, Dialog, TextArea } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postMessage } from "../../../../api/services/jobs/action";
import { useClickOutside } from "../../../../hooks/useClickOutside";
import "./CustomerMessageModal.scss";

interface CustomerMessageModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
}

function CustomerMessageModal({
  jobId,
  isOpen,
  onClose,
  title,
  placeholder,
}: Readonly<CustomerMessageModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDialogElement>(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const postMessageMutation = useMutation({
    mutationFn: postMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
      setCustomerMessage("");
      setIsSubmitting(false);
      onClose();
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  useClickOutside(modalRef as React.RefObject<HTMLElement>, onClose, isOpen);

  const handleReject = () => {
    if (!customerMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const messageData = {
      jobId,
      messageId: null,
      messageType: "GENERAL",
      decision: null,
      message: customerMessage.trim(),
    };

    postMessageMutation.mutate(messageData);
  };

  const handleCancel = () => {
    setCustomerMessage("");
    onClose();
  };

  return (
    <Dialog
      ref={modalRef}
      modal
      open={isOpen}
      title={title}
      className="customer-message-modal"
      data-testid="customer-message-modal"
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        onClose();
      }}
    >
      <div className="modal-subtitle">{t("pleaseAddAdditionalNote")}</div>
      <TextArea
        id="customer-message-textarea"
        label={t("notes")}
        value={customerMessage}
        onChange={(e) => setCustomerMessage(e.target.value)}
        placeholder={placeholder}
        data-testid="customer-message-input"
        className="message-input-section message-textarea"
      />
      <div className="modal-actions action-buttons">
        <Button
          mode="secondary"
          onClick={handleCancel}
          data-testid="cancel-button"
          disabled={isSubmitting}
        >
          {t("cancel")}
        </Button>
        <Button
          mode="primary"
          onClick={handleReject}
          data-testid="send-button"
          disabled={!customerMessage.trim() || isSubmitting}
        >
          {t("reject")}
        </Button>
      </div>
    </Dialog>
  );
}

export type { CustomerMessageModalProps };
export default CustomerMessageModal;
