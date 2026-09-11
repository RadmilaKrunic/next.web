import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useNavigate } from "react-router-dom";
import "../../i18n"; // initialise the i18next singleton so useTranslation resolves a language
import { AnalyticsProvider } from "./AnalyticsProvider";
import { useAnalytics } from "./useAnalytics";
import { DEFAULT_TEST_CLOCK, InMemoryAnalyticsTransport } from "../testing";
import { AnalyticsEnvironment, JobStatus, JobType, UserRole } from "../domain/enums";
import { ValidationMode, type AnalyticsConfig, readDebugOverride } from "../config/config";
import { UserRoleResolverInput } from "../core/mappers";

vi.mock("../config/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config")>();
  return { ...actual, readDebugOverride: vi.fn().mockReturnValue(false) };
});

// ── shared config ─────────────────────────────────────────────────────────────

const enabledConfig: AnalyticsConfig = {
  environment: AnalyticsEnvironment.DEV,
  enabled: true,
  debug: false,
  validationMode: ValidationMode.WARN,
};

// ── helper components ─────────────────────────────────────────────────────────

function Consumer(): React.JSX.Element {
  const analytics = useAnalytics();
  return (
    <button
      onClick={() =>
        analytics.trackRepairStarted({ jobType: JobType.WARRANTY, jobStatus: JobStatus.IN_REPAIR })
      }
    >
      start-repair
    </button>
  );
}

function MultiNavigator(): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/create-job")}>go-create-job</button>
      <button onClick={() => navigate("/job-overview/123")}>go-job-overview</button>
      <button onClick={() => navigate("/job-overview/123#assetData")}>go-job-overview-hash</button>
    </>
  );
}

// ── render helper ─────────────────────────────────────────────────────────────

interface RenderOptions {
  path?: string;
  config?: AnalyticsConfig;
  disableAutomaticPageViews?: boolean;
  userQueryKey?: readonly string[];
  resolveRole?: (input: UserRoleResolverInput) => UserRole;
  /** Set to `null` to simulate no user in the cache. */
  userData?: Record<string, unknown> | null;
  /** The React Query key under which `userData` is stored (defaults to `["user"]`). */
  queryKeyForData?: readonly string[];
}

