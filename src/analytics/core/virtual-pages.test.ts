import { describe, it, expect } from "vitest";
import { matchesRoutePattern, resolveVirtualPage } from "./virtual-pages";
import { VirtualUrl } from "../domain/enums";

describe("matchesRoutePattern", () => {
  it("matches exact and parameterised paths", () => {
    expect(matchesRoutePattern("/job-list", "/job-list")).toBe(true);
    expect(matchesRoutePattern("/job-overview/:jobId", "/job-overview/abc-123")).toBe(true);
    expect(matchesRoutePattern("/", "/")).toBe(true);
  });

  it("rejects mismatched segment counts and literals", () => {
    expect(matchesRoutePattern("/job-overview/:jobId", "/job-overview")).toBe(false);
    expect(matchesRoutePattern("/job-list", "/job-list/extra")).toBe(false);
    expect(matchesRoutePattern("/job-list", "/claim-list")).toBe(false);
  });

  it("tolerates a trailing slash", () => {
    expect(matchesRoutePattern("/dashboard", "/dashboard/")).toBe(true);
  });
});

describe("resolveVirtualPage", () => {
  it("resolves static routes, mapping technical paths to functional URLs", () => {
    expect(resolveVirtualPage({ pathname: "/dashboard" })?.virtualUrl).toBe(VirtualUrl.DASHBOARD);
    expect(resolveVirtualPage({ pathname: "/" })?.virtualUrl).toBe(VirtualUrl.DASHBOARD);
    expect(resolveVirtualPage({ pathname: "/edit-order/42" })?.virtualUrl).toBe(
      VirtualUrl.EDIT_JOB,
    );
    expect(resolveVirtualPage({ pathname: "/approval-list" })?.virtualUrl).toBe(
      VirtualUrl.PRE_APPROVAL_LIST,
    );
  });

  it("selects the job-overview tab from the hash", () => {
    expect(
      resolveVirtualPage({ pathname: "/job-overview/1", hash: "#diagnosticData" })?.virtualUrl,
    ).toBe(VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA);
    expect(resolveVirtualPage({ pathname: "/job-overview/1", hash: "notes" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_NOTES,
    );
  });

  it("selects the claim-overview tab from the hash, including the claims tab", () => {
    expect(resolveVirtualPage({ pathname: "/claim-overview/9", hash: "#claims" })?.virtualUrl).toBe(
      VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
    );
  });

  it("falls back to the default (first) tab for a missing/unknown hash", () => {
    expect(resolveVirtualPage({ pathname: "/job-overview/1" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    );
    expect(resolveVirtualPage({ pathname: "/job-overview/1", hash: "#nope" })?.virtualUrl).toBe(
      VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    );
  });

  it("returns null for an out-of-scope route", () => {
    expect(resolveVirtualPage({ pathname: "/system-configuration" })).toBeNull();
    expect(resolveVirtualPage({ pathname: "/asc-overview/7" })).toBeNull();
  });
});
