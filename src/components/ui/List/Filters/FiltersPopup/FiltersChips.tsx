import { Chip } from "@bosch/react-frok";
import { useFormikContext } from "formik";
import { type MouseEvent, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Section from "../../../../../components/generics/Section/GenericSection.types";
import {
  formatFormikDateValue,
  getLocale,
} from "../../../../../components/ui/DatePicker/hooks/DatePicker.utils";
import { type Locale } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const DATE_FORMAT = "dd.MM.yyyy";

interface FiltersChipsProps {
  filters?: Section;
  locale?: Locale;
  type?: "job" | "claim" | "approval" | "employee";
}

type FieldOptionMap = Record<string, Record<string, string>>;

const buildFieldOptionMap = (filters?: Section): FieldOptionMap => {
  if (!filters) return {};
  const map: FieldOptionMap = {};
  filters.areas.forEach((area) => {
    area.fields.forEach((field) => {
      if (!field.options) return;
      map[field.name] = field.options.reduce<Record<string, string>>((acc, opt) => {
        acc[String(opt.value ?? "")] = String(opt.name ?? "");
        return acc;
      }, {});
    });
  });
  return map;
};

function FiltersChips({ filters, locale, type }: Readonly<FiltersChipsProps>) {
  const { values, setFieldValue } = useFormikContext<Record<string, string | boolean | string[]>>();
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();

  const fieldOptionMap = useMemo(() => buildFieldOptionMap(filters), [filters]);

  const resolveOptionLabel = (filterKey: string, value: string): string => {
    if (filterKey === "ascName") {
      const optionsEndpoint = filters?.areas
        .flatMap((area) => area.fields)
        .find((field) => field.name === "ascName")?.optionsEndpoint;
      if (!optionsEndpoint) return value;
      const names = queryClient.getQueryData<any>([
        "dynamicOptions",
        optionsEndpoint.url,
        optionsEndpoint.queryParams,
      ]);
      const optionName = names?.find((n: any) => String(n.ascId) === value)?.name;
      return optionName ?? t(value);
    }
    const optionName = fieldOptionMap[filterKey]?.[value];
    return optionName ? t(optionName) : t(value);
  };

  const handleArrayChipClose =
    (filterKey: string, filterValue: string[], selectedItem: string) =>
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      void setFieldValue(
        filterKey,
        filterValue.filter((item) => item !== selectedItem),
      );
    };

  const handleScalarChipClose = (filterKey: string) => (e?: MouseEvent<HTMLElement>) => {
    e?.stopPropagation();
    void setFieldValue(filterKey, "");
  };

  useEffect(() => {
    if (filters?.name) {
      const storedFilters: { name: string; value: string | boolean | string[] }[] = JSON.parse(
        sessionStorage.getItem(`${filters.name}-${type}-advancedFilters`) || "[]",
      );
      storedFilters.forEach((filter) => {
        void setFieldValue(filter.name, filter.value);
      });
    }
  }, [filters, setFieldValue, type]);

  return (
    <div className="filters-chips">
      {Object.entries(values).flatMap(([filterKey, filterValue]) => {
        if (
          filterValue === "" ||
          filterValue == null ||
          filterKey === "unassigned" ||
          filterKey === "readyForDiagnostic"
        ) {
          return [];
        }

        if (Array.isArray(filterValue)) {
          return filterValue.map((selectedItem) => (
            <Chip
              key={`${filterKey}-${selectedItem}`}
              chipLabelId={`${filterKey}-${selectedItem}-chip`}
              label={resolveOptionLabel(filterKey, selectedItem)}
              selected
              tabIndex={0}
              buttonClose
              onClose={handleArrayChipClose(filterKey, filterValue, selectedItem)}
            />
          ));
        }

        let label: string;

        if (filterKey === "createdAt" || filterKey === "updatedAt" || filterKey === "createdOn") {
          const prefix =
            filterKey === "createdAt" || filterKey === "createdOn" ? "created" : "modified";
          label = `${t(prefix)}: ${formatFormikDateValue(
            String(filterValue),
            DATE_FORMAT,
            getLocale(locale),
          )}`;
        } else {
          label = resolveOptionLabel(filterKey, String(filterValue));
        }

        return [
          <Chip
            key={filterKey}
            chipLabelId={`${filterKey}-chip`}
            label={label}
            selected
            tabIndex={0}
            buttonClose
            onClose={handleScalarChipClose(filterKey)}
          />,
        ];
      })}
    </div>
  );
}

export default FiltersChips;
