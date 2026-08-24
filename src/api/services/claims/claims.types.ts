import { Price } from "types/price.types";
import { Material } from "modules/ClaimManagement/ClaimOverview/Claims.types";

// Partial<Material> carries through whatever passthrough fields (status, approvedBy, etc.)
// the caller spreads from the original material; the fields below are always set explicitly.
export type ClaimPriceMaterial = Partial<Material> & {
  position: string;
  partNumber: string;
  description: string;
  jobType: string;
  quantity: number;
  order: number;
  isPriceSetManually: boolean;
  price: Price;
};

export interface ClaimPriceSummary {
  netAmount: number;
  suggestedNetPrice: number;
  grossAmount: number;
  discount: number;
  totalAmount: number;
  taxAmount: number;
}

export interface PutClaimPricesRequest {
  id: string;
  jobId: string;
  ascId: string;
  customerId: string;
  ascName: string;
  diagnosticId: string;
  countryCode: string;
  actionType: string;
  jobType: string;
  typeOfUsage: string;
  faultCode: string;
  faultCodeDescription: string;
  faultCodeLabourQuantity: number;
  exchangeReason?: string | null;
  claimStatus: string;
  claimNotes: unknown;
  customer: unknown;
  job: unknown;
  materials: ClaimPriceMaterial[];
  // Archived rows are sent as-is from useClaimMaterialsManager's Material[] state,
  // unlike `materials` above which is rebuilt per-row with isPriceSetManually set explicitly.
  archivedMaterials: Material[];
  claimPriceSummary: ClaimPriceSummary;
  jobDiagnostic: unknown;
}

// The PUT response body is not consumed today — callers refetch the claim via
// GET /v1/claims/{claimId} after a successful update instead (see useUpdateClaimPrices).
// See proposals/items-and-prices-backend-api-spec.md (API-3) for the proposed
// upgraded response shape that would let the frontend skip that extra round trip.
export type PutClaimPricesResponse = Record<string, unknown>;
