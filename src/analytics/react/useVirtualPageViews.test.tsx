import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, useNavigate } from "react-router-dom";
import { useVirtualPageViews } from "./useVirtualPageViews";
import { createNoopAnalytics, type Analytics } from "../core/analytics";

const createMockAnalytics = (): Analytics & { trackVirtualPage: ReturnType<typeof vi.fn> } => ({
  ...createNoopAnalytics(),
  trackVirtualPage: vi.fn(),
});

function RouterHost({ analytics }: { analytics: Analytics }): React.JSX.Element {
  useVirtualPageViews({ analytics });
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate("/job-list")}>to-job-list</button>
      <button onClick={() => navigate("/")}>to-index</button>
    </>
  );
}

function HashHost({ analytics }: { analytics: Analytics }): React.JSX.Element {
  useVirtualPageViews({ analytics });
  return <div>host</div>;
}

describe("useVirtualPageViews", () => {
  it("fires a pageview on mount", () => {
    const analytics = createMockAnalytics();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouterHost analytics={analytics} />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);
  });

  it("fires on route change and deduplicates same-virtual-URL navigations", () => {
    const analytics = createMockAnalytics();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouterHost analytics={analytics} />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1); // /dashboard

    fireEvent.click(screen.getByText("to-index")); // "/" also maps to DASHBOARD → deduped
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("to-job-list")); // JOB_LIST → new pageview
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);
  });

  it("does nothing when disabled", () => {
    const analytics = createMockAnalytics();
    function DisabledHost(): React.JSX.Element {
      useVirtualPageViews({ analytics, enabled: false });
      return <div />;
    }
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DisabledHost />
      </MemoryRouter>,
    );
    expect(analytics.trackVirtualPage).not.toHaveBeenCalled();
  });
});

describe("useVirtualPageViews — hash (tab) tracking", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/job-overview/1");
  });
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("fires on a native hashchange (overview tab switch) that React Router does not observe", () => {
    const analytics = createMockAnalytics();
    render(
      <BrowserRouter>
        <HashHost analytics={analytics} />
      </BrowserRouter>,
    );
    // Mount at /job-overview/1 (no hash) → default customer-payment-data tab.
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(1);

    act(() => {
      window.history.pushState({}, "", "/job-overview/1#diagnosticData");
      window.dispatchEvent(new Event("hashchange"));
    });
    expect(analytics.trackVirtualPage).toHaveBeenCalledTimes(2);
  });
});
