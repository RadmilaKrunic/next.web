import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useApprovals, useApproveJobs } from "../../../api/services/approvals/hooks";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import Pagination from "components/ui/Pagination/Pagination";
import { useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Job } from "modules/JobManagement/JobList/JobList.types";
import GenericForm from "components/generics/Form/GenericForm.types";
import { filterApprovals, getApprovalNavigationPath } from "./ApprovalList.utils";
import { ActivityIndicator } from "@bosch/react-frok";
import { useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "api/services/header/action";
import ApprovalActionsFlyout from "./ApprovalListTable/ApprovalActionsFlyout/ApprovalActionsFlyout";
import {
  getDefaultFixedColumns,
  getVisibleColumns,
  getApprovalListColumns,
  type ApprovalColumnConfiguration,
} from "./ApprovalList.columns.utils";
import "./ApprovalList.scss";
import { MessagesContext } from "contexts/messagescontext";
import { scrollToTop } from "utils/scrollToError";
import { useListFilterHandlers } from "../../../hooks/useListFilterHandlers";

function ApprovalList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const navigate = useNavigate();
  useBreadcrumbs([{ label: t("approvalList"), href: "/approval-list" }]);

  const QUICK_FILTERS: QuickFilter[] = [
    { key: "recentRequests", label: "recentRequests", selected: false },
    { key: "pendingApprovals", label: "pendingApprovals", selected: false },
  ];

  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfiguration = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const jobFiltersSection =
    uiConfiguration?.forms.find((f) => f.name === "jobFilters")?.sections[0] ?? null;
  const { data: approvals = [], isLoading: isApprovalsLoading } = useApprovals();
  const advancedFiltersFromStorage = JSON.parse(
    sessionStorage.getItem(`${jobFiltersSection?.name}-approval-advancedFilters`) || "[]",
  );
  const quickFiltersFromStorage = JSON.parse(
    sessionStorage.getItem("approval-quickFilters") || "null",
  );
  const [quickFilters, setQuickFilters] = useState(quickFiltersFromStorage ?? QUICK_FILTERS);
  const [searchValue, setSearchValue] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(advancedFiltersFromStorage);
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("approvalList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("approvalList-pageSize")) || 10,
  });
  const [columnConfig] = useState<ApprovalColumnConfiguration[]>(
    getDefaultFixedColumns(),
    // Temporarily bypassing user preferences to show new columns
    // (user?.preferences?.jobColumnView as unknown as ApprovalColumnConfiguration[]) ??
    //   getDefaultFixedColumns(),
  );
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { setMessages } = useContext(MessagesContext);

  const APPROVAL_COLUMNS = useMemo(() => getApprovalListColumns(t), [t]);
  const { handleToggleFilter, applyAdvancedFilters, resetAdvancedFilters } = useListFilterHandlers(
    setQuickFilters,
    setAdvancedFilters,
    setPagination,
    "approval",
  );

  const filteredApprovals = useMemo(
    () => filterApprovals(approvals, quickFilters, searchValue, advancedFilters),
    [advancedFilters, approvals, quickFilters, searchValue],
  );

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("approvalList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("approvalList-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const visibleColumns = useMemo(
    () => getVisibleColumns(columnConfig).map((key) => key as string),
    [columnConfig],
  );

  const paginatedApprovals = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredApprovals.slice(startIndex, endIndex);
  }, [filteredApprovals, pagination.page, pagination.pageSize]);

  const handleRowClick = (row: Job) => {
    const navigateResult = navigate(getApprovalNavigationPath(row), {
      state: { from: "approval-list" },
    });
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  };

  const canApproveSelected = useMemo(() => {
    if (selectedRows.length === 0) return false;
    return selectedRows.every((id) => {
      const approval = approvals.find((a) => a.jobId === id);
      return approval?.jobStatus === "BOSCH_APPROVAL_PENDING";
    });
  }, [selectedRows, approvals]);

  const approveJobsMutation = useApproveJobs({
    onSuccess: () => {
      setSelectedRows([]);
      queryClient.invalidateQueries({ queryKey: ["approvals"] }).catch(() => undefined);
      setMessages((prev) => [
        ...prev,
        {
          type: "success",
          text: t("successfulJobsPreApprovalDecision"),
          duration: 3000,
        },
      ]);
      scrollToTop();
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          text: t("errorJobsPreApprovalDecision"),
          duration: 3000,
        },
      ]);
      scrollToTop();
    },
  });

  if (isApprovalsLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="approvals-list-container">
      <Filters
        quickFilters={quickFilters}
        filters={jobFiltersSection ?? undefined}
        applyAdvancedFilters={applyAdvancedFilters}
        resetAdvancedFilters={resetAdvancedFilters}
        onToggleFilter={handleToggleFilter}
        actionButton={{
          icon: "check",
          label: t("approve"),
          disabled: !canApproveSelected,
          onClick: () => {
            approveJobsMutation.mutate({ jobIds: selectedRows });
          },
        }}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        type="approval"
      />
      <Table<Job>
        data={paginatedApprovals}
        columns={APPROVAL_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.jobId}
        onRowClick={handleRowClick}
        renderRowActions={(job) => <ApprovalActionsFlyout jobId={job.jobId} />}
        selectable
        isRowSelectable={(row) => row.jobStatus === "BOSCH_APPROVAL_PENDING"}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        onDropdownOptionChange={handlePageSizeChange}
        totalResults={filteredApprovals.length}
      />
    </div>
  );
}

export default ApprovalList;
