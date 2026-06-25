import { ClaimColumnKey, getClaimColumns } from "./ClaimListTable/ClaimListColumns.config";
import { Column } from "components/ui/List/List.types";
import { Claim } from "./ClaimList.types";

const COLUMN_DISPLAY_ORDER: ClaimColumnKey[] = [
  "claimId",
  "createdOn",
  "ascName",
  "toolModelName",
  "baretoolNumber",
  "jobAction",
  "jobType",
  "totalCost",
  "status",
];

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
