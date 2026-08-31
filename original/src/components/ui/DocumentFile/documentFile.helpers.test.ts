import { describe, it, expect } from "vitest";
import { isDocumentTypeDeletable, getMimeType } from "./documentFile.helpers";

describe("isDocumentTypeDeletable", () => {
  it("returns true for INVOICE", () => {
    expect(isDocumentTypeDeletable("INVOICE")).toBe(true);
  });

  it("returns true for PRODUCT_PHOTO", () => {
    expect(isDocumentTypeDeletable("PRODUCT_PHOTO")).toBe(true);
  });

  it("returns true for WARRANTY_CERTIFICATE", () => {
    expect(isDocumentTypeDeletable("WARRANTY_CERTIFICATE")).toBe(true);
  });

  it("returns true for OTHERS", () => {
    expect(isDocumentTypeDeletable("OTHERS")).toBe(true);
  });

  it("returns false for unknown type", () => {
    expect(isDocumentTypeDeletable("DELIVERY_NOTE")).toBe(false);
  });

  it("returns true for empty string (falsy)", () => {
    expect(isDocumentTypeDeletable("")).toBe(true);
  });
});

describe("getMimeType", () => {
  it("returns image/jpeg for jpg", () => {
    expect(getMimeType("jpg")).toBe("image/jpeg");
  });

  it("returns image/jpeg for jpeg", () => {
    expect(getMimeType("jpeg")).toBe("image/jpeg");
  });

  it("returns image/png for png", () => {
    expect(getMimeType("png")).toBe("image/png");
  });

  it("returns application/pdf for pdf", () => {
    expect(getMimeType("pdf")).toBe("application/pdf");
  });

  it("returns application/octet-stream for unknown", () => {
    expect(getMimeType("docx")).toBe("application/octet-stream");
  });

  it("handles uppercase extension", () => {
    expect(getMimeType("JPG")).toBe("image/jpeg");
  });
});
