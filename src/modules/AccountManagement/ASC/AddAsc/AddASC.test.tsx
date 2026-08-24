import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  useQueryClientMock,
  useMutationMock,
  useQueryMock,
  useParamsMock,
  setTouchedMock,
  setErrorsMock,
  setFieldValueMock,
  validateByActionMock,
  startValidationMock,
  stopValidationMock,
  setCurrentActionMock,
  scrollToFirstErrorMock,
  scrollToTopMock,
  mapAccountRolesToAPIFormatMock,
  resetMock,
  setMessagesMock,
  navigateMock,
  mutateMock,
  invalidateQueriesMock,
  setInitialFormValuesMock,
  formikValuesRef,
  formInitStateRef,
  mutationModeRef,
  queryDataRef,
  ascQueryDataRef,
} = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryMock: vi.fn(),
  useParamsMock: vi.fn(() => ({})),
  setTouchedMock: vi.fn(async () => undefined),
  setErrorsMock: vi.fn(),
  setFieldValueMock: vi.fn(),
  validateByActionMock: vi.fn(),
  startValidationMock: vi.fn(),
  stopValidationMock: vi.fn(),
  setCurrentActionMock: vi.fn(),
  scrollToFirstErrorMock: vi.fn(),
  scrollToTopMock: vi.fn(),
  mapAccountRolesToAPIFormatMock: vi.fn((roles: string[]) => roles),
  resetMock: vi.fn(),
  setMessagesMock: vi.fn(),
  navigateMock: vi.fn(),
  mutateMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  setInitialFormValuesMock: vi.fn(),
  formikValuesRef: {
    current: {
      name: "ASC Name",
      gst: "GST-1",
      email: "asc@mail.com",
      phoneNumber: "111222",
      companyVATNumber: "VAT-1",
      logo: [{ attachmentId: "logo-1", name: "logo.png", type: "image/png" }],
      isActive: true,
      houseNumber: "42",
      street: "Main",
      city: "Istanbul",
      state: "TR-34",
      postalCode: "34000",
      countryCode: "TR",
      laPriceChargeable: "10",
      frPriceChargeable: "11",
      pkPriceChargeable: "12",
      biqicName: "BIQIC",
      customerCode: "C1",
      serviceCenterType: "TYPE",
      laPrice: "20",
      frPrice: "21",
      pkPrice: "22",
      defaultCountry: "TR",
      reimbursementPeriodType: "WEEKLY",
      reimbursementCreateOn: "1",
      sparePartsDiscount: "1",
      accessoriesDiscount: "2",
      sparePartsIncentive: "3",
      accessoriesIncentive: "4",
      packagingCost: "5",
      accountRoles: ["ASC_TECHNICIAN"],
      firstName: "John",
      lastName: "Doe",
      userEmail: "user@mail.com",
      userPhoneNumber: "999",
      employeeCode: "E-1",
      reimbursementMethod_CAT1_repair: "FIXED",
      reimbursementMethod_CAT1_exchange: "DYNAMIC",
    } as Record<string, unknown>,
  },
  formInitStateRef: {
    current: {
      sections: [
        { name: "generalInfo", index: 0 },
        { name: "pricing", index: 1 },
      ],
      initialFormValues: {
        name: "",
        email: "",
        reimbursementCreateOn: "1",
      },
      allFields: [{ name: "name" }, { name: "email" }],
      mandatoryFields: {
        submit: { fieldList: ["name"] },
        save: { fieldList: ["name"] },
      },
      isInitialized: true,
    },
  },
  mutationModeRef: { current: "idle" as "idle" | "success" | "userCreationFailed" | "error" },
  queryDataRef: {
    current: {
      user: { countryCode: "TR", language: "en" },
      countryConfiguration: {
        reimbursementConfig: [
          {
            category: "CAT1",
            reimbursementMethods: { REPAIR: "FIXED", EXCHANGE: "DYNAMIC" },
          },
        ],
        reimbursementPeriodType: "MONTHLY",
        reimbursementCreateOn: "7",
        currency: "TRY",
        currencySymbol: "₺",
      },
      uiConfiguration: {
        forms: [
          {
            name: "AddASC",
            sections: [
              { name: "generalInfo", index: 0 },
              { name: "pricing", index: 1 },
              { name: "boschInternalConfiguration", index: 2 },
              { name: "reimbursement", index: 3 },
              { name: "addAdmin", index: 4 },
            ],
            actions: [
              { onAction: "onSubmit" },
              { onAction: "onCancel" },
              { onAction: "saveDraft" },
            ],
          },
        ],
      },
    },
  },
  ascQueryDataRef: { current: undefined as unknown },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => useParamsMock(),
  };
});

