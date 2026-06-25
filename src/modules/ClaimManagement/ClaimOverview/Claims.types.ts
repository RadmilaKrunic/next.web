import { Customer } from "api/services/customers/customers.types";
import {
  Accessory,
  Attachment,
  CustomerWish,
  JobDiagnostic,
} from "modules/JobManagement/JobList/JobList.types";

export interface Asset {
  brand: string;
  bareToolNumber: string;
  serialNumber: string;
  toolModelName: string;
  manufacturedDate: string;
  category: string;
  categoryId: string;
  purchaseDate: string;
  customerDescriptionOfFailure: string;
  invoiceNumber: string;
  accessories: Accessory[];
  customerWish: CustomerWish;
  attachments: Attachment[];
}

export interface Job {
  jobId: string;
  orderId: string;
  assigneeID: string;
  assigneeName: string;
  ascId: string;
  internalReferenceNumber: string;
  jobStatus: string;
  jobCreationDate: string;
  asset: Asset;
}

export interface Tax {
  type: string;
  percentage: number;
  value: number;
}

export interface Price {
  discount: number;
  grossAmount: number;
  netAmount: number;
  suggestedNetPrice: number;
  tax: number;
  taxAmount: number;
  totalAmount: number;
  unitPrice: number;
}

export interface Material {
  order?: number;
  position: string;
  partNumber: string;
  jobType: string;
  status: string;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  description: string;
  quantity: number;
  isValidated: boolean;
  isPriceManuallySet: boolean;
  price: Price;
}

export interface ClaimItem {
  id: string;
  jobId: string;
  ascId: string;
  ascName: string;
  diagnosticId: string;
  countryCode: string;
  actionType: string;
  jobType: string;
  typeOfUsage: string;
  faultCode: string;
  faultCodeDescription: string;
  faultCodeLabourQuantity: number;
  claimStatus: string;
  overallClaimDecision?: string;
  exchangeReason?: string | null;
  claimNotes: string;
  customer: Customer;
  job: Job;
  materials: Material[];
  archivedMaterials?: Material[];
  jobDiagnostic?: JobDiagnostic;
}
