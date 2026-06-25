import { useQuery } from "@tanstack/react-query";
import "./App.scss";
import "@bosch/frontend.kit-npm/dist/frontend-kit.complete.css";
import Main from "./components/layout/Main/Main";
import { BrowserRouter } from "react-router-dom";
import BassHeader from "./components/layout/BassHeader/Header";
import SideNav from "./components/layout/SideNav/SideNav";
import Footer from "./components/layout/Footer/Footer";
import { useState, useMemo } from "react";
import { Breadcrumb, BreadcrumbsContext } from "./contexts/breadcrumbscontext";
import "./i18n";
import { fetchUserDataFromCookie } from "./api/services/header/action";
import { ActivityIndicator } from "@bosch/react-frok";
import { getCountryConfig } from "./api/services/countryConfiguration/countryConfiguration";
import { getUIConfiguration } from "api/services/uiConfiguration/action";
import { Message, MessagesContext } from "./contexts/messagescontext";

function App() {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  // add call to the messages endpoint when the API is ready
  const [messages, setMessages] = useState<Message[]>([]);

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
    queryFn: () => getCountryConfig(data.countryCode),
    staleTime: Infinity,
    enabled: !!data?.countryCode,
  });

  const { isLoading: isLoadingUIConfig } = useQuery({
    queryKey: ["UIConfiguration", data?.countryCode],
    queryFn: () => getUIConfiguration(data.countryCode),
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
    </BrowserRouter>
  );
}

export default App;
