export interface User {
  email: string;
  type: string;
  ascId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  countryCode: string | null;
}

export interface AscUser {
  userId: string;
  type: string;
  ascId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  boschId: string;
  language: string | null;
  isActive: boolean;
  accountRoles: string[];
  permissions: string[];
  jobListColumnPreference: string[];
  accountableCountries: string | null;
  accountableRegions: string | null;
  employeeCode: string | null;
  serviceId: string | null;
}
