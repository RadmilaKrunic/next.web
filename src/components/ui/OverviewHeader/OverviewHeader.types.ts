export type OverviewType = "job" | "claim";

export interface OverviewHeaderItem {
  icon: string;
  title: string;
  subtitle?: string;
}

export interface OverviewHeaderProps {
  type: OverviewType;
  id: string;
  idLabel: string;
  createdAt: string;
  createdAtLabel: string;
  historyLink?: {
    label: string;
    href: string;
  };
  items: OverviewHeaderItem[];
  technicianSelectProps?: {
    assigneeName: string;
    ascId: string;
    jobId: string;
  };
  assigneeInfo?: {
    icon: string;
    name: string | null;
    subtitle?: string;
  };
  status?: string;
  showStatus?: boolean;
  ascName?: string;
  isDisabled?: boolean;
}
