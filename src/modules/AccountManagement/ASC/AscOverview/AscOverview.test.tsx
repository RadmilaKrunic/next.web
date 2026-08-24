import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";

const {
  useQueryClientMock,
  useQueryMock,
  useMutationMock,
  useParamsMock,
  useLocationMock,
  invalidateQueriesMock,
  setQueryDataMock,
  mutateMock,
  setMessagesMock,
  setAllFieldsMock,
  setInitialFormValuesMock,
  setTouchedMock,
  setErrorsMock,
  setFieldValueMock,
  toggleSectionFieldsDisabledMock,
  useActionWithValidationMock,
  actionWithValidationRunnerMock,
  putMock,
  queryStateRef,
  formInitStateRef,
  formValuesRef,
  uiConfigRef,
  userRef,
} = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useParamsMock: vi.fn(),
  useLocationMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  setQueryDataMock: vi.fn(),
  mutateMock: vi.fn(),
  setMessagesMock: vi.fn(),
  setAllFieldsMock: vi.fn(),
  setInitialFormValuesMock: vi.fn(),
  setTouchedMock: vi.fn(async () => undefined),
  setErrorsMock: vi.fn(),
  setFieldValueMock: vi.fn(),
  toggleSectionFieldsDisabledMock: vi.fn((allFields: unknown[]) => allFields),
  useActionWithValidationMock: vi.fn(),
  actionWithValidationRunnerMock: vi.fn(),
  putMock: vi.fn((url?: string) => Promise.resolve({ url })),
  queryStateRef: {
    current: {
      data: undefined as any,
      isLoading: false,
    },
  },
  formInitStateRef: {
    current: {
      initialFormValues: {
        name: "",
        email: "",
        phoneNumber: "",
        gst: "",
        companyVATNumber: "",
        isActive: true,
        streetName: "Init Street",
        houseNumber: "7",
        city: "Init City",
        state: "Init State",
        postalCode: "1000",
        country: "TR",
        bankName: "Init Bank",
        accountNumber: "ACC-1",
        reimbursementPeriodType: "WEEKLY",
        reimbursementCreateOn: "1",
        biqicName: "Init BIQIC",
        customerCode: "INIT-CODE",
        serviceCenterType: "INIT-TYPE",
        laPrice: "1",
        frPrice: "2",
        pkPrice: "3",
        laPriceChargeable: "4",
        frPriceChargeable: "5",
        pkPriceChargeable: "6",
        sparePartsDiscount: "0",
        accessoriesDiscount: "0",
        sparePartsIncentive: "0",
        accessoriesIncentive: "0",
        packagingCost: "0",
        notificationEmail: false,
        notificationSMS: false,
        parentNotificationEmail: false,
        parentNotificationSMS: false,
      } as Record<string, unknown>,
      allFields: [{ name: "name" }],
      mandatoryFields: { save: { fieldList: ["name"] } },
      tabs: [{ name: "generalInfo", label: "generalInfo", position: 0 }],
      isInitialized: true,
    },
  },
  formValuesRef: {
    current: {
      name: "Updated ASC",
      email: "asc@bosch.com",
      phoneNumber: "555-01",
      gst: "GST-001",
      companyVATNumber: "VAT-001",
      isActive: true,
      streetName: "Street 1",
      houseNumber: "11",
      city: "Istanbul",
      state: "TR-34",
      postalCode: "34000",
      country: "TR",
      logo: [{ attachmentId: "logo-1", name: "logo.png", type: "image/png" }],
      reimbursementPeriodType: "CUSTOM",
      reimbursementCreateOn: "12",
      notificationEmail: true,
      notificationSMS: false,
      parentNotificationEmail: false,
      parentNotificationSMS: true,
    } as Record<string, unknown>,
  },
  uiConfigRef: {
    current: {
      forms: [
        {
          name: "ASCOverview",
          sections: [{ name: "generalInfo", isDisabled: true, areas: [{ fields: [] }] }],
          actions: [{ onAction: "onDeactivateASC" }],
        },
      ],
    },
  },
  userRef: {
    current: {
      ascId: "ASC-1",
      countryCode: "TR",
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => useParamsMock(),
    useLocation: () => useLocationMock(),
  };
});

