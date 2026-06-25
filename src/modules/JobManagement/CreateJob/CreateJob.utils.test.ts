import { describe, it, expect } from "vitest";
import { getCustomerCollapsedTitle, getAssetCollapsedTitle } from "./CreateJob.utils";

describe("getCustomerCollapsedTitle", () => {
  it("builds title from firstName, phone, and email", () => {
    const values: Record<string, unknown> = {
      firstName: "John",
      phoneNumber: "123456789",
      email: "john@example.com",
    };
    expect(getCustomerCollapsedTitle(values)).toBe("John | 123456789 | john@example.com");
  });

  it("uses firstNameInPri over firstName", () => {
    const values: Record<string, unknown> = {
      firstNameInPri: "Alice",
      firstName: "Bob",
      email: "alice@example.com",
    };
    expect(getCustomerCollapsedTitle(values)).toContain("Alice");
  });

  it("uses companyName when no first name present", () => {
    const values: Record<string, unknown> = {
      companyName: "Bosch GmbH",
      email: "contact@bosch.com",
    };
    expect(getCustomerCollapsedTitle(values)).toContain("Bosch GmbH");
  });

  it("uses dealershipName as fallback customer name", () => {
    const values: Record<string, unknown> = { dealershipName: "Tech Dealer" };
    expect(getCustomerCollapsedTitle(values)).toBe("Tech Dealer");
  });

  it("returns empty string when all values are empty", () => {
    expect(getCustomerCollapsedTitle({})).toBe("");
  });

  it("uses mobileNumber when phoneNumber is absent", () => {
    const values: Record<string, unknown> = {
      firstName: "Jane",
      mobileNumber: "987654321",
    };
    expect(getCustomerCollapsedTitle(values)).toBe("Jane | 987654321");
  });

  it("uses phoneNumberInPri when phoneNumber absent", () => {
    const values: Record<string, unknown> = {
      firstName: "Jane",
      phoneNumberInPri: "111222333",
    };
    expect(getCustomerCollapsedTitle(values)).toBe("Jane | 111222333");
  });

  it("uses emailInPri when email absent", () => {
    const values: Record<string, unknown> = {
      firstName: "Jane",
      emailInPri: "jane@pri.com",
    };
    expect(getCustomerCollapsedTitle(values)).toBe("Jane | jane@pri.com");
  });
});

describe("getAssetCollapsedTitle", () => {
  it("builds title from toolModelName, baretoolNumber, serialNumber", () => {
    const values: Record<string, unknown> = {
      "assetData#0_asset_toolModelName": "Model X",
      "assetData#0_asset_baretoolNumber": "BT-123",
      "assetData#0_asset_serialNumber": "SN-456",
    };
    expect(getAssetCollapsedTitle(values, 0)).toBe("Model X | BT-123 | SN-456");
  });

  it("uses correct index prefix", () => {
    const values: Record<string, unknown> = {
      "assetData#1_asset_toolModelName": "Model Y",
      "assetData#1_asset_baretoolNumber": "BT-999",
      "assetData#1_asset_serialNumber": "",
    };
    expect(getAssetCollapsedTitle(values, 1)).toBe("Model Y | BT-999");
  });

  it("returns empty string when all asset values are empty", () => {
    expect(getAssetCollapsedTitle({}, 0)).toBe("");
  });

  it("excludes blank parts from the title", () => {
    const values: Record<string, unknown> = {
      "assetData#0_asset_toolModelName": "",
      "assetData#0_asset_baretoolNumber": "BT-001",
      "assetData#0_asset_serialNumber": "",
    };
    expect(getAssetCollapsedTitle(values, 0)).toBe("BT-001");
  });
});
