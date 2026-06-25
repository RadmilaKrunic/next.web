import { Dropdown } from "@bosch/react-frok";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DynamicDropdownProps, DropdownOption } from "./DynamicDropdown.types";
import { useDynamicOptions } from "./useDynamicOptions";
import { JobOverviewItem } from "../../../modules/JobManagement/JobList/JobList.types";
import { ClaimItem } from "../../../modules/ClaimManagement/ClaimOverview/Claims.types";
import {
  mapDropdownOptions,
  formatDropdownOptions,
  translateStaticOptions,
  resolveQueryParams,
  validateRequiredParams,
  getDropdownValue,
  findRawOption,
} from "./DynamicDropdown.helper";
import MultiSelectDropdown from "./MultiSelectDropdown";
import { HeaderUserData } from "api/services/header/action";
import { GenericOptionProps } from "../../generics/Field/GenericField.types";
import { FormikContext } from "formik";
import "./MultiSelectDropdown.scss";

function filterAlreadySelectedAccessories(
  options: DropdownOption[],
  name: string,
  formValues: Record<string, unknown>,
): DropdownOption[] {
  if (!name.includes("selectAccessory") || !options.length) return options;
  const selected: string[] = [];
  for (const key in formValues) {
    if (key.includes("selectAccessory") && key !== name && formValues[key]) {
      selected.push(formValues[key] as string);
    }
  }
  return selected.length ? options.filter((opt) => !selected.includes(opt.value)) : options;
}

interface SearchableSingleDropdownProps {
  name: string;
  label: string;
  subtype?: string;
  disabled: boolean;
  value: string;
  options: (DropdownOption | GenericOptionProps)[];
  rawOptions: DropdownOption[];
  onChange: (value: string) => void;
  onRawOptionSelect?: (rawItem: Record<string, unknown>) => void;
  className: string;
}