vi.mock("hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("contexts/messagescontext", () => ({
  MessagesContext: React.createContext({ setMessages: setMessagesMock }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
    useQuery: (...args: unknown[]) => useQueryMock(...args),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
  };
});

vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    ...formInitStateRef.current,
    setAllFields: setAllFieldsMock,
    setInitialFormValues: setInitialFormValuesMock,
  }),
}));

vi.mock("components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(() => ({})),
    validateByAction: vi.fn(() => ({})),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

vi.mock("../../../../hooks/useActionWithValidation", () => ({
  useActionWithValidation: (...args: unknown[]) => useActionWithValidationMock(...args),
}));

vi.mock("components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div data-testid="loading" />,
}));

vi.mock("components/ui/OverviewHeader", () => ({
  default: () => <div data-testid="overview-header" />,
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: ({ section, onEdit }: { section: { name: string }; onEdit: () => void }) => {
    const context = React.useContext(GenericFormContext);

    return (
      <div>
        <div data-testid={`section-${section.name}`}>{section.name}</div>
        <button type="button" data-testid="edit-section" onClick={onEdit}>
          edit
        </button>
        <button
          type="button"
          data-testid="trigger-save"
          onClick={() => {
            const onSaveUpdate = context.actionCallbacks.onSaveUpdate;
            if (onSaveUpdate) {
              onSaveUpdate(formValuesRef.current, {
                setErrors: setErrorsMock,
                setTouched: setTouchedMock,
                setFieldValue: setFieldValueMock,
              });
            }
          }}
        >
          save
        </button>
      </div>
    );
  },
}));

vi.mock("components/generics/Action/GenericAction", () => ({
  default: ({ onActionClick }: { onActionClick: (actionName?: string) => void }) => (
    <button
      type="button"
      data-testid="deactivate-asc"
      onClick={() => onActionClick("onDeactivateASC")}
    >
      deactivate
    </button>
  ),
}));

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tab-navigation">{children}</div>
  ),
  Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("formik", async () => {
  const actual = await vi.importActual<typeof import("formik")>("formik");
  return {
    ...actual,
    Formik: ({ children }: any) => children({ setFieldValue: setFieldValueMock }),
    Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  };
});

vi.mock("components/generics/utils", async () => {
  const actual = await vi.importActual<typeof import("components/generics/utils")>(
    "components/generics/utils",
  );
  return {
    ...actual,
    toggleSectionFieldsDisabled: (allFields: unknown[]) =>
      toggleSectionFieldsDisabledMock(allFields),
  };
});

vi.mock("../../../../api/axios-client/axiosClient", () => ({
  default: {
    put: (url: string) => putMock(url),
  },
}));

import AscOverview from "./AscOverview";

