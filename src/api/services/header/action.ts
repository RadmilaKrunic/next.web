import axiosClient from "../../axios-client/axiosClient";
import { JobColumnConfiguration } from "../../../modules/JobManagement/JobList/JobListTable/JobListColumns.config";

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
  preferences?: {
    jobColumnView?: JobColumnConfiguration[];
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

export const updateUserLanguagePreference = async (language: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/profile`, { language });
  } catch (error) {
    console.error("Error updating user language preference:", error);
    throw error;
  }
};
