import { Button, Dialog, Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMessages } from "api/services/jobs/hooks";
import { useClickOutside } from "hooks/useClickOutside";
import { ClaimItem } from "modules/ClaimManagement/ClaimOverview/Claims.types";
import MessagesPreview from "./MessagesPreview/MessagesPreview";
import "./MessagesModal.scss";
import NotesLegend from "../NotesSection/NotesLegend";

type MessagesModalProps = {
  type?: "job" | "claim";
  jobId?: string;
  claimId?: string;
  isOpen: boolean;
  onClose: () => void;
};

function MessagesModal({
  type = "job",
  jobId: jobIdProp,
  claimId: claimIdProp,
  isOpen,
  onClose,
}: Readonly<MessagesModalProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const modalRef = useRef<HTMLDialogElement>(null);

  const resolvedJobId =
    jobIdProp ??
    (type === "claim"
      ? (queryClient.getQueryData<ClaimItem>(["claim", claimIdProp])?.jobId ?? "")
      : "");

  const { data: messages = [] } = useMessages(resolvedJobId, 3, type);

  useClickOutside(modalRef as React.RefObject<HTMLElement>, onClose, isOpen);

  const navigateToOverview = (): void => {
    const path =
      type === "claim"
        ? `/claim-overview/${claimIdProp}#notes`
        : `/job-overview/${resolvedJobId}#notes`;
    Promise.resolve(navigate(path)).catch((err) => {
      console.error("Navigation failed", err);
    });
  };

  return (
    <Dialog
      ref={modalRef}
      modal
      title={t("messages")}
      open={isOpen}
      className="messages-modal"
      data-testid="messages-modal"
    >
      <Button
        mode="tertiary"
        className="show-all-button"
        onClick={navigateToOverview}
        data-testid="show-all-button"
      >
        {t("ShowAll")}
      </Button>
      {messages.length > 0 ? (
        messages.map((message) => (
          <MessagesPreview
            key={message.messageId}
            message={message}
            className={`modal-message-block ${type === "claim" ? "claim-message" : ""}`}
            data-testid={`modal-message-block-${message.messageId}`}
            showDot={true}
          />
        ))
      ) : (
        <p>{t("NoMessagesFound")}</p>
      )}
      {messages.length > 0 ? <NotesLegend /> : null}
      <div className="button-section">
        <Button
          mode="secondary"
          onClick={onClose}
          data-testid="close-button"
          className="button-left"
        >
          {t("Cancel")}
        </Button>
        <div className="button-right">
          <Button mode="secondary" onClick={navigateToOverview} data-testid="goto-overview-button">
            {t("goToOverview")}
          </Button>
          <Button onClick={navigateToOverview} data-testid="add-note-button">
            <Icon iconName="add" />
            {t("AddNote")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default MessagesModal;
