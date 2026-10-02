import Section from "components/generics/Section/GenericSection.types";
import { WarrantyInfoPayload } from "components/generics/Field/GenericField.types";
import { WarrantyCheckRequest, WarrantyCheckResponse } from "api/services/orders/orders.types";
import { type ValidateAndSaveResponse } from "api/services/jobs/action";
import { JobDiagnostic } from "../JobList/JobList.types";
import {
  buildWarrantyCheckPayloadFromFieldNames,
  updateWarrantyFields,
} from "../CreateJob/CreateJob.warranty.utils";

export const buildJobOverviewWarrantyCheckPayload = (
  values: Record<string, unknown>,
  countryCode?: string,
): WarrantyCheckRequest | null => {
  return buildWarrantyCheckPayloadFromFieldNames(
    values,
    {
      brandFieldName: "brand",
      bareToolNumberFieldName: "baretoolNumber",
      serialNumberFieldName: "serialNumber",
      purchaseDateFieldName: "purchaseDate",
    },
    countryCode,
  );
};

export const updateJobOverviewWarrantyTabs = (
  tabs: Section[],
  response: WarrantyCheckResponse,
  warrantyInfoPayload: WarrantyInfoPayload | null,
): Section[] => {
  return tabs.map((tab) => {
    if (tab.name !== "assetData") return tab;

    return {
      ...tab,
      areas: tab.areas.map((area) => {
        if (area.name === "customerWish") {
          return {
            ...area,
            fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
          };
        }

        if (area.name !== "warrantyDetails") {
          return area;
        }

        return {
          ...area,
          fields: updateWarrantyFields(area.fields, response, warrantyInfoPayload) ?? area.fields,
        };
      }),
    };
  });
};

export const extractDiagnosticFromValidateResponse = (
  data: ValidateAndSaveResponse,
  jobId?: string,
): JobDiagnostic | undefined => {
  if ((data as any).diagnostic) return (data as any).diagnostic;

  const hasTopLevelDiagnosticData =
    Array.isArray((data as any).materials) ||
    Array.isArray((data as any).archivedMaterials) ||
    !!(data as any).priceSummary ||
    !!(data as any).priceSummaryDetailed ||
    typeof (data as any).actionType === "string" ||
    typeof (data as any).jobType === "string";

  if (!hasTopLevelDiagnosticData || !jobId) return undefined;
  const responce = { ...(data as any), jobId } as JobDiagnostic;
  return responce;
};
