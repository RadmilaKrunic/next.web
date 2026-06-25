import axiosClient from "../../axios-client/axiosClient";
import { Order, BareToolOption } from "./orders.types";
import axios, { AxiosResponse } from "axios";

const ordersAxiosClient = axios.create({
  ...axiosClient.defaults,
  baseURL: `${axiosClient.defaults.baseURL}/v1/orders`,
  timeout: 30000,
});

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const response: AxiosResponse<Order> = await ordersAxiosClient.get<Order>(`/${orderId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
};

export const createOrder = async (isDraft: boolean, order: Order): Promise<Order | null> => {
  try {
    const response: AxiosResponse<Order> = await ordersAxiosClient.post<
      Order,
      AxiosResponse<Order>
    >("", order, {
      params: { isDraft },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error);
    return null;
  }
};

export const getManufacturedDate = async (serialNo: string): Promise<string | null> => {
  try {
    const response: AxiosResponse<{ manufactureDate: string }> = await ordersAxiosClient.get<{
      manufactureDate: string;
    }>(`${import.meta.env.VITE_API_BASE_URL}/v1/manufacture-date?serialNo=${serialNo}`);
    return response.data.manufactureDate;
  } catch (error) {
    console.error("Error fetching manufactured date:", error);
    return null;
  }
};

export const getOrderReceipt = async (orderId: string): Promise<Blob | null> => {
  try {
    const response: AxiosResponse<Blob> = await ordersAxiosClient.get<Blob>(
      `/${orderId}/order-receipt`,
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching order receipt:", error);
    return null;
  }
};

export const getSparePartsSearch = async (
  bareToolNumber: string,
  tradeName: string,
  countryCode?: string,
  languageCode?: string,
  brand?: string,
  size: number = 20,
  pageNumber: number = 1,
  isExchange?: boolean,
  bareTool?: string,
  position?: string,
): Promise<BareToolOption[] | null> => {
  try {
    const params: Record<string, string | number | boolean> = {
      sku: bareToolNumber,
      tradeName,
      size,
      pageNumber,
    };
    if (countryCode) params.countryCode = countryCode.toLocaleLowerCase();
    if (languageCode) params.languageCode = languageCode;
    if (brand) params.brand = brand;
    if (isExchange !== undefined) params.isExchange = isExchange;
    if (bareTool) params.bareTool = bareTool;
    if (position) params.position = position;

    const response: AxiosResponse<BareToolOption[]> = await ordersAxiosClient.get<BareToolOption[]>(
      `${import.meta.env.VITE_API_BASE_URL}/v1/spare-parts/search`,
      { params },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching spare parts:", error);
    return null;
  }
};
