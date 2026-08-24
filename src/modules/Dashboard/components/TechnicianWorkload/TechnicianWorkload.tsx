import { useTranslation } from "react-i18next";
import "./TechnicianWorkload.scss";

export interface TechnicianWorkloadItem {
  id: number;
  name: string;
  assignedJobs: number;
  totalJobs: number;
}

export interface TechnicianWorkloadProps {
  title?: string;
  items?: TechnicianWorkloadItem[];
  onViewMore?: () => void;
  viewMoreLabel?: string;
  className?: string;
}

const mockData: TechnicianWorkloadItem[] = [
  {
    id: 1,
    name: "Rakesh Sharma",
    assignedJobs: 5,
    totalJobs: 10,
  },
  {
    id: 2,
    name: "Dileep J",
    assignedJobs: 7,
    totalJobs: 10,
  },
  {
    id: 3,
    name: "Steve J",
    assignedJobs: 3,
    totalJobs: 10,
  },
  {
    id: 4,
    name: "Ram Prasad",
    assignedJobs: 10,
    totalJobs: 10,
  },
  {
    id: 5,
    name: "Pradeep",
    assignedJobs: 5,
    totalJobs: 10,
  },
];

export default function TechnicianWorkload({
  title = "technicianWorkload",
  items = mockData,
  onViewMore,
  viewMoreLabel = "ViewMore",
  className = "",
}: Readonly<TechnicianWorkloadProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <div className={`technician-workload ${className}`}>
      <div className="technician-workload__header">
        <span>{t(title)}</span>

        {onViewMore && (
          <button type="button" className="technician-workload__view-more" onClick={onViewMore}>
            {t(viewMoreLabel)}
          </button>
        )}
      </div>

      <div className="technician-workload__list">
        {items.map((item) => {
          const progress = (item.assignedJobs / item.totalJobs) * 100;

          return (
            <div key={item.id} className="technician-workload__item">
              <div className="technician-workload__name">{item.name}</div>
              <div className="technician-workload__label">{t("assignedJobs")}</div>

              <div className="technician-workload__progress-row">
                <div className="technician-workload__progress">
                  <div
                    className="technician-workload__progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="technician-workload__count">
                  {item.assignedJobs}/{item.totalJobs}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
