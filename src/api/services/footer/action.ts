import axiosClient from "../../axios-client/axiosClient";

export interface FooterData {
  links: FooterLink[];
}

export interface FooterLink {
  name: string;
  value: string;
}

export const fetchFooterData = async () => {
  try {
    const response = await axiosClient.get<FooterData>("/v1/footer");
    return response.data;
  } catch (error) {
    console.error("Error fetching footer data:", error);
    throw error;
  }
};
