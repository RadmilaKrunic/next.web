import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import { useTranslation } from "react-i18next";
import "./JobList.scss";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import { QuickFilter, Filter } from "components/ui/List/List.types";
import { useMemo, useState } from "react";
import { useListFilterHandlers } from "hooks/useListFilterHandlers";
import { Job } from "./JobList.types";
import Pagination from "components/ui/Pagination/Pagination";
import GenericForm from "components/generics/Form/GenericForm.types";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { HeaderUserData } from "api/services/header/action";
import { useJobs } from "api/services/jobs/hooks";
import { ActivityIndicator } from "@bosch/react-frok";
import JobActionsFlyout from "./JobListTable/JobActionsFlyout/JobActionsFlyout";
import DocumentsModal from "components/ui/DocumentsModal/DocumentsModal";
import MessagesModal from "components/ui/MessagesModal/MessagesModal";
import CustomizeColumnsPopup from "./FiltersBar/FilterOptionsPopup/CustomizeColumnsPopup/CustomizeColumnsPopup";
import {
  getDefaultFixedColumns,
  getVisibleColumns,
  getJobListColumns,
  JobColumnConfiguration,
} from "./JobList.columns.utils";
import { filterJobs, getJobNavigationPath } from "./JobList.utils";

function JobList() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const QUICK_FILTERS: QuickFilter[] = [
    { key: "readyForDiagnostic", label: "readyForDiagnostic", selected: false },
    { key: "unassigned", label: "unassigned", selected: false },
  ];

  const navigate = useNavigate();
  useBreadcrumbs([{ label: t("jobList"), href: "/job-list" }]);
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<HeaderUserData>(["user"]);
  const uiConfiguration = queryClient.getQueryData<{ forms: GenericForm[] }>([
    "UIConfiguration",
    user?.countryCode,
  ]);
  const jobFiltersSection =
    uiConfiguration?.forms.find((f) => f.name === "jobFilters")?.sections[0] ?? null;
  const advancedFiltersFromStorage = JSON.parse(
    sessionStorage.getItem(`${jobFiltersSection?.name}-job-advancedFilters`) || "[]",
  );
  const quickFiltersFromStorage = JSON.parse(sessionStorage.getItem("job-quickFilters") || "null");

  const { data: jobs = [], isLoading: isJobsLoading } = useJobs();
  const [quickFilters, setQuickFilters] = useState(quickFiltersFromStorage ?? QUICK_FILTERS);
  const [searchValue, setSearchValue] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState<Filter[]>(advancedFiltersFromStorage);
  const [pagination, setPagination] = useState({
    page: Number(sessionStorage.getItem("jobList-currentPage")) || 1,
    pageSize: Number(sessionStorage.getItem("jobList-pageSize")) || 10,
  });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const selectedJob = jobs.find((job) => job.jobId === selectedJobId);
  const selectedJobAttachments = selectedJob?.attachments || [];
  const [columnConfig, setColumnConfig] = useState<JobColumnConfiguration[]>(
    user?.preferences?.jobColumnView ?? getDefaultFixedColumns(),
  );

  const JOB_COLUMNS = useMemo(() => getJobListColumns(t), [t]);

  const { handleToggleFilter, applyAdvancedFilters, resetAdvancedFilters } = useListFilterHandlers(
    setQuickFilters,
    setAdvancedFilters,
    setPagination,
    "job",
  );

  const filteredJobs = useMemo(
    () => filterJobs(jobs, quickFilters, searchValue, advancedFilters),
    [advancedFilters, jobs, quickFilters, searchValue],
  );

  const handlePageChange = (page: number) => {
    sessionStorage.setItem("jobList-currentPage", page.toString());
    setPagination((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (option: string) => {
    sessionStorage.setItem("jobList-pageSize", option);
    setPagination({ page: 1, pageSize: Number(option) });
  };

  const visibleColumns = useMemo(
    () => getVisibleColumns(columnConfig).map((key) => key as string),
    [columnConfig],
  );

  const paginatedJobs = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredJobs.slice(startIndex, endIndex);
  }, [filteredJobs, pagination.page, pagination.pageSize]);

  const handleRowClick = (row: Job) => {
    const navigateResult = navigate(getJobNavigationPath(row));
    if (navigateResult instanceof Promise) {
      navigateResult.catch(() => undefined);
    }
  };

  if (isJobsLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="jobs-list-container">
      <Filters
        quickFilters={quickFilters}
        filters={jobFiltersSection ?? undefined}
        applyAdvancedFilters={applyAdvancedFilters}
        resetAdvancedFilters={resetAdvancedFilters}
        onToggleFilter={handleToggleFilter}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchReset={() => setSearchValue("")}
        actionButton={{
          icon: "add",
          label: t("createJob"),
          onClick: () => {
            const navigateResult = navigate("/create-job");
            if (navigateResult instanceof Promise) {
              navigateResult.catch(() => undefined);
            }
          },
        }}
        type="job"
        optionsContent={
          <CustomizeColumnsPopup columnConfig={columnConfig} setColumnConfig={setColumnConfig} />
        }
      />
      <Table<Job>
        data={paginatedJobs}
        columns={JOB_COLUMNS}
        visibleColumns={visibleColumns}
        getRowKey={(row) => row.jobId}
        onRowClick={handleRowClick}
        renderRowActions={(job) => (
          <JobActionsFlyout
            job={job}
            setSelectedJobId={setSelectedJobId}
            setShowDocumentModal={setShowDocumentModal}
            setShowMessagesModal={setShowMessagesModal}
          />
        )}
      />
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={handlePageChange}
        onDropdownOptionChange={handlePageSizeChange}
        totalResults={filteredJobs.length}
      />
      <DocumentsModal
        isOpen={showDocumentModal}
        attachments={selectedJobAttachments}
        jobId={selectedJobId || ""}
        jobStatus={selectedJob?.jobStatus}
        isOnHold={selectedJob?.isOnHold}
        onClose={() => {
          setShowDocumentModal(false);
          setSelectedJobId(null);
        }}
      />
      {showMessagesModal && selectedJobId ? (
        <MessagesModal
          jobId={selectedJobId}
          isOpen={showMessagesModal}
          onClose={() => {
            setShowMessagesModal(false);
            setSelectedJobId(null);
          }}
        />
      ) : null}
    </div>
  );
}

export default JobList;
