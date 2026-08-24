import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  useQueryClientMock,
  useMutationMock,
  setTouchedMock,
  setErrorsMock,
  validateByActionMock,
  startValidationMock,
  stopValidationMock,
  setCurrentActionMock,
  scrollToFirstErrorMock,
  mapAccountRolesToAPIFormatMock,
  resetMock,
  setMessagesMock,
  navigateMock,
  mutateMock,
} = vi.hoisted(() => ({
  useQueryClientMock: vi.fn(),
  useMutationMock: vi.fn(),
  setTouchedMock: vi.fn(async () => undefined),
  setErrorsMock: vi.fn(),
  validateByActionMock: vi.fn(),
  startValidationMock: vi.fn(),
  stopValidationMock: vi.fn(),
  setCurrentActionMock: vi.fn(),
  scrollToFirstErrorMock: vi.fn(),
  mapAccountRolesToAPIFormatMock: vi.fn((roles: string[]) => roles),
  resetMock: vi.fn(),
  setMessagesMock: vi.fn(),
  navigateMock: vi.fn(),
  mutateMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../../../hooks/useBreadcrumbs", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("../../../../contexts/messagescontext", () => ({
  MessagesContext: React.createContext({
    setMessages: setMessagesMock,
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => useQueryClientMock(),
    useMutation: (...args: unknown[]) => useMutationMock(...args),
  };
});

vi.mock("../../../../hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    sections: [{ name: "employeeInfo", index: 0 }],
    initialFormValues: {
      firstName: "",
      accountRoles: [],
    },
    allFields: [{ name: "firstName" }, { name: "accountRoles" }],
    setAllFields: vi.fn(),
    mandatoryFields: { addemployee: { fieldList: ["firstName", "accountRoles"] } },
    isInitialized: true,
    reset: resetMock,
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
}));

vi.mock("../EmployeeOverview/EmployeeOverview.utils", () => ({
  mapAccountRolesToAPIFormat: (roles: string[]) => mapAccountRolesToAPIFormatMock(roles),
}));

vi.mock("@bosch/react-frok", () => ({
  ActivityIndicator: () => <div data-testid="loading" />,
}));

vi.mock("../../../../components/generics/Section/GenericSection", () => ({
  default: () => <div data-testid="generic-section" />,
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
    </div>
  ),
}));

vi.mock("formik", async () => {
  const actual = await vi.importActual<typeof import("formik")>("formik");
  return {
    ...actual,
    Formik: ({ children }: any) =>
      children({
        values: { firstName: "John", accountRoles: ["ASC_TECHNICIAN"] },
        setErrors: setErrorsMock,
        setTouched: setTouchedMock,
        setFieldValue: vi.fn(),
      }),
    Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  };
});

import AddEmployee from "./AddEmployee";

describe("AddEmployee", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useQueryClientMock.mockReturnValue({
      getQueryData: (key: unknown[]) => {
        if (key[0] === "user") {
          return { ascId: "ASC8", countryCode: "TR", language: "en" };
        }
        if (key[0] === "UIConfiguration") {
          return {
            forms: [
              {
                name: "AddEmployee",
                actions: [{ onAction: "onSubmit" }, { onAction: "onCancel" }],
              },
            ],
          };
        }
        return undefined;
      },
      invalidateQueries: vi.fn(),
    });

    useMutationMock.mockImplementation(({ onError }: any) => {
      mutateMock.mockImplementation((payload) => {
        if ((payload as Record<string, unknown>).email === "conflict@mail.com") {
          onError?.({ status: 409 });
        }
      });
      return { mutate: mutateMock };
    });
  });

  it("renders initialized form with generic section", () => {
    validateByActionMock.mockReturnValue({});

    render(<AddEmployee />);

    expect(screen.getByTestId("generic-section")).toBeInTheDocument();
    expect(screen.getByTestId("action-submit")).toBeInTheDocument();
  });

  it("submits mapped payload when validation passes", async () => {
    validateByActionMock.mockReturnValue({});

    render(<AddEmployee />);

    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setCurrentActionMock).toHaveBeenCalledWith("addemployee");
      expect(startValidationMock).toHaveBeenCalledWith("addemployee");
      expect(stopValidationMock).toHaveBeenCalled();
      expect(mapAccountRolesToAPIFormatMock).toHaveBeenCalledWith(["ASC_TECHNICIAN"]);
      expect(mutateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "John",
          type: "ASC",
          ascId: "ASC8",
          language: "en",
          accountRoles: ["ASC_TECHNICIAN"],
        }),
      );
    });
  });

  it("sets errors, touched fields, and scrolls when validation fails", async () => {
    validateByActionMock.mockReturnValue({ firstName: "required" });

    render(<AddEmployee />);

    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setErrorsMock).toHaveBeenCalledWith({ firstName: "required" });
      expect(setTouchedMock).toHaveBeenCalledWith({ firstName: true });
      expect(scrollToFirstErrorMock).toHaveBeenCalledWith(["firstName"]);
      expect(mutateMock).not.toHaveBeenCalled();
      expect(stopValidationMock).not.toHaveBeenCalled();
    });
  });

  it("shows conflict message when create user returns 409", async () => {
    validateByActionMock.mockReturnValue({});

    vi.mocked(useMutationMock).mockImplementationOnce(({ onError }: any) => {
      return {
        mutate: () => onError?.({ status: 409 }),
      };
    });

    vi.mocked(useQueryClientMock).mockReturnValueOnce({
      getQueryData: (key: unknown[]) => {
        if (key[0] === "user") {
          return { ascId: "ASC8", countryCode: "TR", language: "en" };
        }
        if (key[0] === "UIConfiguration") {
          return {
            forms: [
              {
                name: "AddEmployee",
                actions: [{ onAction: "onSubmit" }, { onAction: "onCancel" }],
              },
            ],
          };
        }
        return undefined;
      },
      invalidateQueries: vi.fn(),
    });

    render(<AddEmployee />);

    fireEvent.click(screen.getByTestId("action-submit"));

    await waitFor(() => {
      expect(setMessagesMock).toHaveBeenCalledWith([
        { type: "error", duration: 5000, text: "emailAlreadyExists" },
      ]);
    });
  });

  it("resets form on cancel action", async () => {
    validateByActionMock.mockReturnValue({});

    render(<AddEmployee />);

    fireEvent.click(screen.getByTestId("action-cancel"));

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalled();
    });
  });
});
