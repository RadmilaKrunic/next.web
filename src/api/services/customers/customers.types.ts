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
