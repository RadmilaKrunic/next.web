import { Button, Dialog, TextArea } from "@bosch/react-frok";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postClaimDecision, ClaimDecision } from "api/services/claims/action";
import "./ClaimNoteModal.scss";

interface AddClaimNoteModalProps {
  action: string;
  claimId: string | undefined;
  jobId: string | undefined;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSuccess?: () => void;
}

function ClaimNoteModal({
  action,
  claimId,
  jobId,
  isOpen,
  setIsOpen,
  onSuccess,
}: Readonly<AddClaimNoteModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const modalRef = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const ACTION_TO_DECISION: Record<string, ClaimDecision> = {
    Approve: "APPROVED",
    Reject: "REJECTED",
    Revise: "REVISED",
  };

  const decisionMutation = useMutation({
    mutationFn: () =>
      postClaimDecision(claimId ?? "", {
        jobId: jobId ?? "",
        message: note,
        decision: ACTION_TO_DECISION[action] ?? "APPROVED",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["claim", claimId] });
      void queryClient.invalidateQueries({ queryKey: ["claims"] });
      void queryClient.invalidateQueries({ queryKey: ["messages", jobId] });
      onSuccess?.();
      close();
    },
    onError: (error) => {
      console.error(`Error posting claim decision:`, error);
    },
  });

  const getReasonPlaceholderKey = () => {
    if (action === "Reject") {
      return "claimNoteRejectReasonMessage";
    }
    if (action === "Revise") {
      return "claimNoteRevisionReasonMessage";
    }
    return "claimApprovalNoteMessage";
  };

  const reasonPlaceholderKey = getReasonPlaceholderKey();

  const close = () => {
    setNote("");
    setIsOpen(false);
  };

  const handleClose = () => close();

  const isNoteRequired = action === "Reject" || action === "Revise";

  const handleConfirm = () => {
    decisionMutation.mutate();
  };

  return (
    <Dialog
      ref={modalRef}
      open={isOpen}
      title={t("claimNoteModalTitle", { action: action.toLowerCase() })}
      modal={true}
      onClose={handleClose}
      className="claim-note-modal"
    >
      <div className="modal-content-wrapper">
        <p>{t("claimNoteModalDescription", { action: action.toLowerCase() })}</p>
        <TextArea
          id="textArea"
          label={`${t("notes")}${isNoteRequired ? " *" : ""}`}
          title={t("notes")}
          placeholder={t(reasonPlaceholderKey)}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          data-testid="claim-note-textarea"
        />
      </div>
      <div className="modal-actions action-buttons">
        <Button mode="secondary" onClick={close} data-testid="cancel-button">
          {t("cancel")}
        </Button>
        <Button
          mode="primary"
          onClick={handleConfirm}
          disabled={decisionMutation.isPending || (isNoteRequired && note.trim() === "")}
          data-testid={`save-note-for-claim-${action.toLowerCase()}-button`}
        >
          {t(action.toLowerCase())}
        </Button>
      </div>
    </Dialog>
  );
}

export default ClaimNoteModal;
