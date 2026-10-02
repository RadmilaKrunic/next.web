import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@bosch/react-frok";
import Filters from "components/ui/List/Filters/Filters";
import Table from "components/ui/List/Table/Table";
import Pagination from "components/ui/Pagination/Pagination";
import { Column } from "components/ui/List/List.types";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { formatDateToDisplay } from "utils/dateFormatter";
import { CustomerJob } from "api/services/customers/customers.types";
import { useCustomerJobs } from "api/services/customers/hooks";
import ActivityIndicatorWithDelay from "components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay";
import "./ClientJobsTab.scss";

const EMPTY_JOBS: CustomerJob[] = [];

interface ClientJobsTabProps {
  clientId: string;
  onRowClick: (job: CustomerJob) => void;
  onCreateJob: () => void;
}

function ClientJobsTab({ clientId, onRowClick, onCreateJob }: Readonly<ClientJobsTabProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [searchValue, setSearchValue] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const {
    data: jobsPage,
    isLoading,
    isError,
  } = useCustomerJobs(clientId, {
    searchTerm: searchValue.trim() || undefined,
    page: pagination.page - 1,
    size: pagination.pageSize,
  });
  const jobs = jobsPage?.content ?? EMPTY_JOBS;

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const columns: Column<CustomerJob>[] = useMemo(
    () => [
      { key: "jobId", label: t("jobId"), render: (job) => job.jobId },
      {
        key: "serialNumber",
        label: t("serialNumber"),
        render: (job) => job.serialNumber || "-",
      },
      {
        key: "toolModelName",
        label: t("toolModelNameFilter"),
        render: (job) => job.assetName || "-",
      },
      {
        key: "createdAt",
        label: t("createdAt"),
        render: (job) => (job.createdOn ? formatDateToDisplay(job.createdOn) : "-"),
      },
      {
        key: "updatedAt",
        label: t("updatedAt"),
        render: (job) => (job.updatedOn ? formatDateToDisplay(job.updatedOn) : "-"),
      },
      {
        key: "jobStatus",
        label: t("jobStatus"),
        render: (job) => <StatusIndicator status={job.status} />,
      },
    ],
    [t],
  );

  return (
    <div className="client-jobs-tab">
      <Filters
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        onSearchReset={() => handleSearchChange("")}
        actionButton={{
          icon: "add",
          label: t("createJob"),
          onClick: onCreateJob,
        }}
        type="job"
      />
      {isLoading && <ActivityIndicatorWithDelay delay={500} />}
      {isError && <p role="alert">{t("errorLoadingJobs")}</p>}
      {!isLoading && !isError && (
        <>
          <Table
            data={jobs}
            columns={columns}
            visibleColumns={columns.map((column) => column.key)}
            getRowKey={(job) => job.jobId}
            onRowClick={onRowClick}
            renderRowActions={() => <Icon iconName="right" />}
            emptyListMessage="noJobsFoundMessage"
          />
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onDropdownOptionChange={(option) =>
              setPagination({ page: 1, pageSize: Number(option) })
            }
            totalResults={jobsPage?.page.totalElements ?? 0}
          />
        </>
      )}
    </div>
  );
}

export default ClientJobsTab;
