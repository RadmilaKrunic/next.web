import { Icon } from "@bosch/react-frok";
import { SetStateAction, useState } from "react";
import "./SearchField.scss";
import { useTranslation } from "react-i18next";

export default function SearchField() {
  const [searchValue, setSearchValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const handleChange = (e: { target: { value: SetStateAction<string> } }) => {
    setSearchValue(e.target.value);
  };

  const clearSearch = () => {
    setSearchValue("");
    setIsExpanded(false);
  };

  const openSearch = () => {
    setIsExpanded(true);
  };

  return (
    <form
      className={`search-form ${isExpanded ? "--expanded" : ""}`}
      autoComplete="off"
      data-testid="search-form"
    >
      <div className="search-input">
        {isExpanded && (
          <input
            type="search"
            name="Header search input"
            placeholder={t("search")}
            value={searchValue}
            onChange={handleChange}
            autoFocus
          />
        )}

        {isExpanded && (
          <button
            type="button"
            className={`icon-close ${searchValue ? "--show" : ""}`}
            data-testid="clear-search-button"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <Icon iconName="close-small" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="icon-search"
          aria-label="Search"
          data-testid="search-button"
          onClick={openSearch}
        >
          <Icon iconName="search" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
