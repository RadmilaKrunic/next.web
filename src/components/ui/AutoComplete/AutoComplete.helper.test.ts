import { describe, it, expect, vi } from "vitest";
import {
  getValueByPath,
  getAutoCompleteValue,
  getAutocompleteOptions,
  setAutocompleteFieldValue,
  getAutofillFieldName,
  handleAutoCompleteSelect,
  handleResetAutoCompleteFields,
} from "./AutoComplete.helper";
import type Field from "../../generics/Field/GenericField.types";

// Mock API dependencies to prevent actual network calls
vi.mock("../../../api/services/customers/customers", () => ({
  getCustomerByCompanyName: vi.fn(),
  getCustomerByDealershipName: vi.fn(),
  getCustomerByFirstName: vi.fn(),
  getCustomerByLastName: vi.fn(),
}));
vi.mock("../../../api/services/orders/orders", () => ({
  getSparePartsSearch: vi.fn(),
}));

import {
  getCustomerByCompanyName,
  getCustomerByDealershipName,
  getCustomerByFirstName,
  getCustomerByLastName,
} from "../../../api/services/customers/customers";
import { getSparePartsSearch } from "../../../api/services/orders/orders";
import type { AutoCompleteOption } from "./OptionItem/OptionItem";
import type { Customer } from "../../../api/services/customers/customers.types";
import type { BareToolOption } from "../../../api/services/orders/orders.types";

const makeBareToolOption = (overrides: Partial<BareToolOption> = {}): BareToolOption =>
  ({
    applicationScope: "GLOBAL",
    brand: "BOSCH",
    businessSegment: "TOOLS",
    businessSegmentId: "1",
    country: "ZA",
    description: "Spare part",
    group: "SPARE_PARTS",
    groupId: "SP",
    partNumber: "SP-1",
    tradeName: "Trade",
    voltage: "230V",
    ...overrides,
  }) as BareToolOption;

const makeCustomer = (overrides: Partial<Customer> = {}): Customer =>
  ({
    customerId: "C1",
    customerTitle: "Mr",
    ascId: "ASC",
    customerType: "PRIVATE",
    firstName: "John",
    lastName: "Doe",
    primaryEmail: "john@example.com",
    phoneNumber: "1",
    mobileNumber: "2",
    companyName: "Acme",
    dealershipName: "Dealer",
    typeOfIndustry: "Tools",
    boschCustomerNumber: "B1",
    vatNumber: "V1",
    communicationMedium: "EMAIL",
    deliveryAddress: {
      street: "s",
      houseNumber: "1",
      additionalDetails: "",
      neighborhood: "",
      district: "",
      city: "c",
      stateProvinceRegion: "sp",
      postalCode: "1",
      countryCode: "ZA",
    },
    billingAddress: {
      street: "s",
      houseNumber: "1",
      additionalDetails: "",
      neighborhood: "",
      district: "",
      city: "c",
      stateProvinceRegion: "sp",
      postalCode: "1",
      countryCode: "ZA",
    },
    useBillingAddressForDelivery: true,
    ...overrides,
  }) as Customer;

const makeField = (name: string, overrides: Partial<Field> = {}): Field =>
  ({
    name,
    label: name,
    type: "autocomplete",
    isDisabled: false,
    fieldMapping: {
      originalName: name,
      map: name,
      parentMap: [],
      prefixes: [],
      nameStartsWith: "",
    },
    ...overrides,
  }) as unknown as Field;

describe("getValueByPath", () => {
  it("returns top-level value when map key exists directly on obj", () => {
    const obj = { partNumber: "BT-001" };
    expect(getValueByPath(obj, [], "partNumber")).toBe("BT-001");
  });

  it("returns empty string when map key not found and parentMap is empty", () => {
    expect(getValueByPath({ other: "val" }, [], "missing")).toBe("");
  });

  it("traverses parentMap to find value", () => {
    const obj = { asset: { baretoolNumber: "BT-999" } };
    expect(getValueByPath(obj, ["asset"], "baretoolNumber")).toBe("BT-999");
  });

  it("returns empty string for null/undefined obj", () => {
    expect(getValueByPath(null, [], "key")).toBe("");
    expect(getValueByPath(undefined, [], "key")).toBe("");
  });

  it("returns empty string when map is empty", () => {
    expect(getValueByPath({ key: "val" }, [], "")).toBe("");
  });
});

