import axiosClient from "../../axios-client/axiosClient";
import { JobColumnConfiguration } from "../../../modules/JobManagement/JobList/JobListTable/JobListColumns.config";
import { ClaimColumnConfiguration } from "../../../modules/ClaimManagement/ClaimList/ClaimListTable/ClaimListColumns.config";
import { ConsentData } from "../consent/consent.types";

export interface HeaderUserData {
  email: string;
  type: string;
  ascId: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  countryCode: string;
  language: string;
  locale: string;
  consent?: ConsentData;
  preferences?: {
    jobColumnView?: JobColumnConfiguration[];
    claimColumnView?: ClaimColumnConfiguration[];
  };
}

export const fetchUserDataFromCookie = async (): Promise<HeaderUserData> => {
  try {
    const response = await axiosClient.get<HeaderUserData>(`/v1/auth/me`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

export const updateUserLanguagePreference = async (payload: {
  language: string;
  locale: string;
}): Promise<void> => {
  try {
    await axiosClient.post(`/v1/profile`, payload);
  } catch (error) {
    console.error("Error updating user language preference:", error);
    throw error;
  }
};
