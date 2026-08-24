import { useEffect, useMemo, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useReimbursements } from "api/services/reimbursements/hooks";
import { useDebouncedValue } from "hooks/useDebouncedValue";
import Table from "components/ui/List/Table/Table";
import { ActivityIndicator } from "@bosch/react-frok";
import { useNavigate } from "react-router";
import Pagination from "components/ui/Pagination/Pagination";
import { getReimbursementListColumns } from "./ReimbursementList.columns.config";
import { Reimbursement } from "api/services/reimbursements/reimbursements.types";
import { handleGenerateReceipt } from "../Reimbursement.utils";
import "../Reimbursement.scss";
import { MessagesContext } from "../../../contexts/messagescontext";
import SearchCreateReimbursementBtns from "../SearchCreateReimbursementBtns/SearchCreateReimbursementBtns";
import { HeaderUserData } from "api/services/header/action";
import {
  DateRangeFilterForm,
  QuickFilterChips,
  ReimbursementReceiptAction,
} from "../ReimbursementDateFilter.shared";
import {
  useReimbursementDateRangeFilter,
  useReimbursementPagination,
} from "../ReimbursementDateFilter.utils";

function ReimbursementList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();
  const { setMessages } = useContext(MessagesContext);
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const isAsc = user?.type === "ASC";

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue, 500);
  const { pagination, setPagination, handlePageChange, handlePageSizeChange } =
    useReimbursementPagination();

  const { quickFilters, dateValues, setDateValues, handleFilterToggle } =
    useReimbursementDateRangeFilter(isAsc);
  const debouncedDateValues = useDebouncedValue(dateValues, 500);

  const parsedFromDate = debouncedDateValues.fromDate
    ? new Date(debouncedDateValues.fromDate)
    : undefined;
  const parsedToDate = debouncedDateValues.toDate
    ? new Date(debouncedDateValues.toDate)
    : undefined;

  const { data, isLoading } = useReimbursements(
    parsedFromDate,
    parsedToDate,
    debouncedSearchValue,
    pagination.page - 1,
    pagination.pageSize,
  );

  const REIMBURSEMENT_COLUMNS = useMemo(() => getReimbursementListColumns(t), [t]);
  const visibleColumns = useMemo(
    () => REIMBURSEMENT_COLUMNS.map((col) => col.key),
    [REIMBURSEMENT_COLUMNS],
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearchValue, setPagination]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedDateValues, setPagination]);

  const isPaginationVisible = (data?.page?.totalElements || 0) > pagination.pageSize;

  return (
    <div className="reimbursement-list-container">
      <div className="reimbursement-filters-wrapper">
        <DateRangeFilterForm dateValues={dateValues} onDateChange={setDateValues} t={t} />
        <QuickFilterChips quickFilters={quickFilters} onToggle={handleFilterToggle} t={t} />
        <SearchCreateReimbursementBtns setSearchValue={setSearchValue} searchValue={searchValue} />
      </div>
      {isLoading ? (
        <div className="loading-container">
          <ActivityIndicator size="large" />
        </div>
      ) : (
        <Table<Reimbursement>
          data={data?.content || []}
          columns={REIMBURSEMENT_COLUMNS}
          visibleColumns={visibleColumns}
          getRowKey={(row) => row.reimbursementId}
          onRowClick={(reimbursement) => {
            navigate(`/reimbursement-claims/${reimbursement.reimbursementId}`);
          }}
          renderRowActions={(reimbursement) => (
            <ReimbursementReceiptAction
              reimbursementId={reimbursement.reimbursementId}
              iconName="edit"
              t={t}
              onGenerateReceipt={(reimbursementId, receiptWindow) => {
                void handleGenerateReceipt(reimbursementId, setMessages, t, receiptWindow);
              }}
            />
          )}
        />
      )}
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

export default ReimbursementList;
