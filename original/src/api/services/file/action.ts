import axios from "axios";
import axiosClient from "../../axios-client/axiosClient";

const filesAxiosClient = axios.create({
  ...axiosClient.defaults,
  baseURL: `${axiosClient.defaults.baseURL}/v1/files`,
  timeout: 120000,
});

export interface FileResponse {
  id: string;
  filename: string;
  type: string;
  createdAt: string;
}

export interface AttachmentsUploadResponse {
  attachments: FileResponse[];
}

export async function uploadFileToServer(
  files: File[],
  types: string[],
): Promise<AttachmentsUploadResponse | FileResponse> {
  try {
    const formData = new FormData();
    let endpoint;
    if (files.length === 1 && !types[0]) {
      endpoint = "/static/upload";
      formData.append("file", files[0]);
    } else {
      files.forEach((file) => {
        formData.append("files", file);
      });
      endpoint = `/upload?source=Orders&types=${types.join(",")}`;
    }

    const response = await filesAxiosClient.post<AttachmentsUploadResponse | FileResponse>(
      endpoint,
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
  sourceReferenceId: string | null = null,
): Promise<Blob | null> {
  try {
    const response = await filesAxiosClient.post(
      "/download",
      { fileId, fileType, sourceReferenceId },
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
