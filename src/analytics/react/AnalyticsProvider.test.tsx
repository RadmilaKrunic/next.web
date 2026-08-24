import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "../../i18n"; // initialise the i18next singleton so useTranslation resolves a language
import { AnalyticsProvider } from "./AnalyticsProvider";
import { useAnalytics } from "./useAnalytics";
import { DEFAULT_TEST_CLOCK, InMemoryAnalyticsTransport } from "../testing";
import { AnalyticsEnvironment, JobStatus, JobType } from "../domain/enums";
import { ValidationMode, type AnalyticsConfig } from "../config/config";

const enabledConfig: AnalyticsConfig = {
  environment: AnalyticsEnvironment.DEV,
  enabled: true,
  debug: false,
  validationMode: ValidationMode.WARN,
};

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

const renderProvider = (transport: InMemoryAnalyticsTransport, path: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(["user"], {
    roles: ["ASC_TECHNICIAN"],
    permissions: [],
    countryCode: "TR",
    ascId: "ASC_TR_001",
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AnalyticsProvider config={enabledConfig} transport={transport} clock={DEFAULT_TEST_CLOCK}>
          <Consumer />
        </AnalyticsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AnalyticsProvider", () => {
  let transport: InMemoryAnalyticsTransport;
  beforeEach(() => {
    transport = new InMemoryAnalyticsTransport();
  });

  it("auto-fires a virtual pageview with resolved page + user context on mount", () => {
    renderProvider(transport, "/job-list");
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
    renderProvider(transport, "/job-list");
    fireEvent.click(screen.getByText("start-repair"));

    const repair = transport.events.find((event) => event.event === "repair_started");
    expect(repair).toMatchObject({
      event: "repair_started",
      virtual_url: "/job-list",
      user_role: "asc_technician",
      job_type: "warranty",
      job_status: "in_repair",
    });
  });
});
