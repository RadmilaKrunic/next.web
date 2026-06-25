import { Button, Icon, Popover } from "@bosch/react-frok";
import GenericArea from "components/generics/Area/GenericArea";
import Area from "components/generics/Area/GenericArea.types";
import { Formik } from "formik";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import FiltersChips from "./FiltersChips";
import { FiltersPopupProps } from "./FiltersPopup.types";
import { Filter } from "../../List.types";
import { hasFilterValue } from "../../List.utils";
import "./FiltersPopup.scss";

const getInitialFieldValues = (fields: { name: string; multiSelect?: boolean }[]) => {
  return fields.reduce(
    (acc, field) => {
      acc[field.name] = field.multiSelect ? [] : "";
      return acc;
    },
    {} as Record<string, string | boolean | string[]>,
  );
};

function FiltersPopup({
  filters,
  applyAdvancedFilters,
  resetAdvancedFilters,
  type,
}: Readonly<FiltersPopupProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const filtersName = filters?.name || undefined;

  const initialValues = useMemo(() => {
    if (!filters) return {};
    const defaults = getInitialFieldValues(filters.areas.flatMap((a) => a.fields));
    return defaults;
  }, [filters]);

  return (
    <Formik initialValues={initialValues} enableReinitialize onSubmit={() => {}}>
      {({ values, resetForm }) => (
        <div className="filters-popup-wrapper">
          <Popover
            position="bottom-left"
            open={isPopupOpen}
            data-testid="filters-popover-job-list"
            onOutsideClick={() => setIsPopupOpen(false)}
            trigger={
              <Icon
                iconName="tune-vertical"
                className="filters-icon"
                tabIndex={0}
                role="button"
                onClick={() => setIsPopupOpen(!isPopupOpen)}
                title={t("filters")}
                aria-label="See more filter options"
              />
            }
          >
            {filters?.areas
              .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((area: Area) => (
                <GenericArea key={area.name} area={area} />
              ))}

            <FiltersChips filters={filters} type={type} />

            <div className="filters-buttons">
              <Button
                icon="reset"
                mode="integrated"
                label={t("resetAllFilters")}
                onClick={(e) => {
                  e.stopPropagation();
                  resetForm();
                  resetAdvancedFilters?.();
                  sessionStorage.removeItem(`${filtersName}-${type}-advancedFilters`);
                }}
              />
              <Button
                mode="secondary"
                label={t("save")}
                onClick={() => {
                  const filters: Filter[] = Object.entries(values)
                    .map(([name, value]) => ({ name, value }))
                    .filter(hasFilterValue);
                  if (filtersName) {
                    sessionStorage.setItem(
                      `${filtersName}-${type}-advancedFilters`,
                      JSON.stringify(filters),
                    );
                  }
                  applyAdvancedFilters?.(filters);
                  setIsPopupOpen(false);
                }}
              />
            </div>
          </Popover>
        </div>
      )}
    </Formik>
  );
}

export default FiltersPopup;
