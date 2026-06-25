import axiosClient from "../../axios-client/axiosClient";
import { NavBar } from "components/layout/SideNav/NavItem/NavItem.types";

export const fetchSideNavItems = async (): Promise<NavBar> => {
  try {
    const response = await axiosClient.get<NavBar>("/v1/users/me/navigation");
    return response.data;
  } catch (error) {
    console.error("Error fetching side navigation items:", error);
    throw error;
  }
};
