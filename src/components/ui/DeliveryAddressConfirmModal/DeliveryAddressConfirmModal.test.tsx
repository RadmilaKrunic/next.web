import { describe, it, expect } from "vitest";
import {
  getCustomerCollapsedTitle,
  getAssetCollapsedTitle,
  getMissingAddressFieldLabels,
  getDeliveryAddressConfirmationInfo,
} from "../../../modules/JobManagement/CreateJob/CreateJob.utils";

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

describe("getMissingAddressFieldLabels", () => {
  it("checks delivery address fields when useBillingAddressForDelivery is false", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: false,
      deliveryStreetName: "Main St",
      deliveryHouseNumber: "12",
      deliveryPostalCode: "10000",
      deliveryCity: "Istanbul",
      deliveryCountry: "TR",
    };

    const result = getMissingAddressFieldLabels(values);

    expect(result).toEqual(["neighborhood", "district"]);
  });

  it("checks billing address fields when useBillingAddressForDelivery is true", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: true,
      streetName: "Billing St",
      houseNumber: "5",
      postalCode: "34000",
      city: "Ankara",
      countryCode: "TR",
    };

    const result = getMissingAddressFieldLabels(values);

    expect(result).toEqual(["neighborhood", "district"]);
  });

  it("returns empty array when all relevant fields are filled", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: false,
      deliveryStreetName: "Main St",
      deliveryHouseNumber: "12",
      deliveryNeighborhood: "Center",
      deliveryPostalCode: "10000",
      deliveryDistrict: "District 1",
      deliveryCity: "Istanbul",
      deliveryCountry: "TR",
    };

    expect(getMissingAddressFieldLabels(values)).toEqual([]);
  });

  it("returns all field labels when address is completely empty", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: false,
    };

    const result = getMissingAddressFieldLabels(values);

    expect(result).toEqual([
      "streetName",
      "houseNumber",
      "neighborhood",
      "postalCode",
      "district",
      "city",
      "state",
      "country",
    ]);
  });

  it("treats whitespace-only string values as empty", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: false,
      deliveryStreetName: "   ",
      deliveryHouseNumber: "12",
      deliveryNeighborhood: "Center",
      deliveryPostalCode: "10000",
      deliveryDistrict: "District 1",
      deliveryCity: "Istanbul",
      deliveryCountry: "TR",
    };

    expect(getMissingAddressFieldLabels(values)).toEqual(["streetName"]);
  });
});

describe("getDeliveryAddressConfirmationInfo", () => {
  it("returns null when pickupType is not DELIVERY", () => {
    const values: Record<string, unknown> = {
      pickupType: "PICKUP_IN_WORKSHOP",
    };

    expect(getDeliveryAddressConfirmationInfo(values)).toBeNull();
  });

  it("returns null when delivery address is fully filled and billing not used", () => {
    const values: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: false,
      deliveryStreetName: "Main St",
      deliveryHouseNumber: "12",
      deliveryNeighborhood: "Center",
      deliveryPostalCode: "10000",
      deliveryDistrict: "District 1",
      deliveryCity: "Istanbul",
      deliveryCountry: "TR",
    };

    expect(getDeliveryAddressConfirmationInfo(values)).toBeNull();
  });

  it("returns null when billing address is fully filled and useBillingAddressForDelivery is true", () => {
    const values: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: true,
      streetName: "Billing St",
      houseNumber: "5",
      neighborhood: "Center",
      postalCode: "34000",
      district: "District 1",
      city: "Ankara",
      countryCode: "TR",
    };

    expect(getDeliveryAddressConfirmationInfo(values)).toBeNull();
  });

  it("returns info with isAddressCompletelyEmpty=true when delivery address is fully empty, ignoring default country value", () => {
    const values: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: false,
      deliveryCountry: "TR",
    };

    const result = getDeliveryAddressConfirmationInfo(values);

    expect(result).not.toBeNull();
    expect(result?.isAddressCompletelyEmpty).toBe(true);
    expect(result?.missingFieldLabels).toEqual([
      "streetName",
      "houseNumber",
      "neighborhood",
      "postalCode",
      "district",
      "city",
    ]);
  });

  it("returns info with isAddressCompletelyEmpty=true when billing address is fully empty, ignoring default country value", () => {
    const values: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: true,
      countryCode: "TR",
    };

    const result = getDeliveryAddressConfirmationInfo(values);

    expect(result).not.toBeNull();
    expect(result?.isAddressCompletelyEmpty).toBe(true);
  });

  it("returns info with isAddressCompletelyEmpty=false when address is partially filled", () => {
    const values: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: false,
      deliveryStreetName: "Main St",
      deliveryHouseNumber: "12",
      deliveryPostalCode: "10000",
      deliveryCity: "Istanbul",
      deliveryCountry: "TR",
    };

    const result = getDeliveryAddressConfirmationInfo(values);

    expect(result).not.toBeNull();
    expect(result?.isAddressCompletelyEmpty).toBe(false);
    expect(result?.missingFieldLabels).toEqual(["neighborhood", "district"]);
  });

  it("switches to checking billing fields when useBillingAddressForDelivery changes from false to true", () => {
    const deliveryValues: Record<string, unknown> = {
      pickupType: "DELIVERY",
      useBillingAddressForDelivery: false,
      streetName: "Billing St",
      houseNumber: "5",
      neighborhood: "Center",
      postalCode: "34000",
      district: "District 1",
      city: "Ankara",
      countryCode: "TR",
    };

    const deliveryResult = getDeliveryAddressConfirmationInfo(deliveryValues);
    expect(deliveryResult).not.toBeNull();
    expect(deliveryResult?.isAddressCompletelyEmpty).toBe(true);

    const billingValues: Record<string, unknown> = {
      ...deliveryValues,
      useBillingAddressForDelivery: true,
    };

    expect(getDeliveryAddressConfirmationInfo(billingValues)).toBeNull();
  });
});
