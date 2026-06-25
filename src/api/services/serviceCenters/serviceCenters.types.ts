export interface ServiceCenterName {
  ascId: string;
  name: string;
}

export interface ServiceCenterNamesResponse {
  serviceCenterNames: ServiceCenterName[];
}
