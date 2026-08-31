import { Chip, TextField, Button } from "@bosch/react-frok";
import FiltersPopup from "./FiltersPopup/FiltersPopup";
import FiltersOptionsPopup from "./FiltersOptionsPopup/FiltersOptionsPopup";
import { FiltersBarProps } from "./Filters.types";
import "./Filters.scss";
import { useTranslation } from "react-i18next";

function Filters({
  quickFilters = [],
  filters,
  onToggleFilter,
  searchValue = "",
  onSearchChange,
  onSearchReset,
  actionButton,
  applyAdvancedFilters,
  resetAdvancedFilters,
  optionsContent,
  type,
}: Readonly<FiltersBarProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <div className="filters-bar">
      <div className="left-filters">
        {quickFilters.map((quickFilter) => (
          <Chip
            key={quickFilter.key}
            chipLabelId={quickFilter.key}
            label={t(quickFilter.label)}
            selected={!!quickFilter.selected}
            tabIndex={0}
            onClick={() => onToggleFilter?.(quickFilter.key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleFilter?.(quickFilter.key);
              }
            }}
          />
        ))}
        {filters && (
          <FiltersPopup
            filters={filters}
            applyAdvancedFilters={applyAdvancedFilters}
            resetAdvancedFilters={resetAdvancedFilters}
            type={type}
          />
        )}
      </div>

      <div className="right-filters">
        <TextField
          as="div"
          id="search"
          type="search"
          placeholder={t("search")}
          searchButton={{
            title: t("search"),
            "aria-label": t("search"),
          }}
          resetButton={{
            title: t("clear"),
            "aria-label": t("clear"),
            onClick: onSearchReset,
          }}
          name="search"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange?.(e.target.value)}
          value={searchValue}
        />
        {actionButton && (
          <Button
            icon={actionButton.icon as React.ComponentProps<typeof Button>["icon"]}
            mode="primary"
            label={actionButton.label}
            onClick={actionButton.onClick}
            disabled={actionButton.disabled}
          />
        )}
        {optionsContent && <FiltersOptionsPopup>{optionsContent}</FiltersOptionsPopup>}
      </div>
    </div>
  );
}

export default Filters;
