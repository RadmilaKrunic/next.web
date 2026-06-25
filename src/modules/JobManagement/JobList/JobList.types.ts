import { Customer } from "api/services/customers/customers.types";
export interface Job {
  jobId: string;
  orderId: string;
  ascId: string;
  source: string;
  pickupType: string;
  paymentType?: string;

  customer: {
    firstName: string;
    lastName: string;
    customerType?: string;
    companyName?: string;
    dealershipName?: string;
  };

  createdAt: string;
  updatedAt: string;

  ascName?: string;
  assigneeName: string | null;
  jobStatus: string;
  isOnHold?: boolean;

  customerWish?: string;

  diagnosticInfo?: {
    actionType?: string;
    materialCost?: number;
    materialsJobType: string[];
  };

  asset?: {
    bareToolNumber?: string;
    serialNumber?: string;
    toolModelName?: string;
    category?: string;
    categoryId?: string;
  };

  attachments: {
    name: string;
    type: string;
    attachmentId: string;
  }[];
}
export interface Message {
  messageId: string;
  jobId: string;
  claimId?: string | null;
  diagnosticId?: string | null;
  authorId: string;
  authorName: string | null;
  messageType: string;
  decision: string | null;
  message: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface JobList {
  count: number;
  jobs: Job[];
  categories: Record<string, string>;
}

export type Filter = {
  name: string;
  value: string | boolean;
};

export interface Address {
  street: string;
  houseNumber: string;
  additionalDetails: string;
  neighborhood: string;
  district: string;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  country: string;
}

export interface Accessory {
  accessoryName: string;
  quantity: number;
  description: string;
}

export interface CustomerWish {
  customerWish: string;
  warrantyType: string;
  invoiceNumber: string;
  promotionalCode: string;
  costLimit: number;
  whatIfCostLimitExceeded: string;
}

export interface Attachment {
  name: string;
  type: string;
  attachmentId: string;
}

export interface JobOverviewItem {
  order: {
    orderId: string;
    ascId: string;
    pickupType: string;
    paymentType: string;
    countryCode: string;
    source: string;
    customerId: string;
    customer: Customer;
  };
  job: {
    jobId: string;
    orderId: string;
    assigneeID: string;
    assigneeName: string;
    ascId: string;
    internalReferenceNumber: string;
    jobStatus: string;
    jobCreationDate: string;
    isOnHold: boolean;
    pendingApprovals: string[];
    asset: {
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
      hasAccessories: boolean;
      isBareTool: boolean;
      accessories: Accessory[];
      customerWish: CustomerWish;
      attachments: Attachment[];
    };
  };
  diagnostic?: JobDiagnostic;
}

export interface JobDiagnostic {
  jobId: string;
  ascId?: string;
  actionType: string;
  jobType: string;
  exchangeReason?: string;
  status: string;
  typeOfUsage: string;
  faultCode: string;
  faultCodeDescription: string;
  faultCodeLabourQuantity: number;
  technicianNote?: string;
  materials?: {
    id: string;
    order?: number;
    position: string;
    partNumber: string;
    description: string;
    type: string;
    quantity: number;
    status: string;
    approvedBy: string;
    approvedByName: string;
    approvedAt: string;
    approvalRemarks: string;
    isPriceSetManually: boolean;
    price: {
      discount: number;
      suggestedNetPrice: number;
      taxAmount: number;
      unitPrice: number;
      netAmount: number;
      tax: number;
      taxTypes?: [];
      grossAmount: number;
      totalAmount: number;
      discountAmount: number;
    };
  }[];
  archivedMaterials?: {
    order?: number;
    position: string;
    partNumber: string;
    description: string;
    type: string;
    quantity: number;
    status: string;
    approvedBy: string;
    approvedByName: string;
    approvedAt: string;
    approvalRemarks: string;
    price: {
      discount: number;
      suggestedNetPrice: number;
      taxAmount: number;
      unitPrice: number;
      netAmount: number;
      tax: number;
      taxTypes?: [];
      grossAmount: number;
      totalAmount: number;
    };
  }[];
  priceSummary: {
    discount: number;
    grossAmount: number;
    netAmount: number;
    suggestedNetPrice: number;
    taxAmount: number;
    totalAmount: number;
    discountAmount: number;
  };
}
