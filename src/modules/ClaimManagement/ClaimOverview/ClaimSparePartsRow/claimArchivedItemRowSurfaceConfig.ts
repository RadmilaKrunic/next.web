import type {
  ArchivedItemRowSurfaceConfig,
  ShowRevertButtonContext,
} from "modules/JobManagement/JobOverview/SparePartsRow/ArchivedItemRowSurfaceConfig";

function resolveShowRevertButton(ctx: ShowRevertButtonContext): boolean {
  return ctx.canDeleteRows;
}

export const claimArchivedItemRowSurfaceConfig: ArchivedItemRowSurfaceConfig = {
  surface: "claimSpareParts",
  resolveShowRevertButton,
  renderPlaceholderWhenHidden: true,
};
