import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "hooks/useDebouncedValue";

import Table from "../../../components/ui/List/Table/Table";
import { ActivityIndicator } from "@bosch/react-frok";
import { useNavigate } from "react-router";
import Pagination from "../../../components/ui/Pagination/Pagination";
import { getReimbursementAscColumns } from "./ReimbursementASCList.columns.config";
import { useReimbursementASCs } from "../../../api/services/reimbursements/hooks";

import { ReimbursementAsc } from "api/services/reimbursements/reimbursements.types";
import SearchCreateReimbursementBtns from "../SearchCreateReimbursementBtns/SearchCreateReimbursementBtns";

function ReimbursementASCList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue, 500);
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("reimbursementASCList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("reimbursementASCList-pageSize")) || 10,
  });

  const { data, isLoading } = useReimbursementASCs(
    debouncedSearchValue,
    pagination.page - 1,
    pagination.pageSize,
  );

  const ASC_COLUMNS = useMemo(() => getReimbursementAscColumns(t), [t]);
  const visibleColumns = useMemo(() => ASC_COLUMNS.map((col) => col.key), [ASC_COLUMNS]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearchValue]);

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("reimbursementASCList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("reimbursementASCList-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const isPaginationVisible = (data?.page?.totalElements || 0) > pagination.pageSize;

  if (isLoading && !data) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="reimbursement-list-container">
      <div className="reimbursement-filters-wrapper">
        <SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue={searchValue} />
      </div>
      <Table<ReimbursementAsc>
        data={data?.content || []}
        columns={ASC_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.ascId}
        onRowClick={(asc) => {
          navigate(`/reimbursement-detail/${asc.ascId}`, {
            state: { ascName: asc.ascName },
          });
        }}
        renderRowActions={() => null}
      />
      {isPaginationVisible && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
          onDropdownOptionChange={handlePageSizeChange}
          totalResults={data?.page?.totalElements || 0}
        />
      )}
    </div>
  );
}

export default ReimbursementASCList;
