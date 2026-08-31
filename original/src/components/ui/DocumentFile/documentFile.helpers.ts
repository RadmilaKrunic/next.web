export const DOCUMENT_TYPES = ["INVOICE", "PRODUCT_PHOTO", "WARRANTY_CERTIFICATE", "OTHERS"];

export function isDocumentTypeDeletable(value: string): boolean {
  if (!value) {
    return true;
  }
  return DOCUMENT_TYPES.includes(value);
}

export function getMimeType(fileType: string): string {
  switch (fileType?.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
