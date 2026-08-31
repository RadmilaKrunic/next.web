import axiosClient from "../../axios-client/axiosClient";
import { Customer } from "./customers.types";
import axios, { AxiosResponse } from "axios";

const customersAxiosClient = axios.create({
  ...axiosClient.defaults,
  baseURL: `${axiosClient.defaults.baseURL}/v1/customers`,
});

const searchCustomers = async (
  ascId: string,
  searchParams: Record<string, string>,
  errorMessage: string,
): Promise<Customer[] | null> => {
  try {
    const response: AxiosResponse<Customer[]> = await customersAxiosClient.get<Customer[]>(
      `/search/${ascId}`,
      {
        params: searchParams,
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `${errorMessage} ${(axios.isAxiosError(error) && error.message) || String(error)}`,
    );
  }
};

export const getCustomerByFirstName = async (
  ascId: string,
  firstName: string,
): Promise<Customer[] | null> => {
  return searchCustomers(ascId, { firstName }, "Error fetching customer by first name:");
};

export const getCustomerByLastName = async (
  ascId: string,
  lastName: string,
): Promise<Customer[] | null> => {
  return searchCustomers(ascId, { lastName }, "Error fetching customer by last name:");
};

export const getCustomerByDealershipName = async (
  ascId: string,
  dealershipName: string,
): Promise<Customer[] | null> => {
  return searchCustomers(ascId, { dealershipName }, "Error fetching customer by dealership name:");
};

export const getCustomerByCompanyName = async (
  ascId: string,
  companyName: string,
): Promise<Customer[] | null> => {
  return searchCustomers(ascId, { companyName }, "Error fetching customer by company name:");
};
