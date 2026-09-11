import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchJobs,
  fetchJobById,
  fetchMessages,
  fetchJobMessages,
  postMessage,
  saveJobListColumns,
  deleteJobAttachment,
  updateJobAssignee,
  patchJobByJobId,
  fetchDiagnosticByJobId,
  postJobStatus,
  fetchSpecialMaterials,
  postCustomerData,
  postJobStatusStartDiagnostic,
  postRepairApproval,
  postInternalApprovalRequest,
  postStartReview,
  postStartRepair,
  postFinishRepair,
  postToolDelivered,
  postCreateCostEstimate,
  getCostEstimationPdf,
  postCustomerAnswer,
  postToggleJobHold,
  postValidateAndSave,
  postDiagnostic,
  updateJobAttachments,
} from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

import axiosClient from "api/axios-client/axiosClient";
const mockGet = vi.mocked(axiosClient.get);
const mockPost = vi.mocked(axiosClient.post);
const mockPut = vi.mocked(axiosClient.put);
const mockPatch = vi.mocked(axiosClient.patch);
const mockDelete = vi.mocked(axiosClient.delete);

beforeEach(() => vi.clearAllMocks());

describe("fetchJobs", () => {
  it("returns jobs array", async () => {
    mockGet.mockResolvedValueOnce({ data: { jobs: [{ jobId: "J001" }] } });
    expect(await fetchJobs()).toEqual([{ jobId: "J001" }]);
  });

  it("returns empty array when jobs is null", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });
    expect(await fetchJobs()).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchJobs()).rejects.toThrow("fail");
  });
});

describe("fetchJobById", () => {
  it("returns job data", async () => {
    mockGet.mockResolvedValueOnce({ data: { jobId: "J001" } });
    expect(await fetchJobById("J001")).toEqual({ jobId: "J001" });
    expect(mockGet).toHaveBeenCalledWith("/v1/jobs/J001");
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchJobById("J001")).rejects.toThrow("fail");
  });
});

describe("fetchMessages", () => {
  it("returns messages", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "M1" }] });
    expect(await fetchMessages("J001", 10)).toEqual([{ id: "M1" }]);
  });

  it("returns empty array on null data", async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    expect(await fetchMessages("J001")).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchMessages("J001")).rejects.toThrow("fail");
  });
});

describe("fetchJobMessages", () => {
  it("returns job messages", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "M1" }] });
    expect(await fetchJobMessages("J001")).toEqual([{ id: "M1" }]);
  });

  it("returns empty array on null", async () => {
    mockGet.mockResolvedValueOnce({ data: null });
    expect(await fetchJobMessages("J001")).toEqual([]);
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchJobMessages("J001")).rejects.toThrow("fail");
  });
});

describe("postMessage", () => {
  it("posts and returns message", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "M1" } });
    const payload = {
      jobId: "J001",
      claimId: null,
      messageId: null,
      messageType: "GENERAL",
      decision: null,
      message: "Hello",
    };
    expect(await postMessage(payload)).toEqual({ id: "M1" });
    expect(mockPost).toHaveBeenCalledWith("/v1/messages", payload);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(
      postMessage({
        jobId: "J",
        claimId: null,
        messageId: null,
        messageType: "T",
        decision: null,
        message: "x",
      }),
    ).rejects.toThrow("fail");
  });
});

describe("saveJobListColumns", () => {
  it("posts checked column keys", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await saveJobListColumns([
      { key: "jobId", isChecked: true, isFixed: true, order: 0 },
      { key: "customer", isChecked: false, isFixed: false, order: 1 },
    ] as any);
    expect(mockPost).toHaveBeenCalledWith("/v1/profile/preferences/job", ["jobId"]);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(saveJobListColumns([])).rejects.toThrow("fail");
  });
});

describe("deleteJobAttachment", () => {
  it("calls delete endpoint", async () => {
    mockDelete.mockResolvedValueOnce({ data: [] });
    await deleteJobAttachment("J001", "A001");
    expect(mockDelete).toHaveBeenCalledWith("/v1/jobs/J001/attachments/A001");
  });

  it("throws on error", async () => {
    mockDelete.mockRejectedValueOnce(new Error("fail"));
    await expect(deleteJobAttachment("J001", "A001")).rejects.toThrow("fail");
  });
});

describe("updateJobAssignee", () => {
  it("posts assignee update", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await updateJobAssignee("J001", "U001", "Alice");
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/J001/assignee", {
      assigneeId: "U001",
      assigneeName: "Alice",
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(updateJobAssignee("J001", "U001", "Alice")).rejects.toThrow("fail");
  });
});

describe("patchJobByJobId", () => {
  it("patches job data", async () => {
    mockPatch.mockResolvedValueOnce(undefined);
    await patchJobByJobId("J001", { jobStatus: "OPEN" } as any);
    expect(mockPatch).toHaveBeenCalledWith("/v1/jobs/J001", { jobStatus: "OPEN" });
  });

  it("throws on error", async () => {
    mockPatch.mockRejectedValueOnce(new Error("fail"));
    await expect(patchJobByJobId("J001", {})).rejects.toThrow("fail");
  });
});

