import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Formik } from "formik";
import GenericField from "./GenericField";
import Field from "./GenericField.types";
import {
  GenericFormContext,
  type ActionCallback,
  type RadioSourceCallback,
} from "../Form/GenericForm.context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { handleFaultCodeSelection, updateDependentFields } from "./GenericField.utils";
import type { AllowedPosition } from "api/services/countryConfiguration/countryConfiguration";
import {
  handleAutoCompleteSelect,
  handleResetAutoCompleteFields,
  getSparePartCompatibilityMessage,
} from "../../ui/AutoComplete/AutoComplete.helper";

const mockUseDiagnosticsContext = vi.fn(
  () => ({ allowedPositions: [] }) as { allowedPositions: AllowedPosition[]; jobStatus?: string },
);
vi.mock("modules/JobManagement/JobOverview/DiagnosticsContext", () => ({
  useDiagnosticsContext: () => mockUseDiagnosticsContext(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock @bosch/react-frok components
vi.mock("@bosch/react-frok", () => ({
  Button: () => <button data-testid="generic-button">Button</button>,
  Icon: ({ iconName }: { iconName: string }) => (
    <span data-testid={`icon-${iconName}`}>{iconName}</span>
  ),
  Toggle: ({
    name,
    id,
    leftLabel,
    checked,
    disabled,
    onChange,
  }: {
    name: string;
    id: string;
    leftLabel?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (e: { target: { checked: boolean } }) => void;
  }) => (
    <label>
      {leftLabel}
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange({ target: { checked: e.target.checked } })}
        data-testid={`toggle-${name}`}
      />
    </label>
  ),
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
    onFocus,
  }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
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
        onFocus={onFocus}
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
    onBlur,
    disabled,
  }: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
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
    onBlur,
    disabled,
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
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
        onBlur={onBlur}
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
    initialFiles,
  }: {
    name: string;
    isDisabled?: boolean;
    onFilesSelected: (files: File[]) => void;
    initialFiles?: Array<{ attachmentId?: string; name?: string; type?: string }>;
  }) => (
    <div>
      <input
        type="file"
        data-testid={`file-upload-${name}`}
        disabled={isDisabled}
        onChange={(e) => onFilesSelected(Array.from(e.target.files || []))}
        aria-label={`File upload for ${name}`}
      />
      <pre data-testid={`file-upload-initial-${name}`}>{JSON.stringify(initialFiles ?? [])}</pre>
    </div>
  ),
}));

