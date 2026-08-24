import { useMemo, useState } from "react";
import { useBreadcrumbs } from "../../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_STALE_TIME_MS } from "../../../../utils/queryConstants";
import Table from "../../../../components/ui/List/Table/Table";
import Filters from "../../../../components/ui/List/Filters/Filters";
import { useNavigate } from "react-router";
import { ActivityIndicator, Button, Icon } from "@bosch/react-frok";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import { ScrollablePopover } from "../../../../components/ui/ScrollablePopover/ScrollablePopover";
import { getAscColumns } from "./AscList.columns.config";
import { filterBySearchValue } from "../../AccountManagement.utils";
import { getAllASCs } from "../../../../api/services/serviceCenters/action";
import { ServiceCenter } from "../../../../api/services/serviceCenters/serviceCenters.types";
import { useHasPermission } from "../../../../hooks/useHasPermission";
import { PERMISSIONS } from "../../../../utils/Permissions";
import "./ASCList.scss";

function AscList() {
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("ascList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("ascList-pageSize")) || 10,
  });
  const navigate = useNavigate();
  const canAddAsc = useHasPermission([PERMISSIONS.ACCESS.CAN_ACCESS_ASC_GLOBALLY]);

  const { t } = useTranslation("translation", { keyPrefix: "app" });
  useBreadcrumbs([{ label: t("ascProfiles"), href: "/asc-profiles" }]);

  const { data: serviceCenters, isLoading } = useQuery({
    queryKey: ["ascProfiles"],
    queryFn: getAllASCs,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    select: (data) => {
      if (!data) return [];

      return [...data].sort((a, b) => {
        const dateA = new Date(a.createdOn).getTime();
        const dateB = new Date(b.createdOn).getTime();

        return dateB - dateA;
      });
    },
  });
  const ASC_COLUMNS = useMemo(() => getAscColumns(t), [t]);
  const visibleColumns = useMemo(() => ASC_COLUMNS.map((col) => col.key), [ASC_COLUMNS]);

  const filteredServiceCenters = useMemo(
    () => filterBySearchValue(serviceCenters || [], searchValue),
    [serviceCenters, searchValue],
  );

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("ascList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("ascList-pageSize", option);
    sessionStorage.setItem("ascList-currentPage", "1");
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const paginatedServiceCenters = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredServiceCenters.slice(startIndex, endIndex);
  }, [filteredServiceCenters, pagination.page, pagination.pageSize]);

  const isPaginationVisible = filteredServiceCenters.length > pagination.pageSize;

  if (isLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="asc-list-container">
      <Filters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        actionButton={
          canAddAsc
            ? {
                icon: "add",
                label: t("addAsc"),
                onClick: () => {
                  navigate(`/add-asc`);
                },
              }
            : undefined
        }
        type="asc"
      />
      <Table<ServiceCenter>
        data={paginatedServiceCenters}
        columns={ASC_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.ascId}
        onRowClick={({ isDraft, ascId }) => {
          navigate(isDraft ? `/edit-asc/${ascId}` : `/asc-overview/${ascId}`);
        }}
        renderRowActions={(asc) => (
          <ScrollablePopover
            className="actions-popover"
            data-testid={`asc-actions-popover-${asc.ascId}`}
            trigger={
              <Button
                icon={"options"}
                className="actions-popover-trigger"
                tabIndex={0}
                aria-label="More ASC options"
                data-testid={`asc-actions-popover-trigger-${asc.ascId}`}
              />
            }
          >
            <button
              type="button"
              className="asc-action-button"
              data-testid={`asc-action-edit-${asc.ascId}`}
              onClick={() => {
                navigate(`/asc-overview/${asc.ascId}`);
              }}
            >
              <Icon iconName="edit" aria-hidden="true" />
              <span>{t("editASC")}</span>
            </button>
          </ScrollablePopover>
        )}
        emptyListMessage="noAscProfilesFound"
      />
      {isPaginationVisible && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onDropdownOptionChange={handlePageSizeChange}
          totalResults={filteredServiceCenters.length}
        />
      )}
    </div>
  );
}

export default AscList;
