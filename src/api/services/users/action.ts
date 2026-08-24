import axiosClient from "../../axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { AscUser } from "../../../types/user.type";
import { Employee } from "../../../modules/AccountManagement/Employees/EmployeeList/EmployeeList.columns.config";

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
    const response: AxiosResponse<{ content: Employee[] }> = await axiosClient.post<{
      content: Employee[];
    }>(`/v1/users/search?page=0&size=200`, {
      ascId: ascId,
      firstName: null,
      lastName: null,
      email: null,
      type: "ASC",
      permissions: null,
      filterForTechnician: false,
    });
    return response.data.content || [];
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

export const getUserById = async (userId: string): Promise<AscUser> => {
  try {
    const response: AxiosResponse<AscUser> = await axiosClient.get<AscUser>(`/v1/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user with ID ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    await axiosClient.delete(`/v1/users/${userId}`);
  } catch (error) {
    console.error(`Error deleting user with ID ${userId}:`, error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: Partial<AscUser>) => {
  try {
    const response: AxiosResponse<AscUser> = await axiosClient.put<AscUser>(
      `/v1/users/${userId}`,
      userData,
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating user with ID ${userId}:`, error);
    throw error;
  }
};

export const suspendUser = async (userId: string) => {
  try {
    await axiosClient.post(`/v1/users/suspend/${userId}`);
  } catch (error) {
    console.error(`Error suspending user with ID ${userId}:`, error);
    throw error;
  }
};
