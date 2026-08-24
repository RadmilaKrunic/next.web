import { GenericOptionProps } from "../../generics/Field/GenericField.types";

export interface FileUploadProps {
  name: string;
  onFilesSelected?: (attachments: Attachments[]) => void;
  allowedFormats?: string[];
  maxFilesAllowed?: number;
  maxFileSizeInMb?: number;
  multiple?: boolean;
  fileTypeOptions: GenericOptionProps[];
  isDisabled?: boolean;
  initialFiles?: Attachments[];
  existingFiles?: { name: string; type?: string }[];
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
}

export interface FileProps {
  file: File;
  fileType: string;
}

export interface Attachments {
  name: string;
  type: string;
  attachmentId: string;
}
