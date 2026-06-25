import "./JobsCard.scss";
import { ActivityIndicator, Button, Chip, Icon, TextField } from "@bosch/react-frok";
import StatusIndicator from "components/ui/StatusIndicator/StatusIndicator";
import { JobsCardProps } from "./JobsCard.types";
import { useTranslation } from "react-i18next";
import { useJobs } from "api/services/jobs/hooks";
import { useMemo, useState } from "react";
import { CUSTOMER_TYPE_ICON_NAME } from "utils/customerTypeIcon";
import { formatDateToDisplay } from "utils/dateFormatter";
import { flattenJobForSearch } from "modules/JobManagement/JobList/JobList.utils";

const filters = [
  { key: "ALL", label: "All" },
  { key: "CREATED", label: "CREATED" },
  { key: "IN_DIAGNOSTICS", label: "IN_DIAGNOSTICS" },
  { key: "REPAIR_DONE", label: "REPAIR_DONE" },
] as const;

function JobsCard({
  title = "Jobs",
  onViewMore,
  viewMoreLabel = "ViewMore",
  actionButton,
}: Readonly<JobsCardProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { data: jobs = [], isLoading: isJobsLoading } = useJobs();
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [searchValue, setSearchValue] = useState("");

  const onToggleFilter = (key: string) => {
    setSelectedFilter(key);
  };

  const filteredJobs = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return jobs
      .filter((job) => selectedFilter === "ALL" || job.jobStatus === selectedFilter)
      .filter((job) => {
        if (!search) return true;

        return flattenJobForSearch(job).some((value) => value.toLowerCase().includes(search));
      })
      .slice(0, 5);
  }, [jobs, selectedFilter, searchValue]);

  if (isJobsLoading) {
    return (
      <div className="loading-container">
        <ActivityIndicator size="large" />
      </div>
    );
  }

  return (
    <div className="jobs-card">
      <div className="jobs-card__header">
        <span>{title}</span>
        {onViewMore && (
          <button type="button" className="jobs-card__view-more" onClick={onViewMore}>
            {t(viewMoreLabel)}
          </button>
        )}
      </div>

      <div className="jobs-card__list">
        <div className="jobs-card__filters">
          <div className="left-filters">
            {filters.map((filter) => (
              <Chip
                key={filter.key}
                chipLabelId={filter.key}
                label={t(filter.label)}
                selected={filter.key === selectedFilter}
                tabIndex={0}
                onClick={() => onToggleFilter(filter.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleFilter(filter.key);
                  }
                }}
              />
            ))}
          </div>
          <div className="right-filters">
            <TextField
              as="div"
              id="search"
              type="search"
              placeholder={t("search")}
              searchButton={{
                title: t("search"),
                "aria-label": t("search"),
              }}
              resetButton={{
                title: t("clear"),
                "aria-label": t("clear"),
                onClick: setSearchValue.bind(null, ""),
              }}
              name="search"
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
              value={searchValue}
            />
            {actionButton && (
              <Button
                icon={actionButton.icon as React.ComponentProps<typeof Button>["icon"]}
                mode="primary"
                label={actionButton.label}
                onClick={actionButton.onClick}
              />
            )}
          </div>
        </div>
        {filteredJobs.map((job) => {
          const content = (
            <>
              <Icon
                iconName={
                  job.customer.customerType
                    ? CUSTOMER_TYPE_ICON_NAME[
                        job.customer.customerType as keyof typeof CUSTOMER_TYPE_ICON_NAME
                      ]
                    : "user"
                }
                className="jobs-card__icon"
              />
              <div className="jobs-card__content">
                <strong>
                  {job.asset?.toolModelName} | {job.customer?.firstName} {job.customer?.lastName} |{" "}
                  {job.asset?.bareToolNumber}
                </strong>
                <div className="jobs-card__meta">
                  {t("jobId")}: {job.jobId} | {t("createdOn")}: {formatDateToDisplay(job.createdAt)}
                </div>
              </div>
              <StatusIndicator status={job.jobStatus} type="job" />
            </>
          );

          return (
            <div key={job.jobId} className="jobs-card__item">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default JobsCard;
