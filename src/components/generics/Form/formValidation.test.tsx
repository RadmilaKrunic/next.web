import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  getMandatoryFieldsForSection,
  getMandatoryFieldsForForm,
  getVisibleFieldsWithErrors,
  getUploadFieldErrors,
  validateByAction,
  useValidator,
  getMandatoryFields,
  ValidationErrors,
} from "./formValidation";
import Section from "../Section/GenericSection.types";
import Field from "../Field/GenericField.types";
import GenericForm from "./GenericForm.types";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        isRequired: "is required",
        valueExceedsMaxLength: "Value exceeds maximum length",
        valueIsShorterThanMinLength: "Value is shorter than minimum length",
        valueIsLessThanMinValue: "Value is less than minimum value",
        valueExceedsMaxValue: "Value exceeds maximum value",
        emailLabel: "Email",
        phoneLabel: "Phone",
        invalidEmail: "Invalid email format",
        fieldRequired: "This field is required",
        fieldDependencyError: "This field is required based on other field values",
        toolModelNameNotFound: "Tool model name '{{name}}' not found.",
        incompatibleWarrantyType: "Incompatible part/material. Warranty not applicable",
        incompatibleServiceOfferingType:
          "Incompatible part/material. Service offering not applicable",
        manufacturedDateMustBeBeforePurchaseDate:
          "Manufacture date must be before or in same month as purchase date",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock utils
vi.mock("../utils", () => ({
  isFieldVisible: vi.fn((field: Field) => {
    // Simple visibility check - field is visible by default unless explicitly hidden
    return !field.isHidden;
  }),
}));

