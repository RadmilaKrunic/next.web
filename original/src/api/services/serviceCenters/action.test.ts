import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchServiceCenterNames,
  getAllASCs,
  createASC,
  getASCById,
  getDraftAscById,
} from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

vi.spyOn(console, "error").mockImplementation(() => undefined);

import axiosClient from "api/axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);
const mockPost = vi.mocked(axiosClient.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchServiceCenterNames", () => {
  it("returns service center names", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        serviceCenterNames: [
          { ascId: "ASC8", name: "Altay Elektromekanik Türkiye" },
          { ascId: "ASC9", name: "Turkey Claim service center" },
        ],
      },
    });
    const result = await fetchServiceCenterNames();
    expect(result).toEqual([
      { ascId: "ASC8", name: "Altay Elektromekanik Türkiye" },
      { ascId: "ASC9", name: "Turkey Claim service center" },
    ]);
    expect(mockGet).toHaveBeenCalledWith("/v1/service-centers/names");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(fetchServiceCenterNames()).rejects.toThrow("not found");
  });
});

describe("getAllASCs", () => {
  it("returns ASC list content", async () => {
    mockPost.mockResolvedValueOnce({ data: { content: [{ ascId: "ASC1" }] } });
    const result = await getAllASCs();
    expect(result).toEqual([{ ascId: "ASC1" }]);
    expect(mockPost).toHaveBeenCalledWith("/v1/service-centers/search?page=0&size=200", {});
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("search failed"));
    await expect(getAllASCs()).rejects.toThrow("search failed");
  });
});

describe("createASC", () => {
  const ascData = { ascName: "New ASC" } as never;

  it("posts with isDraft=true query param", async () => {
    mockPost.mockResolvedValueOnce({ data: { ascId: "ASC1" } });
    const result = await createASC(ascData, true);
    expect(result).toEqual({ ascId: "ASC1" });
    expect(mockPost).toHaveBeenCalledWith("/v1/service-centers?isDraft=true", ascData);
  });

  it("posts with isDraft=false query param", async () => {
    mockPost.mockResolvedValueOnce({ data: { ascId: "ASC1" } });
    await createASC(ascData, false);
    expect(mockPost).toHaveBeenCalledWith("/v1/service-centers?isDraft=false", ascData);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("create failed"));
    await expect(createASC(ascData, true)).rejects.toThrow("create failed");
  });
});

describe("getASCById", () => {
  it("returns ASC data", async () => {
    mockGet.mockResolvedValueOnce({ data: { ascId: "ASC1" } });
    const result = await getASCById("ASC1");
    expect(result).toEqual({ ascId: "ASC1" });
    expect(mockGet).toHaveBeenCalledWith("/v1/service-centers/ASC1");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(getASCById("ASC1")).rejects.toThrow("not found");
  });
});

describe("getDraftAscById", () => {
  it("returns draft ASC data", async () => {
    mockGet.mockResolvedValueOnce({ data: { ascId: "ASC1", isDraft: true } });
    const result = await getDraftAscById("ASC1");
    expect(result).toEqual({ ascId: "ASC1", isDraft: true });
    expect(mockGet).toHaveBeenCalledWith("/v1/service-centers/draft/ASC1");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("not found"));
    await expect(getDraftAscById("ASC1")).rejects.toThrow("not found");
  });
});
