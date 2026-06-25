import { Icon } from "@bosch/react-frok";
import "./DocumentFile.scss";
import { useTranslation } from "react-i18next";
import { isDocumentTypeDeletable, getMimeType } from "./documentFile.helpers";
import { useMutation } from "@tanstack/react-query";
import { deleteFileFromServer, downloadFileFromServer } from "../../../api/services/file/action";
import { deleteJobAttachment } from "../../../api/services/jobs/action";
import { Attachment } from "../DocumentsModal/DocumentsModal";

type DocumentFileProps = Readonly<{
  name: string;
  type?: string;
  size?: number;
  fileId?: string;
  jobId?: string;
  onDeleteSuccess?: (responseData: Attachment[]) => void;
  removeFile?: () => void;
  dataTestid?: string;
  className?: string;
  enableDownload?: boolean;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
  hideDelete?: boolean;
}>;

export default function DocumentFile({
  name,
  type,
  size,
  fileId,
  jobId,
  onDeleteSuccess,
  removeFile,
  dataTestid,
  className,
  enableDownload = false,
  onDeleteStart,
  onDeleteEnd,
  hideDelete = false,
}: DocumentFileProps) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const deleteFileMutation = useMutation<Attachment[] | void, Error, string>({
    mutationFn: (fileId: string) => {
      if (jobId) {
        return deleteJobAttachment(jobId, fileId);
      }
      return deleteFileFromServer(fileId);
    },
    onMutate: () => {
      onDeleteStart?.();
    },
    onSuccess: (responseData) => {
      const attachments = Array.isArray(responseData) ? responseData : undefined;
      onDeleteSuccess?.(attachments);
      onDeleteEnd?.();
    },
    onError: (error) => {
      console.error("Error deleting file:", error);
      onDeleteEnd?.();
    },
  });

  const downloadFileMutation = useMutation({
    mutationFn: ({ fileId, type }: { fileId: string; type: string }) =>
      downloadFileFromServer(fileId, type),
    onSuccess: (blob) => {
      if (!blob) return;
      const extension = name.split(".").pop();
      const mimeType = getMimeType(extension);
      const file = new File([blob], name, { type: mimeType });
      const url = URL.createObjectURL(file);
      const win = window.open(url, "_blank");

      if (!win) {
        console.error("Popup blocked");
        return;
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    },
    onError: (error) => {
      console.error("Failed to open document:", error);
    },
  });

  const handleDelete = () => {
    if (removeFile) {
      removeFile();
    } else {
      if (!fileId) {
        return;
      }
      deleteFileMutation.mutate(fileId);
    }
  };

  const handleDownload = () => {
    if (!fileId || !type || !enableDownload) return;
    downloadFileMutation.mutate({ fileId, type });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDownload();
    }
  };

  return (
    <div
      className={className ? `file-row ${className}` : "file-row"}
      data-testid={`document-file-${dataTestid}`}
    >
      <div className="file-left" aria-hidden="true">
        <Icon iconName="document-plain" className="file-icon" />
      </div>
      <button
        className="file-center"
        onClick={fileId && type && enableDownload ? () => handleDownload() : undefined}
        onKeyDown={fileId && type && enableDownload ? handleKeyDown : undefined}
        disabled={!fileId || !type || !enableDownload}
        aria-label={`Download document: ${name}`}
        type="button"
      >
        {type ? (
          <span className="file-name">
            {t(type)} | <span className="file-name-with-type">{name}</span>
          </span>
        ) : (
          <span className="file-name">{name}</span>
        )}

        {!!size && (
          <span
            className="file-size"
            aria-label={`File size: ${(size / 1024 / 1024).toFixed(1)} megabytes`}
          >
            {(size / 1024 / 1024).toFixed(1)} MB
          </span>
        )}
      </button>
      {!hideDelete && isDocumentTypeDeletable(type) && (
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          aria-label={`Delete ${name} document`}
          data-testid={`delete-document-${dataTestid}`}
          type="button"
        >
          <Icon iconName="delete" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
