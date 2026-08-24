import {
  ClaimColumnKey,
  ClaimColumnConfiguration,
  getClaimColumns,
} from "./ClaimListTable/ClaimListColumns.config";
import { saveClaimListColumns } from "api/services/claims/action";
import { Column } from "components/ui/List/List.types";
import { Claim } from "./ClaimList.types";

export type { ClaimColumnConfiguration } from "./ClaimListTable/ClaimListColumns.config";

export const MIN_VISIBLE_COLUMNS = 5;
export const MAX_VISIBLE_COLUMNS = 8;

const COLUMN_DISPLAY_ORDER: ClaimColumnKey[] = [
  "claimId",
  "jobId",
  "ascName",
  "jobType",
  "status",
  "invoiceNumber",
  "internalReferenceNumber",
  "mobileNumber",
  "phoneNumber",
  "createdOn",
  "toolModelName",
  "baretoolNumber",
  "jobAction",
  "totalCost",
];

export const DEFAULT_COLUMN_CONFIGURATION = COLUMN_DISPLAY_ORDER.map((key, index) => ({
  key,
  isFixed: index < MIN_VISIBLE_COLUMNS,
  isChecked: index < MAX_VISIBLE_COLUMNS,
  order: index,
}));

export function getVisibleColumns(config: ClaimColumnConfiguration[]): ClaimColumnKey[] {
  const visibleKeys = new Set(config.filter((col) => col.isChecked).map((col) => col.key));

  return COLUMN_DISPLAY_ORDER.filter((key) => visibleKeys.has(key));
}

export function getSelectedColumnsCount(config: ClaimColumnConfiguration[]): number {
  return config.filter((col) => col.isChecked).length;
}

export function isColumnDisabled(
  columnKey: ClaimColumnKey,
  config: ClaimColumnConfiguration[],
): boolean {
  const column = config.find((col) => col.key === columnKey);
  if (!column) return false;

  if (column.isFixed) {
    return true;
  }

  const selectedCount = getSelectedColumnsCount(config);

  if (column.isChecked) {
    return selectedCount <= MIN_VISIBLE_COLUMNS;
  }

  return selectedCount >= MAX_VISIBLE_COLUMNS;
}

export function getDefaultFixedColumns(): ClaimColumnConfiguration[] {
  return DEFAULT_COLUMN_CONFIGURATION.map((col) => ({
    ...col,
    isChecked: col.isFixed,
  }));
}

export async function saveVisibleColumns(config: ClaimColumnConfiguration[]): Promise<void> {
  await saveClaimListColumns(config);
}

export function getClaimListColumns(t: (key: string) => string): Column<Claim>[] {
  const columnsConfig = getClaimColumns(t);
  return COLUMN_DISPLAY_ORDER.map((key) => {
    const col = columnsConfig[key];
    return {
      key: col.key,
      label: col.label,
      render: col.getValue,
    };
  });
}
