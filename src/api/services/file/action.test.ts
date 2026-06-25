import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPost = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ post: mockPost, delete: mockDelete, defaults: {} })),
    isAxiosError: vi.fn(),
  },
  isAxiosError: vi.fn(),
}));

vi.mock("../../axios-client/axiosClient", () => ({
  default: {
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import { uploadFileToServer, deleteFileFromServer, downloadFileFromServer } from "./action";

beforeEach(() => vi.clearAllMocks());

describe("uploadFileToServer", () => {
  it("returns upload response on success", async () => {
    const mockResponse = {
      attachments: [{ id: "att1", filename: "test.pdf", type: "INVOICE", createdAt: "2023-01-01" }],
    };
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const files = [new File(["content"], "test.pdf", { type: "application/pdf" })];
    const result = await uploadFileToServer(files, ["INVOICE"]);

    expect(result).toEqual(mockResponse);
    expect(mockPost).toHaveBeenCalledWith(
      "/upload?source=Orders&types=INVOICE",
      expect.any(FormData),
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  });

  it("throws on upload error", async () => {
    mockPost.mockRejectedValueOnce(new Error("Upload failed"));
    const files = [new File(["content"], "test.pdf")];
    await expect(uploadFileToServer(files, ["INVOICE"])).rejects.toThrow("Upload failed");
  });

  it("uploads multiple files with multiple types", async () => {
    const mockResponse = { attachments: [] };
    mockPost.mockResolvedValueOnce({ data: mockResponse });
    const files = [new File(["a"], "a.pdf"), new File(["b"], "b.pdf")];
    await uploadFileToServer(files, ["INVOICE", "RECEIPT"]);
    expect(mockPost).toHaveBeenCalledWith(
      "/upload?source=Orders&types=INVOICE,RECEIPT",
      expect.any(FormData),
      expect.any(Object),
    );
  });
});

describe("deleteFileFromServer", () => {
  it("resolves on success", async () => {
    mockDelete.mockResolvedValueOnce({});
    await expect(deleteFileFromServer("file-123")).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith("/file-123");
  });

  it("throws on delete error", async () => {
    mockDelete.mockRejectedValueOnce(new Error("Delete failed"));
    await expect(deleteFileFromServer("file-123")).rejects.toThrow("Delete failed");
  });
});

describe("downloadFileFromServer", () => {
  it("returns blob on success", async () => {
    const blob = new Blob(["file content"]);
    mockPost.mockResolvedValueOnce({ data: blob });
    const result = await downloadFileFromServer("file-123", "PDF");
    expect(result).toBe(blob);
    expect(mockPost).toHaveBeenCalledWith(
      "/download",
      { fileId: "file-123", fileType: "PDF" },
      { responseType: "blob", headers: { Accept: "application/octet-stream" } },
    );
  });

  it("returns null on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("Download failed"));
    const result = await downloadFileFromServer("file-123", "PDF");
    expect(result).toBeNull();
  });
});
