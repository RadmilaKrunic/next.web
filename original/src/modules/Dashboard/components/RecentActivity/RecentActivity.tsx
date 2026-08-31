import { useTranslation } from "react-i18next";
import "./RecentActivity.scss";

export interface RecentActivityProps {
  title?: string;
  onViewMore?: () => void;
  viewMoreLabel?: string;
  className?: string;
}

type ActivityItem = {
  id: number;
  name: string;
  title: string;
  subtitle: string;
  customer: string;
  time: string;
};

const mockData: ActivityItem[] = [
  {
    id: 1,
    name: "Dhinesh M",
    title: "Tool marked as Delivered",
    subtitle: "Order ID: OA0045917",
    customer: "Customer name: Cody fisher",
    time: "23 min ago",
  },
  {
    id: 2,
    name: "Dhinesh M",
    title: "Updated with new message",
    subtitle: "Order ID: OA0045917",
    customer: "Customer name: Cody fisher",
    time: "30 min ago",
  },
  {
    id: 3,
    name: "Dhinesh M",
    title: "New job created",
    subtitle: "Order ID: OA0045917",
    customer: "Customer name: Cody fisher",
    time: "1 hour ago",
  },
  {
    id: 4,
    name: "Dhinesh M",
    title: "repair finished ready to deliver",
    subtitle: "Order ID: OA0045917",
    customer: "Customer name: Cody fisher",
    time: "1 day ago",
  },
];

export default function RecentActivity({
  title = "recentActivity",
  onViewMore,
  viewMoreLabel = "ViewMore",
}: Readonly<RecentActivityProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  return (
    <div className="recent-activity">
      <div className="recent-activity__header">
        <span>{t(title)}</span>
        {onViewMore && (
          <button type="button" className="recent-activity__view-more" onClick={onViewMore}>
            {t(viewMoreLabel)}
          </button>
        )}
      </div>
      <div className="recent-activity__list">
        {mockData.map((item) => (
          <div key={item.id} className="recent-activity__item">
            <div className="recent-activity__title">
              <strong>{item.name}</strong> - {t(item.title)}
            </div>
            <div className="recent-activity__meta">{t(item.subtitle)}</div>
            <div className="recent-activity__meta">{t(item.customer)}</div>
            <div className="recent-activity__time">{t(item.time)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
