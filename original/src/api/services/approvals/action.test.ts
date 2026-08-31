import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchApprovals,
  saveApprovalListColumns,
  updateApprovalStatus,
  approveJobs,
} from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

vi.mock("../jobs/action", () => ({
  fetchJobs: vi.fn(),
}));

import axiosClient from "api/axios-client/axiosClient";
import { fetchJobs } from "../jobs/action";

const mockPost = vi.mocked(axiosClient.post);
const mockFetchJobs = vi.mocked(fetchJobs);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchApprovals", () => {
  it("returns all jobs as approvals", async () => {
    mockFetchJobs.mockResolvedValueOnce([{ jobId: "J001" }] as any);
    const result = await fetchApprovals();
    expect(result).toEqual([{ jobId: "J001" }]);
  });

  it("throws when fetchJobs fails", async () => {
    mockFetchJobs.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(fetchApprovals()).rejects.toThrow("fetch failed");
  });
});

describe("saveApprovalListColumns", () => {
  it("posts only checked column keys", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await saveApprovalListColumns([
      { key: "jobId", isChecked: true, isFixed: true, order: 0 },
      { key: "customer", isChecked: false, isFixed: false, order: 1 },
    ] as any);
    expect(mockPost).toHaveBeenCalledWith("/v1/profile/preferences/job", ["jobId"]);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("save failed"));
    await expect(saveApprovalListColumns([])).rejects.toThrow("save failed");
  });
});

describe("updateApprovalStatus", () => {
  it("posts approval update", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await updateApprovalStatus({
      jobId: "J001",
      materialIds: ["M1"],
      approvalStatus: "APPROVED",
      message: "OK",
    });
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/J001/flow/bosch-approval", {
      materialIds: ["M1"],
      approvalStatus: "APPROVED",
      message: "OK",
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("update failed"));
    await expect(
      updateApprovalStatus({
        jobId: "J001",
        materialIds: [],
        approvalStatus: "REJECTED",
        message: "",
      }),
    ).rejects.toThrow("update failed");
  });
});

describe("approveJobs", () => {
  it("posts job ids for bulk approval", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await approveJobs(["J001", "J002"]);
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/flow/bosch-approval/approve", {
      jobIds: ["J001", "J002"],
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("approve failed"));
    await expect(approveJobs(["J001"])).rejects.toThrow("approve failed");
  });
});
