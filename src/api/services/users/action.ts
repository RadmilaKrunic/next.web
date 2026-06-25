import axiosClient from "../../axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { AscUser } from "../../../types/user.type";
import { Employee } from "../../../modules/AccountManagement/EmployeeList/EmployeeList.columns.config";

export const fetchUsersByAscId = async (ascId: string): Promise<AscUser[]> => {
  try {
    const response: AxiosResponse<AscUser[]> = await axiosClient.get<AscUser[]>(
      `/v1/users/asc/${ascId}/technicians`,
    );
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching users for ascId ${ascId}:`, error);
    throw error;
  }
};

export const searchUsers = async (ascId: string): Promise<Employee[]> => {
  try {
    const response: AxiosResponse<Employee[]> = await axiosClient.post<Employee[]>(
      `/v1/users/search`,
      {
        ascId: ascId,
        firstName: null,
        lastName: null,
        email: null,
        type: "ASC",
        permissions: null,
        filterForTechnician: false,
      },
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const createUser = async (userData: Partial<AscUser>) => {
  try {
    const response: AxiosResponse<AscUser> = await axiosClient.post<AscUser>(`/v1/users`, userData);
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};