describe("AscOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useParamsMock.mockReturnValue({});
    useLocationMock.mockReturnValue({ hash: "#generalInfo" });

    useQueryClientMock.mockReturnValue({
      getQueryData: (key: unknown[]) => {
        if (key[0] === "user") return userRef.current;
        if (key[0] === "UIConfiguration") return uiConfigRef.current;
        return undefined;
      },
      invalidateQueries: invalidateQueriesMock,
      setQueryData: setQueryDataMock,
    });

    useQueryMock.mockImplementation(() => queryStateRef.current);

    useMutationMock.mockImplementation(() => ({
      mutate: (payload: unknown, config?: { onSettled?: () => void }) => {
        mutateMock(payload, config);
        config?.onSettled?.();
      },
    }));

    useActionWithValidationMock.mockReturnValue(
      (
        actionName: string,
        formValues: Record<string, unknown>,
        helpers: { setErrors: (errors: Record<string, unknown>) => void; setTouched: () => void },
        onSuccess: () => void,
      ) => {
        actionWithValidationRunnerMock(actionName, formValues, helpers);
        onSuccess();
      },
    );
  });

  it("shows loading when ASC data is loading", () => {
    queryStateRef.current = {
      data: undefined,
      isLoading: true,
    };

    render(<AscOverview />);

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("maps ASC response into form initial values", async () => {
    queryStateRef.current = {
      isLoading: false,
      data: {
        ascId: "ASC-1",
        name: "Bosch ASC",
        email: "asc@bosch.com",
        phoneNumber: "555-01",
        gst: "GST-101",
        companyVATNumber: "VAT-202",
        isActive: true,
        address: {
          street: "Main Street",
          city: "Istanbul",
          stateProvinceRegion: "TR-34",
          postalCode: "34000",
          countryCode: "TR",
          houseNumber: "5",
        },
        logo: { logoId: "logo-1", name: "logo.png", type: "image/png" },
        bankAccount: { bankName: "Bank", accountNumber: "ACC-11" },
        reimbursementConfig: [
          {
            category: "CAT1",
            reimbursementMethods: { REPAIR: "FIXED", EXCHANGE: "DYNAMIC" },
          },
        ],
        reimbursementCreateOn: "5",
        reimbursementPeriodType: "WEEKLY",
      },
    };

    render(<AscOverview />);

    await waitFor(() => {
      expect(setInitialFormValuesMock).toHaveBeenCalled();
    });

    const updater = setInitialFormValuesMock.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    const updated = updater({ foo: "bar" });

    expect(updated).toMatchObject({
      foo: "bar",
      name: "Bosch ASC",
      email: "asc@bosch.com",
      streetName: "Main Street",
      city: "Istanbul",
      state: "TR-34",
      logo: [{ name: "logo.png", type: "image/png", attachmentId: "logo-1" }],
      reimbursementPeriodType: "WEEKLY",
      reimbursementCreateOn: "5",
    });
  });

  it("deactivates ASC and refreshes ASC query", async () => {
    queryStateRef.current = {
      isLoading: false,
      data: {
        ascId: "ASC-1",
        name: "Bosch ASC",
        isActive: true,
        createdOn: "2026-01-01",
        address: {},
      },
    };

    render(<AscOverview />);

    fireEvent.click(screen.getByTestId("deactivate-asc"));

    await waitFor(() => {
      expect(putMock).toHaveBeenCalledWith("/v1/service-centers/ASC-1");
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: ["ASC", "ASC-1"] });
    });
  });

  it("saves current tab values through mutation payload", async () => {
    queryStateRef.current = {
      isLoading: false,
      data: {
        ascId: "ASC-1",
        name: "Current ASC",
        isActive: true,
        currency: "TRY",
        currencySymbol: "₺",
        reimbursementConfig: [
          {
            category: "CAT1",
            reimbursementMethods: { REPAIR: "FIXED", EXCHANGE: "DYNAMIC" },
          },
        ],
        reimbursementCreateOn: "7",
        reimbursementPeriodType: "WEEKLY",
        address: {},
      },
    };

    render(<AscOverview />);

    fireEvent.click(screen.getByTestId("trigger-save"));

    await waitFor(() => {
      expect(actionWithValidationRunnerMock).toHaveBeenCalled();
      expect(mutateMock).toHaveBeenCalled();
    });

    const payload = mutateMock.mock.calls[0][0] as { serviceCenter: Record<string, unknown> };

    expect(payload.serviceCenter).toMatchObject({
      ascId: "ASC-1",
      reimbursementType: "DIRECT_SHIPMENT",
      name: "Updated ASC",
      email: "asc@bosch.com",
      phoneNumber: "555-01",
      address: {
        street: "Street 1",
        houseNumber: "11",
        city: "Istanbul",
        stateProvinceRegion: "TR-34",
        postalCode: "34000",
        countryCode: "TR",
      },
      reimbursementCreateOn: "1",
    });

    expect(payload.serviceCenter).not.toHaveProperty("state");
    expect(payload.serviceCenter).not.toHaveProperty("streetName");
    expect(payload.serviceCenter).not.toHaveProperty("city");
  });
});
