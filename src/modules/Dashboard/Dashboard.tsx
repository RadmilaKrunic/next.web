import { useTranslation } from "react-i18next";
import { useBreadcrumbs } from "../../hooks/useBreadcrumbs";
import Tile from "../../components/ui/Tile/Tile";
import DashboardGrid from "./DashboardGrid";
import "./Dashboard.scss";
import type { DashboardSlot } from "./Dashboard.types";
import { getDashboardLayout } from "./Dashboard.utils";
import JobsCard from "@/modules/Dashboard/components/JobsCard";
import { useNavigate } from "react-router-dom";
import ClaimsCard from "./components/ClaimsCard/ClaimsCard";
import RecentActivity from "./components/RecentActivity/RecentActivity";

function MockWidget({ label, height }: Readonly<{ label: string; height?: number }>) {
  return (
    <div className="dashboard__mock" style={{ minHeight: height ?? 160 }}>
      {label}
    </div>
  );
}

function Dashboard() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  useBreadcrumbs([]);
  const navigate = useNavigate();

  const widgetMap = {
    tiles: (
      <div className="dashboard__tiles">
        <Tile icon="box-closed" value={250} label={t("activeJobs")} onClick={() => {}} />
        <Tile icon="document" value={32} label={t("openClaims")} onClick={() => {}} />
        <Tile icon="people" value={314} label={t("activeClients")} onClick={() => {}} />
        <Tile icon="reporting" value={32} label={t("reports")} onClick={() => {}} />
      </div>
    ),
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
    order_snapshot: <MockWidget label="Order snapshot" height={220} />,
    claims_warranty: <MockWidget label="Claims & Warranty" height={220} />,
    claims: (
      <ClaimsCard
        onViewMore={() => {
          navigate("/claim-list");
        }}
      />
    ),
    technician_workload: <MockWidget label="Technician workload" />,
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
