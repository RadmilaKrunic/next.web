import { Checkbox, Dropdown } from "@bosch/react-frok";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MultiSelectDropdownProps } from "./DynamicDropdown.types";
import "./MultiSelectDropdown.scss";

function MultiSelectDropdown({
  name,
  label,
  required = false,
  disabled = false,
  isSearchable = false,
  options,
  selectedValues,
  onChange,
  className = "",
}: Readonly<MultiSelectDropdownProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const reactId = useId();
  const selectId = `multi-select-${name}-${reactId}`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectableOptions = useMemo(() => {
    const base = options.filter((opt) => opt.value !== "");
    if (!isSearchable || !searchText) return base;
    return base.filter((opt) => opt.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [options, isSearchable, searchText]);

  const selectedLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return t("select");
    }

    return options
      .filter((opt) => opt.value !== "")
      .filter((opt) => selectedValues.includes(opt.value))
      .map((opt) => opt.name)
      .join(", ");
  }, [selectedValues, options, t]);

  const displayOptions = useMemo(
    () => [{ value: selectedLabel, name: selectedLabel }],
    [selectedLabel],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchText("");
      return;
    }
    // Clear search text when opening
    setSearchText("");
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isOpen]);

  const toggleValue = useCallback(
    (value: string) => {
      onChange(
        selectedValues.includes(value)
          ? selectedValues.filter((v) => v !== value)
          : [...selectedValues, value],
      );
    },
    [onChange, selectedValues],
  );

  const handleTriggerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) setIsOpen((prev) => !prev);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleRowClick = (
    e: React.MouseEvent<HTMLDivElement | HTMLButtonElement>,
    value: string,
  ) => {
    if (e.target === e.currentTarget) toggleValue(value);
  };

  return (
    <div ref={containerRef} className={`multi-select-dropdown ${className}`}>
      {isSearchable ? (
        <div className={`a-dropdown${disabled ? " a-dropdown--disabled" : ""}`}>
          <label htmlFor={selectId}>{`${t(label)} ${required ? "*" : ""}`}</label>
          <input
            id={selectId}
            name={name}
            type="text"
            className="searchable-combobox-input"
            value={isOpen ? searchText : selectedLabel}
            title={selectedLabel}
            disabled={disabled}
            autoComplete="off"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchText(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => !disabled && setIsOpen(true)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
          />
        </div>
      ) : (
        <Dropdown
          id={selectId}
          label={`${t(label)} ${required ? "*" : ""}`}
          className={`a-dropdown ${className}`}
          name={name}
          disabled={disabled}
          value={selectedLabel}
          options={displayOptions}
          title={selectedLabel}
          onMouseDown={handleTriggerMouseDown}
          onKeyDown={handleTriggerKeyDown}
          onChange={() => {}}
        />
      )}
      {isOpen && (
        <div className="multi-select-dropdown-panel">
          {selectableOptions.length === 0 ? (
            <div className="multi-select-dropdown-empty">{t("noOptions")}</div>
          ) : (
            selectableOptions.map((opt) => {
              const checked = selectedValues.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.key ?? `${name}-${opt.value}`}
                  className="multi-select-dropdown-row"
                  onClick={(e) => handleRowClick(e, opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleValue(opt.value);
                    }
                  }}
                >
                  <Checkbox
                    id={`${selectId}-${opt.value}`}
                    label={opt.name}
                    value={opt.value}
                    checked={checked}
                    onChange={() => toggleValue(opt.value)}
                  />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
