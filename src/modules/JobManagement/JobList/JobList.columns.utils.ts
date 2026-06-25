import {
  JobColumnKey,
  JobColumnConfiguration,
  getJobColumns,
} from "./JobListTable/JobListColumns.config";
import { saveJobListColumns } from "api/services/jobs/action";
import { Column } from "components/ui/List/List.types";
import { Job } from "./JobList.types";

export type { JobColumnConfiguration } from "./JobListTable/JobListColumns.config";

export const MAX_CUSTOM_COLUMNS = 4;

export const DEFAULT_COLUMN_CONFIGURATION: JobColumnConfiguration[] = [
  { key: "jobId", isFixed: true, isChecked: true, order: 0 },
  { key: "toolModelName", isFixed: true, isChecked: true, order: 1 },
  { key: "jobStatus", isFixed: true, isChecked: true, order: 2 },
  { key: "serialNumber", isFixed: false, isChecked: true, order: 4 },
  { key: "customer", isFixed: false, isChecked: true, order: 5 },
  { key: "updatedAt", isFixed: false, isChecked: true, order: 6 },
  { key: "bareToolNumber", isFixed: false, isChecked: false, order: 7 },
  { key: "assignee", isFixed: false, isChecked: true, order: 8 },
  { key: "customerWish", isFixed: false, isChecked: false, order: 9 },
  { key: "pickupType", isFixed: false, isChecked: false, order: 10 },
  { key: "paymentType", isFixed: false, isChecked: false, order: 11 },
  { key: "source", isFixed: false, isChecked: false, order: 12 },
  { key: "createdAt", isFixed: true, isChecked: true, order: 3 },
];

const COLUMN_DISPLAY_ORDER: JobColumnKey[] = [
  "jobId",
  "customer",
  "serialNumber",
  "toolModelName",
  "createdAt",
  "assignee",
  "updatedAt",
  "customerWish",
  "pickupType",
  "paymentType",
  "source",
  "bareToolNumber",
  "jobStatus",
];

export function getVisibleColumns(config: JobColumnConfiguration[]): JobColumnKey[] {
  const visibleKeys = new Set(config.filter((col) => col.isChecked).map((col) => col.key));

  return COLUMN_DISPLAY_ORDER.filter((key) => visibleKeys.has(key));
}

export function getSelectedCustomColumnsCount(config: JobColumnConfiguration[]): number {
  return config.filter((col) => col.isChecked && !col.isFixed).length;
}

export function isColumnDisabled(
  columnKey: JobColumnKey,
  config: JobColumnConfiguration[],
): boolean {
  const column = config.find((col) => col.key === columnKey);
  if (!column) return false;

  if (column.isFixed) {
    return true;
  }

  if (column.isChecked) {
    return false;
  }

  const selectedCustomCount = getSelectedCustomColumnsCount(config);
  return selectedCustomCount >= MAX_CUSTOM_COLUMNS;
}

export function getDefaultFixedColumns(): JobColumnConfiguration[] {
  return DEFAULT_COLUMN_CONFIGURATION.map((col) => ({
    ...col,
    isChecked: col.isFixed,
  }));
}

export async function saveVisibleColumns(config: JobColumnConfiguration[]): Promise<void> {
  await saveJobListColumns(config);
}

export function getJobListColumns(t: (key: string) => string): Column<Job>[] {
  const columnsConfig = getJobColumns(t);
  return COLUMN_DISPLAY_ORDER.map((key) => {
    const col = columnsConfig[key];
    return {
      key: col.key,
      label: col.label,
      render: col.getValue,
    };
  });
}
