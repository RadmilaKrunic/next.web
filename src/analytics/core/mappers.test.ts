import { describe, it, expect } from "vitest";
import {
  resolveUserRole,
  toClaimAction,
  toClaimStatus,
  toJobStatus,
  toJobType,
  toPreApprovalAction,
} from "./mappers";
import {
  ClaimAction,
  ClaimStatus,
  JobStatus,
  JobType,
  PreApprovalAction,
  UserRole,
} from "../domain/enums";

describe("workflow value mappers", () => {
  it("normalises app UPPERCASE statuses/types to the analytics contract", () => {
    expect(toJobStatus("READY_FOR_DIAGNOSTIC")).toBe(JobStatus.READY_FOR_DIAGNOSTIC);
    expect(toJobStatus("IN_REPAIR")).toBe(JobStatus.IN_REPAIR);
    expect(toClaimStatus("PENDING")).toBe(ClaimStatus.PENDING);
    expect(toJobType("WARRANTY")).toBe(JobType.WARRANTY);
    expect(toJobType("COMMERCIAL_GOODWILL")).toBe(JobType.COMMERCIAL_GOODWILL);
  });

  it("returns undefined for unknown/blank values (so the param is omitted)", () => {
    expect(toJobStatus("NOT_A_STATUS")).toBeUndefined();
    expect(toJobStatus("")).toBeUndefined();
    expect(toJobStatus(null)).toBeUndefined();
    expect(toClaimStatus(undefined)).toBeUndefined();
    expect(toJobType("SERVICE_GOODWILL")).toBeUndefined();
  });

  it("normalises claim / pre-approval decisions to action enums", () => {
    expect(toClaimAction("APPROVED")).toBe(ClaimAction.APPROVED);
    expect(toClaimAction("Revised")).toBe(ClaimAction.REVISED);
    expect(toClaimAction("unknown")).toBeUndefined();
    expect(toPreApprovalAction("REJECTED")).toBe(PreApprovalAction.REJECTED);
    expect(toPreApprovalAction(null)).toBeUndefined();
  });
});

describe("resolveUserRole", () => {
  it("maps ASC roles, with manager taking precedence over technician", () => {
    expect(resolveUserRole({ roles: ["ASC_TECHNICIAN"] })).toBe(UserRole.ASC_TECHNICIAN);
    expect(resolveUserRole({ roles: ["ASC_MANAGER"] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: ["ASC_MANAGER_WITHOUT_CLAIM"] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: ["ASC_TECHNICIAN", "ASC_MANAGER"] })).toBe(
      UserRole.ASC_MANAGER,
    );
  });

  it("detects a country manager via claim/approval permissions", () => {
    expect(resolveUserRole({ permissions: ["AC_A"] })).toBe(UserRole.COUNTRY_MANAGER);
    expect(resolveUserRole({ roles: [], permissions: ["A_WA"] })).toBe(UserRole.COUNTRY_MANAGER);
  });

  it("returns UNKNOWN when nothing matches", () => {
    expect(resolveUserRole({})).toBe(UserRole.UNKNOWN);
    expect(resolveUserRole({ roles: ["ASC_RECEPTIONIST"] })).toBe(UserRole.UNKNOWN);
  });

  it("normalises casing/whitespace and tolerates malformed role entries", () => {
    expect(resolveUserRole({ roles: ["  asc_manager  "] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: [undefined as unknown as string, "ASC_TECHNICIAN"] })).toBe(
      UserRole.ASC_TECHNICIAN,
    );
  });
});
