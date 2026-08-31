import { Icon } from "@bosch/react-frok";
import "./Breadcrumbs.scss";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { BreadcrumbsContext } from "../../../contexts/breadcrumbscontext";
import { useTranslation } from "react-i18next";

function Breadcrumbs() {
  const { breadcrumbs } = useContext(BreadcrumbsContext);
  const isLastItem = (index: number) => index === breadcrumbs.length - 1;
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <ol className="breadcrumbs-list" aria-label="Breadcrumb menu" data-testid="breadcrumbs-list">
      <li className="item">
        <Link to="/dashboard" className="item-link" data-testid={`breadcrumb-link-dashboard`}>
          <span className="item-label">{t("dashboard")}</span>
        </Link>
      </li>
      {breadcrumbs.map((item, index) => {
        return (
          <li key={item.href} className="item">
            <Link
              to={item.href}
              className={`item-link${isLastItem(index) ? " last" : ""}`}
              data-testid={`breadcrumb-link-${index}`}
              onClick={(e) => (isLastItem(index) ? e.preventDefault() : null)}
            >
              <Icon iconName="forward-right" aria-hidden="true" />
              <span className="item-label">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export default Breadcrumbs;