vi.mock("../../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("../../../../contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: setMessagesMock }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

vi.mock("../../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    ...formInitStateRef.current,
    setAllFields: vi.fn(),
    reset: resetMock,
    setInitialFormValues: setInitialFormValuesMock,
  }),
}));

vi.mock("../../../../components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(() => ({})),
    validateByAction: validateByActionMock,
    startValidation: startValidationMock,
    stopValidation: stopValidationMock,
    setCurrentAction: setCurrentActionMock,
  }),
}));

vi.mock("../../../../components/generics/Form/formValidation", () => ({
  getVisibleFieldsWithErrors: (_fields: unknown, errors: Record<string, string>) =>
    Object.keys(errors),
}));

vi.mock("../../../../utils/scrollToError", () => ({
  scrollToFirstError: (...args: unknown[]) => scrollToFirstErrorMock(...args),
  scrollToTop: (...args: unknown[]) => scrollToTopMock(...args),
}));

vi.mock("../../Employees/EmployeeOverview/EmployeeOverview.utils", () => ({
  mapAccountRolesToAPIFormat: (roles: string[]) => mapAccountRolesToAPIFormatMock(roles),
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="loading" />,
}));

vi.mock("../../../../components/generics/Section/GenericSection", () => ({
  default: ({ section, onHeaderClick, isCollapsed }: any) => (
    <button
      type="button"
      data-testid={`section-${section.name}`}
      data-collapsed={String(isCollapsed)}
      onClick={onHeaderClick}
    >
      {section.name}
    </button>
  ),
}));

vi.mock("../../../../components/generics/Action/GenericAction", () => ({
  default: ({ onActionClick }: { onActionClick: (actionName?: string) => void }) => (
    <div>
      <button type="button" data-testid="action-submit" onClick={() => onActionClick("onSubmit")}>
        submit
      </button>
      <button type="button" data-testid="action-cancel" onClick={() => onActionClick("onCancel")}>
        cancel
      </button>
      <button
        type="button"
        data-testid="action-save-draft"
        onClick={() => onActionClick("saveDraft")}
      >
        saveDraft
      </button>
    </div>
  ),
}));

vi.mock("formik", async () => {
  const actual = await vi.importActual<typeof import("formik")>("formik");
  return {
    ...actual,
    Formik: ({ children }: any) =>
      children({
        values: formikValuesRef.current,
        setErrors: setErrorsMock,
        setTouched: setTouchedMock,
        setFieldValue: setFieldValueMock,
      }),
    Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  };
});

import AddASC from "./AddASC";