describe("fetchDiagnosticByJobId", () => {
  it("returns diagnostic data", async () => {
    mockGet.mockResolvedValueOnce({ data: { jobId: "J001", materials: [] } });
    expect(await fetchDiagnosticByJobId("J001")).toEqual({ jobId: "J001", materials: [] });
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchDiagnosticByJobId("J001")).rejects.toThrow("fail");
  });
});

describe("postJobStatus", () => {
  it("posts job status", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await postJobStatus("J001", "COMPLETED");
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/J001/status", { jobStatus: "COMPLETED" });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(postJobStatus("J001", "COMPLETED")).rejects.toThrow("fail");
  });
});

describe("fetchSpecialMaterials", () => {
  it("returns special materials", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "SM1" }] });
    expect(await fetchSpecialMaterials("ZA")).toEqual([{ id: "SM1" }]);
    expect(mockGet).toHaveBeenCalledWith("/v1/special-materials", {
      params: { countryCode: "ZA" },
    });
  });

  it("throws on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchSpecialMaterials("ZA")).rejects.toThrow("fail");
  });
});

describe("simple flow endpoints", () => {
  const simplePostTests: Array<[string, () => Promise<void>, string]> = [
    [
      "postCustomerData",
      () => postCustomerData("J001", { name: "Alice" }),
      "/v1/orders/J001/customer-snapshot",
    ],
    [
      "postJobStatusStartDiagnostic",
      () => postJobStatusStartDiagnostic("J001"),
      "/v1/jobs/J001/flow/start-diagnostics",
    ],
    ["postRepairApproval", () => postRepairApproval("J001"), "/v1/jobs/J001/flow/repair-approval"],
    [
      "postInternalApprovalRequest",
      () => postInternalApprovalRequest("J001"),
      "/v1/jobs/J001/flow/bosch-approval-request",
    ],
    ["postStartReview", () => postStartReview("J001"), "/v1/jobs/J001/flow/start-review"],
    ["postStartRepair", () => postStartRepair("J001"), "/v1/jobs/J001/flow/start-repair"],
    ["postFinishRepair", () => postFinishRepair("J001"), "/v1/jobs/J001/flow/finish-repair"],
    ["postToolDelivered", () => postToolDelivered("J001"), "/v1/jobs/J001/flow/delivered"],
    [
      "postCreateCostEstimate",
      () => postCreateCostEstimate("J001"),
      "/v1/jobs/J001/flow/create-cost-estimate",
    ],
    [
      "postCustomerAnswer",
      () => postCustomerAnswer("J001", "REPAIR"),
      "/v1/jobs/J001/flow/customer-answer",
    ],
    ["postToggleJobHold", () => postToggleJobHold("J001"), "/v1/jobs/J001/toggle-hold"],
  ];

  simplePostTests.forEach(([name, fn]) => {
    it(`${name} succeeds`, async () => {
      mockPost.mockResolvedValueOnce(undefined);
      await expect(fn()).resolves.not.toThrow();
    });

    it(`${name} throws on error`, async () => {
      mockPost.mockRejectedValueOnce(new Error("fail"));
      await expect(fn()).rejects.toThrow("fail");
    });
  });
});

describe("getCostEstimationPdf", () => {
  it("returns blob on success", async () => {
    const blob = new Blob(["pdf"]);
    mockGet.mockResolvedValueOnce({ data: blob });
    expect(await getCostEstimationPdf("J001")).toBe(blob);
  });

  it("returns null on error", async () => {
    mockGet.mockRejectedValueOnce(new Error("fail"));
    expect(await getCostEstimationPdf("J001")).toBeNull();
  });
});

describe("postValidateAndSave", () => {
  it("returns validate response", async () => {
    mockPost.mockResolvedValueOnce({ data: { errorMessages: [] } });
    const result = await postValidateAndSave("J001", { materials: [] });
    expect(result).toEqual({ errorMessages: [] });
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/flow/validate-and-save", {
      jobId: "J001",
      materials: [],
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(postValidateAndSave("J001", {})).rejects.toThrow("fail");
  });
});

describe("postDiagnostic", () => {
  it("posts diagnostic payload", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await postDiagnostic("J001", { faultCode: "E001" });
    expect(mockPost).toHaveBeenCalledWith("/v1/diagnostic", { jobId: "J001", faultCode: "E001" });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("fail"));
    await expect(postDiagnostic("J001", {})).rejects.toThrow("fail");
  });
});

describe("updateJobAttachments", () => {
  it("puts attachments", async () => {
    mockPut.mockResolvedValueOnce(undefined);
    await updateJobAttachments("J001", []);
    expect(mockPut).toHaveBeenCalledWith("/v1/jobs/J001/attachments", { attachments: [] });
  });

  it("throws on error", async () => {
    mockPut.mockRejectedValueOnce(new Error("fail"));
    await expect(updateJobAttachments("J001", [])).rejects.toThrow("fail");
  });
});
