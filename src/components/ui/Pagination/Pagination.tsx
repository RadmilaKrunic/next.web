import "./Pagination.scss";
import { PageIndicator, Dropdown } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { OptionProp, defaultPageSizeOptions, PAGINATION_IDS } from "./Pagination.data";

export interface PaginationProps {
  totalResults: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: OptionProp[];
  onPageChange: (page: number) => unknown;
  onDropdownOptionChange: (option: string) => unknown;
}

function Pagination({
  totalResults,
  page,
  pageSize,
  pageSizeOptions = defaultPageSizeOptions,
  onDropdownOptionChange,
  onPageChange,
}: Readonly<PaginationProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    setCurrentPageSize(pageSize);
  }, [pageSize]);

  const totalPages = Math.ceil(totalResults / currentPageSize);

  const handlePageSizeChange = (selectedValue: string) => {
    const newPageSize = Number(selectedValue);
    setCurrentPageSize(newPageSize);
    onDropdownOptionChange(selectedValue);
  };

  const handlePageSelect = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    let pageNumber = null;

    if (target.dataset.index) {
      pageNumber = Number(target.dataset.index);
    } else {
      pageNumber = Number(target.innerText);
    }

    if (pageNumber && !Number.isNaN(pageNumber) && pageNumber !== page) {
      onPageChange(pageNumber);
    }
  };

  return (
    <div className="pagination" id={PAGINATION_IDS.CONTAINER}>
      <div className="pagination__left" id={PAGINATION_IDS.LEFT_SECTION}>
        <span className="pagination__results" id={PAGINATION_IDS.RESULTS_LABEL}>
          {totalResults} {t("results")}
        </span>
        {totalResults > 0 && (
          <div className="pagination__dropdown" id={PAGINATION_IDS.DROPDOWN_CONTAINER}>
            <span className="show" id={PAGINATION_IDS.SHOW_LABEL}>
              {t("show")}:
            </span>
            <Dropdown
              value={currentPageSize?.toString()}
              options={pageSizeOptions}
              aria-label="Select number jobs per page"
              onChange={(event) => {
                const selectedValue = event.target.value;
                handlePageSizeChange(selectedValue);
              }}
              className="show__dropdown"
              id={PAGINATION_IDS.DROPDOWN}
            />
          </div>
        )}
      </div>
      {totalResults > 0 && (
        <div className="pagination__right" id={PAGINATION_IDS.INDICATOR_SECTION}>
          <PageIndicator
            numbered
            onPageSelect={handlePageSelect}
            pages={totalPages}
            defaultSelected={page}
            key={`${PAGINATION_IDS.INDICATOR}-${page}`}
          />
        </div>
      )}
    </div>
  );
}

export default Pagination;
