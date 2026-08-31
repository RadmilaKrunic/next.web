import type { DashboardLayout } from "./Dashboard.types";
import dashboardLayouts from "../../../data/dashboard.json";

export function getDashboardLayout(variant: string): DashboardLayout | undefined {
  return (dashboardLayouts as DashboardLayout[]).find((layout) => layout.variant === variant);
}