const renderProvider = (
  transport: InMemoryAnalyticsTransport,
  {
    path = "/job-list",
    config = enabledConfig,
    disableAutomaticPageViews = false,
    userQueryKey,
    resolveRole,
    userData = {
      roles: ["ASC_TECHNICIAN"],
      permissions: [],
      countryCode: "TR",
      ascId: "ASC_TR_001",
    },
    queryKeyForData = ["user"],
  }: RenderOptions = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (userData !== null) {
    queryClient.setQueryData([...queryKeyForData], userData);
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AnalyticsProvider
          config={config}
          transport={transport}
          clock={DEFAULT_TEST_CLOCK}
          disableAutomaticPageViews={disableAutomaticPageViews}
          userQueryKey={userQueryKey}
          resolveRole={resolveRole}
        >
          <Consumer />
          <MultiNavigator />
        </AnalyticsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe("AnalyticsProvider", () => {
  let transport: InMemoryAnalyticsTransport;

  beforeEach(() => {
    transport = new InMemoryAnalyticsTransport();
    vi.mocked(readDebugOverride).mockClear();
    vi.mocked(readDebugOverride).mockReturnValue(false);
  });

  // ── core behaviour ───────────────────────────────────────────────────────

  it("auto-fires a virtual pageview with resolved page + user context on mount", () => {
    renderProvider(transport, { path: "/job-list" });
    expect(transport.events).toHaveLength(1);
    expect(transport.last).toMatchObject({
      event: "virtual_page_view",
      virtual_url: "/job-list",
      page_name: "Job List",
      module_name: "Job Management",
      user_role: "asc_technician",
      country_code: "TR",
      asc_id: "ASC_TR_001",
    });
  });

  it("business events use the current page's virtual_url + injected user context", () => {
    renderProvider(transport, { path: "/job-list" });
    fireEvent.click(screen.getByText("start-repair"));

    const repair = transport.events.find((e) => e.event === "repair_started");
    expect(repair).toMatchObject({
      event: "repair_started",
      virtual_url: "/job-list",
      user_role: "asc_technician",
      job_type: "warranty",
      job_status: "in_repair",
    });
  });

  // ── disableAutomaticPageViews ────────────────────────────────────────────

  describe("disableAutomaticPageViews", () => {
    it("suppresses the initial pageview when true", () => {
      renderProvider(transport, { disableAutomaticPageViews: true });
      expect(transport.events).toHaveLength(0);
    });

    it("still tracks business events when automatic pageviews are disabled", () => {
      renderProvider(transport, { disableAutomaticPageViews: true });
      fireEvent.click(screen.getByText("start-repair"));
      expect(transport.events).toHaveLength(1);
      expect(transport.last).toMatchObject({ event: "repair_started" });
    });
  });

  // ── user context resolution ──────────────────────────────────────────────

  describe("user context resolution", () => {
    it("resolves user_role to 'unknown' when no user exists in the React Query cache", () => {
      renderProvider(transport, { userData: null });
      expect(transport.last).toMatchObject({ user_role: "unknown" });
    });

    it("reads user data from a custom userQueryKey", () => {
      renderProvider(transport, {
        userQueryKey: ["currentUser"],
        userData: {
          roles: ["ASC_MANAGER"],
          permissions: [],
          countryCode: "ZA",
          ascId: "ASC_ZA_002",
        },
        queryKeyForData: ["currentUser"],
      });
      expect(transport.last).toMatchObject({
        user_role: "asc_manager",
        country_code: "ZA",
        asc_id: "ASC_ZA_002",
      });
    });

    it("does not find user data when a custom userQueryKey is set but data is under ['user']", () => {
      // userData defaults to being stored under ["user"], but the provider reads from ["customKey"]
      renderProvider(transport, {
        userQueryKey: ["customKey"],
        queryKeyForData: ["user"], // data placed under the default key, not the custom one
      });
      expect(transport.last).toMatchObject({ user_role: "unknown" });
    });

    it("uses a custom resolveRole function and reflects the result in events", () => {
      const resolveRole = vi.fn(() => UserRole.COUNTRY_MANAGER);
      renderProvider(transport, { resolveRole });
      expect(resolveRole).toHaveBeenCalled();
      expect(transport.last).toMatchObject({ user_role: "country_manager" });
    });
  });

  // ── page tracking ────────────────────────────────────────────────────────

  describe("page tracking", () => {
    it("does not fire a pageview for an unrecognised route", () => {
      renderProvider(transport, { path: "/this-route-does-not-exist" });
      expect(transport.events).toHaveLength(0);
    });

    it("fires a second pageview when navigating to a different virtual URL", async () => {
      renderProvider(transport, { path: "/job-list" });
      expect(transport.events).toHaveLength(1);

      fireEvent.click(screen.getByText("go-create-job"));

      const pageViews = transport.events.filter((e) => e.event === "virtual_page_view");
      expect(pageViews).toHaveLength(2);
      expect(pageViews[1]).toMatchObject({
        event: "virtual_page_view",
        virtual_url: "/create-job",
      });
    });

    it("fires a pageview again when navigating back to a previously visited virtual URL", async () => {
      renderProvider(transport, { path: "/job-list" });

      fireEvent.click(screen.getByText("go-create-job"));
      fireEvent.click(screen.getByText("go-job-overview"));

      const urls = transport.events
        .filter((e) => e.event === "virtual_page_view")
        .map((e) => (e as Record<string, unknown>).virtual_url);

      expect(urls).toEqual(["/job-list", "/create-job", "/job-overview/customer-payment-data"]);
    });

    it("resolves a tabbed route with no hash to its default virtual URL", () => {
      renderProvider(transport, { path: "/job-overview/123" });
      expect(transport.last).toMatchObject({
        event: "virtual_page_view",
        virtual_url: "/job-overview/customer-payment-data",
        page_name: "Job Overview - Customer & Payment Data",
      });
    });

    it("fires a new pageview and switches virtual URL when hash changes on a tabbed route", async () => {
      renderProvider(transport, { path: "/job-overview/123" });
      expect(transport.events).toHaveLength(1);

      fireEvent.click(screen.getByText("go-job-overview-hash"));

      expect(transport.events).toHaveLength(2);
      expect(transport.last).toMatchObject({
        event: "virtual_page_view",
        virtual_url: "/job-overview/asset-data",
        page_name: "Job Overview - Asset Data",
      });
    });
  });

  // ── config handling ──────────────────────────────────────────────────────

  describe("config handling", () => {
    it("calls readDebugOverride and merges the result when config.debug is false", () => {
      vi.mocked(readDebugOverride).mockReturnValue(true);
      renderProvider(transport, { config: { ...enabledConfig, debug: false } });
      expect(readDebugOverride).toHaveBeenCalled();
    });

    it("does not call readDebugOverride when config.debug is already true", () => {
      renderProvider(transport, { config: { ...enabledConfig, debug: true } });
      expect(readDebugOverride).not.toHaveBeenCalled();
    });

    it("falls back to resolveAnalyticsConfig when no config prop is provided", () => {
      // In the Vitest environment (MODE=test), resolveAnalyticsConfig returns enabled:false.
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      queryClient.setQueryData(["user"], {
        roles: ["ASC_TECHNICIAN"],
        permissions: [],
        countryCode: "TR",
        ascId: "ASC_TR_001",
      });
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/job-list"]}>
            <AnalyticsProvider transport={transport} clock={DEFAULT_TEST_CLOCK}>
              <div />
            </AnalyticsProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );
      // Analytics disabled in test env — no events pushed to transport
      expect(transport.events).toHaveLength(0);
    });
  });
});
