import "./Header.scss";
import boschLogoSvg from "../../../assets/Bosch_Logo.svg";
import { Link, useLocation } from "react-router-dom";
import AccountManagement from "./AccountManagement/AccountManagement";
import { useContext, useRef } from "react";
import { BreadcrumbsContext } from "../../../contexts/breadcrumbscontext";
import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";

function Header() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { breadcrumbs } = useContext(BreadcrumbsContext);
  const location = useLocation();

  const prevPathnameRef = useRef(location.pathname);
  const fromStateRef = useRef<string | undefined>(
    (location.state as { from?: string } | null)?.from,
  );
  if (location.pathname !== prevPathnameRef.current) {
    fromStateRef.current = (location.state as { from?: string } | null)?.from;
    prevPathnameRef.current = location.pathname;
  }

  const isJobOverview = location.pathname.startsWith("/job-overview/");
  const isFromApprovalList = isJobOverview && fromStateRef.current === "approval-list";
  const jobOverviewTitle = isFromApprovalList ? t("preApprovals") : t("jobOverview");
  const headerTitle = isJobOverview
    ? jobOverviewTitle
    : breadcrumbs[breadcrumbs?.length - 1]?.label || t("dashboard");

  return (
    <header>
      <div className="header-title">{headerTitle}</div>
      <span className="header-content">
        {/* <SearchField /> */}
        <button className="header-button" aria-label="Help Center">
          <Icon iconName="question-frame" aria-hidden="true" />
        </button>
        <AccountManagement />
        <Link to="/" aria-label="Bosch logo" className="bosch-logo-container">
          <img src={boschLogoSvg} alt="Bosch logo" />
        </Link>
      </span>
    </header>
  );
}

export default Header;
