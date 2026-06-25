import { ActivityIndicator, Button, Dropdown } from "@bosch/react-frok";
import { useState } from "react";
import "./FilePreview.scss";
import { useTranslation } from "react-i18next";
import { FileProps } from "../FileUpload";
import DocumentFile from "components/ui/DocumentFile/DocumentFile";
import { GenericOptionProps } from "components/generics/Field/GenericField.types";

interface ModalFile {
  file: File;
  fileType: string;
}

export default function FilePreview({
  files,
  onClose,
  onSave,
  fileTypeOptions,
  isLoading = false,
}: Readonly<{
  files: File[];
  onClose: () => void;
  onSave: (payload: { files: FileProps[] }) => void;
  fileTypeOptions: GenericOptionProps[];
  isLoading?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const [fileList, setFileList] = useState<ModalFile[]>(
    files.map((f) => ({ file: f, fileType: String(fileTypeOptions[0]?.value ?? "") })),
  );

  const fileTypeOptionsTranslated = fileTypeOptions.map((option) => ({
    value: option.value,
    name: t(option.name),
  }));

  const updateFileType = (index: number, type: string) => {
    const updated = [...fileList];
    updated[index].fileType = type;
    setFileList(updated);
  };

  const deleteFile = (index: number) => {
    const updated = fileList.filter((_, i) => i !== index);
    setFileList(updated);
    if (updated.length === 0) {
      onClose();
    }
  };

  const handleSave = () => {
    onSave({
      files: fileList.map((i) => ({ file: i.file, fileType: i.fileType })),
    });
  };

  return (
    <div className="filePreview">
      <p className="uploadfile-info">{t("jpegPngOrPdfFormatAndMax25MB")}</p>
      <div className="modal-files-list">
        {isLoading && (
          <div className="loading-container">
            <ActivityIndicator size="large" />
          </div>
        )}
        {!isLoading &&
          fileList.map((item, idx) => (
            <div key={`${item.file.name}-${item.file.lastModified}`} className="modal-file-block">
              <DocumentFile
                name={item.file.name}
                removeFile={() => deleteFile(idx)}
                size={item.file.size}
                dataTestid={idx.toString()}
              />

              <Dropdown
                label={t("fileType")}
                value={item.fileType}
                options={fileTypeOptionsTranslated}
                onChange={(event) => updateFileType(idx, event.target.value ?? "")}
                className="file-type-section"
              />
            </div>
          ))}
      </div>
      <div className="uploadfile-actions">
        <Button
          as="button"
          mode="tertiary"
          label={t("cancel")}
          onClick={onClose}
          disabled={isLoading}
        />
        <Button as="button" label={t("save")} onClick={handleSave} disabled={isLoading} />
      </div>
    </div>
  );
}
