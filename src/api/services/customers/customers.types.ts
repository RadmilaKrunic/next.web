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

export interface UpdateCustomerRequest {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  communicationMedium?: unknown;
  type?: string;
  ascId?: string;
  language?: string;
  locale?: string;
  clientId?: string;
  billingAddress?: Partial<Address>;
}
