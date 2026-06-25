import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import GenericField from "./GenericField";
import Field from "./GenericField.types";
import { GenericFormContext } from "../Form/GenericForm.context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @bosch/react-frok components
vi.mock("@bosch/react-frok", () => ({
  Button: () => <button data-testid="generic-button">Button</button>,
  Checkbox: ({
    label,
    checked,
    onChange,
    disabled,
  }: {
    label: string;
    checked: boolean;
    onChange: (e: { target: { checked: boolean } }) => void;
    disabled?: boolean;
  }) => (
    <label data-testid={`checkbox-label`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange({ target: { checked: e.target.checked } })}
        disabled={disabled}
        data-testid="checkbox-input"
      />
      {label}
    </label>
  ),
  TextField: ({
    label,
    name,
    value,
    onChange,
    disabled,
    type,
    onBlur,
  }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type || "text"}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        data-testid={`text-field-${name}`}
      />
    </div>
  ),
  TextArea: ({
    label,
    name,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        data-testid={`textarea-${name}`}
      />
    </div>
  ),
}));

// Mock custom UI components
vi.mock("components/ui/RadioGroup/RadioGroup", () => ({
  default: ({
    name,
    radioButtons,
    onChange,
    disabled,
  }: {
    name: string;
    radioButtons: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid={`radio-group-${name}`}>
      {radioButtons?.map((button) => (
        <label key={button.value}>
          <input
            type="radio"
            name={name}
            value={button.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            data-testid={`radio-${button.value}`}
          />
          {button.label}
        </label>
      ))}
    </div>
  ),
}));

vi.mock("components/ui/DatePicker/DatePicker", () => ({
  default: ({ name, label, disabled }: { name: string; label: string; disabled?: boolean }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        type="date"
        id={name}
        name={name}
        disabled={disabled}
        data-testid={`datepicker-${name}`}
      />
    </div>
  ),
}));

vi.mock("components/ui/NumberInputField/NumberInputFiled", () => ({
  default: ({
    name,
    label,
    value,
    onChange,
    disabled,
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        type="number"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        data-testid={`number-field-${name}`}
      />
    </div>
  ),
}));

vi.mock("components/ui/FileUpload/FileUpload", () => ({
  default: ({
    name,
    isDisabled,
    onFilesSelected,
  }: {
    name: string;
    isDisabled?: boolean;
    onFilesSelected: (files: File[]) => void;
  }) => (
    <input
      type="file"
      data-testid={`file-upload-${name}`}
      disabled={isDisabled}
      onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
      aria-label={`File upload for ${name}`}
    />
  ),
}));

vi.mock("components/ui/AutoComplete/AutoComplete", () => ({
  default: ({
    name,
    label,
    value,
    onChange,
    disabled,
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`autocomplete-${name}`}
      />
    </div>
  ),
}));

vi.mock("components/ui/DynamicDropdown/DynamicDropdown", () => ({
  default: ({
    name,
    label,
    value,
    onChange,
    disabled,
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`dropdown-${name}`}
      >
        <option value="">Select</option>
      </select>
    </div>
  ),
}));

vi.mock("../../ui/TooltipContent/InfoIconWithTooltip", () => ({
  default: ({ name, infoText }: { name: string; infoText: string }) => (
    <span data-testid={`info-icon-${name}`} title={infoText}>
      Info
    </span>
  ),
}));

// Mock utils
vi.mock("../utils", () => ({
  isFieldVisible: vi.fn(() => true),
}));

vi.mock("./GenericField.utils", () => ({
  customActions: vi.fn(),
  onBlurActions: vi.fn(),
  updateDependentFields: vi.fn(() => false),
  handleFaultCodeSelection: vi.fn(),
  resolveIsRequired: vi.fn((field: { isRequired?: boolean }) => field.isRequired),
}));

vi.mock("../../ui/AutoComplete/AutoComplete.helper", () => ({
  getAutoCompleteValue: vi.fn(() => ""),
  getAutofillFieldName: vi.fn((name, field) => `${name}_${field}`),
  getSparePartCompatibilityMessage: vi.fn(() => ""),
  handleAutoCompleteSelect: vi.fn(),
  handleResetAutoCompleteFields: vi.fn(),
  setAutocompleteFieldValue: vi.fn(),
}));

describe("GenericField", () => {
  const mockContextValue = {
    allFields: [],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    setMandatoryFields: vi.fn(),
    actionCallbacks: {},
  };

  const mockInitialValues = {
    testField: "",
    testCheckbox: false,
    testNumber: "",
  };

  const queryClient = new QueryClient();

  const renderWithContext = (field: Field) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GenericFormContext.Provider value={mockContextValue}>
          <Formik initialValues={mockInitialValues} onSubmit={vi.fn()}>
            <GenericField field={field} />
          </Formik>
        </GenericFormContext.Provider>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Text Field", () => {
    it("renders text input field", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("text-field-testField")).toBeInTheDocument();
    });

    it("renders required text field with asterisk", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: true,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByText(/Test Field.*\*/)).toBeInTheDocument();
    });

    it("handles text input change", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      const input = screen.getByTestId("text-field-testField");
      await user.type(input, "Hello");

      expect(input).toHaveValue("Hello");
    });

    it("renders disabled text field", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        isDisabled: true,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("text-field-testField")).toBeDisabled();
    });

    it("renders info icon when isInfoIcon is true", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        isInfoIcon: true,
        infoText: "This is a tooltip",
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("info-icon-testField")).toBeInTheDocument();
    });
  });

  describe("Email and Tel Fields", () => {
    it("renders email field", () => {
      const field: Field = {
        name: "emailField",
        label: "Email",
        type: "email",
        isRequired: false,
        fieldMapping: { originalName: "emailField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("text-field-emailField")).toHaveAttribute("type", "email");
    });

    it("renders tel field", () => {
      const field: Field = {
        name: "telField",
        label: "Phone",
        type: "tel",
        isRequired: false,
        fieldMapping: { originalName: "telField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("text-field-telField")).toHaveAttribute("type", "tel");
    });
  });

  describe("Number Field", () => {
    it("renders number input field", () => {
      const field: Field = {
        name: "testNumber",
        label: "Test Number",
        type: "number",
        isRequired: false,
        fieldMapping: { originalName: "testNumber" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("number-field-testNumber")).toBeInTheDocument();
    });

    it("handles number input change", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testNumber",
        label: "Test Number",
        type: "number",
        isRequired: false,
        fieldMapping: { originalName: "testNumber" },
      };

      renderWithContext(field);

      const input = screen.getByTestId("number-field-testNumber");
      await user.type(input, "123");

      expect(input).toHaveValue(123);
    });
  });

  describe("Checkbox Field", () => {
    it("renders checkbox field", () => {
      const field: Field = {
        name: "testCheckbox",
        label: "Test Checkbox",
        type: "checkbox",
        isRequired: false,
        fieldMapping: { originalName: "testCheckbox" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("checkbox-input")).toBeInTheDocument();
    });

    it("handles checkbox change", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testCheckbox",
        label: "Test Checkbox",
        type: "checkbox",
        isRequired: false,
        fieldMapping: { originalName: "testCheckbox" },
      };

      renderWithContext(field);

      const checkbox = screen.getByTestId("checkbox-input");
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });
  });

  describe("Radio Group Field", () => {
    it("renders radio group", () => {
      const field: Field = {
        name: "testRadio",
        label: "Test Radio",
        type: "radiogroup",
        isRequired: false,
        radioButtons: [
          { label: "Option 1", value: "option1" },
          { label: "Option 2", value: "option2" },
        ],
        fieldMapping: { originalName: "testRadio" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("radio-group-testRadio")).toBeInTheDocument();
    });

    it("handles radio selection", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testRadio",
        label: "Test Radio",
        type: "radiogroup",
        isRequired: false,
        radioButtons: [
          { label: "Option 1", value: "option1" },
          { label: "Option 2", value: "option2" },
        ],
        fieldMapping: { originalName: "testRadio" },
      };

      renderWithContext(field);

      const radio = screen.getByTestId("radio-option1");
      await user.click(radio);

      expect(radio).toBeChecked();
    });
  });

  describe("Date Picker Field", () => {
    it("renders date picker", () => {
      const field: Field = {
        name: "testDate",
        label: "Test Date",
        type: "datepicker",
        isRequired: false,
        fieldMapping: { originalName: "testDate" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("datepicker-testDate")).toBeInTheDocument();
    });
  });

  describe("Dropdown Field", () => {
    it("renders dropdown", () => {
      const field: Field = {
        name: "testDropdown",
        label: "Test Dropdown",
        type: "dropdown",
        isRequired: false,
        fieldMapping: { originalName: "testDropdown" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("dropdown-testDropdown")).toBeInTheDocument();
    });

    it("handles dropdown change", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testDropdown",
        label: "Test Dropdown",
        type: "dropdown",
        isRequired: false,
        fieldMapping: { originalName: "testDropdown" },
      };

      renderWithContext(field);

      const dropdown = screen.getByTestId("dropdown-testDropdown");
      await user.selectOptions(dropdown, "");

      expect(dropdown).toHaveValue("");
    });
  });

  describe("File Upload Field", () => {
    it("renders file upload", () => {
      const field: Field = {
        name: "testFile",
        label: "Test File",
        type: "upload",
        isRequired: false,
        fieldMapping: { originalName: "testFile" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("file-upload-testFile")).toBeInTheDocument();
    });
  });

  describe("TextArea Field", () => {
    it("renders textarea", () => {
      const field: Field = {
        name: "testTextarea",
        label: "Test Textarea",
        type: "textarea",
        isRequired: false,
        fieldMapping: { originalName: "testTextarea" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("textarea-testTextarea")).toBeInTheDocument();
    });

    it("handles textarea change", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "testTextarea",
        label: "Test Textarea",
        type: "textarea",
        isRequired: false,
        fieldMapping: { originalName: "testTextarea" },
      };

      renderWithContext(field);

      const textarea = screen.getByTestId("textarea-testTextarea");
      await user.type(textarea, "Long text");

      expect(textarea).toHaveValue("Long text");
    });
  });

  describe("AutoComplete Field", () => {
    it("renders autocomplete", () => {
      const field: Field = {
        name: "testAutocomplete",
        label: "Test Autocomplete",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "testAutocomplete" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("autocomplete-testAutocomplete")).toBeInTheDocument();
    });
  });

  describe("Button Field", () => {
    it("renders button", () => {
      const field: Field = {
        name: "testButton",
        label: "Test Button",
        type: "button",
        isRequired: false,
        fieldMapping: { originalName: "testButton" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("generic-button")).toBeInTheDocument();
    });
  });

  describe("Field Visibility", () => {
    it("does not render field when not visible", async () => {
      const { isFieldVisible } = await import("../utils");
      vi.mocked(isFieldVisible).mockReturnValue(false);

      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.queryByTestId("text-field-testField")).not.toBeInTheDocument();
    });

    it("renders field when visible", async () => {
      const { isFieldVisible } = await import("../utils");
      vi.mocked(isFieldVisible).mockReturnValue(true);

      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("text-field-testField")).toBeInTheDocument();
    });
  });

  describe("Field Size", () => {
    it("applies full-width class for size 3", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        size: "3",
        fieldMapping: { originalName: "testField" },
      };

      const { container } = renderWithContext(field);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fullWidthElement = container.querySelector(".full-width");

      expect(fullWidthElement).toBeTruthy();
    });

    it("does not apply full-width class for other sizes", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "text",
        isRequired: false,
        size: "1",
        fieldMapping: { originalName: "testField" },
      };

      const { container } = renderWithContext(field);
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      const fullWidthElement = container.querySelector(".full-width");

      expect(fullWidthElement).toBeFalsy();
    });
  });

  describe("Unknown Field Type", () => {
    it("renders fallback for unknown field type", () => {
      const field: Field = {
        name: "testField",
        label: "Test Field",
        type: "unknownType",
        isRequired: false,
        fieldMapping: { originalName: "testField" },
      };

      renderWithContext(field);

      expect(screen.getByText(/unknownType FIELD: Test Field/)).toBeInTheDocument();
    });
  });
});
