import { useEffect, useMemo, useState, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router";
import { useBreadcrumbs } from "hooks/useBreadcrumbs";
import { useDebouncedValue } from "hooks/useDebouncedValue";
import { useReimbursementsByAscId } from "api/services/reimbursements/hooks";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { getReimbursementDetailColumns } from "./ReimbursementDetail.columns.config";
import { ReimbursementPerAsc } from "api/services/reimbursements/reimbursements.types";
import { handleGenerateReceipt } from "../Reimbursement.utils";
import { HeaderUserData } from "@/api/services/header/action";
import { useHasPermission } from "@/hooks/useHasPermission";
import { PERMISSIONS } from "@/utils/Permissions";
import { MessagesContext } from "../../../contexts/messagescontext";
import SearchCreateReimbursementBtns from "../SearchCreateReimbursementBtns/SearchCreateReimbursementBtns";
import {
  DateRangeFilterForm,
  QuickFilterChips,
  ReimbursementReceiptAction,
} from "../ReimbursementDateFilter.shared";
import {
  useReimbursementDateRangeFilter,
  useReimbursementPagination,
} from "../ReimbursementDateFilter.utils";

interface ReimbursementDetailLocationState {
  ascName?: string;
}

function ReimbursementDetail() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { setMessages } = useContext(MessagesContext);

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const { ascId } = useParams<{ ascId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const ascNameFromState = (location.state as ReimbursementDetailLocationState | null)?.ascName;
  const ascNameFromQuery = new URLSearchParams(location.search).get("ascName") || undefined;
  const ascName = ascNameFromState || ascNameFromQuery;
  const hasAscListViewPermission = useHasPermission([
    PERMISSIONS.REIMBURSEMENT.CAN_VIEW_ASC_LIST_TABLE,
  ]);

  useBreadcrumbs([
    {
      label: hasAscListViewPermission ? t("ASCs") : t("reimbursement"),
      href: hasAscListViewPermission ? "/reimbursement#asc-list" : "#",
    },
    {
      label: t("reimbursementDetail"),
      href: `/reimbursement-detail/${ascId || ""}`,
    },
  ]);

  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebouncedValue(searchValue, 500);
  const { pagination, setPagination, handlePageChange, handlePageSizeChange } =
    useReimbursementPagination();

  const { quickFilters, dateValues, setDateValues, handleFilterToggle } =
    useReimbursementDateRangeFilter(true);

  const parsedFromDate = dateValues.fromDate ? new Date(dateValues.fromDate) : undefined;
  const parsedToDate = dateValues.toDate ? new Date(dateValues.toDate) : undefined;

  const { data } = useReimbursementsByAscId(
    ascId || user?.ascId || "",
    parsedFromDate,
    parsedToDate,
    debouncedSearchValue,
    pagination.page - 1,
    pagination.pageSize,
  );

  const REIMBURSEMENT_COLUMNS = useMemo(() => getReimbursementDetailColumns(t), [t]);
  const visibleColumns = useMemo(
    () => REIMBURSEMENT_COLUMNS.map((col) => col.key),
    [REIMBURSEMENT_COLUMNS],
  );

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearchValue, setPagination]);

  const isPaginationVisible = (data?.page?.totalElements || 0) > pagination.pageSize;

  return (
    <div className="reimbursement-detail-container">
      <div className="reimbursement-header">
        {hasAscListViewPermission && (
          <div>
            <span>{t("reimbursementDetailsFor")} </span>
            <span className="strong">{`${ascName || ascId || "-"}`}</span>
          </div>
        )}
        {!hasAscListViewPermission && (
          <div>
            <span>{t("reimbursementDetail")}</span>
          </div>
        )}
      </div>
      <div className="reimbursement-filters-wrapper">
        <DateRangeFilterForm dateValues={dateValues} onDateChange={setDateValues} t={t} />
        <QuickFilterChips quickFilters={quickFilters} onToggle={handleFilterToggle} t={t} />
        <SearchCreateReimbursementBtns
          setSearchValue={setSearchValue}
          searchValue={searchValue}
          showCreateReimbursementBtn={false}
        />
      </div>
      <Table<ReimbursementPerAsc>
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
            iconName="document-pdf"
            t={t}
            onGenerateReceipt={(reimbursementId, receiptWindow) => {
              void handleGenerateReceipt(reimbursementId, setMessages, t, receiptWindow);
            }}
          />
        )}
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

export default ReimbursementDetail;
