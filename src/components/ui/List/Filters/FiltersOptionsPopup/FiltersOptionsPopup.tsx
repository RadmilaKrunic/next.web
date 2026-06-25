import { Icon, Popover } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { ReactNode } from "react";
import "./FiltersOptionsPopup.scss";

type FiltersOptionsPopupProps = {
  children: ReactNode;
};

function FiltersOptionsPopup({ children }: Readonly<FiltersOptionsPopupProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <Popover
      position="bottom-right"
      data-testid="filters-bar-options-popover"
      trigger={
        <Icon
          iconName="options"
          tabIndex={0}
          role="button"
          className="filters-icon"
          title={t("options")}
          aria-label="filter-options-button"
        />
      }
    >
      <div className="filters-options-popup">{children}</div>
    </Popover>
  );
}

export default FiltersOptionsPopup;
