import SnapshotCard from "@/components/ui/SnapshotCard/SnapshotCard";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useTranslation } from "react-i18next";

interface SnapshotConfig {
  id: string;
  title: string;
  items: {
    label: string;
    value: number | string;
  }[];
  buttonLabel: string;
  onButtonClick: () => void;
}

export default function DashboardSnapshots() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const canViewOrderSnapshot = useHasPermission(["OT_V"]);
  const canViewClaimsWarranty = useHasPermission(["CT_V", "C__V"]);

  const snapshots: SnapshotConfig[] = [];

  if (canViewOrderSnapshot) {
    snapshots.push({
      id: "orderSnapshot",
      title: t("orderSnapshots"),
      items: [
        { label: t("openOrdersToday"), value: 35 },
        { label: t("recentlyCreated"), value: 8 },
        { label: t("deliveredClosed"), value: 9 },
      ],
      buttonLabel: t("viewAllOrders"),
      onButtonClick: () => {},
    });
  }

  if (canViewClaimsWarranty) {
    snapshots.push({
      id: "claimsWarranty",
      title: t("claimsWarranty"),
      items: [
        { label: t("openClaims"), value: 32 },
        { label: t("warrantyClaims"), value: 14 },
        { label: t("averageProcessingTime"), value: "3.5 days" },
      ],
      buttonLabel: t("manageClaims"),
      onButtonClick: () => {},
    });
  }

  if (!snapshots.length) {
    return null;
  }

  return (
    <div className="dashboard__tiles">
      {snapshots.map((snapshot) => (
        <SnapshotCard
          key={snapshot.id}
          title={snapshot.title}
          items={snapshot.items}
          buttonLabel={snapshot.buttonLabel}
          onButtonClick={snapshot.onButtonClick}
        />
      ))}
    </div>
  );
}
