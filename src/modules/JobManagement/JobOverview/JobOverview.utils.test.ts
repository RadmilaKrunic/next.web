import { describe, it, expect, vi } from "vitest";
import {
  buildJobOverviewWarrantyCheckPayload,
  updateJobOverviewWarrantyTabs,
} from "./JobOverview.utils";

vi.mock("../CreateJob/CreateJob.warranty.utils", () => ({
  buildWarrantyCheckPayloadFromFieldNames: (values: any, cfg: any, country?: string) => ({
    brand: values["brand"],
    country: country,
  }),
  updateWarrantyFields: (fields: any[]) => fields.map((f) => ({ ...f, updated: true })),
}));

describe("JobOverview utils", () => {
  it("builds warranty payload when values present", () => {
    const vals = {
      brand: "Bosch",
      baretoolNumber: "BT1",
      serialNumber: "S1",
      purchaseDate: "2023-01-01",
    };
    const payload = buildJobOverviewWarrantyCheckPayload(vals, "DE");
    expect(payload).toBeTruthy();
    expect(payload?.brand).toBe("Bosch");
    expect(payload?.country).toBe("DE");
  });

  it("updates tabs replacing fields for assetData areas", () => {
    const tabs = [
      {
        name: "assetData",
        areas: [
          { name: "customerWish", fields: [{ name: "f1" }] },
          { name: "warrantyDetails", fields: [{ name: "f2" }] },
        ],
      },
      { name: "other", areas: [] },
    ];

    const response = { evaluationStatus: "ELIGIBLE" } as any;
    const result = updateJobOverviewWarrantyTabs(tabs as any, response, null);
    const asset = result.find((t) => t.name === "assetData");
    expect(asset).toBeDefined();
    expect(asset?.areas[0].fields[0].updated).toBe(true);
    expect(asset?.areas[1].fields[0].updated).toBe(true);
  });
});
