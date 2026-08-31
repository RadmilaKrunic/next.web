export interface Claim {
  claimId: string;
  jobId: string;
  invoiceNumber?: string;
  internalReferenceNumber?: string;
  mobileNumber?: string;
  phoneNumber?: string;
  createdOn: string;
  countryCode: string;
  ascId: string;
  ascName: string;
  toolModelName: string;
  baretoolNumber: string;
  jobAction: string;
  jobType: string;
  totalCost: number;
  status: string;
}

export interface ClaimListResponse {
  claims: Claim[];
  count: number;
}
