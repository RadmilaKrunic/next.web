import { useState, useEffect } from "react";
import { useDiagnosticByJobId } from "api/services/jobs/hooks";
import GenericSection from "components/generics/Section/GenericSection.types";
import { JobDiagnostic } from "modules/JobManagement/JobList/JobList.types";

interface UseDiagnosticDataProps {
  jobId: string;
  jobData: any;
  tabs: GenericSection[];
}

const EMPTY_DIAGNOSTIC_DATA: JobDiagnostic = {
  jobId: "",
  ascId: "",
  actionType: "",
  jobType: "",
  status: "",
  typeOfUsage: "",
  faultCode: "",
  faultCodeDescription: "",
  faultCodeLabourQuantity: 0,
  materials: [],
  priceSummary: {
    discount: 0,
    grossAmount: 0,
    netAmount: 0,
    suggestedNetPrice: 0,
    taxAmount: 0,
    totalAmount: 0,
    discountAmount: 0,
  },
};

export const useDiagnosticData = ({ jobId, jobData, tabs }: UseDiagnosticDataProps) => {
  const [shouldFetchDiagnostic, setShouldFetchDiagnostic] = useState(false);

  useEffect(() => {
    if (!jobData) {
      setShouldFetchDiagnostic(false);
      return;
    }

    if (tabs.length === 0) {
      setShouldFetchDiagnostic(false);
      return;
    }

    const currentStatus = jobData?.job?.jobStatus || "";
    const diagnosticSection = tabs.find((tab) => tab.name === "diagnosticData");

    const shouldFetch = !diagnosticSection?.hiddenForStatuses?.includes(currentStatus);

    setShouldFetchDiagnostic(shouldFetch);
  }, [jobData, tabs]);

  const {
    data: diagnosticData,
    isLoading: diagnosticLoading,
    error: diagnosticError,
  } = useDiagnosticByJobId(jobId, {
    enabled: shouldFetchDiagnostic && !!jobId,
  });

  return {
    diagnosticData: diagnosticData || EMPTY_DIAGNOSTIC_DATA,
    diagnosticLoading,
    diagnosticError,
    shouldFetchDiagnostic,
  };
};
