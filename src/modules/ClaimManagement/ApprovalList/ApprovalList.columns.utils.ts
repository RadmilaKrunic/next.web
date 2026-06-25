import {
  ApprovalColumnKey,
  ApprovalColumnConfiguration,
  getApprovalColumns,
} from "./ApprovalListTable/ApprovalListColumns.config";
import { saveApprovalListColumns } from "api/services/approvals/action";
import { Column } from "components/ui/List/List.types";
import { Job } from "modules/JobManagement/JobList/JobList.types";

export type { ApprovalColumnConfiguration } from "./ApprovalListTable/ApprovalListColumns.config";

export const MAX_CUSTOM_COLUMNS = 4;

export const DEFAULT_COLUMN_CONFIGURATION: ApprovalColumnConfiguration[] = [
  { key: "jobId", isFixed: true, isChecked: true, order: 0 },
  { key: "toolModelName", isFixed: true, isChecked: true, order: 1 },
  { key: "jobStatus", isFixed: true, isChecked: true, order: 2 },
  { key: "createdAt", isFixed: true, isChecked: true, order: 3 },
  { key: "serialNumber", isFixed: false, isChecked: true, order: 4 },
  { key: "customer", isFixed: false, isChecked: true, order: 5 },
  { key: "updatedAt", isFixed: false, isChecked: true, order: 6 },
  { key: "bareToolNumber", isFixed: false, isChecked: false, order: 7 },
  { key: "assignee", isFixed: false, isChecked: true, order: 8 },
  { key: "customerWish", isFixed: false, isChecked: false, order: 9 },
  { key: "pickupType", isFixed: false, isChecked: false, order: 10 },
  { key: "paymentType", isFixed: false, isChecked: false, order: 11 },
  { key: "source", isFixed: false, isChecked: false, order: 12 },
  { key: "ascName", isFixed: true, isChecked: true, order: 13 },
  { key: "actionType", isFixed: true, isChecked: true, order: 14 },
  { key: "materialCost", isFixed: true, isChecked: true, order: 15 },
];

const COLUMN_DISPLAY_ORDER: ApprovalColumnKey[] = [
  "jobId",
  "createdAt",
  "ascName",
  "toolModelName",
  "actionType",
  "materialCost",
  "jobStatus",
];

export function getVisibleColumns(config: ApprovalColumnConfiguration[]): ApprovalColumnKey[] {
  const visibleKeys = new Set(config.filter((col) => col.isChecked).map((col) => col.key));

  return COLUMN_DISPLAY_ORDER.filter((key) => visibleKeys.has(key));
}

export function getSelectedCustomColumnsCount(config: ApprovalColumnConfiguration[]): number {
  return config.filter((col) => col.isChecked && !col.isFixed).length;
}

export function isColumnDisabled(
  columnKey: ApprovalColumnKey,
  config: ApprovalColumnConfiguration[],
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

export function getDefaultFixedColumns(): ApprovalColumnConfiguration[] {
  return DEFAULT_COLUMN_CONFIGURATION.map((col) => ({
    ...col,
    isChecked: col.isFixed,
  }));
}

export async function saveVisibleColumns(config: ApprovalColumnConfiguration[]): Promise<void> {
  await saveApprovalListColumns(config);
}

export function getApprovalListColumns(t: (key: string) => string): Column<Job>[] {
  const columnsConfig = getApprovalColumns(t);
  return COLUMN_DISPLAY_ORDER.map((key) => {
    const col = columnsConfig[key];
    return {
      key: col.key,
      label: col.label,
      render: col.getValue,
    };
  });
}
