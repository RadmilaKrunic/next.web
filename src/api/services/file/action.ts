import axios from "axios";
import axiosClient from "../../axios-client/axiosClient";

const filesAxiosClient = axios.create({
  ...axiosClient.defaults,
  baseURL: `${axiosClient.defaults.baseURL}/v1/files`,
  timeout: 120000,
});

export interface UploadResponse {
  attachments: {
    id: string;
    filename: string;
    type: string;
    createdAt: string;
  }[];
}

export async function uploadFileToServer(files: File[], types: string[]): Promise<UploadResponse> {
  try {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await filesAxiosClient.post<UploadResponse>(
      `/upload?source=Orders&types=${types.join(",")}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );

    return response.data;
  } catch (error) {
    console.error("Error uploading files:", error);
    throw error;
  }
}

export async function deleteFileFromServer(fileId: string): Promise<void> {
  try {
    await filesAxiosClient.delete(`/${fileId}`);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

export async function downloadFileFromServer(
  fileId: string,
  fileType: string,
): Promise<Blob | null> {
  try {
    const response = await filesAxiosClient.post(
      "/download",
      { fileId, fileType },
      {
        responseType: "blob",
        headers: {
          Accept: "application/octet-stream",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error downloading file:", error);
    return null;
  }
}
