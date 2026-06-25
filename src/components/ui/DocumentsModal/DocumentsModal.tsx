import { useTranslation } from "react-i18next";
import "./DocumentsModal.scss";
import { Dialog } from "@bosch/react-frok";
import DocumentFile from "../DocumentFile/DocumentFile";
import { useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Job } from "modules/JobManagement/JobList/JobList.types";
import { useClickOutside } from "../../../hooks/useClickOutside";

export interface Attachment {
  name: string;
  type: string;
  attachmentId: string;
}
export default function DocumentsModal({
  attachments,
  isOpen,
  onClose,
  jobId,
  jobStatus,
  isOnHold = false,
  hideDelete: hideDeleteProp,
}: Readonly<{
  attachments: Attachment[];
  isOpen: boolean;
  onClose: (value: boolean) => void;
  jobId: string;
  jobStatus?: string;
  isOnHold?: boolean;
  hideDelete?: boolean;
}>) {
  const LOCKED_STATUSES = ["REPAIR_DONE", "DELIVERED"];
  const hideDelete =
    hideDeleteProp ?? (isOnHold || (jobStatus ? LOCKED_STATUSES.includes(jobStatus) : false));
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleDeleteSuccess = (updatedAttachments: Attachment[]) => {
    if (updatedAttachments !== undefined) {
      queryClient.setQueryData<Job[]>(["jobs"], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((job) => {
          if (job.jobId === jobId) {
            return {
              ...job,
              attachments: updatedAttachments,
            };
          }
          return job;
        });
      });
      void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    }
  };

  useClickOutside(modalRef as React.RefObject<HTMLElement>, onClose, isOpen);

  return (
    <Dialog
      ref={modalRef}
      modal
      onClose={(event) => {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        onClose(false);
      }}
      title={t("documents")}
      open={isOpen}
      className="documents-modal"
      data-testid="documents-modal"
    >
      {attachments.length > 0 ? (
        attachments.map((attachment) => (
          <DocumentFile
            key={attachment.attachmentId}
            name={attachment.name}
            type={attachment.type}
            fileId={attachment.attachmentId}
            jobId={jobId}
            onDeleteSuccess={handleDeleteSuccess}
            dataTestid={attachment.attachmentId}
            className="modal-document-block"
            enableDownload={true}
            hideDelete={hideDelete}
          />
        ))
      ) : (
        <p>{t("NoDocumentsFound")}</p>
      )}
    </Dialog>
  );
}
