import { useState, useEffect } from "react";
import "./FileUpload.scss";
import { useTranslation } from "react-i18next";
import { Icon, Button, Dialog, Notification } from "@bosch/react-frok";
import FilePreview from "./FilePreview/FilePreview";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteFileFromServer,
  uploadFileToServer,
  AttachmentsUploadResponse,
  FileResponse,
} from "../../../api/services/file/action";
import {
  isFilenameSafe,
  hasDoubleExtension,
  hasHiddenDangerousExtension,
  isBlockedExtension,
} from "utils/fileValidation";
import DocumentFile from "../DocumentFile/DocumentFile";
import { FileUploadProps, Attachments, FileProps } from "./FileUpload.types";

const isCountableFile = (f: { type?: string }) => f.type !== "SYSTEM_GENERATED_RECEIPT";

export default function FileUpload({
  name,
  onFilesSelected,
  allowedFormats,
  maxFilesAllowed = 5,
  maxFileSizeInMb = 25,
  multiple = true,
  fileTypeOptions,
  isDisabled = false,
  initialFiles = [],
  existingFiles = [],
  onDeleteStart,
  onDeleteEnd,
}: Readonly<FileUploadProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<Attachments[]>(initialFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const MAX_FILE_SIZE = maxFileSizeInMb * 1024 * 1024;

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const handleUploadSuccess = (response: AttachmentsUploadResponse | FileResponse) => {
    if ((response as FileResponse)?.type === "ASC_LOGO") {
      const file = {
        name: (response as FileResponse)?.filename,
        type: (response as FileResponse)?.type,
        attachmentId: (response as FileResponse)?.id,
      };
      setFiles([file]);
      onFilesSelected?.([file]);
    } else {
      const attachments: Attachments[] =
        (response as AttachmentsUploadResponse)?.attachments?.map((item) => {
          return {
            name: item.filename,
            type: item.type,
            attachmentId: item.id,
          };
        }) ?? [];
      const merged = [...files, ...attachments];
      void queryClient.invalidateQueries({ queryKey: ["attachments"] });
      onFilesSelected?.(merged);
      setFiles(merged);
    }

    setShowUploadModal(false);
    setPendingFiles([]);
  };

  const handleUploadError = (error: Error) => {
    console.error("Error uploading files:", error);
  };

  const { mutate: uploadFiles, isPending: isUploading } = useMutation({
    mutationFn: ({ files, types }: { files: File[]; types: string[] }) =>
      uploadFileToServer(files, types),
    onSuccess: handleUploadSuccess,
    onError: handleUploadError,
  });

  useEffect(() => {
    if (errorMessages.length === 0) return;
    const timer = setTimeout(() => setErrorMessages([]), 5000);
    return () => clearTimeout(timer);
  }, [errorMessages]);

  const isDuplicate = (file: File) => {
    return (
      files.some((f) => f.name === file.name) || existingFiles.some((f) => f.name === file.name)
    );
  };

  const isFormatInvalid = (fileName: string): boolean =>
    !!allowedFormats?.length &&
    allowedFormats.every((format) => !fileName.toLowerCase().endsWith(format.toLowerCase()));

  const getFileValidationError = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE)
      return `${file.name} ${t("maxSizeExceeded")} ${maxFileSizeInMb}MB.`;
    if (isBlockedExtension(file.name)) return t("activeContentFormatBlocked");
    if (isFormatInvalid(file.name))
      return t("invalidFormat", { allowedFormats: allowedFormats?.join(", ") });
    if (!isFilenameSafe(file.name)) return t("fileNameInvalidChars");
    if (hasDoubleExtension(file.name)) return t("fileNameDoubleExtension");
    if (hasHiddenDangerousExtension(file.name)) return t("fileNameHiddenExtension");
    if (isDuplicate(file)) return `${file.name} ${t("isDuplicate")}`;
    return null;
  };

  const filterNewValidFiles = (incoming: File[]) => {
    const filtered: File[] = [];
    const errors: string[] = [];
    const availableSlots =
      maxFilesAllowed -
      files.filter(isCountableFile).length -
      existingFiles.filter(isCountableFile).length;

    for (const file of incoming) {
      if (filtered.length >= availableSlots) {
        errors.push(
          `${t("cannotAddFile", { fileName: file.name })} ${t("maxFilesAllowed", { maxFiles: maxFilesAllowed })}`,
        );
        break;
      }
      const error = getFileValidationError(file);
      if (error) {
        errors.push(error);
      } else {
        filtered.push(file);
      }
    }
    setErrorMessages(errors);
    return filtered;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const validNewFiles = filterNewValidFiles(selected);
    if (validNewFiles.length > 0) {
      setPendingFiles(validNewFiles);
      setShowUploadModal(true);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const dropped = Array.from(e.dataTransfer.files || []);
    const validNewFiles = filterNewValidFiles(dropped);

    if (validNewFiles.length > 0) {
      setPendingFiles(validNewFiles);
      setShowUploadModal(true);
    }
  };

  const handleModalSave = (payload: { files: FileProps[] }) => {
    uploadFiles({
      files: payload.files.map((f) => f.file),
      types: payload.files.map((f) => f.fileType),
    });
  };

  const handleModalClose = () => {
    setShowUploadModal(false);
    setPendingFiles([]);
  };

  const removeFile = (attachmentId: string) => {
    const updated = files.filter((file) => file.attachmentId !== attachmentId);
    setFiles(updated);
    onFilesSelected?.(updated);
  };

  const removeFilesMutation = useMutation({
    mutationFn: async (attachments: Attachments[]) => {
      await Promise.all(attachments.map((file) => deleteFileFromServer(file.attachmentId)));
    },
    onMutate: () => {
      onDeleteStart?.();
      setFiles([]);
      onFilesSelected?.([]);
    },
    onSuccess: () => {
      onDeleteEnd?.();
    },
    onError: (error: any, attachments: Attachments[]) => {
      if (
        attachments[0].type === "ASC_LOGO" &&
        error?.response?.data?.detail?.includes("already deleted")
      ) {
        setFiles([]);
        onFilesSelected?.([]);
      } else {
        setFiles(attachments);
        onFilesSelected?.(attachments);
      }
      onDeleteEnd?.();
    },
  });

  const isMaxReached =
    files?.filter(isCountableFile).length + existingFiles.filter(isCountableFile).length >=
    maxFilesAllowed;

  const isUploadAllowed = isDisabled || isMaxReached;

  return (
    <>
      {pendingFiles.length > 0 && (
        <Dialog
          modal
          onClose={handleModalClose}
          title={t("uploadDocument")}
          open={showUploadModal}
          className="bass-modal"
        >
          <FilePreview
            files={pendingFiles}
            onClose={handleModalClose}
            onSave={handleModalSave}
            fileTypeOptions={fileTypeOptions}
            isLoading={isUploading}
          />
        </Dialog>
      )}
      <div className="file-upload-container">
        <div className="file-upload-note">
          <p>{t("pleaseNoteThatMaximumFile(s)SizeIs25MB.")}</p>
          <Icon iconName="info-i-frame" className="info-icon-file-upload" />
        </div>

        <div
          className={`file-upload-box ${isDragging ? "dragging" : ""} ${isUploadAllowed ? "disabled" : ""}`}
          onDragOver={isUploadAllowed ? undefined : handleDragOver}
          onDragLeave={isUploadAllowed ? undefined : handleDragLeave}
          onDrop={isUploadAllowed ? undefined : handleDrop}
        >
          {errorMessages.length > 0 && (
            <Notification
              variant="banner"
              open
              type="error"
              onCloseClick={() => setErrorMessages([])}
            >
              {errorMessages.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </Notification>
          )}

          <input
            type="file"
            id={name}
            accept={(allowedFormats ?? []).join(",")}
            multiple={multiple}
            onChange={handleFileChange}
            disabled={isUploadAllowed}
            style={{ display: "none" }}
          />
          <label
            className={`file-upload-label ${isUploadAllowed ? "disabled" : ""}`}
            htmlFor={name}
          >
            <Icon iconName="upload" aria-hidden="true" className="icon-upload" />
            <div className="upload-content">
              <span className="upload-text">
                {(() => {
                  if (isMaxReached) {
                    return "Maximum files reached";
                  } else if (isDragging) {
                    return t("dropFilesHere");
                  } else if (isDisabled) {
                    return t("fileUploadDisabled");
                  } else {
                    return (
                      <>
                        {t("dragAndDropFilesHere")}
                        <br />
                        {t("orBrowseToUpload")}
                      </>
                    );
                  }
                })()}
              </span>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="file-list-container">
            {files.map((file) => (
              <DocumentFile
                className="file-list-row"
                key={file.attachmentId}
                name={file.name}
                type={file.type}
                fileId={file.attachmentId}
                enableDownload={true}
                onDeleteSuccess={() => removeFile(file.attachmentId)}
                dataTestid={file.attachmentId}
                onDeleteStart={onDeleteStart}
                onDeleteEnd={onDeleteEnd}
              />
            ))}
            <Button
              mode="tertiary"
              onClick={() => {
                removeFilesMutation.mutate(files);
              }}
              icon={{ iconName: "delete", title: "delete" }}
              label={files.length > 1 ? t("removeAll") : t("remove")}
              className="action-buttons"
              disabled={removeFilesMutation.isPending || isDisabled}
            />
          </div>
        )}
      </div>
    </>
  );
}
