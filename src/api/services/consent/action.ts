import axiosClient from "../../axios-client/axiosClient";
import { ConsentAcceptPayload } from "./consent.types";

export const postConsentAccept = async (payload: ConsentAcceptPayload): Promise<void> => {
  try {
    await axiosClient.put("/v1/users/consent/accept", payload);
  } catch (error) {
    console.error("Error accepting consent:", error);
    throw error;
  }
};
