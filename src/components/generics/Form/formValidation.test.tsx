import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  getMandatoryFieldsForSection,
  getMandatoryFieldsForForm,
  getVisibleFieldsWithErrors,
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
      const emailPattern = btoa("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
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
  });
});
