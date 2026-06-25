import type { ReactNode } from "react";

export interface DashboardLayoutSlot {
  id: string;
  type: string;
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface DashboardSlot extends DashboardLayoutSlot {
  content: ReactNode;
  permissions?: string[];
}

export interface DashboardLayout {
  variant: string;
  slots: DashboardLayoutSlot[];
}
