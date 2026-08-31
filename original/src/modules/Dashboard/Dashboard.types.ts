import type { ReactNode } from "react";

export interface DashboardLayoutSlot {
  id: string;
  type: string;
  row: number;
  col: number;
  width: number;
  height: number;
  permissions?: string[];
}

export interface DashboardSlot extends DashboardLayoutSlot {
  content: ReactNode;
}

export interface DashboardLayout {
  variant: string;
  slots: DashboardLayoutSlot[];
}
