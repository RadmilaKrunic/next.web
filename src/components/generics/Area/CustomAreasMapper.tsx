import DocumentTabArea from "components/ui/DocumentTabArea/DocumentTabArea";
import AccessoryArea from "../../../modules/JobManagement/CreateJob/AssetData/AccessoryArea/AccessoryArea";
import Area from "./GenericArea.types";
import NotesList from "components/ui/NotesSection/NotesList";
import SparePartsArea from "../../../modules/JobManagement/JobOverview/SparePartsArea/SparePartsArea";
import SummaryArea from "modules/JobManagement/JobOverview/SparePartsArea/SummaryArea";
import ArchivedSparePartsArea from "modules/JobManagement/JobOverview/ArchivedSparePartsArea/ArchivedSparePartsArea";
import ClaimSparePartsArea from "modules/ClaimManagement/ClaimOverview/ClaimSparePartsArea/ClaimSparePartsArea";
import ClaimSummaryArea from "modules/ClaimManagement/ClaimOverview/ClaimSummaryArea/ClaimSummaryArea";
import ClaimArchivedSparePartsArea from "modules/ClaimManagement/ClaimOverview/ClaimArchivedSparePartsArea/ClaimArchivedSparePartsArea";

export const getCustomArea = (area: Area) => {
  if (area.name.includes("accessory")) {
    const isCreateJobPattern = area.name.includes("assetData#");
    const isReadOnly = !isCreateJobPattern && area.isDisabled !== false;
    return <AccessoryArea area={area} readOnly={isReadOnly} />;
  }
  if (area.name.includes("claimDocumentList")) {
    return <DocumentTabArea entityType="claim" />;
  }

  if (area.name.includes("documentList")) {
    return <DocumentTabArea area={area} />;
  }

  if (area.name.includes("claimNotesList")) {
    return <NotesList entityType="claim" />;
  }

  if (area.name.includes("notesList")) {
    return <NotesList />;
  }

  if (area.name.includes("claimArchivedSpareParts")) {
    return <ClaimArchivedSparePartsArea area={area} />;
  }

  if (area.name.includes("claimSpareParts")) {
    return <ClaimSparePartsArea area={area} />;
  }

  if (area.name.includes("diagnosticsSpareParts")) {
    return <SparePartsArea area={area} />;
  }

  if (area.name.includes("claimDiagnosticsSummary")) {
    return <ClaimSummaryArea area={area} />;
  }

  if (area.name.includes("diagnosticsSummary")) {
    return <SummaryArea area={area} />;
  }

  if (area.name.includes("archivedSpareParts")) {
    return <ArchivedSparePartsArea area={area} />;
  }
  return null;
};
