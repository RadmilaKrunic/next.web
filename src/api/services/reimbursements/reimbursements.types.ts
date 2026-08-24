import { PaginationPage } from "@/components/ui/Pagination/Pagination";

export interface Reimbursement {
  reimbursementId: string;
  ascId: string;
  ascName: string;
  claimCount: number;
  creditAmount: number;
  status: string;
  countryCode: "string";
  materialCount: 0;
  periodEndDate: Date;
  periodStartDate: Date;
  periodType: string;
  totalAmount: number;
  claims: ReimbursementClaim[];
  claimIds: string[];
  customerCode: string;
  paymentSummaries: { amount: number; paymentMethod: string }[];
}
export interface ReimbursementResponse {
  page: PaginationPage;
  content: Reimbursement[];
}
export interface ReimbursementPerAsc {
  reimbursementId: string;
  createdAt: Date;
  timePeriod: string;
  claimsIncluded: number;
  creditNoteAmount: number;
  status: string;
}

export interface ReimbursementPerAscResponse {
  page: PaginationPage;
  content: ReimbursementPerAsc[];
}

export interface ReimbursementClaim {
  claimId: string;
  created: string;
  assetName: string;
  bareToolNumber: string;
  actionType: string;
  jobType: string;
  createdOn: string;
  creditNoteAmount: number;
  jobId: string;
}

export interface ReimbursementAsc {
  ascId: string;
  ascName: string;
  customerCode: string;
  address: {
    street: string;
    houseNumber: string;
    additionalDetails: string;
    neighborhood: string;
    district: string;
    city: string;
    stateProvinceRegion: string;
    postalCode: string;
    countryCode: string;
  };
  email: string;
}

export interface ReimbursementAscResponse {
  page: PaginationPage;
  content: ReimbursementAsc[];
}

export interface ReimbursementDryRunInfo {
  approvedClaimCount: number;
  dryRun: boolean;
  periodEndDate: string;
  periodStartDate: string;
  periodType: string;
  reimbursementCount: number;
  reimbursementIds: string[];
  totalAmount: number;
}
