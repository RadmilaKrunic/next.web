export interface Customer {
  customerId: string;
  userTitle?: string;
  ascId: string;
  customerType: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  phoneNumber: string;
  mobileNumber: string;
  companyName: string;
  dealershipName: string;
  typeOfIndustry: string;
  boschCustomerNumber: string;
  vatNumber: string;
  communicationMedium: string;
  deliveryAddress: DeliveryAddress;
  billingAddress: BillingAddress;
}

export interface DeliveryAddress {
  street: string;
  houseNumber: string;
  additionalDetails: string | null;
  neighborhood: string | null;
  district: null;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  countryCode: string;
}

export interface BillingAddress {
  street: string;
  houseNumber: string;
  additionalDetails: string | null;
  neighborhood: string | null;
  district: null;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  countryCode: string;
}

export interface Job {
  jobId: null;
  orderId: null;
  ascId: string;
  internalReferenceNumber: string;
  jobStatus: string;
  jobCreationDate: null;
  asset: Asset;
}

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
  jobCreationDate: string;
  hasAccessories: boolean;
  isBareTool: boolean;
  accessories: {
    accessoryName: string;
    quantity: number;
    description: string;
  }[];
  customerWish: {
    customerWish: string;
    warrantyType: string;
    promotionalCode: string;
    costLimit: number;
    whatIfCostLimitExceeded: string;
  };
  attachments: {
    name: string;
    type: string;
    attachmentId: string;
  }[];
}

export interface Order {
  order: {
    orderId: string;
    ascId: string;
    pickupType: string;
    paymentType: string;
    customer: Customer;
  };
  jobs: Job[];
}

export interface BareToolOption {
  applicationScope: string;
  brand: string;
  businessSegment: string;
  businessSegmentId: string;
  country: string;
  description: string;
  group: string;
  groupId: string;
  partNumber: string;
  tradeName: string;
  voltage: string;
  price?: number;
  notBelongsToTool?: boolean;
}

export interface WarrantyCheckRequest {
  brand: string;
  country: string;
  bareToolNumber: string;
  serialNumber: string;
  purchaseDate: string;
}

export interface WarrantyCheckResponse {
  evaluationStatus: "ELIGIBLE" | "INELIGIBLE" | "SKIPPED";
  supportedWarrantyType: "STANDARD_WARRANTY" | "EXTENDED_WARRANTY" | "BOSCH_PRO_SERVICE" | null;
  proServiceType: string | null;
  reasonKey: "UNKNOWN_SERIAL_NUMBER" | "WARRANTY_EXPIRED" | "ALLOWED_REPAIR_COUNT_EXCEEDED" | null;
  validityExpirationDate: string | null;
  allowedWarrantyRepairCount: number | null;
  usedWarrantyRepairCount: number | null;
}

export interface SparePartsSearchRequest {
  bareToolNumber?: string;
  tradeName?: string;
  countryCode?: string;
  languageCode?: string;
  brand?: string;
  size?: number;
  pageNumber?: number;
  isExchange?: boolean;
  bareTool?: string;
  position?: string;
}
