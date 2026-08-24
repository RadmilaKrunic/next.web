import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import DashboardGrid from "./DashboardGrid";
import "./Dashboard.scss";
import type { DashboardSlot } from "./Dashboard.types";
import { getDashboardLayout } from "./Dashboard.utils";
import JobsCard from "@/modules/Dashboard/components/JobsCard";
import { useNavigate } from "react-router-dom";
import ClaimsCard from "./components/ClaimsCard/ClaimsCard";
import RecentActivity from "./components/RecentActivity/RecentActivity";
import TechnicianWorkload from "./components/TechnicianWorkload/TechnicianWorkload";
import DashboardTiles from "./DashboardTiles";
import DashboardSnapshots from "./DashboardSnapshots";

function Dashboard() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  useBreadcrumbs([]);
  const navigate = useNavigate();

  const widgetMap = {
    tiles: <DashboardTiles />,
    jobs: (
      <JobsCard
        title={t("Jobs")}
        onViewMore={() => navigate("/job-list")}
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
      />
    ),
    recent_activity: <RecentActivity onViewMore={() => {}} title="recentActivity" />,
    snapshots: <DashboardSnapshots />,
    claims: (
      <ClaimsCard
        onViewMore={() => {
          navigate("/claim-list");
        }}
      />
    ),
    technician_workload: <TechnicianWorkload onViewMore={() => {}} title="technicianWorkload" />,
  };

  const dashboardVariant = "";

  const selectedLayout = getDashboardLayout(dashboardVariant);

  const slots: DashboardSlot[] =
    selectedLayout?.slots.map((slot) => ({
      id: slot.id,
      type: slot.type,
      row: slot.row,
      col: slot.col,
      width: slot.width,
      height: slot.height,
      permissions: slot.permissions,
      content: widgetMap[slot.type as keyof typeof widgetMap],
    })) ?? [];

  return (
    <section className="dashboard" aria-label={t("dashboard")}>
      <DashboardGrid
        slots={slots}
        emptyState={<h1 className="dashboard__empty">{t("dashboard")}</h1>}
      />
    </section>
  );
}

export default Dashboard;