describe("getAutoCompleteValue", () => {
  it("returns empty string when allFields is undefined", () => {
    expect(getAutoCompleteValue({ partNumber: "BT-001" }, "baretoolNumber")).toBe("");
  });

  it("returns partNumber for baretoolNumber field", () => {
    const fields = [makeField("baretoolNumber")];
    const option = { partNumber: "BT-001" };
    expect(getAutoCompleteValue(option, "baretoolNumber", fields)).toBe("BT-001");
  });

  it("returns partNumber for field name containing sparePartNumber", () => {
    const fields = [
      makeField("row0_sparePartNumber", {
        fieldMapping: {
          originalName: "sparePartNumber",
          map: "partNumber",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];
    const option = { partNumber: "SP-100" };
    expect(getAutoCompleteValue(option, "sparePartNumber", fields)).toBe("SP-100");
  });

  it("returns description for sparePartDescription field", () => {
    const fields = [makeField("sparePartDescription")];
    const option = { description: "Bearing" };
    expect(getAutoCompleteValue(option, "sparePartDescription", fields)).toBe("Bearing");
  });

  it("returns price for sparePartsUnitPrice field", () => {
    const fields = [makeField("sparePartsUnitPrice")];
    const option = { price: 49.99 };
    expect(getAutoCompleteValue(option, "sparePartsUnitPrice", fields)).toBe("49.99");
  });

  it("returns tradeName for toolModelName field", () => {
    const fields = [makeField("toolModelName")];
    const option = { tradeName: "DrillPro X", description: "Cordless Drill" };
    expect(getAutoCompleteValue(option, "toolModelName", fields)).toBe("DrillPro X");
  });

  it("falls back to description when tradeName is absent for toolModelName", () => {
    const fields = [makeField("toolModelName")];
    const option = { description: "Cordless Drill" };
    expect(getAutoCompleteValue(option, "toolModelName", fields)).toBe("Cordless Drill");
  });

  it("returns group for category field, defaulting to OTHERS", () => {
    const fields = [makeField("category")];
    const option = { group: "POWER_TOOLS" };
    expect(getAutoCompleteValue(option, "category", fields)).toBe("POWER_TOOLS");
  });

  it("returns OTHERS when group is absent for category field", () => {
    const fields = [makeField("category")];
    const option = {};
    expect(getAutoCompleteValue(option, "category", fields)).toBe("OTHERS");
  });

  it("returns uppercase brand for brand field", () => {
    const fields = [makeField("brand")];
    const option = { brand: "bosch" };
    expect(getAutoCompleteValue(option, "brand", fields)).toBe("BOSCH");
  });

  it("returns description for generic description field", () => {
    const fields = [makeField("description")];
    const option = { description: "Some description" };
    expect(getAutoCompleteValue(option, "description", fields)).toBe("Some description");
  });

  it("falls back to fieldMapping map path when no specific match", () => {
    const fields = [
      makeField("customField", {
        fieldMapping: {
          originalName: "customField",
          map: "customValue",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "",
        },
      }),
    ];
    const option = { customValue: "MY_VALUE" };
    expect(getAutoCompleteValue(option, "customField", fields)).toBe("MY_VALUE");
  });

  it("returns empty string when field not found in allFields", () => {
    const fields = [makeField("otherField")];
    expect(getAutoCompleteValue({}, "notFound", fields)).toBe("");
  });
});

describe("getAutocompleteOptions", () => {
  it("returns spare parts for baretoolNumber with language normalization", async () => {
    const bareToolOptions = [makeBareToolOption({ partNumber: "BT-1" })];
    vi.mocked(getSparePartsSearch).mockResolvedValueOnce(bareToolOptions);
    const result = await getAutocompleteOptions("baretoolNumber", "12345", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });

    expect(getSparePartsSearch).toHaveBeenCalledWith(
      "12345",
      "",
      "ZA",
      "en",
      undefined,
      10,
      1,
      undefined,
      undefined,
      undefined,
    );
    expect(result).toEqual(bareToolOptions);
  });

  it("returns spare parts for sparePartNumber and toolModelName", async () => {
    const sparePartOptions = [makeBareToolOption({ partNumber: "SP-1" })];
    vi.mocked(getSparePartsSearch).mockClear();
    vi.mocked(getSparePartsSearch).mockResolvedValue(sparePartOptions);

    const byPart = await getAutocompleteOptions("sparePartNumber", "99999", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });
    expect(getSparePartsSearch).toHaveBeenNthCalledWith(
      1,
      "99999",
      "",
      "ZA",
      "en-US",
      undefined,
      10,
      1,
      undefined,
      undefined,
      undefined,
    );
    expect(byPart).toEqual(sparePartOptions);

    const byModel = await getAutocompleteOptions("toolModelName", "A B C D E", "ASC", {
      countryCode: "ZA",
      languageCode: "en-US",
    });
    expect(getSparePartsSearch).toHaveBeenNthCalledWith(
      2,
      "",
      "ABCDE",
      "ZA",
      "en-US",
      undefined,
      10,
      1,
      undefined,
      undefined,
      undefined,
    );
    expect(byModel).toEqual(sparePartOptions);
  });

  it("returns customer options by field name and empty array for unknown", async () => {
    vi.mocked(getCustomerByFirstName).mockResolvedValueOnce([makeCustomer({ firstName: "John" })]);
    vi.mocked(getCustomerByLastName).mockResolvedValueOnce([makeCustomer({ lastName: "Doe" })]);
    vi.mocked(getCustomerByDealershipName).mockResolvedValueOnce([
      makeCustomer({ dealershipName: "Dealer" }),
    ]);
    vi.mocked(getCustomerByCompanyName).mockResolvedValueOnce([
      makeCustomer({ companyName: "Acme" }),
    ]);

    expect(await getAutocompleteOptions("firstName", "Jo", "ASC")).toEqual([
      makeCustomer({ firstName: "John" }),
    ]);
    expect(await getAutocompleteOptions("lastName", "Do", "ASC")).toEqual([
      makeCustomer({ lastName: "Doe" }),
    ]);
    expect(await getAutocompleteOptions("dealershipName", "De", "ASC")).toEqual([
      makeCustomer({ dealershipName: "Dealer" }),
    ]);
    expect(await getAutocompleteOptions("companyName", "Ac", "ASC")).toEqual([
      makeCustomer({ companyName: "Acme" }),
    ]);

    expect(await getAutocompleteOptions("unknown", "value", "ASC")).toEqual([]);
  });
});

describe("setAutocompleteFieldValue", () => {
  it("sets values for baretool/toolmodel/sparepart and customer fields", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);

    await setAutocompleteFieldValue(
      "baretoolNumber",
      { partNumber: "BT" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "toolModelName",
      { tradeName: "MODEL" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "sparePartNumber",
      { partNumber: "SP" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "companyName",
      { companyName: "ACME" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "dealershipName",
      { dealershipName: "Dealer" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "firstName",
      { firstName: "John" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue(
      "lastName",
      { lastName: "Doe" } as unknown as AutoCompleteOption,
      setFieldValue,
    );
    await setAutocompleteFieldValue("unknown", {} as unknown as AutoCompleteOption, setFieldValue);

    expect(setFieldValue).toHaveBeenCalledWith("baretoolNumber", "BT");
    expect(setFieldValue).toHaveBeenCalledWith("toolModelName", "MODEL");
    expect(setFieldValue).toHaveBeenCalledWith("sparePartNumber", "SP");
    expect(setFieldValue).toHaveBeenCalledWith("companyName", "ACME");
    expect(setFieldValue).toHaveBeenCalledWith("dealershipName", "Dealer");
    expect(setFieldValue).toHaveBeenCalledWith("firstName", "John");
    expect(setFieldValue).toHaveBeenCalledWith("lastName", "Doe");
    expect(setFieldValue).toHaveBeenCalledWith("unknown", "");
  });
});

describe("getAutofillFieldName", () => {
  it("maps assetData baretoolNumber and indexed names", () => {
    expect(getAutofillFieldName("assetData#0_baretoolNumber", "toolModelName")).toBe(
      "assetData#0_toolModelName",
    );
    expect(
      getAutofillFieldName("diagnosticData_diagnosticsSpareParts#2_sparePartNumber", "description"),
    ).toBe("diagnosticData_diagnosticsSpareParts#2_description");
    expect(getAutofillFieldName("position#3", "partNumber")).toBe("partNumber#3");
    expect(getAutofillFieldName("plainName", "fallback")).toBe("fallback");
  });
});

describe("handleAutoCompleteSelect and handleResetAutoCompleteFields", () => {
  it("sets primary field and autofill fields on select", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const mainField = makeField("row0_sparePartNumber", {
      autoFillFields: ["sparePartDescription", "sparePartsUnitPrice"],
      fieldMapping: {
        originalName: "sparePartNumber",
        map: "partNumber",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });

    const allFields = [
      mainField,
      makeField("row0_sparePartDescription", {
        fieldMapping: {
          originalName: "sparePartDescription",
          map: "description",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
      makeField("row0_sparePartsUnitPrice", {
        fieldMapping: {
          originalName: "sparePartsUnitPrice",
          map: "price",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];

    await handleAutoCompleteSelect(
      { partNumber: "SP-1", description: "Bearing", price: 10 } as unknown as AutoCompleteOption,
      mainField,
      setFieldValue,
      allFields,
    );

    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartNumber", "SP-1");
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartDescription", "Bearing");
    expect(setFieldValue).toHaveBeenCalledWith("row0_sparePartsUnitPrice", "10");
  });

  it("resets primary field and autofill fields", async () => {
    const setFieldValue = vi.fn().mockResolvedValue(undefined);
    const handleFieldChange = vi.fn().mockResolvedValue(undefined);
    const field = makeField("row0_primary", {
      defaultValue: "DEF",
      isPrimaryAutoComplete: true,
      autoFillFields: ["a1", "a2"],
      fieldMapping: {
        originalName: "primary",
        map: "primary",
        parentMap: [],
        prefixes: [],
        nameStartsWith: "row0_",
      },
    });
    const allFields = [
      makeField("row0_a1", {
        defaultValue: "D1",
        fieldMapping: {
          originalName: "a1",
          map: "a1",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
      makeField("row0_a2", {
        defaultValue: "D2",
        fieldMapping: {
          originalName: "a2",
          map: "a2",
          parentMap: [],
          prefixes: [],
          nameStartsWith: "row0_",
        },
      }),
    ];

    await handleResetAutoCompleteFields(field, setFieldValue, allFields, handleFieldChange);
    expect(handleFieldChange).toHaveBeenCalledWith("row0_primary", "DEF");
    expect(handleFieldChange).toHaveBeenCalledWith("row0_a1", "D1");
    expect(handleFieldChange).toHaveBeenCalledWith("row0_a2", "D2");
  });
});
