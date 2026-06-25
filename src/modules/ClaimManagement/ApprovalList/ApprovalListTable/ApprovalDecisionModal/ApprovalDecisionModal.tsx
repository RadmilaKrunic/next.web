import { Button, Dialog, TextArea } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { useClickOutside } from "../../../../../hooks/useClickOutside";
import "./ApprovalDecisionModal.scss";

interface ApprovalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comments: string) => void;
  title: string;
  decisionType: "approved" | "rejected" | "revised" | null;
  jobId: string | undefined;
}

function ApprovalDecisionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  decisionType,
  jobId,
}: Readonly<ApprovalDecisionModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const modalRef = useRef<HTMLDialogElement>(null);
  const [comments, setComments] = useState("");

  useClickOutside(modalRef as React.RefObject<HTMLElement>, onClose, isOpen);

  const handleConfirm = () => {
    try {
      onConfirm(comments);
      setComments("");
      onClose();
    } catch (error) {
      console.error(`Failed to ${decisionType} goodwill:`, error);
    }
  };

  const handleCancel = () => {
    setComments("");
    onClose();
  };

  const isCommentsRequired = decisionType === "rejected" || decisionType === "revised";

  return (
    <Dialog
      ref={modalRef}
      modal
      open={isOpen}
      title={title}
      className="approval-decision-modal"
      data-testid={`approval-decision-modal-${decisionType}-${jobId}`}
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
        id={`approval-comments-${decisionType}`}
        label={t(isCommentsRequired ? "comments" : "optionalComments")}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder={t(
          decisionType === "revised" ? "pleaseDescribeWhatNeedsClarification" : "addYourComments",
        )}
        data-testid={`approval-comments-${decisionType}`}
        className="message-input-section message-textarea"
      />
      <div className="modal-actions action-buttons">
        <Button mode="secondary" onClick={handleCancel} data-testid="cancel-button">
          {t("cancel")}
        </Button>
        <Button
          mode="primary"
          onClick={handleConfirm}
          data-testid="confirm-button"
          disabled={isCommentsRequired && !comments.trim()}
        >
          {t("confirm")}
        </Button>
      </div>
    </Dialog>
  );
}

export default ApprovalDecisionModal;
