import { useQuery } from "@tanstack/react-query";
import "./App.scss";
import "@bosch/frontend.kit-npm/dist/frontend-kit.complete.css";
import Main from "./components/layout/Main/Main";
import { BrowserRouter } from "react-router-dom";
import BassHeader from "./components/layout/BassHeader/Header";
import SideNav from "./components/layout/SideNav/SideNav";
import Footer from "./components/layout/Footer/Footer";
import { useState, useMemo, useEffect } from "react";
import { Breadcrumb, BreadcrumbsContext } from "./contexts/breadcrumbscontext";
import "./i18n";
import { fetchUserDataFromCookie } from "./api/services/header/action";
import { ActivityIndicator } from "@bosch/react-frok";
import { getCountryConfig } from "./api/services/countryConfiguration/countryConfiguration";
import { getUIConfiguration } from "api/services/uiConfiguration/action";
import { Message, MessagesContext } from "./contexts/messagescontext";
import { AnalyticsProvider } from "@/analytics";
import ConsentModal from "./components/ui/ConsentModal/ConsentModal";

// Runs once per actual page load/reload, cleared here (not at module scope)
// so a sessionStorage failure (e.g. private mode, sandboxed iframe) can't
// block the whole app from bootstrapping. Filters persist while navigating
// within the SPA but are cleared on browser reload.
function clearListFiltersOnReload() {
  try {
    sessionStorage.removeItem("jobFilters-job-advancedFilters");
    sessionStorage.removeItem("job-quickFilters");
    sessionStorage.removeItem("approval-quickFilters");
    sessionStorage.removeItem("jobFilters-approval-advancedFilters");
    sessionStorage.removeItem("claim-quickFilters");
    sessionStorage.removeItem("claimFilters-claim-advancedFilters");
  } catch {
    // sessionStorage unavailable - ignore, filters will simply persist
  }
}

function App() {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  // add call to the messages endpoint when the API is ready
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    clearListFiltersOnReload();
  }, []);

  const breadcrumbsValue = useMemo(() => ({ breadcrumbs, setBreadcrumbs }), [breadcrumbs]);
  const messagesValue = useMemo(() => ({ messages, setMessages }), [messages]);

  const { isLoading, data } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUserDataFromCookie,
    staleTime: Infinity,
    retry: false,
  });

  const { isLoading: isLoadingCountryConfig } = useQuery({
    queryKey: ["countryConfiguration", data?.countryCode],
    queryFn: () => getCountryConfig(data?.countryCode || ""),
    staleTime: Infinity,
    enabled: !!data?.countryCode,
  });

  const { isLoading: isLoadingUIConfig } = useQuery({
    queryKey: ["UIConfiguration", data?.countryCode],
    queryFn: () => getUIConfiguration(data?.countryCode || ""),
    staleTime: Infinity,
    enabled: !!data?.countryCode,
    retry: false,
  });

  if (isLoading || !data || (data.countryCode && (isLoadingCountryConfig || isLoadingUIConfig))) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AnalyticsProvider>
        <div className="app-container -light-mode">
          <SideNav />
          <div className="app-content">
            <BreadcrumbsContext.Provider value={breadcrumbsValue}>
              <MessagesContext.Provider value={messagesValue}>
                <BassHeader />
                <Main />
                <Footer />
              </MessagesContext.Provider>
            </BreadcrumbsContext.Provider>
          </div>
        </div>
        <ConsentModal isOpen={data.consent?.isConsentUpdateRequired ?? false} />
      </AnalyticsProvider>
    </BrowserRouter>
  );
}

export default App;
