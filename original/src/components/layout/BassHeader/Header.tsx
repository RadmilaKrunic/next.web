import "./Header.scss";
import boschLogoSvg from "../../../assets/Bosch_Logo.svg";
import { Link, useLocation } from "react-router-dom";
import AccountManagement from "./AccountManagement/AccountManagement";
import { useContext, useRef } from "react";
import { BreadcrumbsContext } from "../../../contexts/breadcrumbscontext";
import { Icon } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useAnalytics } from "@/analytics";

function Header() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const analytics = useAnalytics();
  const { breadcrumbs } = useContext(BreadcrumbsContext);
  const location = useLocation();

  if (
    !location.pathname.includes("job-list") &&
    !location.pathname.includes("job-overview") &&
    !location.pathname.includes("create-job")
  ) {
    sessionStorage.removeItem("jobFilters-job-advancedFilters");
    sessionStorage.removeItem("job-quickFilters");
  }

  if (!location.pathname.includes("approval-list") && !location.pathname.includes("job-overview")) {
    sessionStorage.removeItem("approval-quickFilters");
    sessionStorage.removeItem("jobFilters-approval-advancedFilters");
  }

  if (!location.pathname.includes("claim-list") && !location.pathname.includes("claim-overview")) {
    sessionStorage.removeItem("claim-quickFilters");
    sessionStorage.removeItem("claimFilters-claim-advancedFilters");
  }

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

  let reimbursementTitle = "";
  const isReimbursement = location.pathname.startsWith("/reimbursement");
  reimbursementTitle = isReimbursement && location.hash ? t(location.hash.replace("#", "")) : "";
  reimbursementTitle =
    isReimbursement && !reimbursementTitle ? t("reimbursement") : reimbursementTitle;

  const jobOverviewOrReimbursementTitle = isJobOverview ? jobOverviewTitle : reimbursementTitle;
  const headerTitle =
    isJobOverview || isReimbursement
      ? jobOverviewOrReimbursementTitle
      : breadcrumbs[breadcrumbs?.length - 1]?.label || t("dashboard");

  return (
    <header>
      <div className="header-title">{headerTitle}</div>
      <span className="header-content">
        {/* <SearchField /> */}
        <button
          className="header-button"
          aria-label="Help Center"
          onClick={() => analytics.trackHelpCenterClicked()}
        >
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