describe("formValidation", () => {
  const createMockField = (overrides: Partial<Field> = {}): Field => ({
    name: "testField",
    label: "Test Field",
    type: "text",
    pattern: "",
    maxLength: 100,
    minLength: 0,
    minValue: 0,
    maxValue: 100,
    isDisabled: false,
    isHidden: false,
    isRequired: false,
    isSubField: false,
    isInfoIcon: false,
    position: 1,
    placeholder: "",
    options: [],
    value: "",
    errorMessage: "",
    dependentFields: [],
    dependFieldCondition: "",
    requiredDependentFields: undefined,
    calendarConfig: undefined,
    infoText: "",
    size: "medium",
    fieldMapping: {
      originalName: "testField",
      map: "",
      parentMap: [],
      prefixes: [],
    },
    ...overrides,
  });

  const createMockSection = (overrides: Partial<Section> = {}): Section => ({
    name: "testSection",
    isHidden: false,
    label: "Test Section",
    dependFieldCondition: "",
    dependentFields: [],
    position: 1,
    areas: [],
    actions: null,
    isSubSection: false,
    isAccordion: false,
    isTab: false,
    ...overrides,
  });

  const createMockForm = (overrides: Partial<GenericForm> = {}): GenericForm => ({
    name: "testForm",
    formGroup: "testGroup",
    position: 1,
    sections: [],
    actions: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMandatoryFieldsForSection", () => {
    it("returns empty array when section has no actions", () => {
      const section = createMockSection({ actions: null });
      const result = getMandatoryFieldsForSection(section, "submit");
      expect(result).toEqual([]);
    });

    it("returns empty array when section has undefined actions", () => {
      const section = createMockSection({ actions: undefined });
      const result = getMandatoryFieldsForSection(section, "submit");
      expect(result).toEqual([]);
    });

    it("returns mandatory fields for matching action", () => {
      const section = createMockSection({
        actions: [
          { name: "submit", mandatoryFields: ["field1", "field2"] },
          { name: "save", mandatoryFields: ["field3"] },
        ],
      });
      const result = getMandatoryFieldsForSection(section, "submit");
      expect(result).toEqual(["field1", "field2"]);
    });

    it("is case-insensitive when matching action names", () => {
      const section = createMockSection({
        actions: [{ name: "Submit", mandatoryFields: ["field1", "field2"] }],
      });
      const result = getMandatoryFieldsForSection(section, "SUBMIT");
      expect(result).toEqual(["field1", "field2"]);
    });

    it("returns empty array when action is not found", () => {
      const section = createMockSection({
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });
      const result = getMandatoryFieldsForSection(section, "nonexistent");
      expect(result).toEqual([]);
    });
  });

  describe("getMandatoryFieldsForForm", () => {
    it("returns empty array when form has no actions", () => {
      const form = createMockForm({ actions: null });
      const result = getMandatoryFieldsForForm(form, "submit");
      expect(result).toEqual([]);
    });

    it("returns mandatory fields for matching action", () => {
      const form = createMockForm({
        actions: [
          { name: "submit", mandatoryFields: ["field1", "field2"] },
          { name: "save", mandatoryFields: ["field3"] },
        ],
      });
      const result = getMandatoryFieldsForForm(form, "submit");
      expect(result).toEqual(["field1", "field2"]);
    });

    it("is case-insensitive when matching action names", () => {
      const form = createMockForm({
        actions: [{ name: "Submit", mandatoryFields: ["field1"] }],
      });
      const result = getMandatoryFieldsForForm(form, "SUBMIT");
      expect(result).toEqual(["field1"]);
    });
  });

  describe("getVisibleFieldsWithErrors", () => {
    it("returns only visible fields with errors", () => {
      const fields = [
        createMockField({ name: "field1", isHidden: false }),
        createMockField({ name: "field2", isHidden: false }),
        createMockField({ name: "field3", isHidden: true }),
      ];
      const errors = {
        field1: "Error 1",
        field2: "Error 2",
        field3: "Error 3",
      };
      const values = {};

      const result = getVisibleFieldsWithErrors(fields, errors, values);
      expect(result).toEqual(["field1", "field2"]);
    });

    it("returns empty array when no errors exist", () => {
      const fields = [createMockField({ name: "field1" })];
      const errors = {};
      const values = {};

      const result = getVisibleFieldsWithErrors(fields, errors, values);
      expect(result).toEqual([]);
    });

    it("excludes fields without errors", () => {
      const fields = [createMockField({ name: "field1" }), createMockField({ name: "field2" })];
      const errors = { field1: "Error 1" };
      const values = {};

      const result = getVisibleFieldsWithErrors(fields, errors, values);
      expect(result).toEqual(["field1"]);
    });
  });

  describe("validateByAction", () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        isRequired: "is required",
        emailLabel: "Email",
        invalidEmail: "Invalid email format",
        valueExceedsMaxLength: "Value exceeds maximum length",
        valueIsShorterThanMinLength: "Value is shorter than minimum length",
        valueIsLessThanMinValue: "Value is less than minimum value",
        valueExceedsMaxValue: "Value exceeds maximum value",
        toolModelNameNotFound: "Tool model name '{{name}}' not found.",
        incompatibleWarrantyType: "Incompatible part/material. Warranty not applicable",
        incompatibleServiceOfferingType:
          "Incompatible part/material. Service offering not applicable",
        manufacturedDateMustBeBeforePurchaseDate:
          "Manufacture date must be before or in same month as purchase date",
      };
      return translations[key] || key;
    };

    it("adds error for empty mandatory field", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "emailLabel",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      const values = { email: "" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.email).toBe("Email is required");
    });

    it("adds error for empty mandatory multi-select field", () => {
      const fields = [
        createMockField({
          name: "accountRoles",
          label: "role",
          type: "dropdown",
          multiSelect: true,
          fieldMapping: { originalName: "accountRoles" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["accountRoles"];
      const values = { accountRoles: [] };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.accountRoles).toBe("role is required");
    });

    it("does not validate non-mandatory fields", () => {
      const fields = [
        createMockField({
          name: "optionalField",
          fieldMapping: { originalName: "optionalField" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      const values = { optionalField: "" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.optionalField).toBeUndefined();
    });

    it("validates only touched fields when onlyTouched is true", () => {
      const fields = [
        createMockField({
          name: "field1",
          fieldMapping: { originalName: "field1" },
        }),
        createMockField({
          name: "field2",
          fieldMapping: { originalName: "field2" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1", "field2"];
      const values = { field1: "", field2: "" };
      const touchedFields = { field1: true, field2: false };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        onlyTouched: true,
        touchedFields,
        t: mockT,
      });

      expect(errors.field1).toBeDefined();
      expect(errors.field2).toBeUndefined();
    });

    it("validates pattern with base64 encoded regex", () => {
      // Base64 encoded pattern for email: ^[^\s@]+@[^\s@]+\.[^\s@]+$
      const emailPattern = btoa(String.raw`^[^\s@]+@[^\s@]+\.[^\s@]+$`);
      const fields = [
        createMockField({
          name: "email",
          label: "emailLabel",
          pattern: emailPattern,
          patternText: "invalidEmail",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      const values = { email: "invalid-email" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.email).toBe("Invalid email format");
    });

    it("validates maxLength constraint", () => {
      const fields = [
        createMockField({
          name: "name",
          label: "Name",
          maxLength: 5,
          fieldMapping: { originalName: "name" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["name"];
      const values = { name: "TooLongName" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.name).toBe("Value exceeds maximum length 5");
    });

    it("validates minLength constraint", () => {
      const fields = [
        createMockField({
          name: "name",
          label: "Name",
          minLength: 5,
          fieldMapping: { originalName: "name" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["name"];
      const values = { name: "Tim" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.name).toBe("Value is shorter than minimum length 5");
    });

    it("validates minValue constraint for numbers", () => {
      const fields = [
        createMockField({
          name: "age",
          label: "Age",
          minValue: 18,
          fieldMapping: { originalName: "age" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["age"];
      const values = { age: 15 };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.age).toBe("Value is less than minimum value 18");
    });

    it("validates maxValue constraint for numbers", () => {
      const fields = [
        createMockField({
          name: "age",
          label: "Age",
          maxValue: 100,
          fieldMapping: { originalName: "age" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["age"];
      const values = { age: 120 };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.age).toBe("Value exceeds maximum value 100");
    });

    it("validates field with requiredDependentFields - AND condition", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          requiredDependentFields: {
            errorMessageByValue: "fieldDependencyError",
            byValueAnd: [
              { fieldName: "field2", fieldValue: true },
              { fieldName: "field3", fieldValue: "true" },
            ],
          },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = { field1: "", field2: true, field3: "true" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Field is empty and dependency condition is met, so it shows the dependency error
      expect(errors.field1).toBe("fieldDependencyError");
    });

    it("validates field with requiredDependentFields - OR condition", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          requiredDependentFields: {
            errorMessageByValue: "fieldDependencyError",
            byValueOr: [
              { fieldName: "field2", fieldValue: true },
              { fieldName: "field3", fieldValue: false },
            ],
          },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = { field1: "", field2: true, field3: "false" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Field is empty and dependency condition is met, so it shows the dependency error
      expect(errors.field1).toBe("fieldDependencyError");
    });

    it("does not show dependency error when field has value", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          requiredDependentFields: {
            errorMessageByValue: "fieldDependencyError",
            byValueAnd: [{ fieldName: "field2", fieldValue: true }],
          },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = { field1: "some value", field2: true };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Field has a value, so no error even though dependencies are met
      expect(errors.field1).toBeUndefined();
    });

    it("handles allEmpty validation - all fields empty", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          requiredDependentFields: {
            allEmpty: ["field1", "field2"],
            errorMessageAllEmpty: "At least one field must be filled",
            errorMessageByValue: "",
          },
        }),
        createMockField({
          name: "field2",
          label: "Field 2",
          fieldMapping: { originalName: "field2" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = { field1: "", field2: "" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.field1).toBe("At least one field must be filled");
      expect(errors.field2).toBe("At least one field must be filled");
    });

    it("prioritizes byValue error over allEmpty when both conditions exist and byValue is met", () => {
      // Simulates the real scenario: email/phoneNumber/mobileNumber with communicationMedium
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          fieldMapping: { originalName: "email" },
          requiredDependentFields: {
            allEmpty: ["phoneNumber", "email", "mobileNumber"],
            errorMessageAllEmpty: "requiredPhoneorNumberMessage",
            errorMessageByValue: "requiredEmailForCommunicationMessage",
            byValueOr: [
              {
                fieldName: "communicationMedium",
                fieldValue: "EMAIL",
              },
            ],
          },
        }),
        createMockField({
          name: "phoneNumber",
          label: "Phone Number",
          fieldMapping: { originalName: "phoneNumber" },
        }),
        createMockField({
          name: "mobileNumber",
          label: "Mobile Number",
          fieldMapping: { originalName: "mobileNumber" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      // All contact fields empty AND communicationMedium is EMAIL
      const values = {
        phoneNumber: "",
        email: "",
        mobileNumber: "",
        communicationMedium: "EMAIL",
      };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Should show the specific byValue error, not the generic allEmpty error
      expect(errors.email).toBe("requiredEmailForCommunicationMessage");
      expect(errors.phoneNumber).toBeUndefined();
      expect(errors.mobileNumber).toBeUndefined();
    });

    it("shows allEmpty error when byValue condition is not met", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          fieldMapping: { originalName: "email" },
          requiredDependentFields: {
            allEmpty: ["phoneNumber", "email", "mobileNumber"],
            errorMessageAllEmpty: "requiredPhoneorNumberMessage",
            errorMessageByValue: "requiredEmailForCommunicationMessage",
            byValueOr: [
              {
                fieldName: "communicationMedium",
                fieldValue: "EMAIL",
              },
            ],
          },
        }),
        createMockField({
          name: "phoneNumber",
          label: "Phone Number",
          fieldMapping: { originalName: "phoneNumber" },
        }),
        createMockField({
          name: "mobileNumber",
          label: "Mobile Number",
          fieldMapping: { originalName: "mobileNumber" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      // All contact fields empty BUT communicationMedium is NOT EMAIL
      const values = {
        phoneNumber: "",
        email: "",
        mobileNumber: "",
        communicationMedium: "SMS",
      };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Should show the allEmpty error on all empty fields
      expect(errors.email).toBe("requiredPhoneorNumberMessage");
      expect(errors.phoneNumber).toBe("requiredPhoneorNumberMessage");
      expect(errors.mobileNumber).toBe("requiredPhoneorNumberMessage");
    });

    it("does not show error when byValue condition is not met and no allEmpty condition", () => {
      // Simulates companyName: visible for COMPANY and INDIVIDUAL_PRO, but only required for COMPANY
      const fields = [
        createMockField({
          name: "companyName",
          label: "Company Name",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            errorMessageByValue: "companyNameRequired",
            byValueOr: [
              {
                fieldName: "typeOfUser",
                fieldValue: "COMPANY",
              },
            ],
          },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["companyName"];
      // typeOfUser is INDIVIDUAL_PRO (field visible but not required)
      const values = {
        companyName: "",
        typeOfUser: "INDIVIDUAL_PRO",
      };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Should NOT show error because byValue condition is not met and there's no allEmpty
      expect(errors.companyName).toBeUndefined();
    });

    it("shows error when byValue condition is met", () => {
      const fields = [
        createMockField({
          name: "companyName",
          label: "Company Name",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            errorMessageByValue: "companyNameRequired",
            byValueOr: [
              {
                fieldName: "typeOfUser",
                fieldValue: "COMPANY",
              },
            ],
          },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["companyName"];
      // typeOfUser is COMPANY (field visible AND required)
      const values = {
        companyName: "",
        typeOfUser: "COMPANY",
      };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      // Should show the specific byValue error
      expect(errors.companyName).toBe("companyNameRequired");
    });

    it("does not add error when field has value", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "emailLabel",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["email"];
      const values = { email: "test@example.com" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.email).toBeUndefined();
    });

    it("adds error when manufactured month is after purchase month", () => {
      const fields = [
        createMockField({
          name: "assetData#0_asset_purchaseDate",
          label: "purchaseDate",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      const values = {
        "assetData#0_asset_purchaseDate": "2024-05-10",
        "assetData#0_asset_manufacturedDate": "06/2024",
      };

      validateByAction({
        errors,
        mandatoryFields: [],
        values,
        fields,
        t: mockT,
      });

      expect(errors["assetData#0_asset_purchaseDate"]).toBe(
        "Manufacture date must be before or in same month as purchase date",
      );
    });

    it("allows same month for manufactured and purchase dates", () => {
      const fields = [
        createMockField({
          name: "assetData#0_asset_purchaseDate",
          label: "purchaseDate",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      const values = {
        "assetData#0_asset_purchaseDate": "2024-05-01",
        "assetData#0_asset_manufacturedDate": "05/2024",
      };

      validateByAction({
        errors,
        mandatoryFields: [],
        values,
        fields,
        t: mockT,
      });

      expect(errors["assetData#0_asset_purchaseDate"]).toBeUndefined();
    });

    it("skips check when manufactured date format is unknown", () => {
      const fields = [
        createMockField({
          name: "assetData#0_asset_purchaseDate",
          label: "purchaseDate",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      const values = {
        "assetData#0_asset_purchaseDate": "2024-05-01",
        "assetData#0_asset_manufacturedDate": "999",
      };

      validateByAction({
        errors,
        mandatoryFields: [],
        values,
        fields,
        t: mockT,
      });

      expect(errors["assetData#0_asset_purchaseDate"]).toBeUndefined();
    });

    it("validates null values as empty", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = { field1: null };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.field1).toBe("Field 1 is required");
    });

    it("validates undefined values as empty", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["field1"];
      const values = {};

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.field1).toBe("Field 1 is required");
    });

    it("skips validation for hidden fields and clears existing errors", () => {
      const fields = [
        createMockField({
          name: "exchangeReason",
          label: "exchangeReason",
          isHidden: true,
          fieldMapping: { originalName: "exchangeReason" },
        }),
      ];
      const errors: ValidationErrors = { exchangeReason: "exchangeReason is required" };
      const mandatoryFields = ["exchangeReason"];
      const values = { exchangeReason: "" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.exchangeReason).toBeUndefined();
    });

    it("does not require exchangeReason when action type is not exchange", () => {
      const fields = [
        createMockField({
          name: "actionType",
          label: "actionType",
          fieldMapping: { originalName: "actionType" },
        }),
        createMockField({
          name: "exchangeReason",
          label: "exchangeReason",
          isHidden: true,
          fieldMapping: { originalName: "exchangeReason" },
        }),
      ];
      const errors: ValidationErrors = {};
      const mandatoryFields = ["actionType", "exchangeReason"];
      const values = { actionType: "REPAIR", exchangeReason: "" };

      validateByAction({
        errors,
        mandatoryFields,
        values,
        fields,
        t: mockT,
      });

      expect(errors.exchangeReason).toBeUndefined();
      expect(errors.actionType).toBeUndefined();
    });

    describe("toolModelName autocomplete validation", () => {
      it("blocks submission when autocomplete value is not validated (isValidated === false)", () => {
        const fields = [
          createMockField({
            name: "toolModelName",
            type: "autocomplete",
            fieldMapping: { originalName: "toolModelName" },
          }),
        ];
        const errors: ValidationErrors = {};
        const mandatoryFields: string[] = [];
        const values = { toolModelName: "DummyName" };
        const autocompleteValidationRef = { current: { toolModelName: false } };

        validateByAction({
          errors,
          mandatoryFields,
          values,
          fields,
          t: mockT,
          autocompleteValidationRef,
        });

        expect(errors.toolModelName).toBe("Tool model name 'DummyName' not found.");
      });

      it("allows submission when autocomplete value is validated (isValidated === true)", () => {
        const fields = [
          createMockField({
            name: "toolModelName",
            type: "autocomplete",
            fieldMapping: { originalName: "toolModelName" },
          }),
        ];
        const errors: ValidationErrors = {};
        const mandatoryFields: string[] = [];
        const values = { toolModelName: "PSB 1800-2-LI" };
        const autocompleteValidationRef = { current: { toolModelName: true } };

        validateByAction({
          errors,
          mandatoryFields,
          values,
          fields,
          t: mockT,
          autocompleteValidationRef,
        });

        expect(errors.toolModelName).toBeUndefined();
      });

      it("allows submission when ref entry is undefined (untouched / edit-mode pre-populated)", () => {
        const fields = [
          createMockField({
            name: "toolModelName",
            type: "autocomplete",
            fieldMapping: { originalName: "toolModelName" },
          }),
        ];
        const errors: ValidationErrors = {};
        const mandatoryFields: string[] = [];
        const values = { toolModelName: "PSB 1800-2-LI" };
        const autocompleteValidationRef = { current: {} };

        validateByAction({
          errors,
          mandatoryFields,
          values,
          fields,
          t: mockT,
          autocompleteValidationRef,
        });

        expect(errors.toolModelName).toBeUndefined();
      });

      it("adds required error when toolModelName is empty and mandatory", () => {
        const fields = [
          createMockField({
            name: "toolModelName",
            label: "toolModelName",
            type: "autocomplete",
            fieldMapping: { originalName: "toolModelName" },
          }),
        ];
        const errors: ValidationErrors = {};
        const mandatoryFields = ["toolModelName"];
        const values = { toolModelName: "" };
        const autocompleteValidationRef = { current: {} };

        validateByAction({
          errors,
          mandatoryFields,
          values,
          fields,
          t: mockT,
          autocompleteValidationRef,
        });

        expect(errors.toolModelName).toBeDefined();
      });
    });

    describe("spare part compatibility validation", () => {
      const buildSparePartFields = () => [
        createMockField({
          name: "sparePartNumber",
          type: "autocomplete",
          fieldMapping: { originalName: "sparePartNumber", nameStartsWith: "row1" },
        }),
        createMockField({
          name: "rowType",
          subtype: "diagnosticType",
          fieldMapping: { originalName: "rowType", nameStartsWith: "row1" },
        }),
      ];

      it("blocks submission for WARRANTY part flagged as not belonging to the tool", () => {
        const fields = buildSparePartFields();
        const errors: ValidationErrors = {};
        const values = { sparePartNumber: "123456789", rowType: "WARRANTY", actionType: "REPAIR" };
        const sparePartNotBelongsToToolRef = { current: { sparePartNumber: true } };

        validateByAction({
          errors,
          mandatoryFields: [],
          values,
          fields,
          t: mockT,
          sparePartNotBelongsToToolRef,
        });

        expect(errors.sparePartNumber).toBe("Incompatible part/material. Warranty not applicable");
      });

      it("blocks submission for SERVICE_OFFERING part flagged as not belonging to the tool", () => {
        const fields = buildSparePartFields();
        const errors: ValidationErrors = {};
        const values = {
          sparePartNumber: "123456789",
          rowType: "SERVICE_OFFERING",
          actionType: "REPAIR",
        };
        const sparePartNotBelongsToToolRef = { current: { sparePartNumber: true } };

        validateByAction({
          errors,
          mandatoryFields: [],
          values,
          fields,
          t: mockT,
          sparePartNotBelongsToToolRef,
        });

        expect(errors.sparePartNumber).toBe(
          "Incompatible part/material. Service offering not applicable",
        );
      });

      it("allows submission when actionType is an exchange type", () => {
        const fields = buildSparePartFields();
        const errors: ValidationErrors = {};
        const values = {
          sparePartNumber: "123456789",
          rowType: "WARRANTY",
          actionType: "NEW_TOOL_EXCHANGE",
        };
        const sparePartNotBelongsToToolRef = { current: { sparePartNumber: true } };

        validateByAction({
          errors,
          mandatoryFields: [],
          values,
          fields,
          t: mockT,
          sparePartNotBelongsToToolRef,
        });

        expect(errors.sparePartNumber).toBeUndefined();
      });

      it("does not overwrite an existing pattern/length error on the same field", () => {
        const emailPattern = btoa("^[0-9]+$");
        const fields = [
          createMockField({
            name: "sparePartNumber",
            type: "autocomplete",
            pattern: emailPattern,
            patternText: "invalidEmail",
            fieldMapping: { originalName: "sparePartNumber", nameStartsWith: "row1" },
          }),
          createMockField({
            name: "rowType",
            subtype: "diagnosticType",
            fieldMapping: { originalName: "rowType", nameStartsWith: "row1" },
          }),
        ];
        const errors: ValidationErrors = {};
        const values = {
          sparePartNumber: "NOT-NUMERIC",
          rowType: "WARRANTY",
          actionType: "REPAIR",
        };
        const sparePartNotBelongsToToolRef = { current: { sparePartNumber: true } };

        validateByAction({
          errors,
          mandatoryFields: [],
          values,
          fields,
          t: mockT,
          sparePartNotBelongsToToolRef,
        });

        expect(errors.sparePartNumber).toBe("Invalid email format");
      });

      it("clears a stale incompatibility error once the part is no longer flagged", () => {
        const fields = buildSparePartFields();
        const errors: ValidationErrors = {
          sparePartNumber: "Incompatible part/material. Warranty not applicable",
        };
        const values = { sparePartNumber: "123456789", rowType: "WARRANTY", actionType: "REPAIR" };
        const sparePartNotBelongsToToolRef = { current: { sparePartNumber: false } };

        validateByAction({
          errors,
          mandatoryFields: [],
          values,
          fields,
          t: mockT,
          sparePartNotBelongsToToolRef,
        });

        expect(errors.sparePartNumber).toBeUndefined();
      });
    });
  });

  describe("useValidator", () => {
    it("returns a validation function", () => {
      const { result } = renderHook(() => useValidator());
      expect(typeof result.current).toBe("function");
    });

    it("validates form fields and returns errors", () => {
      const { result } = renderHook(() => useValidator());
      const validateForm = result.current;

      const fields = [
        createMockField({
          name: "email",
          label: "emailLabel",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const values = { email: "" };
      const mandatoryFields = ["email"];

      const errors = validateForm({ fields, values, mandatoryFields });

      expect(errors.email).toBeDefined();
    });

    it("validates only touched fields when onlyTouched is true", () => {
      const { result } = renderHook(() => useValidator());
      const validateForm = result.current;

      const fields = [
        createMockField({
          name: "field1",
          fieldMapping: { originalName: "field1" },
        }),
        createMockField({
          name: "field2",
          fieldMapping: { originalName: "field2" },
        }),
      ];
      const values = { field1: "", field2: "" };
      const mandatoryFields = ["field1", "field2"];
      const touchedFields = { field1: true, field2: false };

      const errors = validateForm({
        fields,
        values,
        mandatoryFields,
        onlyTouched: true,
        touchedFields,
      });

      expect(errors.field1).toBeDefined();
      expect(errors.field2).toBeUndefined();
    });

    it("returns empty object when all validations pass", () => {
      const { result } = renderHook(() => useValidator());
      const validateForm = result.current;

      const fields = [
        createMockField({
          name: "email",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const values = { email: "test@example.com" };
      const mandatoryFields = ["email"];

      const errors = validateForm({ fields, values, mandatoryFields });

      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe("getMandatoryFields", () => {
    it("returns empty object for form with no actions", () => {
      const form = createMockForm({
        sections: [createMockSection()],
        actions: null,
      });

      const result = getMandatoryFields(form);

      expect(result).toEqual({});
    });

    it("aggregates mandatory fields from form actions", () => {
      const form = createMockForm({
        sections: [],
        actions: [
          { name: "submit", mandatoryFields: ["field1", "field2"] },
          { name: "save", mandatoryFields: ["field3"] },
        ],
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["field1", "field2"]);
      expect(result.save.fieldList).toEqual(["field3"]);
    });

    it("aggregates mandatory fields from section actions", () => {
      const section = createMockSection({
        actions: [{ name: "submit", mandatoryFields: ["field1", "field2"] }],
      });
      const form = createMockForm({
        sections: [section],
        actions: null,
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["field1", "field2"]);
      expect(result.submit.section).toBe(section);
    });

    it("merges mandatory fields from both form and section actions", () => {
      const section = createMockSection({
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });
      const form = createMockForm({
        sections: [section],
        actions: [{ name: "submit", mandatoryFields: ["field2", "field3"] }],
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["field1", "field2", "field3"]);
    });

    it("handles multiple sections with different actions", () => {
      const section1 = createMockSection({
        name: "section1",
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });
      const section2 = createMockSection({
        name: "section2",
        actions: [{ name: "validate", mandatoryFields: ["field2"] }],
      });
      const form = createMockForm({
        sections: [section1, section2],
        actions: null,
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["field1"]);
      expect(result.validate.fieldList).toEqual(["field2"]);
    });

    it("uses lowercase keys for action names", () => {
      const form = createMockForm({
        actions: [{ name: "SUBMIT", mandatoryFields: ["field1"] }],
      });

      const result = getMandatoryFields(form);

      expect(result.submit).toBeDefined();
      expect(result.SUBMIT).toBeUndefined();
    });

    it("handles sections without actions", () => {
      const section = createMockSection({
        actions: null,
      });
      const form = createMockForm({
        sections: [section],
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["field1"]);
    });

    it("skips section when user lacks required permission", () => {
      const section = createMockSection({
        permissions: ["ADMIN"],
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });
      const form = createMockForm({ sections: [section], actions: null });

      const result = getMandatoryFields(form, ["USER"]);

      expect(result.submit).toBeUndefined();
    });

    it("includes section when user has required permission", () => {
      const section = createMockSection({
        permissions: ["ADMIN"],
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });
      const form = createMockForm({ sections: [section], actions: null });

      const result = getMandatoryFields(form, ["ADMIN"]);

      expect(result.submit.fieldList).toEqual(["field1"]);
    });

    it("skips form actions when user lacks required permission", () => {
      const form = createMockForm({
        sections: [],
        permissions: ["ADMIN"],
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });

      const result = getMandatoryFields(form, ["USER"]);

      expect(result.submit).toBeUndefined();
    });

    it("includes form actions when user has required permission", () => {
      const form = createMockForm({
        sections: [],
        permissions: ["ADMIN"],
        actions: [{ name: "submit", mandatoryFields: ["field1"] }],
      });

      const result = getMandatoryFields(form, ["ADMIN"]);

      expect(result.submit.fieldList).toEqual(["field1"]);
    });

    it("skips action without a name", () => {
      const section = createMockSection({
        actions: [{ name: undefined, mandatoryFields: ["field1"] }],
      });
      const form = createMockForm({ sections: [section], actions: null });

      const result = getMandatoryFields(form);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("skips form-level action without a name", () => {
      const form = createMockForm({
        sections: [],
        actions: [{ name: undefined, mandatoryFields: ["field1"] }],
      });

      const result = getMandatoryFields(form);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("getMandatoryFieldsForForm additional branches", () => {
    it("returns empty array when form actions is undefined", () => {
      const form = createMockForm({ actions: undefined });
      expect(getMandatoryFieldsForForm(form, "submit")).toEqual([]);
    });

    it("returns empty array when action found but has no mandatoryFields", () => {
      const form = createMockForm({
        actions: [{ name: "submit" }],
      });
      expect(getMandatoryFieldsForForm(form, "submit")).toEqual([]);
    });
  });

  describe("getMandatoryFieldsForSection additional branches", () => {
    it("returns empty array when action found but has no mandatoryFields", () => {
      const section = createMockSection({
        actions: [{ name: "submit" }],
      });
      expect(getMandatoryFieldsForSection(section, "submit")).toEqual([]);
    });
  });

  describe("getUploadFieldErrors", () => {
    const mockT = (key: string) => key;

    it("returns empty array for non-upload field", () => {
      const field = createMockField({ type: "text", name: "doc" });
      expect(getUploadFieldErrors(field, {})).toEqual([]);
    });

    it("returns empty array when requiredDocuments is absent", () => {
      const field = createMockField({ type: "upload", name: "doc", requiredDocuments: [] });
      expect(getUploadFieldErrors(field, {})).toEqual([]);
    });

    it("returns empty array when condition is not met", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { status: "INACTIVE", doc: [] };
      expect(getUploadFieldErrors(field, values)).toEqual([]);
    });

    it("returns empty array when condition met and required file is present", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { status: "ACTIVE", doc: [{ type: "PDF" }] };
      expect(getUploadFieldErrors(field, values)).toEqual([]);
    });

    it("returns error when condition met and required file is missing", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { status: "ACTIVE", doc: [] };
      expect(getUploadFieldErrors(field, values)).toEqual(["pdfRequired"]);
      expect(field.patternText).toBe("pdfRequired");
    });

    it("returns multiple errors and sets patternText to first", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["jpg"],
            errorMessage: "imageRequired",
          },
        ],
      });
      const values = { status: "ACTIVE", doc: [] };
      const result = getUploadFieldErrors(field, values);
      expect(result).toEqual(["pdfRequired", "imageRequired"]);
      expect(field.patternText).toBe("pdfRequired");
    });

    it("uses wildcard * condition — met when field is truthy", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "anyField", fieldValue: "*" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { anyField: "someValue", doc: [] };
      expect(getUploadFieldErrors(field, values)).toEqual(["pdfRequired"]);
    });

    it("uses wildcard * condition — not met when field is falsy", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "anyField", fieldValue: "*" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { anyField: "", doc: [] };
      expect(getUploadFieldErrors(field, values)).toEqual([]);
    });

    it("treats non-array upload value as empty", () => {
      const field = createMockField({
        type: "upload",
        name: "doc",
        requiredDocuments: [
          {
            requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
            documentTypes: ["pdf"],
            errorMessage: "pdfRequired",
          },
        ],
      });
      const values = { status: "ACTIVE", doc: "not-an-array" };
      expect(getUploadFieldErrors(field, values)).toEqual(["pdfRequired"]);
    });

    void mockT;
  });

  describe("validateByAction — additional coverage", () => {
    const mockT = (key: string) => {
      const map: Record<string, string> = {
        isRequired: "is required",
        invalidFormat: "Invalid format",
        invalidEmail: "Invalid email format",
        manufacturedDateMustBeBeforePurchaseDate:
          "Manufacture date must be before or in same month as purchase date",
        serialNumberMustHave: "Serial number must have valid length",
        dremelSerialNumberMustHave: "Dremel serial number must have valid length",
        incompatibleWarrantyType: "Incompatible part/material. Warranty not applicable",
        incompatibleServiceOfferingType:
          "Incompatible part/material. Service offering not applicable",
        bareToolNumberNotFound: "Bare tool number {{id}} not found.",
        toolModelNameNotFound: "Tool model name {{name}} not found.",
      };
      return map[key] ?? key;
    };

    // ── areAllFieldsEmpty with null values ────────────────────────────────────

    it("treats null group values as empty in allEmpty validation", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          fieldMapping: { originalName: "email" },
          requiredDependentFields: {
            allEmpty: ["email", "phone"],
            errorMessageAllEmpty: "atLeastOneRequired",
          },
        }),
        createMockField({ name: "phone", label: "Phone", fieldMapping: { originalName: "phone" } }),
      ];
      const errors: ValidationErrors = {};
      // phone is null — should count as empty
      validateByAction({
        errors,
        mandatoryFields: ["email"],
        values: { email: "", phone: null },
        fields,
        t: mockT,
      });
      expect(errors.email).toBe("atLeastOneRequired");
      expect(errors.phone).toBe("atLeastOneRequired");
    });

    // ── clearMatchingGroupErrors — stale allEmpty errors cleared ─────────────

    it("clears stale allEmpty errors once group is no longer all empty", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          fieldMapping: { originalName: "email" },
          requiredDependentFields: {
            allEmpty: ["email", "phone"],
            errorMessageAllEmpty: "atLeastOneRequired",
          },
        }),
        createMockField({ name: "phone", label: "Phone", fieldMapping: { originalName: "phone" } }),
      ];
      // Pre-existing stale errors from previous validation run
      const errors: ValidationErrors = {
        email: "atLeastOneRequired",
        phone: "atLeastOneRequired",
      };
      // Now phone has a value — group is no longer all empty
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { email: "", phone: "555-1234" },
        fields,
        t: mockT,
      });
      expect(errors.email).toBeUndefined();
      expect(errors.phone).toBeUndefined();
    });

    // ── applyGroupErrors with onlyTouched ────────────────────────────────────

    it("applies allEmpty error only to touched fields when onlyTouched=true", () => {
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          fieldMapping: { originalName: "email" },
          requiredDependentFields: {
            allEmpty: ["email", "phone"],
            errorMessageAllEmpty: "atLeastOneRequired",
          },
        }),
        createMockField({ name: "phone", label: "Phone", fieldMapping: { originalName: "phone" } }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["email"],
        values: { email: "", phone: "" },
        fields,
        onlyTouched: true,
        touchedFields: { email: true, phone: false },
        t: mockT,
      });
      expect(errors.email).toBe("atLeastOneRequired");
      expect(errors.phone).toBeUndefined();
    });

    // ── checkDependencyCondition with empty arrays ────────────────────────────

    it("does not error when byValueAnd and byValueOr are empty arrays", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          requiredDependentFields: {
            byValueAnd: [],
            byValueOr: [],
            errorMessageByValue: "conditionalError",
          },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["field1"],
        values: { field1: "" },
        fields,
        t: mockT,
      });
      // condition never met (empty arrays) → no byValue error, falls through to simple required check
      // but hasByValueCondition=true & byValueConditionMet=false → handleRequiredFieldCheck deletes error
      expect(errors.field1).toBeUndefined();
    });

    // ── handleRequiredFieldCheck — byValue condition not met, delete stale error ──

    it("removes stale required error when byValue condition is no longer met", () => {
      const fields = [
        createMockField({
          name: "companyName",
          label: "Company Name",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            byValueOr: [{ fieldName: "typeOfUser", fieldValue: "COMPANY" }],
            errorMessageByValue: "companyNameRequired",
          },
        }),
      ];
      // Stale error from when typeOfUser was COMPANY
      const errors: ValidationErrors = { companyName: "Company Name is required" };
      validateByAction({
        errors,
        mandatoryFields: ["companyName"],
        values: { companyName: "", typeOfUser: "INDIVIDUAL" },
        fields,
        t: mockT,
      });
      expect(errors.companyName).toBeUndefined();
    });

    // ── validatePattern — pattern matches, clear stale patternText error ─────

    it("clears stale pattern error when value now matches pattern", () => {
      const emailPattern = btoa("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          pattern: emailPattern,
          patternText: "invalidEmail",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = { email: "Invalid email format" };
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { email: "valid@example.com" },
        fields,
        t: mockT,
      });
      expect(errors.email).toBeUndefined();
    });

    // ── validatePattern — pattern matches, clear stale sameDataFieldAs error ─

    it("clears stale sameDataFieldAs error when value now matches pattern", () => {
      const emailPattern = btoa("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          pattern: emailPattern,
          patternText: "invalidEmail",
          sameDataFieldAs: "emailCopy",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = {
        email: "Invalid email format",
        emailCopy: "Invalid email format",
      };
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { email: "valid@example.com" },
        fields,
        t: mockT,
      });
      expect(errors.email).toBeUndefined();
      expect(errors.emailCopy).toBeUndefined();
    });

    // ── validatePattern — pattern fails, no patternText → "invalidFormat" ───

    it("uses invalidFormat when pattern fails and patternText is absent", () => {
      const numericPattern = btoa("^[0-9]+$");
      const fields = [
        createMockField({
          name: "code",
          label: "Code",
          pattern: numericPattern,
          patternText: undefined,
          fieldMapping: { originalName: "code" },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { code: "abc" },
        fields,
        t: mockT,
      });
      expect(errors.code).toBe("Invalid format");
    });

    // ── validatePattern — pattern fails, propagate error to sameDataFieldAs ─

    it("sets error on sameDataFieldAs field when pattern fails", () => {
      const emailPattern = btoa("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
      const fields = [
        createMockField({
          name: "email",
          label: "Email",
          pattern: emailPattern,
          patternText: "invalidEmail",
          sameDataFieldAs: "emailCopy",
          fieldMapping: { originalName: "email" },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { email: "not-an-email" },
        fields,
        t: mockT,
      });
      expect(errors.email).toBe("Invalid email format");
      expect(errors.emailCopy).toBe("Invalid email format");
    });

    // ── validateSerialNumberField ─────────────────────────────────────────────

    describe("serialNumber validation", () => {
      const makeSerialField = (overrides: Partial<ReturnType<typeof createMockField>> = {}) =>
        createMockField({
          name: "asset_serialNumber",
          label: "Serial Number",
          fieldMapping: { originalName: "serialNumber" },
          ...overrides,
        });

      it("DREMEL brand uses dremel-specific error message", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "AB", asset_brand: "DREMEL" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBe("Dremel serial number must have valid length");
      });

      it("non-DREMEL brand uses generic error message for invalid length", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "AB", asset_brand: "BOSCH" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBe("Serial number must have valid length");
      });

      it("length 9 is valid — no error", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = { asset_serialNumber: "old error" };
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "123456789" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeUndefined();
      });

      it("length 12 is valid — no error", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "123456789012" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeUndefined();
      });

      it("length 10 is invalid", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "1234567890" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeDefined();
      });

      it("length 11 is invalid", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "12345678901" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeDefined();
      });

      it("value '999' is valid — no error", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "999" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeUndefined();
      });

      it("length 3 non-999 is valid — no error", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "ABC" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeUndefined();
      });

      it("length 1 (not 3, not 999) is invalid", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: "A" },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeDefined();
      });

      it("non-string value clears existing serial error", () => {
        const fields = [makeSerialField()];
        const errors: ValidationErrors = { asset_serialNumber: "old error" };
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_serialNumber: 12345 as unknown as string },
          fields,
          t: mockT,
        });
        expect(errors.asset_serialNumber).toBeUndefined();
      });
    });

    // ── validateManufacturedBeforePurchaseDate ────────────────────────────────

    describe("manufactured-before-purchase date validation", () => {
      const makePurchaseField = (name = "asset_purchaseDate") =>
        createMockField({
          name,
          label: "Purchase Date",
          fieldMapping: { originalName: "purchaseDate" },
        });

      it("ignores fields that are not purchaseDate", () => {
        const fields = [
          createMockField({
            name: "orderDate",
            label: "Order Date",
            fieldMapping: { originalName: "orderDate" },
          }),
        ];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { orderDate: "2024-01-15", asset_manufacturedDate: "06/2025" },
          fields,
          t: mockT,
        });
        expect(errors.orderDate).toBeUndefined();
      });

      it("clears stale error when purchaseDate is empty", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {
          asset_purchaseDate: "Manufacture date must be before or in same month as purchase date",
        };
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "", asset_manufacturedDate: "06/2024" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBeUndefined();
      });

      it("clears stale error when manufactured date is unparseable", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {
          asset_purchaseDate: "Manufacture date must be before or in same month as purchase date",
        };
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "2024-05-01", asset_manufacturedDate: "bad-value" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBeUndefined();
      });

      it("clears stale error when manufactured date is before purchase date", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {
          asset_purchaseDate: "Manufacture date must be before or in same month as purchase date",
        };
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "2024-06-01", asset_manufacturedDate: "03/2024" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBeUndefined();
      });

      it("accepts compact YYYYMM manufactured date format", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "2024-05-01", asset_manufacturedDate: "202407" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBe(
          "Manufacture date must be before or in same month as purchase date",
        );
      });

      it("accepts ISO YYYY-MM-DD manufactured date format", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: {
            asset_purchaseDate: "2024-05-01",
            asset_manufacturedDate: "2024-07-15",
          },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBe(
          "Manufacture date must be before or in same month as purchase date",
        );
      });

      it("accepts non-ISO purchase date parsed via Date constructor", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {};
        // "May 10, 2024" is a valid Date but not ISO format
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "May 10, 2024", asset_manufacturedDate: "06/2024" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBe(
          "Manufacture date must be before or in same month as purchase date",
        );
      });

      it("ignores invalid purchase date string", () => {
        const fields = [makePurchaseField()];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { asset_purchaseDate: "not-a-date", asset_manufacturedDate: "06/2024" },
          fields,
          t: mockT,
        });
        expect(errors.asset_purchaseDate).toBeUndefined();
      });
    });

    // ── bareToolNumber autocomplete ───────────────────────────────────────────

    describe("bareToolNumber autocomplete validation", () => {
      it("blocks when bareToolNumber is not validated", () => {
        const fields = [
          createMockField({
            name: "bareToolNumber",
            type: "autocomplete",
            fieldMapping: { originalName: "bareToolNumber" },
          }),
        ];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { bareToolNumber: "BT-123" },
          fields,
          t: mockT,
          autocompleteValidationRef: { current: { bareToolNumber: false } },
        });
        expect(errors.bareToolNumber).toBe("Bare tool number BT-123 not found.");
      });

      it("allows when bareToolNumber is validated", () => {
        const fields = [
          createMockField({
            name: "bareToolNumber",
            type: "autocomplete",
            fieldMapping: { originalName: "bareToolNumber" },
          }),
        ];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { bareToolNumber: "BT-123" },
          fields,
          t: mockT,
          autocompleteValidationRef: { current: { bareToolNumber: true } },
        });
        expect(errors.bareToolNumber).toBeUndefined();
      });

      it("skips autocomplete check when value is empty", () => {
        const fields = [
          createMockField({
            name: "bareToolNumber",
            type: "autocomplete",
            fieldMapping: { originalName: "bareToolNumber" },
          }),
        ];
        const errors: ValidationErrors = {};
        validateByAction({
          errors,
          mandatoryFields: [],
          values: { bareToolNumber: "" },
          fields,
          t: mockT,
          autocompleteValidationRef: { current: { bareToolNumber: false } },
        });
        expect(errors.bareToolNumber).toBeUndefined();
      });
    });

    // ── upload field with multiple errors ─────────────────────────────────────

    it("collects multiple upload errors and encodes them as JSON array", () => {
      const fields = [
        createMockField({
          name: "doc",
          type: "upload",
          label: "Document",
          fieldMapping: { originalName: "doc" },
          requiredDocuments: [
            {
              requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
              documentTypes: ["pdf"],
              errorMessage: "pdfRequired",
            },
            {
              requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
              documentTypes: ["jpg"],
              errorMessage: "imageRequired",
            },
          ],
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["doc"],
        values: { status: "ACTIVE", doc: [] },
        fields,
        t: mockT,
      });
      const parsed: string[] = JSON.parse(errors.doc);
      expect(parsed).toContain("pdfRequired");
      expect(parsed).toContain("imageRequired");
    });

    it("upload field with required documents but no mandatory check is skipped", () => {
      const fields = [
        createMockField({
          name: "doc",
          type: "upload",
          label: "Document",
          fieldMapping: { originalName: "doc" },
          requiredDocuments: [
            {
              requiredForFields: [{ fieldName: "status", fieldValue: "ACTIVE" }],
              documentTypes: ["pdf"],
              errorMessage: "pdfRequired",
            },
          ],
        }),
      ];
      const errors: ValidationErrors = {};
      // not mandatory → upload field with requiredDocuments returns early (no error)
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { status: "ACTIVE", doc: [] },
        fields,
        t: mockT,
      });
      expect(errors.doc).toBeUndefined();
    });

    // ── checkDependencyCondition — dep exists but byValueAnd/byValueOr both undefined ──

    it("treats dep with no byValueAnd/byValueOr as no condition", () => {
      const fields = [
        createMockField({
          name: "field1",
          label: "Field 1",
          fieldMapping: { originalName: "field1" },
          // requiredDependentFields exists but has only allEmpty (no byValueAnd/byValueOr)
          requiredDependentFields: {
            allEmpty: ["field1"],
            errorMessageAllEmpty: "atLeastOneRequired",
          },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["field1"],
        values: { field1: "" },
        fields,
        t: mockT,
      });
      // hasRequiredDependency=false (no byValueAnd/byValueOr) → simple required check fires
      expect(errors.field1).toBeDefined();
    });

    // ── validatePattern — non-string/number/boolean value → valueToTest="" ───

    it("treats non-primitive pattern value as empty string (no match)", () => {
      const alphaPattern = btoa("^[a-z]+$");
      const fields = [
        createMockField({
          name: "code",
          label: "Code",
          pattern: alphaPattern,
          patternText: "invalidFormat",
          fieldMapping: { originalName: "code" },
        }),
      ];
      const errors: ValidationErrors = {};
      // object value → valueToTest="" → regex fails → error set
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { code: {} as unknown as string },
        fields,
        t: mockT,
      });
      expect(errors.code).toBe("Invalid format");
    });

    // ── getYearMonthKey — month out of range ─────────────────────────────────

    it("ignores manufactured date with invalid month 0 in compact format", () => {
      const fields = [
        createMockField({
          name: "asset_purchaseDate",
          label: "Purchase Date",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      // "202400" → month=00, out-of-range → parseManufacturedYearMonth returns null → no error
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { asset_purchaseDate: "2024-05-01", asset_manufacturedDate: "202400" },
        fields,
        t: mockT,
      });
      expect(errors.asset_purchaseDate).toBeUndefined();
    });

    it("ignores manufactured date with invalid month 13 in MM/YYYY format", () => {
      const fields = [
        createMockField({
          name: "asset_purchaseDate",
          label: "Purchase Date",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { asset_purchaseDate: "2024-05-01", asset_manufacturedDate: "13/2024" },
        fields,
        t: mockT,
      });
      expect(errors.asset_purchaseDate).toBeUndefined();
    });

    it("ignores purchase date with empty trimmed string", () => {
      const fields = [
        createMockField({
          name: "asset_purchaseDate",
          label: "Purchase Date",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: [],
        values: { asset_purchaseDate: "   ", asset_manufacturedDate: "06/2024" },
        fields,
        t: mockT,
      });
      expect(errors.asset_purchaseDate).toBeUndefined();
    });

    it("ignores manufactured date that is not a string (non-string type check branch)", () => {
      const fields = [
        createMockField({
          name: "asset_purchaseDate",
          label: "Purchase Date",
          fieldMapping: { originalName: "purchaseDate" },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: [],
        values: {
          asset_purchaseDate: "2024-05-01",
          asset_manufacturedDate: 202406 as unknown as string,
        },
        fields,
        t: mockT,
      });
      expect(errors.asset_purchaseDate).toBeUndefined();
    });

    it("no error when byValue condition met but field has value", () => {
      const fields = [
        createMockField({
          name: "companyName",
          label: "Company Name",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            byValueOr: [{ fieldName: "typeOfUser", fieldValue: "COMPANY" }],
            errorMessageByValue: "companyNameRequired",
          },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["companyName"],
        values: { companyName: "Acme", typeOfUser: "COMPANY" },
        fields,
        t: mockT,
      });
      expect(errors.companyName).toBeUndefined();
    });

    // ── byValue condition met + empty + no errorMessageByValue → fallback label ──

    it("uses field label as fallback when byValue condition met and errorMessageByValue absent", () => {
      const fields = [
        createMockField({
          name: "companyName",
          label: "companyName",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            byValueOr: [{ fieldName: "typeOfUser", fieldValue: "COMPANY" }],
            // intentionally no errorMessageByValue
          },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["companyName"],
        values: { companyName: "", typeOfUser: "COMPANY" },
        fields,
        t: mockT,
      });
      expect(errors.companyName).toBe("companyName is required");
    });

    it("uses field label fallback when errorMessageByValue is explicitly null", () => {
      const fields = [
        createMockField({
          name: "companyName",
          label: "companyName",
          fieldMapping: { originalName: "companyName" },
          requiredDependentFields: {
            byValueOr: [{ fieldName: "typeOfUser", fieldValue: "COMPANY" }],
            errorMessageByValue: null as unknown as string,
          },
        }),
      ];
      const errors: ValidationErrors = {};
      validateByAction({
        errors,
        mandatoryFields: ["companyName"],
        values: { companyName: "", typeOfUser: "COMPANY" },
        fields,
        t: mockT,
      });
      expect(errors.companyName).toBe("companyName is required");
    });
  });

  describe("getMandatoryFields — action.mandatoryFields absent", () => {
    it("treats absent mandatoryFields in section action as empty array", () => {
      const section = createMockSection({
        actions: [{ name: "submit" }],
      });
      const form = createMockForm({ sections: [section], actions: null });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual([]);
    });

    it("treats absent mandatoryFields in form action as empty array", () => {
      const form = createMockForm({
        sections: [],
        actions: [{ name: "submit" }],
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual([]);
    });

    it("merges into existing section entry that lacks fieldList via section then form action", () => {
      // section action creates entry first, form action with same key appends
      const section = createMockSection({
        actions: [{ name: "submit", mandatoryFields: ["f1"] }],
      });
      const form = createMockForm({
        sections: [section],
        actions: [{ name: "submit", mandatoryFields: ["f2"] }],
      });

      const result = getMandatoryFields(form);

      expect(result.submit.fieldList).toEqual(["f1", "f2"]);
    });
  });
});
