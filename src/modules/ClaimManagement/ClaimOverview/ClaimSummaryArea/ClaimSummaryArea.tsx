import { useMemo } from "react";
import Area from "components/generics/Area/GenericArea.types";
import SummaryArea from "modules/JobManagement/JobOverview/SparePartsArea/SummaryArea";
import {
  DiagnosticsContext,
  type DiagnosticsContextValue,
} from "modules/JobManagement/JobOverview/DiagnosticsContext";
import { useClaimContext } from "../ClaimContext";

/**
 * Bridges ClaimContext → DiagnosticsContext so that SummaryArea (which calls
 * useDiagnosticsContext internally) works correctly inside the claims tab without
 * depending on the job-level DiagnosticsContext.Provider.
 *
 * Only the 4 values that SummaryArea actually reads from context are wired;
 * everything else is a no-op stub.
 */
function ClaimSummaryArea({ area }: Readonly<{ area: Area }>) {
  const {
    isDistributingRef,
    hasPricesPopulated,
    setSummaryTypeOptions,
    discountBase,
    materials,
    setMaterials,
  } = useClaimContext();

  const bridgedContextValue = useMemo<DiagnosticsContextValue>(
    () => ({
      materials,
      setMaterials,
      onAddRow: () => {},
      onAddMaterials: () => {},
      onDeleteRow: () => {},
      onRestoreRow: () => {},
      addSpecialMaterialsAllowed: false,
      positionDropdownOptions: [],
      allowedPositions: [],
      getExistingPartNumbers: () => new Set(),
      isDistributingRef,
      isResyncingRef: { current: false },
      arePricesValidated: false,
      setArePricesValidated: () => {},
      hasPricesPopulated,
      markAllValidated: () => {},
      markRowDirty: () => {},
      summaryTypeOptions: [{ value: "totalSummary", label: "totalSummary" }],
      setSummaryTypeOptions,
      setRevisedRowPending: () => {},
      isArchivedExpanded: false,
      setIsArchivedExpanded: () => {},
      canArchiveOnDelete: false,
      resyncMaterialsFromAPI: () => {},
      jobStatus: "",
      discountBase,
      automaticRows: [],
      apiMaterialsLoaded: false,
      apiMaterialsEmpty: true,
      hasExistingDiagnostic: false,
    }),
    [
      materials,
      setMaterials,
      isDistributingRef,
      hasPricesPopulated,
      setSummaryTypeOptions,
      discountBase,
    ],
  );

  return (
    <DiagnosticsContext.Provider value={bridgedContextValue}>
      <SummaryArea area={area} />
    </DiagnosticsContext.Provider>
  );
}

export default ClaimSummaryArea;
