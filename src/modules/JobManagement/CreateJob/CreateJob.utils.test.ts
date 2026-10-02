import { describe, it, expect } from "vitest";
import {
  getCustomerCollapsedTitle,
  getAssetCollapsedTitle,
  getMissingAddressFieldLabels,
  getDeliveryAddressConfirmationInfo,
  getSelectedCustomerFormSnapshot,
  getCustomerChangeComparisons,
} from "./CreateJob.utils";

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
      deliveryState: "Istanbul",
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
      state: "Ankara",
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
      deliveryState: "Istanbul",
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
      deliveryState: "Istanbul",
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
      deliveryState: "Istanbul",
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
      state: "Ankara",
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
      deliveryState: "Istanbul",
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
      state: "Ankara",
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

describe("getMissingAddressFieldLabels - billing address edge cases", () => {
  it("includes countryRegion label when billing countryCode is missing", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: true,
      streetName: "Street",
      houseNumber: "1",
      neighborhood: "Center",
      postalCode: "10000",
      district: "District",
      city: "City",
      state: "State",
    };

    const result = getMissingAddressFieldLabels(values);

    expect(result).toEqual(["countryRegion"]);
  });

  it("returns all billing labels when useBillingAddressForDelivery is true and all fields empty", () => {
    const values: Record<string, unknown> = {
      useBillingAddressForDelivery: true,
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
      "countryRegion",
    ]);
  });
});

describe("customer change detection", () => {
  const selectedCustomer = {
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "john@example.com",
    phoneNumber: "123456789",
    mobileNumber: "987654321",
    companyName: "Bosch GmbH",
    dealershipName: "Dealer",
    typeOfIndustry: "INDUSTRY",
    boschCustomerNumber: "BCN-1",
    vatNumber: "VAT-1",
    communicationMedium: "EMAIL",
    useBillingAddressForDelivery: false,
    billingAddress: {
      street: "Billing St",
      houseNumber: "5",
      additionalDetails: "",
      neighborhood: "Center",
      district: "District 1",
      city: "Ankara",
      stateProvinceRegion: "Ankara",
      postalCode: "34000",
      countryCode: "TR",
    },
    deliveryAddress: {
      street: "Delivery St",
      houseNumber: "7",
      additionalDetails: "",
      neighborhood: "North",
      district: "District 2",
      city: "Istanbul",
      stateProvinceRegion: "Istanbul",
      postalCode: "10000",
      countryCode: "TR",
    },
  };

  it("builds form snapshot from selected customer", () => {
    const snapshot = getSelectedCustomerFormSnapshot(selectedCustomer as never);

    expect(snapshot.firstName).toBe("John");
    expect(snapshot.email).toBe("john@example.com");
    expect(snapshot.streetName).toBe("Billing St");
    expect(snapshot.deliveryStreetName).toBe("Delivery St");
    expect(snapshot.addressLineTwo).toBe("");
    expect(snapshot.addressLineTwoDelivery).toBe("");
  });

  it("detects address line 2 edits", () => {
    const snapshot = getSelectedCustomerFormSnapshot(selectedCustomer as never);

    expect(
      getCustomerChangeComparisons(
        {
          addressLineTwo: snapshot.addressLineTwo,
          addressLineTwoDelivery: snapshot.addressLineTwoDelivery,
        },
        selectedCustomer as never,
        [
          { fieldName: "addressLineTwo", fieldLabel: "addressLineTwo" },
          { fieldName: "addressLineTwoDelivery", fieldLabel: "addressLineTwoDelivery" },
        ],
      ),
    ).toHaveLength(0);

    expect(
      getCustomerChangeComparisons(
        {
          addressLineTwo: "Floor 2",
          addressLineTwoDelivery: snapshot.addressLineTwoDelivery,
        },
        selectedCustomer as never,
        [
          { fieldName: "addressLineTwo", fieldLabel: "addressLineTwo" },
          { fieldName: "addressLineTwoDelivery", fieldLabel: "addressLineTwoDelivery" },
        ],
      ),
    ).not.toHaveLength(0);
  });

  it("detects customer edits only for rendered fields", () => {
    const snapshot = getSelectedCustomerFormSnapshot(selectedCustomer as never);
    const currentValues = {
      firstName: snapshot.firstName,
      email: snapshot.email,
      streetName: snapshot.streetName,
      deliveryStreetName: snapshot.deliveryStreetName,
      useBillingAddressForDelivery: snapshot.useBillingAddressForDelivery,
    };

    expect(
      getCustomerChangeComparisons(
        currentValues,
        selectedCustomer as never,
        Object.keys(currentValues).map((fieldName) => ({ fieldName, fieldLabel: fieldName })),
      ),
    ).toHaveLength(0);

    expect(
      getCustomerChangeComparisons(
        { ...currentValues, firstName: "Jane" },
        selectedCustomer as never,
        Object.keys(currentValues).map((fieldName) => ({ fieldName, fieldLabel: fieldName })),
      ),
    ).not.toHaveLength(0);
  });

  it("uses provided field labels for comparisons", () => {
    const comparisons = getCustomerChangeComparisons(
      {
        firstName: "Jane",
        email: "jane@example.com",
      },
      selectedCustomer as never,
      [
        { fieldName: "firstName", fieldLabel: "customerFirstName" },
        { fieldName: "email", fieldLabel: "customerEmail" },
      ],
    );

    expect(comparisons).toEqual([
      {
        fieldName: "firstName",
        fieldLabel: "customerFirstName",
        originalValue: "John",
        currentValue: "Jane",
      },
      {
        fieldName: "email",
        fieldLabel: "customerEmail",
        originalValue: "john@example.com",
        currentValue: "jane@example.com",
      },
    ]);
  });
});
