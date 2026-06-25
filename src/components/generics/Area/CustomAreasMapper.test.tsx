import { describe, it, expect, vi } from "vitest";
import React from "react";
import { getCustomArea } from "./CustomAreasMapper";
import type Area from "./GenericArea.types";

vi.mock("components/ui/DocumentTabArea/DocumentTabArea", () => ({
  default: ({ entityType }: { entityType?: string; area?: unknown }) =>
    React.createElement("div", { "data-testid": `doc-tab-area-${entityType ?? "job"}` }),
}));

vi.mock("../../../modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea", () => ({
  default: ({ readOnly }: { area?: unknown; readOnly: boolean }) =>
    React.createElement("div", {
      "data-testid": `accessory-area-${readOnly ? "readonly" : "edit"}`,
    }),
}));

vi.mock("components/ui/NotesSection/NotesList", () => ({
  default: ({ entityType }: { entityType?: string }) =>
    React.createElement("div", { "data-testid": `notes-list-${entityType ?? "job"}` }),
}));

vi.mock("../../../modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea", () => ({
  default: () => React.createElement("div", { "data-testid": "spare-parts-area" }),
}));

vi.mock("modules/JobManagement/JobOverview/SparePartsArea/SummaryArea", () => ({
  default: () => React.createElement("div", { "data-testid": "summary-area" }),
}));

vi.mock("modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea", () => ({
  default: () => React.createElement("div", { "data-testid": "archived-spare-parts-area" }),
}));

vi.mock("modules/ClaimManagement/ClaimOverview/ClaimSparePartsArea/ClaimSparePartsArea", () => ({
  default: () => React.createElement("div", { "data-testid": "claim-spare-parts-area" }),
}));

vi.mock("modules/ClaimManagement/ClaimOverview/ClaimSummaryArea/ClaimSummaryArea", () => ({
  default: () => React.createElement("div", { "data-testid": "claim-summary-area" }),
}));

function makeArea(name: string, overrides: Partial<Area> = {}): Area {
  return { name, fields: [], isDisabled: true, ...overrides } as Area;
}

describe("getCustomArea", () => {
  it("returns AccessoryArea for assetData# accessory area (create mode, editable)", () => {
    const result = getCustomArea(makeArea("assetData#0_accessory_accessories"));
    expect(result).not.toBeNull();
  });

  it("returns AccessoryArea in read-only for non-createJob accessory", () => {
    const result = getCustomArea(makeArea("accessory_items", { isDisabled: true }));
    expect(result).not.toBeNull();
  });

  it("returns DocumentTabArea with entityType=claim for claimDocumentList", () => {
    const result = getCustomArea(makeArea("claimDocumentList"));
    expect(result).not.toBeNull();
  });

  it("returns DocumentTabArea for documentList", () => {
    const result = getCustomArea(makeArea("documentList"));
    expect(result).not.toBeNull();
  });

  it("returns NotesList with entityType=claim for claimNotesList", () => {
    const result = getCustomArea(makeArea("claimNotesList"));
    expect(result).not.toBeNull();
  });

  it("returns NotesList for notesList", () => {
    const result = getCustomArea(makeArea("notesList"));
    expect(result).not.toBeNull();
  });

  it("returns ClaimSparePartsArea for claimSpareParts", () => {
    const result = getCustomArea(makeArea("claimSpareParts"));
    expect(result).not.toBeNull();
  });

  it("returns SparePartsArea for diagnosticsSpareParts", () => {
    const result = getCustomArea(makeArea("diagnosticsSpareParts"));
    expect(result).not.toBeNull();
  });

  it("returns ClaimSummaryArea for claimDiagnosticsSummary", () => {
    const result = getCustomArea(makeArea("claimDiagnosticsSummary"));
    expect(result).not.toBeNull();
  });

  it("returns SummaryArea for diagnosticsSummary", () => {
    const result = getCustomArea(makeArea("diagnosticsSummary"));
    expect(result).not.toBeNull();
  });

  it("returns ArchivedSparePartsArea for archivedSpareParts", () => {
    const result = getCustomArea(makeArea("archivedSpareParts"));
    expect(result).not.toBeNull();
  });

  it("returns null for unknown area name", () => {
    const result = getCustomArea(makeArea("someRandomAreaName"));
    expect(result).toBeNull();
  });
});
