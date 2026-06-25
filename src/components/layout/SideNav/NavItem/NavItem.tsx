import "./NavItem.scss";
import { Icon } from "@bosch/react-frok";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { NavItem } from "./NavItem.types";
import { useTranslation } from "react-i18next";

interface NavItemProps extends React.HTMLAttributes<HTMLDivElement> {
  item: NavItem;
  setSelectedNavItem: (name: string) => void;
  selectedNavItem?: string;
  setIsOpen?: (isOpen: boolean) => void;
  isOpen?: boolean;
}

function NavItem({
  item,
  setSelectedNavItem,
  selectedNavItem = "",
  setIsOpen,
  isOpen,
}: Readonly<NavItemProps>) {
  const { label, icon, subNavItems, link } = item;
  const [displaySubNav, setDisplaySubNav] = useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const onItemClick = () => {
    if (!isOpen) {
      setIsOpen(true);
    }
    if (subNavItems && subNavItems.length > 0) {
      setDisplaySubNav(!displaySubNav);
      return;
    }
    setSelectedNavItem(item.label);
  };

  const navItemClass = `nav-item ${selectedNavItem === item.label ? "selected" : ""}`;

  return (
    <>
      {!subNavItems?.length && (
        <li>
          <Link
            className={navItemClass}
            onClick={onItemClick}
            to={link || "#"}
            aria-label={label}
            aria-current={selectedNavItem === item.label ? "page" : undefined}
          >
            <Icon iconName={icon} aria-hidden="true" />
            {t(label)}
          </Link>
        </li>
      )}
      {!!subNavItems?.length && (
        <li>
          <button
            className={navItemClass}
            onClick={onItemClick}
            type="button"
            aria-expanded={displaySubNav}
            aria-label={`${label}, has submenu`}
          >
            <Icon iconName={icon} className="subnav-icon" aria-hidden="true" />
            <span className="subnav-label">{t(label)}</span>
            {subNavItems && subNavItems.length > 0 && (
              <Icon
                iconName={displaySubNav ? "up-small" : "down-small"}
                className="arrow"
                aria-hidden="true"
              />
            )}
          </button>
        </li>
      )}
      {displaySubNav && isOpen && (
        <li
          className={`sub-nav ${displaySubNav ? "expanded" : "collapsed"}`}
          aria-label={`${label} submenu`}
        >
          <ul>
            {subNavItems?.map((subItem) => (
              <li key={subItem.id}>
                <Link
                  to={subItem.link}
                  key={subItem.id}
                  className={`nav-item ${selectedNavItem === subItem.label ? "selected" : ""}`}
                  onClick={() => setSelectedNavItem(subItem.label)}
                  tabIndex={0}
                  aria-label={subItem.label}
                  aria-current={selectedNavItem === subItem.label ? "page" : undefined}
                >
                  {t(subItem.label)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      )}
    </>
  );
}

export default NavItem;
