import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type Area from "components/generics/Area/GenericArea.types";
import type { HeaderUserData } from "api/services/header/action";
import type {
  CountryConfig,
  ReimbursementConfiguration,
} from "api/services/countryConfiguration/countryConfiguration";
import type {
  DraftServiceCenter,
  ServiceCenter,
} from "api/services/serviceCenters/serviceCenters.types";
import AscReimbursementArea from "./AscReimbursementArea";

const { useParamsMock, useFormikContextMock, setFieldValueMock, genericFieldSpy } = vi.hoisted(
  () => ({
    useParamsMock: vi.fn(),
    useFormikContextMock: vi.fn(),
    setFieldValueMock: vi.fn(),
    genericFieldSpy: vi.fn(),
  }),
);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => useParamsMock(),
  };
});

vi.mock("formik", async () => {
  const actual = await vi.importActual<typeof import("formik")>("formik");
  return {
    ...actual,
    useFormikContext: () => useFormikContextMock(),
  };
});

vi.mock("components/generics/Field/GenericField", () => ({
  default: ({ field }: { field: { name: string; defaultValue?: unknown } }) => {
    genericFieldSpy(field);
    return (
      <div data-testid={`field-${field.name}`}>
        {field.name}:{String(field.defaultValue ?? "")}
      </div>
    );
  },
}));

vi.mock("@bosch/react-frok", () => ({
  Notification: ({ children, onCloseClick }: { children: ReactNode; onCloseClick: () => void }) => (
    <div data-testid="reimbursement-notification">
      <button type="button" onClick={onCloseClick} data-testid="notification-close">
        close
      </button>
      {children}
    </div>
  ),
  Table: ({ children, className }: { children: ReactNode; className?: string }) => (
    <table className={className}>{children}</table>
  ),
  TableHead: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children, header }: { children: ReactNode; header?: boolean }) =>
    header ? <th>{children}</th> : <td>{children}</td>,
}));

const baseArea: Area = {
  name: "reimbursement",
  label: "Reimbursement",
  position: 0,
  fields: [
    {
      name: "reimbursementMethod",
      label: "method",
      type: "dropdown",
    },
    {
      name: "reimbursementInfo",
      label: "info",
      type: "infoIcon",
    },
  ],
  dependFieldCondition: "AND",
  dependentFields: [],
  actions: null,
  isSubArea: false,
};

const baseUser: HeaderUserData = {
  email: "test@bosch.com",
  type: "ASC",
  ascId: "ASC-1",
  firstName: "Test",
  lastName: "User",
  roles: [],
  locale: "en-TR",
  permissions: [],
  countryCode: "TR",
  language: "en-US",
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderArea({
  paramsAscId,
  user = baseUser,
  asc,
  countryConfig,
  values = {},
}: {
  paramsAscId?: string;
  user?: HeaderUserData;
  asc?: ServiceCenter | DraftServiceCenter;
  countryConfig?: CountryConfig;
  values?: Record<string, unknown>;
}) {
  useParamsMock.mockReturnValue(paramsAscId ? { ascId: paramsAscId } : {});
  useFormikContextMock.mockReturnValue({ values, setFieldValue: setFieldValueMock });

  const queryClient = createQueryClient();
  queryClient.setQueryData(["user"], user);

  const resolvedAscId = paramsAscId || user.ascId || "";
  if (asc) {
    queryClient.setQueryData(["ASC", resolvedAscId], asc);
  }

  if (countryConfig) {
    queryClient.setQueryData(["countryConfiguration", user.countryCode], countryConfig);
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <AscReimbursementArea area={baseArea} />
    </QueryClientProvider>,
  );
}

function makeConfig(
  category: string,
  repair: string,
  exchange: string,
): ReimbursementConfiguration {
  return {
    category,
    reimbursementMethods: {
      REPAIR: repair,
      EXCHANGE: exchange,
    },
  };
}

describe("AscReimbursementArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParamsMock.mockReturnValue({ ascId: "ASC-1" });
    useFormikContextMock.mockReturnValue({ values: {}, setFieldValue: setFieldValueMock });
  });

  it("renders reimbursement rows from draft service center config", async () => {
    const draftAsc = {
      serviceCenter: {
        reimbursementConfig: [makeConfig("SPARE_PARTS", "METHOD_A", "METHOD_B")],
      },
    } as DraftServiceCenter;

    renderArea({ paramsAscId: "ASC-1", asc: draftAsc, values: {} });

    await waitFor(() => {
      expect(
        screen.getByTestId("field-reimbursementMethod_SPARE_PARTS_repair"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("field-reimbursementMethod_SPARE_PARTS_exchange"),
    ).toBeInTheDocument();
    expect(setFieldValueMock).toHaveBeenCalledWith(
      "reimbursementMethod_SPARE_PARTS_repair",
      "METHOD_A",
    );
    expect(setFieldValueMock).toHaveBeenCalledWith(
      "reimbursementMethod_SPARE_PARTS_exchange",
      "METHOD_B",
    );
  });

  it("renders reimbursement rows from service center config", async () => {
    const serviceCenter = {
      reimbursementConfig: [makeConfig("ACCESSORIES", "ACC_REPAIR", "ACC_EXCHANGE")],
    } as ServiceCenter;

    renderArea({ paramsAscId: "ASC-1", asc: serviceCenter, values: {} });

    await waitFor(() => {
      expect(
        screen.getByTestId("field-reimbursementMethod_ACCESSORIES_repair"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId("field-reimbursementMethod_ACCESSORIES_exchange"),
    ).toBeInTheDocument();
  });

  it("falls back to country config when asc id is missing", async () => {
    const countryConfig = {
      reimbursementConfig: [makeConfig("TOOLS", "TR_REPAIR", "TR_EXCHANGE")],
    } as CountryConfig;

    renderArea({
      paramsAscId: undefined,
      user: { ...baseUser, ascId: "" },
      countryConfig,
      values: {},
    });

    await waitFor(() => {
      expect(screen.getByTestId("field-reimbursementMethod_TOOLS_repair")).toBeInTheDocument();
    });

    expect(screen.getByTestId("field-reimbursementMethod_TOOLS_exchange")).toBeInTheDocument();
  });

  it("does not overwrite already-initialized form values", async () => {
    const draftAsc = {
      serviceCenter: {
        reimbursementConfig: [makeConfig("SPARE_PARTS", "METHOD_A", "METHOD_B")],
      },
    } as DraftServiceCenter;

    renderArea({
      paramsAscId: "ASC-1",
      asc: draftAsc,
      values: {
        reimbursementMethod_SPARE_PARTS_repair: "EXISTING_REPAIR",
        reimbursementMethod_SPARE_PARTS_exchange: "EXISTING_EXCHANGE",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("field-reimbursementMethod_SPARE_PARTS_repair"),
      ).toBeInTheDocument();
    });

    expect(setFieldValueMock).not.toHaveBeenCalled();
  });

  it("hides notification after close click and renders info icon field", () => {
    renderArea({ paramsAscId: "ASC-1", values: {} });

    expect(screen.getByTestId("reimbursement-notification")).toBeInTheDocument();
    expect(screen.getByTestId("field-reimbursementInfo")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("notification-close"));

    expect(screen.queryByTestId("reimbursement-notification")).not.toBeInTheDocument();
  });
});
