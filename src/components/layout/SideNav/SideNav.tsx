import NavItem from "./NavItem/NavItem";
import { Icon } from "@bosch/react-frok";
import "./SideNav.scss";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { fetchSideNavItems } from "../../../api/services/sideNav/action";
import { NavBar } from "./NavItem/NavItem.types";
import ActivityIndicatorWithDelay from "../../ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";

const ROUTE_TO_NAV_LINK: Record<string, string> = {
  "job-overview": "job-management",
  "edit-order": "job-management",
  "claim-overview": "claim-management",
};

function SideNav() {
  const {
    data: navBar,
    isLoading,
    isSuccess,
  } = useQuery<NavBar>({
    queryKey: ["sideNav"],
    queryFn: fetchSideNavItems,
    staleTime: Infinity,
  });

  const [selectedNavItem, setSelectedNavItem] = useState<string>("");
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  const fromStateRef = useRef<string | undefined>(
    (location.state as { from?: string } | null)?.from,
  );
  useEffect(() => {
    const pathSegment = location.pathname.split("/")[1];

    // Only update fromState when pathname actually changes (hash changes lose state)
    if (location.pathname !== prevPathnameRef.current) {
      fromStateRef.current = (location.state as { from?: string } | null)?.from;
      prevPathnameRef.current = location.pathname;
    }

    if (pathSegment === selectedNavItem) return;

    if (navBar) {
      setSelectedNavItem(navBar.sideNavItems[0].label);

      const resolvedSegment =
        pathSegment === "job-overview" && fromStateRef.current === "approval-list"
          ? "claim-management"
          : ROUTE_TO_NAV_LINK[pathSegment] || pathSegment;

      navBar.sideNavItems.forEach((item) => {
        if (item.link === resolvedSegment) {
          setSelectedNavItem(item.label);
        }
        if (item.subNavItems && item.subNavItems.length > 0) {
          item.subNavItems.forEach((subItem) => {
            if (subItem.link === resolvedSegment) {
              setSelectedNavItem(subItem.label);
            }
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, navBar]);

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  if (isLoading || !isSuccess) {
    return (
      <nav className={`side-nav ${isOpen ? "" : "closed"}`} aria-label="Main navigation">
        <div className="loading-container">
          <ActivityIndicatorWithDelay delay={300} size="small" />
        </div>
      </nav>
    );
  }

  return (
    <nav className={`side-nav ${isOpen ? "" : "closed"}`} aria-label="Main navigation">
      <div className="nav-header">
        <span aria-label="BASS Application">{t("name")}</span>
        <Icon
          onClick={() => setIsOpen(!isOpen)}
          iconName={isOpen ? "close" : "list-view-mobile"}
          className="close-nav-icon"
          tabIndex={0}
          role="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        />
      </div>
      <ul className="nav-items">
        {navBar.sideNavItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            setSelectedNavItem={setSelectedNavItem}
            selectedNavItem={selectedNavItem}
            setIsOpen={setIsOpen}
            isOpen={isOpen}
          />
        ))}
      </ul>
      <Link
        to={navBar.helpLink.value}
        className="help-center"
        aria-label="Help Center"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon iconName="question-frame" aria-hidden="true" />
        {t("helpCenter")}
      </Link>
    </nav>
  );
}

export default SideNav;
