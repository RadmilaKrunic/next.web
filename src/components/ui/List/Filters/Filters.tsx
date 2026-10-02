import { Chip, TextField, Button, Popover } from "@bosch/react-frok";
import FiltersPopup from "./FiltersPopup/FiltersPopup";
import FiltersOptionsPopup from "./FiltersOptionsPopup/FiltersOptionsPopup";
import { FiltersBarProps } from "./Filters.types";
import "./Filters.scss";
import { useTranslation } from "react-i18next";
import { Fragment, useState } from "react";

function Filters({
  quickFilters = [],
  filters,
  onToggleFilter,
  searchValue = "",
  onSearchChange,
  onSearchReset,
  actionButton,
  splitActionButton,
  applyAdvancedFilters,
  resetAdvancedFilters,
  optionsContent,
  type,
}: Readonly<FiltersBarProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [isSplitActionOpen, setIsSplitActionOpen] = useState(false);

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
        {splitActionButton && (
          <div className="split-action-button" data-testid="split-action-button">
            <Button
              mode="primary"
              label={splitActionButton.primaryLabel}
              onClick={splitActionButton.primaryAction}
              disabled={splitActionButton.primaryDisabled}
            />
            {splitActionButton.options.length > 0 && (
              <Popover
                className="split-action-popover"
                position="bottom-right"
                open={isSplitActionOpen}
                onTriggerClick={() => setIsSplitActionOpen((prev) => !prev)}
                onOutsideClick={() => setIsSplitActionOpen(false)}
                isPopoverArrowMissing={true}
                trigger={
                  <Button
                    icon={isSplitActionOpen ? "up-small" : "down-small"}
                    mode="primary"
                    className="split-action-popover-trigger"
                    aria-label={t("moreOptions")}
                    disabled={splitActionButton.optionsDisabled}
                  />
                }
              >
                <div className="split-action-menu">
                  {splitActionButton.options.map((option, index) => (
                    <Fragment key={option.label}>
                      {index > 0 && (
                        <div className="split-action-menu-divider" aria-hidden="true" />
                      )}
                      <button
                        type="button"
                        className="split-action-menu-item"
                        disabled={option.disabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsSplitActionOpen(false);
                          option.onClick();
                        }}
                      >
                        {option.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </Popover>
            )}
          </div>
        )}
        {optionsContent && <FiltersOptionsPopup>{optionsContent}</FiltersOptionsPopup>}
      </div>
    </div>
  );
}

export default Filters;
