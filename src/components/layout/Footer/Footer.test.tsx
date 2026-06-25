import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderFooter(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Footer", () => {
  it("renders footer element", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderFooter(qc);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders imprint link from i18n key", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderFooter(qc);
    expect(screen.getByText("imprint")).toBeInTheDocument();
  });

  it("renders copyright text", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const currentYear = new Date().getFullYear();
    renderFooter(qc);
    expect(screen.getByText(new RegExp(String(currentYear)))).toBeInTheDocument();
  });

  it("renders footer links from countryConfiguration", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["user"], { countryCode: "ZA" });
    qc.setQueryData(["countryConfiguration", "ZA"], {
      links: {
        footer: [
          { name: "copyrightPartOne", value: "© Bosch" },
          { name: "imprintLink", value: "https://www.bosch.com/imprint" },
          { name: "privacyLink", value: "https://www.bosch.com/privacy" },
          { name: "termsLink", value: "https://www.bosch.com/terms" },
          { name: "ossBundleLink", value: "https://www.bosch.com/oss" },
          { name: "paiaLink", value: "https://www.bosch.com/paia" },
        ],
      },
    });
    renderFooter(qc);
    expect(screen.getByText("paiaLink")).toBeInTheDocument();
  });

  it("does not render paiaLink when it is '#'", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderFooter(qc);
    expect(screen.queryByText("paiaLink")).not.toBeInTheDocument();
  });
});
