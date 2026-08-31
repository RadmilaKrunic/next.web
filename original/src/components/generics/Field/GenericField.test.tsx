import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor, act } from "@testing-library/react";
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
import { handleFaultCodeSelection } from "./GenericField.utils";
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
    value: string;
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
    activeValueChangeFieldRef: undefined as { current: string | null } | undefined,
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

    it("locks the active value-change field on focus and releases it on blur for guarded fields", async () => {
      vi.useFakeTimers();
      const field: Field = {
        name: "onSummaryTotalAmountChange",
        label: "Total",
        type: "price",
        subtype: "amount",
        isRequired: false,
        onValueChange: "onSummaryTotalAmountChange",
        fieldMapping: { originalName: "onSummaryTotalAmountChange" },
      };
      const activeValueChangeFieldRef = { current: null as string | null };

      renderWithContext(field, { activeValueChangeFieldRef }, { onSummaryTotalAmountChange: 5 });

      const input = screen.getByTestId("text-field-onSummaryTotalAmountChange");
      fireEvent.focus(input);
      expect(activeValueChangeFieldRef.current).toBe("onSummaryTotalAmountChange");

      fireEvent.blur(input);
      act(() => {
        vi.runAllTimers();
      });
      expect(activeValueChangeFieldRef.current).toBeNull();

      vi.useRealTimers();
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
          { value: "CHARGABLE", label: "Chargeable", name: "Chargeable" },
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
          { value: "CHARGABLE", label: "Chargeable", name: "Chargeable" },
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
});
