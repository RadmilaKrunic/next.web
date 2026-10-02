import { PaginationPage } from "components/ui/Pagination/Pagination";

export interface ClientManagementCustomer {
  customerId: string;
  customerType: string;
  name: string;
  primaryEmail: string;
  phoneNumber: string;
  assetCount: number;
}

export interface ClientManagementCustomersRequest {
  ascId: string;
  searchTerm?: string;
  customerTypes?: string[];
}

export interface ClientManagementCustomersResponse {
  content: ClientManagementCustomer[];
  page: PaginationPage;
}
