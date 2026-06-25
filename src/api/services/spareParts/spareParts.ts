import axiosClient from "../../axios-client/axiosClient";
import { AxiosResponse } from "axios";
import { SparePartIllustration } from "../../../modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawing.types";

export interface ExplosionDrawingParams {
  countryCode: string;
  languageCode: string;
  brand: string;
  illustrationPage: number;
  illustrationType?: string;
}

export const getExplosionDrawing = async (
  partNumber: string,
  params: ExplosionDrawingParams,
): Promise<SparePartIllustration | null> => {
  try {
    const response: AxiosResponse<SparePartIllustration> =
      await axiosClient.get<SparePartIllustration>(`/v1/spare-parts/explosion-data/${partNumber}`, {
        params,
      });

    const data = response.data;
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

    // Normalize ImagePath: prefix relative paths with the API base URL
    if (data?.illustrationList) {
      data.illustrationList = data.illustrationList.map((item) => ({
        ...item,
        ImagePath: item.ImagePath,
      }));

      data.illustrationList = data.illustrationList.map((item) => {
        if (!item.ImagePath || item.ImagePath.startsWith("http")) {
          return item;
        }

        const pathPrefix = item.ImagePath.startsWith("/") ? "" : "/";
        return {
          ...item,
          ImagePath: `${baseUrl}${pathPrefix}${item.ImagePath}`,
        };
      });
    }

    return data;
  } catch (error) {
    console.error("Error fetching explosion drawing:", error);
    throw error;
  }
};
