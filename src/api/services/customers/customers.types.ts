export interface Customer {
  customerId: string;
  customerTitle: string;
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
  deliveryAddress: Address;
  billingAddress: Address;
  useBillingAddressForDelivery: boolean;
  // Not returned by the current API response. Populate when the backend/data model supports it.
  assetsCount?: number;
  status?: string;
  isActive?: boolean;
  createdOn?: string;
}

export interface CustomerJob {
  jobId: string;
  orderId: string;
  serialNumber: string;
  assetName: string;
  createdOn: string;
  updatedOn: string;
  assigneeName: string;
  status: string;
}

export interface CustomerJobsQuery {
  searchTerm?: string;
  page?: number;
  size?: number;
}

export interface CustomerJobsResponse {
  page: {
    number: number;
    totalElements: number;
    totalPages: number;
    size: number;
  };
  content: CustomerJob[];
}

export interface CustomerOrder {
  orderId: string;
  assets: number;
  createdOn: string;
  updatedOn: string;
}

export interface CustomerOrdersQuery {
  searchTerm?: string;
  page?: number;
  size?: number;
}

export interface CustomerOrdersResponse {
  page: {
    number: number;
    totalElements: number;
    totalPages: number;
    size: number;
  };
  content: CustomerOrder[];
}

export interface Address {
  street: string;
  houseNumber: string;
  additionalDetails: string;
  neighborhood: string;
  district: string;
  city: string;
  stateProvinceRegion: string;
  postalCode: string;
  countryCode: string;
}