vi.mock("components/ui/AutoComplete/AutoComplete", () => ({
  default: ({
    name,
    label,
    value,
    onChange,
    disabled,
    onSelect,
    onSetFieldError,
    onSetFieldTouched,
    onClearFieldError,
    onValidation,
    incompatibleSelectionMessage,
    position,
    brand,
    bareTool,
    isExchange,
  }: {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    onSelect?: (option: { notBelongsToTool?: boolean }) => void;
    onSetFieldError?: (fieldName: string, message: string) => void;
    onSetFieldTouched?: (fieldName: string, touched: boolean) => void;
    onClearFieldError?: (fieldName: string) => void;
    onValidation?: (isValid: boolean) => void;
    incompatibleSelectionMessage?: string;
    position?: string;
    brand?: string;
    bareTool?: string;
    isExchange?: boolean;
  }) => (
    <div
      data-testid={`autocomplete-context-${name}`}
      data-position={position}
      data-brand={brand}
      data-baretool={bareTool}
      data-isexchange={String(!!isExchange)}
    >
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
      {incompatibleSelectionMessage && (
        <span data-testid={`autocomplete-incompatible-${name}`}>
          {incompatibleSelectionMessage}
        </span>
      )}
      <button
        data-testid={`autocomplete-select-belongs-${name}`}
        onClick={() => onSelect?.({ notBelongsToTool: false })}
      >
        Select (belongs)
      </button>
      <button
        data-testid={`autocomplete-select-not-belongs-${name}`}
        onClick={() => onSelect?.({ notBelongsToTool: true })}
      >
        Select (not belongs)
      </button>
      <button
        data-testid={`autocomplete-set-error-${name}`}
        onClick={() => onSetFieldError?.(name, "err")}
      >
        Set error
      </button>
      <button
        data-testid={`autocomplete-set-touched-${name}`}
        onClick={() => onSetFieldTouched?.(name, true)}
      >
        Set touched
      </button>
      <button
        data-testid={`autocomplete-clear-error-${name}`}
        onClick={() => onClearFieldError?.(name)}
      >
        Clear error
      </button>
      <button data-testid={`autocomplete-validate-${name}`} onClick={() => onValidation?.(true)}>
        Validate
      </button>
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
    onRawOptionSelect,
    options,
  }: {
    name: string;
    label: string;
    value: string | string[];
    onChange: (value: string) => void;
    disabled?: boolean;
    onRawOptionSelect?: (rawItem: Record<string, unknown>) => void;
    options?: Array<{ value: string; label?: string; disabled?: boolean }>;
  }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        multiple={Array.isArray(value)}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`dropdown-${name}`}
      >
        <option value="">Select</option>
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
      {onRawOptionSelect && (
        <button
          data-testid={`raw-option-select-${name}`}
          onClick={() => onRawOptionSelect({ faultCode: "E001", faultCodeLabourQuantity: 3 })}
        >
          Select Raw Option
        </button>
      )}
    </div>
  ),
}));

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string; type?: string; showStatusMessage?: boolean }) => (
    <div data-testid="status-indicator">{status}</div>
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
    allFields: [] as Field[],
    setAllFields: vi.fn(),
    mandatoryFields: null,
    setMandatoryFields: vi.fn(),
    actionCallbacks: {} as Record<string, ActionCallback>,
    onDeleteStart: undefined as (() => void) | undefined,
    onDeleteEnd: undefined as (() => void) | undefined,
    autocompleteValidation: undefined as { current: Record<string, boolean> } | undefined,
    sparePartNotBelongsToTool: undefined as { current: Record<string, boolean> } | undefined,
    radioSourceCallbacks: undefined as Record<string, RadioSourceCallback> | undefined,
    warrantyPanelInfo: undefined as
      | { isIneligible?: boolean; hasPurchaseDate?: boolean; supportedWarrantyType: string }
      | undefined,
  };

  const mockInitialValues = {
    testField: "",
    testCheckbox: false,
    testNumber: "",
  };

  const queryClient = new QueryClient();

  const renderWithContext = (
    field: Field,
    contextOverrides: Partial<typeof mockContextValue> = {},
    initialValuesOverrides: Record<string, unknown> = {},
  ) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <GenericFormContext.Provider value={{ ...mockContextValue, ...contextOverrides }}>
          <Formik
            initialValues={{ ...mockInitialValues, ...initialValuesOverrides }}
            onSubmit={vi.fn()}
          >
            <GenericField field={field} />
          </Formik>
        </GenericFormContext.Provider>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDiagnosticsContext.mockReturnValue({ allowedPositions: [] });
  });

  it("uses live diagnostics status to disable fields without waiting for formik refresh", () => {
    mockUseDiagnosticsContext.mockReturnValue({
      allowedPositions: [],
      jobStatus: "IN_DIAGNOSTICS",
    });

    const field: Field = {
      name: "testField",
      label: "Test Field",
      type: "text",
      isRequired: false,
      disabledForStatuses: ["IN_DIAGNOSTICS"],
      fieldMapping: { originalName: "testField" },
    };

    renderWithContext(field);

    expect(screen.getByTestId("text-field-testField")).toBeDisabled();
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

  describe("Price Field", () => {
    it("formats a non-focused, non-disabled amount value to two decimals", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        isRequired: false,
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 12.5 });

      expect(screen.getByTestId("text-field-priceField")).toHaveValue("12.50");
    });

    it("shows the raw value while focused", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        isRequired: false,
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 12.5 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);

      expect(input).toHaveValue("12.5");
    });

    it("clears the display to empty while a zero value is focused, then reformats on blur", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        isRequired: false,
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 0 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);
      expect(input).toHaveValue("");

      fireEvent.blur(input);
      expect(input).toHaveValue("0.00");
    });

    it("defaults an emptied price value to 0 on blur", async () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        isRequired: false,
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: "" });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.blur(input);

      await waitFor(() => expect(input).toHaveValue("0.00"));
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

    it("passes allowedPositions from DiagnosticsContext into handleFaultCodeSelection on raw option select", async () => {
      const user = userEvent.setup();
      const allowedPositions = [
        {
          position: "LA",
          minCount: 1,
          maxCount: 1,
          quantity: { quantitySource: "DEFAULT", defaultQuantity: 3 },
          unitPriceSource: "SAP",
        },
      ];
      mockUseDiagnosticsContext.mockReturnValue({ allowedPositions });

      const field: Field = {
        name: "faultCodeDropdown",
        label: "Fault Code",
        type: "dropdown",
        subtype: "diagnosticFaultCode",
        isRequired: false,
        fieldMapping: { originalName: "faultCodeDropdown" },
      };

      renderWithContext(field);

      const button = screen.getByTestId("raw-option-select-faultCodeDropdown");
      await user.click(button);

      expect(handleFaultCodeSelection).toHaveBeenCalledWith(
        { faultCode: "E001", faultCodeLabourQuantity: 3 },
        expect.anything(),
        expect.anything(),
        expect.anything(),
        allowedPositions,
      );
    });

    it("disables warranty-ineligible job types when the tool is warranty-ineligible", () => {
      const field: Field = {
        name: "jobType",
        label: "Job Type",
        type: "dropdown",
        isRequired: false,
        options: [
          { value: "WARRANTY", label: "Warranty", name: "Warranty" },
          { value: "CHARGEABLE", label: "Chargeable", name: "Chargeable" },
        ],
        fieldMapping: { originalName: "jobType" },
      };

      renderWithContext(field, {
        warrantyPanelInfo: {
          isIneligible: true,
          hasPurchaseDate: true,
          supportedWarrantyType: "WARRANTY",
        },
      });

      const dropdown = screen.getByTestId("dropdown-jobType");
      expect(within(dropdown).getByRole("option", { name: "Warranty" })).toBeDisabled();
      expect(within(dropdown).getByRole("option", { name: "Chargeable" })).toBeEnabled();
    });

    it("disables warranty-ineligible job types when the tool has no purchase date", () => {
      const field: Field = {
        name: "jobType",
        label: "Job Type",
        type: "dropdown",
        isRequired: false,
        options: [
          { value: "WARRANTY", label: "Warranty", name: "Warranty" },
          { value: "CHARGEABLE", label: "Chargeable", name: "Chargeable" },
        ],
        fieldMapping: { originalName: "jobType" },
      };

      renderWithContext(field, {
        warrantyPanelInfo: {
          isIneligible: false,
          hasPurchaseDate: false,
          supportedWarrantyType: "WARRANTY",
        },
      });

      const dropdown = screen.getByTestId("dropdown-jobType");
      expect(within(dropdown).getByRole("option", { name: "Warranty" })).toBeDisabled();
      expect(within(dropdown).getByRole("option", { name: "Chargeable" })).toBeEnabled();
    });

    it("leaves job type options enabled when the tool is warranty-eligible", () => {
      const field: Field = {
        name: "jobType",
        label: "Job Type",
        type: "dropdown",
        isRequired: false,
        options: [{ value: "WARRANTY", label: "Warranty", name: "Warranty" }],
        fieldMapping: { originalName: "jobType" },
      };

      renderWithContext(field, {
        warrantyPanelInfo: {
          isIneligible: false,
          hasPurchaseDate: true,
          supportedWarrantyType: "WARRANTY",
        },
      });

      const dropdown = screen.getByTestId("dropdown-jobType");
      expect(within(dropdown).getByRole("option", { name: "Warranty" })).toBeEnabled();
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

    it("builds a single-entry file list for the logo field when a logoId is present", () => {
      const field: Field = {
        name: "logo",
        label: "Logo",
        type: "upload",
        isRequired: false,
        fieldMapping: { originalName: "logo" },
      };

      renderWithContext(
        field,
        {},
        { logo: { logoId: "LOGO-1", name: "logo.png", type: "image/png" } },
      );

      expect(screen.getByTestId("file-upload-initial-logo")).toHaveTextContent(
        JSON.stringify([{ attachmentId: "LOGO-1", name: "logo.png", type: "image/png" }]),
      );
    });

    it("falls back to an empty attachments list for the logo field when no logoId is present", () => {
      const field: Field = {
        name: "logo",
        label: "Logo",
        type: "upload",
        isRequired: false,
        fieldMapping: { originalName: "logo" },
      };

      renderWithContext(field, {}, { logo: undefined });

      expect(screen.getByTestId("file-upload-initial-logo")).toHaveTextContent("[]");
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

    it("extracts position, brand, bareTool and isExchange for a spare part number field", () => {
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(
        field,
        {},
        {
          row0_position: "SP",
          brand: "BRANDX",
          bareToolNumber: "BT-9",
          actionType: "SPARE_PARTS_EXCHANGE",
        },
      );

      const wrapper = screen.getByTestId("autocomplete-context-row0_sparePartNumber");
      expect(wrapper).toHaveAttribute("data-position", "SP");
      expect(wrapper).toHaveAttribute("data-brand", "BRANDX");
      expect(wrapper).toHaveAttribute("data-baretool", "BT-9");
      expect(wrapper).toHaveAttribute("data-isexchange", "true");
    });

    it("does not extract spare-part context for non spare-part-number fields", () => {
      const field: Field = {
        name: "bareToolNumber",
        label: "Bare Tool",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "bareToolNumber" },
      };

      renderWithContext(field, {}, { actionType: "SPARE_PARTS_EXCHANGE" });

      const wrapper = screen.getByTestId("autocomplete-context-bareToolNumber");
      expect(wrapper).toHaveAttribute("data-position", "");
      expect(wrapper).toHaveAttribute("data-isexchange", "false");
    });

    it("shows the compatibility message returned by getSparePartCompatibilityMessage", () => {
      vi.mocked(getSparePartCompatibilityMessage).mockReturnValueOnce("incompatibleWarrantyType");
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(field);

      expect(
        screen.getByTestId("autocomplete-incompatible-row0_sparePartNumber"),
      ).toHaveTextContent("incompatibleWarrantyType");
    });

    it("flags a spare part number as not belonging to the tool while typing (not an SP exchange)", async () => {
      const user = userEvent.setup();
      const sparePartNotBelongsToTool = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(field, { sparePartNotBelongsToTool }, { actionType: "REPAIR" });

      await user.type(screen.getByTestId("autocomplete-row0_sparePartNumber"), "1");

      expect(sparePartNotBelongsToTool.current["row0_sparePartNumber"]).toBe(true);
    });

    it("does not flag a spare part number while typing during a spare-parts exchange", async () => {
      const user = userEvent.setup();
      const sparePartNotBelongsToTool = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(
        field,
        { sparePartNotBelongsToTool },
        { actionType: "SPARE_PARTS_EXCHANGE" },
      );

      await user.type(screen.getByTestId("autocomplete-row0_sparePartNumber"), "1");

      expect(sparePartNotBelongsToTool.current["row0_sparePartNumber"]).toBeUndefined();
    });

    it("resets dependent fields when the autocomplete value is cleared", async () => {
      const field: Field = {
        name: "testAutocomplete",
        label: "Test Autocomplete",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "testAutocomplete" },
      };

      renderWithContext(field, {}, { testAutocomplete: "existing" });

      fireEvent.change(screen.getByTestId("autocomplete-testAutocomplete"), {
        target: { value: "" },
      });

      await waitFor(() => expect(handleResetAutoCompleteFields).toHaveBeenCalled());
    });

    it("records notBelongsToTool from the selected option and calls handleAutoCompleteSelect", async () => {
      const user = userEvent.setup();
      const sparePartNotBelongsToTool = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(field, { sparePartNotBelongsToTool });

      await user.click(screen.getByTestId("autocomplete-select-not-belongs-row0_sparePartNumber"));

      await waitFor(() => expect(handleAutoCompleteSelect).toHaveBeenCalled());
      expect(sparePartNotBelongsToTool.current["row0_sparePartNumber"]).toBe(true);
    });

    it("marks the option as belonging to the tool when notBelongsToTool is false", async () => {
      const user = userEvent.setup();
      const sparePartNotBelongsToTool = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "row0_sparePartNumber",
        label: "Spare Part",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "sparePartNumber" },
      };

      renderWithContext(field, { sparePartNotBelongsToTool });

      await user.click(screen.getByTestId("autocomplete-select-belongs-row0_sparePartNumber"));

      await waitFor(() => expect(handleAutoCompleteSelect).toHaveBeenCalled());
      expect(sparePartNotBelongsToTool.current["row0_sparePartNumber"]).toBe(false);
    });

    it("wires field error, touched, clear-error and validation callbacks through to formik / the ref", async () => {
      const user = userEvent.setup();
      const autocompleteValidation = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "bareToolNumber",
        label: "Bare Tool",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "bareToolNumber" },
      };

      renderWithContext(field, { autocompleteValidation });

      // These call into formikContext internals — just confirm no crash and the ref path.
      await user.click(screen.getByTestId("autocomplete-set-error-bareToolNumber"));
      await user.click(screen.getByTestId("autocomplete-set-touched-bareToolNumber"));
      await user.click(screen.getByTestId("autocomplete-clear-error-bareToolNumber"));
      await user.click(screen.getByTestId("autocomplete-validate-bareToolNumber"));

      expect(autocompleteValidation.current["bareToolNumber"]).toBe(true);
    });

    it("does not track validation for non-lookup fields", async () => {
      const user = userEvent.setup();
      const autocompleteValidation = { current: {} as Record<string, boolean> };
      const field: Field = {
        name: "customerName",
        label: "Customer",
        type: "autocomplete",
        isRequired: false,
        fieldMapping: { originalName: "customerName" },
      };

      renderWithContext(field, { autocompleteValidation });

      await user.click(screen.getByTestId("autocomplete-validate-customerName"));

      expect(autocompleteValidation.current["customerName"]).toBeUndefined();
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

  describe("Badge Field", () => {
    it("renders a status indicator and hidden input reflecting the field value", () => {
      const field: Field = {
        name: "statusField",
        label: "Status",
        type: "badge",
        isRequired: false,
        fieldMapping: { originalName: "statusField" },
      };

      renderWithContext(field, {}, { statusField: "APPROVED" });

      expect(screen.getByTestId("status-indicator")).toHaveTextContent("APPROVED");
    });
  });

  describe("Toggle Field", () => {
    it("renders a toggle reflecting the field value and handles changes", async () => {
      const user = userEvent.setup();
      const field: Field = {
        name: "toggleField",
        label: "Toggle Field",
        type: "toggle",
        isRequired: false,
        fieldMapping: { originalName: "toggleField" },
      };

      renderWithContext(field, {}, { toggleField: false });

      const toggle = screen.getByTestId("toggle-toggleField");
      expect(toggle).not.toBeChecked();

      await user.click(toggle);

      expect(toggle).toBeChecked();
    });

    it("renders info text next to the toggle when provided", () => {
      const field: Field = {
        name: "toggleField",
        label: "Toggle Field",
        type: "toggle",
        isRequired: false,
        infoText: "Extra context",
        fieldMapping: { originalName: "toggleField" },
      };

      renderWithContext(field);

      expect(screen.getByText("Extra context")).toBeInTheDocument();
    });
  });

  describe("Info Icon Field", () => {
    it("renders the translated info text next to an info icon", () => {
      const field: Field = {
        name: "infoField",
        label: "Info",
        type: "infoIcon",
        isRequired: false,
        infoText: "helpfulInfoKey",
        fieldMapping: { originalName: "infoField" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("icon-info-i-frame")).toBeInTheDocument();
      expect(screen.getByText("helpfulInfoKey")).toBeInTheDocument();
    });
  });

  describe("Label suffix", () => {
    it("appends a percentage suffix for percentage subtype fields", () => {
      const field: Field = {
        name: "discountField",
        label: "Discount",
        type: "text",
        subtype: "discount",
        isRequired: false,
        fieldMapping: { originalName: "discountField" },
      };

      renderWithContext(field);

      expect(screen.getByLabelText(/Discount \(%\)/)).toBeInTheDocument();
    });

    it("appends the currency symbol for amount subtype fields when configured", () => {
      queryClient.setQueryData(["user"], { countryCode: "US" });
      queryClient.setQueryData(["countryConfiguration", "US"], { currencySymbol: "$" });

      const field: Field = {
        name: "totalField",
        label: "Total",
        type: "text",
        subtype: "amount",
        isRequired: false,
        fieldMapping: { originalName: "totalField" },
      };

      renderWithContext(field);

      expect(screen.getByLabelText(/Total \(\$\)/)).toBeInTheDocument();

      // Avoid leaking this cached data into unrelated tests that reuse `queryClient`.
      queryClient.removeQueries({ queryKey: ["user"] });
      queryClient.removeQueries({ queryKey: ["countryConfiguration", "US"] });
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
  describe("Value change propagation", () => {
    const renderProbe = (
      field: Field,
      contextOverrides: Partial<typeof mockContextValue> = {},
      initialValues: Record<string, unknown> = {},
    ) =>
      render(
        <QueryClientProvider client={queryClient}>
          <GenericFormContext.Provider value={{ ...mockContextValue, ...contextOverrides }}>
            <Formik initialValues={{ ...mockInitialValues, ...initialValues }} onSubmit={vi.fn()}>
              {({ values, touched }) => (
                <>
                  <GenericField field={field} />
                  <div data-testid="probe-values">{JSON.stringify(values)}</div>
                  <div data-testid="probe-touched">{JSON.stringify(touched)}</div>
                </>
              )}
            </Formik>
          </GenericFormContext.Provider>
        </QueryClientProvider>,
      );

    const textField = (overrides: Partial<Field> = {}): Field => ({
      name: "testField",
      label: "Test Field",
      type: "text",
      isRequired: false,
      fieldMapping: { originalName: "testField" },
      ...overrides,
    });

    it("mirrors the value to the sameDataFieldAs target", async () => {
      const field = textField();
      renderProbe(
        field,
        {
          allFields: [{ ...field, sameDataFieldAs: "mirrorField" }],
        },
        { mirrorField: "" },
      );

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("probe-values")).toHaveTextContent('"mirrorField":"abc"');
      });
    });

    it("marks dependent fields touched when a byValueOr dependency is met", async () => {
      const field = textField();
      renderProbe(field, {
        allFields: [
          field,
          {
            name: "dependentField",
            label: "Dependent",
            type: "text",
            requiredDependentFields: {
              byValueOr: [{ fieldName: "testField", fieldValue: "abc" }],
            },
          },
        ],
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("probe-touched")).toHaveTextContent('"dependentField":true');
      });
    });

    it("marks dependent fields untouched when a byValueAnd dependency is not met", async () => {
      const field = textField();
      renderProbe(field, {
        allFields: [
          field,
          {
            name: "dependentField",
            label: "Dependent",
            type: "text",
            requiredDependentFields: {
              byValueAnd: [{ fieldName: "testField", fieldValue: "expected" }],
            },
          },
        ],
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "other" } });

      await waitFor(() => {
        expect(screen.getByTestId("probe-values")).toHaveTextContent('"testField":"other"');
      });
      expect(screen.getByTestId("probe-touched")).not.toHaveTextContent('"dependentField":true');
    });

    it("ignores fields without a dependency on the changed field", async () => {
      const field = textField();
      renderProbe(field, {
        allFields: [
          field,
          {
            name: "unrelated",
            label: "Unrelated",
            type: "text",
            requiredDependentFields: {
              byValueOr: [{ fieldName: "otherField", fieldValue: "x" }],
            },
          },
        ],
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("probe-values")).toHaveTextContent('"testField":"abc"');
      });
      expect(screen.getByTestId("probe-touched")).not.toHaveTextContent("unrelated");
    });

    it("invokes a single-argument onValueChange handler with the new value", async () => {
      const handler = vi.fn((_value: unknown) => undefined);
      renderProbe(textField({ onValueChange: "onTestChange" }), {
        actionCallbacks: { onTestChange: handler as unknown as ActionCallback },
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => expect(handler).toHaveBeenCalledWith("abc"));
    });

    it("invokes a two-argument onValueChange handler with name and value", async () => {
      // A real two-parameter function: the field picks the (name, value) signature by arity,
      // which a vitest spy (length 0) cannot express.
      const received: unknown[][] = [];
      const handler = (name: unknown, value: unknown) => {
        received.push([name, value]);
      };
      renderProbe(textField({ onValueChange: "onTestChange" }), {
        actionCallbacks: { onTestChange: handler as unknown as ActionCallback },
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => expect(received).toEqual([["testField", "abc"]]));
    });

    it("logs an error when an async onValueChange handler rejects", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler = vi.fn((_value: unknown) => Promise.reject(new Error("boom")));
      renderProbe(textField({ onValueChange: "onTestChange" }), {
        actionCallbacks: { onTestChange: handler as unknown as ActionCallback },
      });

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith(
          "onValueChange onTestChange failed:",
          expect.any(Error),
        ),
      );
      errorSpy.mockRestore();
    });

    it("skips onValueChange when the callback is not registered", async () => {
      renderProbe(textField({ onValueChange: "missing" }));

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await waitFor(() => {
        expect(screen.getByTestId("probe-values")).toHaveTextContent('"testField":"abc"');
      });
    });

    it("invokes the onBlur handler with name and value", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const handler = vi.fn((_name: unknown, _value: unknown) => undefined);
      renderProbe(textField({ onBlur: "onTestBlur" }), {
        actionCallbacks: { onTestBlur: handler as unknown as ActionCallback },
      });

      const input = screen.getByTestId("text-field-testField");
      fireEvent.change(input, { target: { value: "abc" } });
      fireEvent.blur(input);

      await waitFor(() => expect(handler).toHaveBeenCalledWith("testField", "abc"));
      logSpy.mockRestore();
    });

    it("logs an error when an async onBlur handler rejects", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const handler = vi.fn((_name: unknown, _value: unknown) =>
        Promise.reject(new Error("blur boom")),
      );
      renderProbe(textField({ onBlur: "onTestBlur" }), {
        actionCallbacks: { onTestBlur: handler as unknown as ActionCallback },
      });

      fireEvent.blur(screen.getByTestId("text-field-testField"));

      await waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith("onBlur onTestBlur failed:", expect.any(Error)),
      );
      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("skips onBlur when the callback is not registered", async () => {
      renderProbe(textField({ onBlur: "missing" }));

      fireEvent.blur(screen.getByTestId("text-field-testField"));

      await waitFor(() => {
        expect(screen.getByTestId("probe-values")).toHaveTextContent('"testField"');
      });
    });

    it("stops the change when updateDependentFields asks to return", async () => {
      vi.mocked(updateDependentFields).mockReturnValueOnce(true);
      renderProbe(textField());

      fireEvent.change(screen.getByTestId("text-field-testField"), { target: { value: "abc" } });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.getByTestId("probe-values")).toHaveTextContent('"testField":""');
    });
  });

  describe("Text and price edge cases", () => {
    it("adds the hidden class when the field is hidden", () => {
      const field: Field = {
        name: "hiddenField",
        label: "Hidden",
        type: "text",
        isHidden: true,
        fieldMapping: { originalName: "hiddenField" },
      };

      const { container } = renderWithContext(field);

      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector(".generic-field-hidden")).toBeInTheDocument();
    });

    it("renders null or undefined values as empty text", () => {
      const field: Field = {
        name: "nullField",
        label: "Null",
        type: "text",
        fieldMapping: { originalName: "nullField" },
      };

      renderWithContext(field, {}, { nullField: null });

      expect(screen.getByTestId("text-field-nullField")).toHaveValue("");
    });

    it("renders empty price values as empty text", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: "" });

      expect(screen.getByTestId("text-field-priceField")).toHaveValue("");
    });

    it("renders price values without percentage or amount subtype as-is", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 12.5 });

      expect(screen.getByTestId("text-field-priceField")).toHaveValue("12.5");
    });

    it("renders non-numeric price values as-is even for amount subtype", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: "abc" });

      expect(screen.getByTestId("text-field-priceField")).toHaveValue("abc");
    });

    it("formats percentage values to two decimals", () => {
      const field: Field = {
        name: "discountField",
        label: "Discount",
        type: "price",
        subtype: "discount",
        fieldMapping: { originalName: "discountField" },
      };

      renderWithContext(field, {}, { discountField: 5 });

      expect(screen.getByTestId("text-field-discountField")).toHaveValue("5.00");
    });

    it("clears the zero-focus state once the user types", async () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 0 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);
      expect(input).toHaveValue("");

      fireEvent.change(input, { target: { value: "7" } });

      await waitFor(() => expect(input).toHaveValue("7"));
    });

    it("keeps non-zero price raw on focus without setting the zero state", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 3 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);

      expect(input).toHaveValue("3");
    });

    it("does not enter focused state when a price field is disabled", () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        isDisabled: true,
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 0 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);

      expect(input).toHaveValue("0.00");
    });

    it("keeps an existing price value on blur", async () => {
      const field: Field = {
        name: "priceField",
        label: "Price",
        type: "price",
        subtype: "amount",
        fieldMapping: { originalName: "priceField" },
      };

      renderWithContext(field, {}, { priceField: 9 });

      const input = screen.getByTestId("text-field-priceField");
      fireEvent.focus(input);
      fireEvent.blur(input);

      await waitFor(() => expect(input).toHaveValue("9.00"));
    });

    it("does not apply price blur defaults to plain text fields", async () => {
      const field: Field = {
        name: "plainField",
        label: "Plain",
        type: "text",
        fieldMapping: { originalName: "plainField" },
      };

      renderWithContext(field, {}, { plainField: "" });

      const input = screen.getByTestId("text-field-plainField");
      fireEvent.blur(input);

      await waitFor(() => expect(input).toHaveValue(""));
    });
  });

  describe("Number field edge cases", () => {
    const numberField: Field = {
      name: "testNumber",
      label: "Test Number",
      type: "number",
      step: 1,
      defaultValue: 5,
      fieldMapping: { originalName: "testNumber" },
    };

    it("falls back to the default value when the input is cleared", async () => {
      renderWithContext(numberField, {}, { testNumber: "3" });

      fireEvent.change(screen.getByTestId("number-field-testNumber"), { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByTestId("number-field-testNumber")).toHaveValue(5);
      });
    });

    it("falls back to 0 when cleared and no default value is configured", async () => {
      renderWithContext({ ...numberField, defaultValue: undefined }, {}, { testNumber: "3" });

      fireEvent.change(screen.getByTestId("number-field-testNumber"), { target: { value: "" } });

      await waitFor(() => {
        expect(screen.getByTestId("number-field-testNumber")).toHaveValue(0);
      });
    });

    it("renders 0 when the form value is missing", () => {
      renderWithContext(numberField, {}, { testNumber: undefined });

      expect(screen.getByTestId("number-field-testNumber")).toHaveValue(0);
    });

    it("runs blur handling and the onBlur callback", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const handler = vi.fn((_name: unknown, _value: unknown) => undefined);
      renderWithContext(
        { ...numberField, onBlur: "onNumberBlur" },
        { actionCallbacks: { onNumberBlur: handler as unknown as ActionCallback } },
        { testNumber: "4" },
      );

      fireEvent.blur(screen.getByTestId("number-field-testNumber"));

      await waitFor(() => expect(handler).toHaveBeenCalledWith("testNumber", "4"));
      logSpy.mockRestore();
    });
  });

  describe("Radio source callbacks", () => {
    const radioField: Field = {
      name: "sourceRadio",
      label: "Source Radio",
      type: "radiogroup",
      radioButtonsSource: "getOptions",
      fieldMapping: { originalName: "sourceRadio" },
    };

    it("resolves radio buttons from the registered source callback", () => {
      renderWithContext(radioField, {
        radioSourceCallbacks: {
          getOptions: () => [
            { label: "A", value: "a" },
            { label: "B", value: "b" },
          ],
        },
      });

      expect(screen.getByTestId("radio-a")).toBeInTheDocument();
      expect(screen.getByTestId("radio-b")).toBeInTheDocument();
    });

    it("renders no radio buttons when the source callback is missing", () => {
      renderWithContext(radioField, { radioSourceCallbacks: {} });

      expect(screen.getByTestId("radio-group-sourceRadio")).toBeEmptyDOMElement();
    });

    it("renders no radio buttons when no callbacks are provided at all", () => {
      renderWithContext(radioField);

      expect(screen.getByTestId("radio-group-sourceRadio")).toBeEmptyDOMElement();
    });

    it("renders no radio buttons when neither source nor buttons are configured", () => {
      renderWithContext({ ...radioField, radioButtonsSource: undefined });

      expect(screen.getByTestId("radio-group-sourceRadio")).toBeEmptyDOMElement();
    });
  });

  describe("Multi-select dropdown and permissions", () => {
    it("uses an empty array when a multi-select has no value", () => {
      const field: Field = {
        name: "multiDropdown",
        label: "Multi",
        type: "dropdown",
        multiSelect: true,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        fieldMapping: { originalName: "multiDropdown" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("dropdown-multiDropdown")).toBeInTheDocument();
    });

    it("uses the stored array for a multi-select value", () => {
      const field: Field = {
        name: "multiDropdown",
        label: "Multi",
        type: "dropdown",
        multiSelect: true,
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        fieldMapping: { originalName: "multiDropdown" },
      };

      renderWithContext(field, {}, { multiDropdown: ["a", "b"] });

      expect(screen.getByRole("option", { name: "A" })).toHaveProperty("selected", true);
      expect(screen.getByRole("option", { name: "B" })).toHaveProperty("selected", true);
    });

    it("falls back to the default value for single dropdowns", () => {
      const field: Field = {
        name: "defaultDropdown",
        label: "Default",
        type: "dropdown",
        defaultValue: "b",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        fieldMapping: { originalName: "defaultDropdown" },
      };

      renderWithContext(field);

      expect(screen.getByTestId("dropdown-defaultDropdown")).toHaveValue("b");
    });

    it("renders nothing when the user lacks the required permission", () => {
      const field: Field = {
        name: "secretField",
        label: "Secret",
        type: "text",
        permissions: ["NOPE"],
        fieldMapping: { originalName: "secretField" },
      };

      renderWithContext(field);

      expect(screen.queryByTestId("text-field-secretField")).not.toBeInTheDocument();
    });
  });

  describe("Upload and textarea callbacks", () => {
    it("stores selected files in the form", async () => {
      const field: Field = {
        name: "uploadField",
        label: "Upload",
        type: "upload",
        fieldMapping: { originalName: "uploadField" },
      };
      const file = new File(["x"], "doc.txt", { type: "text/plain" });

      renderWithContext(field);
      fireEvent.change(screen.getByTestId("file-upload-uploadField"), {
        target: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByTestId("file-upload-initial-uploadField")).toHaveTextContent("[{}]");
      });
    });

    it("passes delete callbacks and defaults to empty file lists", () => {
      const field: Field = {
        name: "uploadField",
        label: "Upload",
        type: "upload",
        allowedFormats: ["pdf"],
        maxFilesAllowed: 2,
        maxFileSizeInMb: 5,
        options: [{ value: "t", label: "T" }],
        existingFiles: [{ name: "a.pdf" }],
        fieldMapping: { originalName: "uploadField" },
      };

      renderWithContext(field, { onDeleteStart: vi.fn(), onDeleteEnd: vi.fn() });

      expect(screen.getByTestId("file-upload-initial-uploadField")).toHaveTextContent("[]");
    });

    it("runs the onBlur callback for textarea fields", async () => {
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const handler = vi.fn((_name: unknown, _value: unknown) => undefined);
      const field: Field = {
        name: "testTextarea",
        label: "Notes",
        type: "textarea",
        isRequired: true,
        onBlur: "onNotesBlur",
        fieldMapping: { originalName: "testTextarea" },
      };

      renderWithContext(
        field,
        { actionCallbacks: { onNotesBlur: handler as unknown as ActionCallback } },
        { testTextarea: "hello" },
      );
      fireEvent.blur(screen.getByTestId("textarea-testTextarea"));

      await waitFor(() => expect(handler).toHaveBeenCalledWith("testTextarea", "hello"));
      logSpy.mockRestore();
    });
  });
});