describe("AddASC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutationModeRef.current = "idle";
    ascQueryDataRef.current = undefined;
    useParamsMock.mockReturnValue({});

    formInitStateRef.current = {
      sections: [
        { name: "generalInfo", index: 0 },
        { name: "pricing", index: 1 },
      ],
      initialFormValues: {
        name: "",
        email: "",
        reimbursementCreateOn: "1",
      },
      allFields: [{ name: "name" }, { name: "email" }],
      mandatoryFields: {
        submit: { fieldList: ["name"] },
        save: { fieldList: ["name"] },
      },
      isInitialized: true,
    };

    formikValuesRef.current = {
      name: "ASC Name",
      gst: "GST-1",
      email: "asc@mail.com",
      phoneNumber: "111222",
      companyVATNumber: "VAT-1",
      logo: [{ attachmentId: "logo-1", name: "logo.png", type: "image/png" }],
      isActive: true,
      houseNumber: "42",
      street: "Main",
      city: "Istanbul",
      state: "TR-34",
      postalCode: "34000",
      countryCode: "TR",
      laPriceChargeable: "10",
      frPriceChargeable: "11",
      pkPriceChargeable: "12",
      biqicName: "BIQIC",
      customerCode: "C1",
      serviceCenterType: "TYPE",
      laPrice: "20",
      frPrice: "21",
      pkPrice: "22",
      defaultCountry: "TR",
      reimbursementPeriodType: "WEEKLY",
      reimbursementCreateOn: "1",
      sparePartsDiscount: "1",
      accessoriesDiscount: "2",
      sparePartsIncentive: "3",
      accessoriesIncentive: "4",
      packagingCost: "5",
      accountRoles: ["ASC_TECHNICIAN"],
      firstName: "John",
      lastName: "Doe",
      userEmail: "user@mail.com",
      userPhoneNumber: "999",
      employeeCode: "E-1",
      reimbursementMethod_CAT1_repair: "FIXED",
      reimbursementMethod_CAT1_exchange: "DYNAMIC",
    };

    queryDataRef.current = {
      user: { countryCode: "TR", language: "en" },
      countryConfiguration: {
        reimbursementConfig: [
          {
            category: "CAT1",
            reimbursementMethods: { REPAIR: "FIXED", EXCHANGE: "DYNAMIC" },
          },
        ],
        reimbursementPeriodType: "MONTHLY",
        reimbursementCreateOn: "7",
        currency: "TRY",
        currencySymbol: "₺",
      },
      uiConfiguration: {
        forms: [
          {
            name: "AddASC",
            sections: [
              { name: "generalInfo", index: 0 },
              { name: "pricing", index: 1 },
              { name: "boschInternalConfiguration", index: 2 },
              { name: "reimbursement", index: 3 },
              { name: "addAdmin", index: 4 },
            ],
            actions: [
              { onAction: "onSubmit" },
              { onAction: "onCancel" },
              { onAction: "saveDraft" },
            ],
          },
        ],
      },
    };

    useQueryClientMock.mockReturnValue({
      getQueryData: (key: unknown[]) => {
        if (key[0] === "user") return queryDataRef.current.user;
        if (key[0] === "countryConfiguration") return queryDataRef.current.countryConfiguration;
        if (key[0] === "UIConfiguration") return queryDataRef.current.uiConfiguration;
        return undefined;
      },
      invalidateQueries: invalidateQueriesMock,
    });

    useQueryMock.mockImplementation(() => ({ data: ascQueryDataRef.current }));

    useMutationMock.mockImplementation(({ onSuccess, onError }: any) => {
      mutateMock.mockImplementation(() => {
        if (mutationModeRef.current === "success") {
          onSuccess?.();
          return;
        }
        if (mutationModeRef.current === "userCreationFailed") {
          onError?.({ response: { data: { detail: "userCreationFailed" } } });
          return;
        }
        if (mutationModeRef.current === "error") {
          onError?.({ response: { data: { detail: "somethingElse" } } });
        }
      });
      return { mutate: mutateMock };
    });
  });

  it("renders loading state when form initialization is not ready", () => {
    formInitStateRef.current.isInitialized = false;

    render(<AddASC />);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders sections and generic actions when initialized", () => {
    render(<AddASC />);

    expect(screen.getByTestId("section-generalInfo")).toBeInTheDocument();
    expect(screen.getByTestId("action-submit")).toBeInTheDocument();
    expect(screen.getByTestId("action-save-draft")).toBeInTheDocument();
  });

  it("submits mapped payload and runs success side effects", async () => {
    validateByActionMock.mockReturnValue({});
    mutationModeRef.current = "success";

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setCurrentActionMock).toHaveBeenCalledWith("submit");
      expect(startValidationMock).toHaveBeenCalledWith("submit");
      expect(stopValidationMock).toHaveBeenCalled();
      expect(mapAccountRolesToAPIFormatMock).toHaveBeenCalledWith(["ASC_TECHNICIAN"]);
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isDraft: false,
          payload: expect.objectContaining({
            firstUser: expect.objectContaining({
              email: "user@mail.com",
              accountRoles: ["ASC_TECHNICIAN"],
              language: "en",
            }),
            serviceCenter: expect.objectContaining({
              reimbursementConfig: [
                {
                  category: "CAT1",
                  reimbursementMethods: { REPAIR: "FIXED", EXCHANGE: "DYNAMIC" },
                },
              ],
              laPrice: 20,
              frPrice: 21,
              pkPrice: 22,
              currency: "TRY",
              currencySymbol: "₺",
            }),
          }),
        }),
      );
      expect(setMessagesMock).toHaveBeenCalledWith([
        { type: "success", duration: 5000, text: "ASCCreatedSuccessfully" },
      ]);
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["ascProfiles"] });
      expect(navigateMock).toHaveBeenCalledWith("/asc-profiles");
      expect(scrollToTopMock).toHaveBeenCalled();
    });
  });

  it("blocks submit and marks fields when validation fails", async () => {
    validateByActionMock.mockReturnValue({ name: "required" });

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setErrorsMock).toHaveBeenCalledWith({ name: "required" });
      expect(setTouchedMock).toHaveBeenCalledWith({ name: true });
      expect(scrollToFirstErrorMock).toHaveBeenCalledWith(["name"]);
      expect(mutateMock).not.toHaveBeenCalled();
      expect(stopValidationMock).not.toHaveBeenCalled();
    });
  });

  it("runs saveDraft validation and submits draft payload", async () => {
    validateByActionMock.mockReturnValue({});

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-save-draft"));

    await waitFor(() => {
      expect(setCurrentActionMock).toHaveBeenCalledWith("save");
      expect(startValidationMock).toHaveBeenCalledWith("save");
      expect(stopValidationMock).toHaveBeenCalled();
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isDraft: true,
        }),
      );
    });
  });

  it("blocks saveDraft and scrolls when draft validation fails", async () => {
    validateByActionMock.mockReturnValue({ email: "required" });

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-save-draft"));

    await waitFor(() => {
      expect(setCurrentActionMock).toHaveBeenCalledWith("save");
      expect(setErrorsMock).toHaveBeenCalledWith({ email: "required" });
      expect(setTouchedMock).toHaveBeenCalledWith({ email: true });
      expect(scrollToFirstErrorMock).toHaveBeenCalledWith(["email"]);
      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  it("resets form on cancel", async () => {
    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-cancel"));

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalled();
      expect(setFieldValueMock).not.toHaveBeenCalled();
    });
  });

  it("handles userCreationFailed API error with warning and redirect", async () => {
    validateByActionMock.mockReturnValue({});
    mutationModeRef.current = "userCreationFailed";

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setMessagesMock).toHaveBeenCalledWith([
        { type: "warning", text: "ascDraftCreatedWithoutUser" },
      ]);
      expect(navigateMock).toHaveBeenCalledWith("/asc-profiles");
      expect(scrollToTopMock).toHaveBeenCalled();
    });
  });

  it("handles generic API error with error message", async () => {
    validateByActionMock.mockReturnValue({});
    mutationModeRef.current = "error";

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setMessagesMock).toHaveBeenCalledWith([
        { type: "error", duration: 5000, text: "failedToCreateAsc" },
      ]);
      expect(scrollToTopMock).toHaveBeenCalled();
    });
  });

  it("maps edit-mode draft data into initial form values", async () => {
    useParamsMock.mockReturnValue({ ascId: "ASC-9" });
    ascQueryDataRef.current = {
      serviceCenter: {
        ascId: "ASC-9",
        name: "Draft ASC",
        email: "draft@mail.com",
        phoneNumber: "123",
        gst: "GST",
        companyVATNumber: "VAT",
        isActive: true,
        address: {
          houseNumber: "1",
          street: "Street",
          city: "City",
          stateProvinceRegion: "State",
          postalCode: "1000",
          countryCode: "TR",
        },
        logo: { logoId: "logo-2", name: "logo2.png", type: "image/png" },
        pkPriceChargeable: 5,
        laPriceChargeable: 6,
        frPriceChargeable: 7,
        biqicName: "BQ",
        customerCode: "CC",
        serviceCenterType: "TYPE",
        laPrice: 1,
        frPrice: 2,
        pkPrice: 3,
        sparePartsDiscount: 0,
        accessoriesDiscount: 0,
        sparePartsIncentive: 0,
        accessoriesIncentive: 0,
        packagingCost: 0,
        defaultCountry: "TR",
        reimbursementPeriodType: "CUSTOM",
        reimbursementCreateOn: "2",
        reimbursementConfig: [
          {
            category: "CAT1",
            reimbursementMethods: { REPAIR: "R1", EXCHANGE: "E1" },
          },
        ],
      },
      firstUser: {
        userId: "U-9",
        firstName: "Ann",
        lastName: "Lee",
        phoneNumber: "888",
        email: "ann@mail.com",
        employeeCode: "EMP-9",
        accountRoles: [{ id: "ASC_ADMIN" }],
      },
    };

    render(<AddASC />);

    await waitFor(() => {
      expect(setInitialFormValuesMock).toHaveBeenCalled();
    });

    const updater = setInitialFormValuesMock.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    const mapped = updater({ baseline: true });
    expect(mapped).toMatchObject({
      baseline: true,
      ascId: "ASC-9",
      name: "Draft ASC",
      userEmail: "ann@mail.com",
      accountRoles: ["ASC_ADMIN"],
      reimbursementMethod_CAT1_repair: "R1",
      reimbursementMethod_CAT1_exchange: "E1",
    });
  });

  it("uses country config defaults for reimbursement in create mode", async () => {
    render(<AddASC />);

    await waitFor(() => {
      expect(setInitialFormValuesMock).toHaveBeenCalled();
    });

    const lastCallIndex = setInitialFormValuesMock.mock.calls.length - 1;
    const updater = setInitialFormValuesMock.mock.calls[lastCallIndex][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    const mapped = updater({ existing: "value" });
    expect(mapped).toMatchObject({
      existing: "value",
      reimbursementMethod_CAT1_repair: "FIXED",
      reimbursementMethod_CAT1_exchange: "DYNAMIC",
      reimbursementCreateOn: "7",
      reimbursementPeriodType: "MONTHLY",
    });
  });

  it("sends edit payload with ascId, first user id, and null createOn for custom period", async () => {
    validateByActionMock.mockReturnValue({});
    useParamsMock.mockReturnValue({ ascId: "ASC-42" });
    ascQueryDataRef.current = {
      serviceCenter: {
        ascId: "ASC-42",
        name: "Draft ASC",
        email: "draft@mail.com",
        phoneNumber: "123",
        gst: "GST",
        companyVATNumber: "VAT",
        isActive: true,
        address: {
          houseNumber: "1",
          street: "Street",
          city: "City",
          stateProvinceRegion: "State",
          postalCode: "1000",
          countryCode: "TR",
        },
        logo: { logoId: "logo-2", name: "logo2.png", type: "image/png" },
        pkPriceChargeable: 5,
        laPriceChargeable: 6,
        frPriceChargeable: 7,
        biqicName: "BQ",
        customerCode: "CC",
        serviceCenterType: "TYPE",
        laPrice: 1,
        frPrice: 2,
        pkPrice: 3,
        sparePartsDiscount: 0,
        accessoriesDiscount: 0,
        sparePartsIncentive: 0,
        accessoriesIncentive: 0,
        packagingCost: 0,
        defaultCountry: "TR",
        reimbursementPeriodType: "CUSTOM",
        reimbursementCreateOn: "2",
        reimbursementConfig: [],
      },
      firstUser: {
        userId: "U-42",
        firstName: "Ann",
        lastName: "Lee",
        phoneNumber: "888",
        email: "ann@mail.com",
        employeeCode: "EMP-9",
        accountRoles: [{ id: "ASC_ADMIN" }],
      },
    };
    formikValuesRef.current = {
      ...formikValuesRef.current,
      reimbursementPeriodType: "CUSTOM",
      reimbursementCreateOn: "10",
    };

    render(<AddASC />);
    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          isDraft: false,
          payload: expect.objectContaining({
            firstUser: expect.objectContaining({ userId: "U-42" }),
            serviceCenter: expect.objectContaining({
              ascId: "ASC-42",
              reimbursementPeriodType: "CUSTOM",
              reimbursementCreateOn: null,
            }),
          }),
        }),
      );
    });
  });
});
