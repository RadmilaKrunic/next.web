import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import { TabNavigation, Tab } from "@bosch/react-frok";
import ReimbursementASCList from "./ReimbursementASCList/ReimbursementASCList";
import ReimbursementList from "./ReimbursementList/ReimbursementList";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Reimbursement() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = location.hash.replace("#", "") || "asc-list";
  const [selectedTab, setSelectedTab] = useState<string>(currentTab);

  useEffect(() => {
    setSelectedTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = globalThis.location.hash.replace("#", "") || "asc-list";
      setSelectedTab(hash);
    };

    globalThis.addEventListener("hashchange", handleHashChange);
    return () => globalThis.removeEventListener("hashchange", handleHashChange);
  }, []);

  useBreadcrumbs([
    {
      label: t(`${selectedTab}`),
      href: `/reimbursement#${selectedTab}`,
    },
  ]);

  const visibleTabs = [
    { name: "asc-list", label: "ascList", position: 1 },
    { name: "reimbursement-list", label: "reimbursementList", position: 2 },
  ];

  const handleTabSelect = (_: unknown, data: { value: unknown }) => {
    const tabValue = String(data.value);
    navigate(`/reimbursement#${tabValue}`, { replace: true });
  };

  return (
    <div>
      <TabNavigation
        className="sticky-tab-navigation"
        selectedValue={selectedTab || visibleTabs[0]?.name}
        onTabSelect={handleTabSelect}
      >
        {visibleTabs.map((tab) => (
          <Tab key={`${tab.name}_${tab.position}`} value={tab.name}>
            {t(tab.label)}
          </Tab>
        ))}
      </TabNavigation>
      <section>
        {visibleTabs
          .filter((tab) => tab.name === selectedTab)
          .map((tab) => {
            switch (tab.name) {
              case "asc-list":
                return <ReimbursementASCList key={tab.name} />;
              case "reimbursement-list":
                return <ReimbursementList key={tab.name} />;
              default:
                return null;
            }
          })}
      </section>
    </div>
  );
}

export default Reimbursement;