function SearchableSingleDropdown({
  name,
  label,
  subtype,
  disabled,
  value,
  options,
  rawOptions,
  onChange,
  onRawOptionSelect,
  className,
}: Readonly<SearchableSingleDropdownProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    const opt = (options as DropdownOption[]).find((o) => String(o.value ?? "") === value);
    return opt ? String(opt.name ?? "") : "";
  }, [options, value]);

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

  const filteredOptions = useMemo(() => {
    const base = (options as DropdownOption[]).filter((o) => String(o.value ?? "") !== "");
    if (!searchText) return base;
    const lower = searchText.toLowerCase();
    return base.filter((o) =>
      String(o.name ?? "")
        .toLowerCase()
        .includes(lower),
    );
  }, [options, searchText]);

  const handleSelect = (opt: DropdownOption) => {
    onChange(opt.value);
    if (onRawOptionSelect && rawOptions.length > 0) {
      const rawItem = findRawOption(name, subtype, rawOptions, opt.value);
      if (rawItem) onRawOptionSelect(rawItem);
    }
    setIsOpen(false);
    setSearchText("");
  };

  return (
    <div ref={containerRef} className={`dynamic-dropdown ${className}`}>
      <div className={`a-dropdown${disabled ? " a-dropdown--disabled" : ""}`}>
        <label htmlFor={`${name}-searchable`}>{label}</label>
        <input
          id={`${name}-searchable`}
          name={name}
          type="text"
          className="searchable-combobox-input"
          value={isOpen ? searchText : selectedLabel}
          placeholder={t("select")}
          disabled={disabled}
          autoComplete="off"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchText(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Escape") setIsOpen(false);
            else if (e.key === "ArrowDown") setIsOpen(true);
          }}
        />
      </div>
      {isOpen && (
        <div className="multi-select-dropdown-panel">
          {filteredOptions.length === 0 ? (
            <div className="multi-select-dropdown-empty">{t("noOptions")}</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.key ?? `${name}-${opt.value}`}
                className={`searchable-dropdown-option${value === opt.value ? " searchable-dropdown-option--selected" : ""}`}
                onMouseDown={() => handleSelect(opt)}
              >
                {opt.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DynamicDropdown({
  name,
  label,
  subtype,
  value,
  disabled = false,
  required = false,
  multiSelect = false,
  isSearchable = false,
  optionsEndpoint,
  options,
  onChange,
  onRawOptionSelect,
  className = "",
}: Readonly<DynamicDropdownProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const formValues = useContext(FormikContext).values;

  const { jobId, claimId } = useParams<{ jobId: string; claimId: string }>();
  const queryClient = useQueryClient();

  const jobData = jobId
    ? queryClient.getQueryData<JobOverviewItem>(["job", jobId])
    : (queryClient.getQueryData<ClaimItem>(["claim", claimId]) as unknown as
        | JobOverviewItem
        | undefined);
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const countryCode = user?.countryCode;

  const resolvedQueryParams = optionsEndpoint
    ? resolveQueryParams(optionsEndpoint, jobData, countryCode)
    : [];

  const hasAllRequiredParams = validateRequiredParams(resolvedQueryParams);

  const { options: rawOptions, isLoading } = useDynamicOptions({
    optionsEndpoint: optionsEndpoint
      ? {
          ...optionsEndpoint,
          queryParams: resolvedQueryParams,
        }
      : { url: "", method: "GET", queryParams: [] },
    enabled: !!optionsEndpoint && hasAllRequiredParams,
  });

  const finalOptions = useMemo<DropdownOption[] | GenericOptionProps[]>(() => {
    if (optionsEndpoint) {
      const mapped = mapDropdownOptions(name, subtype, rawOptions, t);
      const mappedOptions =
        subtype === "accessoryDropdown"
          ? filterAlreadySelectedAccessories(mapped, name, formValues)
          : mapped;
      if (mappedOptions.length > 0) {
        return formatDropdownOptions(name, mappedOptions, t("select"));
      }
    }
    if (options) {
      return translateStaticOptions(name, options, t);
    }
    return [];
  }, [optionsEndpoint, rawOptions, options, name, subtype, t, formValues]);

  const selectedValues = useMemo(() => {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }, [value]);

  const multiOptions = useMemo<DropdownOption[]>(
    () =>
      finalOptions.map((opt) => ({
        value: String(opt.value ?? ""),
        name: String(opt.name ?? ""),
        key: opt.key,
      })),
    [finalOptions],
  );

  if (name === "ascName" && finalOptions.length <= 2) {
    return null;
  }

  if (multiSelect) {
    return (
      <div className={`dynamic-dropdown ${className}`}>
        <MultiSelectDropdown
          name={name}
          label={label}
          required={required}
          disabled={disabled || isLoading}
          isSearchable={isSearchable}
          options={multiOptions}
          selectedValues={selectedValues}
          onChange={onChange}
          className={className}
        />
      </div>
    );
  }

  const singleValue = Array.isArray(value) ? (value[0] ?? "") : value;
  const resolvedValue =
    optionsEndpoint && isLoading
      ? (singleValue ?? "")
      : getDropdownValue(name, subtype, finalOptions, singleValue);

  if (isSearchable) {
    return (
      <SearchableSingleDropdown
        name={name}
        label={`${t(label)} ${required ? "*" : ""}`}
        subtype={subtype}
        disabled={disabled || isLoading}
        value={resolvedValue}
        options={finalOptions}
        rawOptions={rawOptions}
        onChange={(v) => onChange(v)}
        onRawOptionSelect={onRawOptionSelect}
        className={className}
      />
    );
  }

  return (
    <div className={`dynamic-dropdown ${className}`}>
      <Dropdown
        label={`${t(label)} ${required ? "*" : ""}`}
        className={`a-dropdown ${className}`}
        name={name}
        disabled={disabled || isLoading}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const selectedValue = e.target.value;
          onChange(selectedValue);
          if (onRawOptionSelect && rawOptions.length > 0) {
            const rawItem = findRawOption(name, subtype, rawOptions, selectedValue);
            if (rawItem) {
              onRawOptionSelect(rawItem);
            }
          }
        }}
        value={resolvedValue}
        options={finalOptions}
      />
    </div>
  );
}

export default DynamicDropdown;
