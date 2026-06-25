import axiosClient from "api/axios-client/axiosClient";
import {
  Job,
  JobDiagnostic,
  JobList,
  JobOverviewItem,
  Message,
} from "modules/JobManagement/JobList/JobList.types";
import { JobColumnConfiguration } from "modules/JobManagement/JobList/JobListTable/JobListColumns.config";
import { AxiosResponse } from "axios";
import { Attachment } from "components/ui/DocumentsModal/DocumentsModal";
import { SpecialMaterial } from "modules/JobManagement/JobOverview/AddSpecialMaterialModal/SpecialMeterialItem/SpecialMaterialItem";

export const fetchJobs = async (): Promise<Job[]> => {
  try {
    const response: AxiosResponse<JobList> = await axiosClient.get<JobList>("/v1/jobs");
    return response.data.jobs || [];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const fetchJobById = async (jobId: string): Promise<JobOverviewItem> => {
  try {
    const response: AxiosResponse<JobOverviewItem> = await axiosClient.get<JobOverviewItem>(
      `/v1/jobs/${jobId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    throw error;
  }
};

export const fetchMessages = async (jobId: string, limit?: number): Promise<Message[]> => {
  try {
    const response: AxiosResponse<Message[]> = await axiosClient.get<Message[]>(
      `/v1/messages/${jobId}`,
      {
        params: {
          limit,
        },
      },
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const fetchJobMessages = async (jobId: string, limit?: number): Promise<Message[]> => {
  try {
    const response: AxiosResponse<Message[]> = await axiosClient.get<Message[]>(
      `/v1/messages/job/${jobId}`,
      {
        params: {
          limit,
        },
      },
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching job messages:", error);
    throw error;
  }
};

export const postMessage = async (messageData: {
  jobId: string;
  claimId?: string | null;
  messageId: null;
  messageType: string;
  decision: null;
  message: string;
}): Promise<Message> => {
  try {
    const response: AxiosResponse<Message> = await axiosClient.post<Message>(
      `/v1/messages`,
      messageData,
    );
    return response.data;
  } catch (error) {
    console.error("Error posting message:", error);
    throw error;
  }
};

export const saveJobListColumns = async (columns: JobColumnConfiguration[]): Promise<void> => {
  try {
    const selectedColumnKeys = columns.filter((col) => col.isChecked).map((col) => col.key);
    await axiosClient.post(`/v1/profile/preferences/job`, selectedColumnKeys);
  } catch (error) {
    console.error("Error saving job list columns:", error);
    throw error;
  }
};

export const deleteJobAttachment = async (
  jobId: string,
  attachmentId: string,
): Promise<Attachment[]> => {
  try {
    const response = await axiosClient.delete(`/v1/jobs/${jobId}/attachments/${attachmentId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting attachment ${attachmentId} from job ${jobId}:`, error);
    throw error;
  }
};

export const updateJobAssignee = async (
  jobId: string,
  assigneeId: string,
  assigneeName: string,
): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/assignee`, {
      assigneeId,
      assigneeName,
    });
  } catch (error) {
    console.error(`Error updating assignee for job ${jobId}:`, error);
    throw error;
  }
};

export const patchJobByJobId = async (jobId: string, data: Partial<Job>): Promise<void> => {
  try {
    await axiosClient.patch(`/v1/jobs/${jobId}`, data);
  } catch (error) {
    console.error(`Error patching job ${jobId}:`, error);
    throw error;
  }
};

export const fetchDiagnosticByJobId = async (jobId: string): Promise<JobDiagnostic> => {
  try {
    const response: AxiosResponse<JobDiagnostic> = await axiosClient.get<JobDiagnostic>(
      `/v1/diagnostic/${jobId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    throw error;
  }
};

export const postJobStatus = async (jobId: string, jobStatus: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/status`, { jobStatus });
  } catch (error) {
    console.error(`Error posting status for job ${jobId}:`, error);
    throw error;
  }
};

export const fetchSpecialMaterials = async (countryCode: string): Promise<SpecialMaterial[]> => {
  try {
    const response = await axiosClient.get<SpecialMaterial[]>("/v1/special-materials", {
      params: { countryCode },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching special materials:", error);
    throw error;
  }
};

export const postCustomerData = async (
  orderId: string,
  data: Record<string, any>,
): Promise<void> => {
  try {
    await axiosClient.post(`/v1/orders/${orderId}/customer-snapshot`, data);
  } catch (error) {
    console.error(`Error posting customer data for order ${orderId}:`, error);
    throw error;
  }
};

export const postJobStatusStartDiagnostic = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/start-diagnostics`);
  } catch (error) {
    console.error(`Error starting diagnostic for job ${jobId}:`, error);
    throw error;
  }
};

export const postRepairApproval = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/repair-approval`);
  } catch (error) {
    console.error(`Error posting repair approval for job ${jobId}:`, error);
    throw error;
  }
};

export const postInternalApprovalRequest = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/bosch-approval-request`);
  } catch (error) {
    console.error(`Error posting internal approval request for job ${jobId}:`, error);
    throw error;
  }
};

export const postStartReview = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/start-review`);
  } catch (error) {
    console.error(`Error posting start review for job ${jobId}:`, error);
    throw error;
  }
};

export const postStartRepair = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/start-repair`);
  } catch (error) {
    console.error(`Error posting start repair for job ${jobId}:`, error);
    throw error;
  }
};

export const postFinishRepair = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/finish-repair`);
  } catch (error) {
    console.error(`Error posting finish repair for job ${jobId}:`, error);
    throw error;
  }
};

export const postToolDelivered = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/delivered`);
  } catch (error) {
    console.error(`Error posting tool delivered for job ${jobId}:`, error);
    throw error;
  }
};

export const postCreateCostEstimate = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/create-cost-estimate`);
  } catch (error) {
    console.error(`Error creating cost estimate for job ${jobId}:`, error);
    throw error;
  }
};

export const getCostEstimationPdf = async (jobId: string): Promise<Blob | null> => {
  try {
    const response: AxiosResponse<Blob> = await axiosClient.get<Blob>(
      `/v1/pdf/cost-estimation/${jobId}`,
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching cost estimation PDF for job ${jobId}:`, error);
    return null;
  }
};

export const postCustomerAnswer = async (jobId: string, answer: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/customer-answer`, { jobId, answer });
  } catch (error) {
    console.error(`Error posting customer answer for job ${jobId}:`, error);
    throw error;
  }
};

export const postToggleJobHold = async (jobId: string): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/toggle-hold`);
  } catch (error) {
    console.error(`Error toggling hold for job ${jobId}:`, error);
    throw error;
  }
};

export interface ValidateAndSaveResponse {
  errorMessages: Record<string, string>[];
  diagnostic?: JobDiagnostic;
  materials?: JobDiagnostic["materials"];
  archivedMaterials?: JobDiagnostic["archivedMaterials"];
  actionType?: string;
  jobType?: string;
  exchangeReason?: string;
  status?: string;
  typeOfUsage?: string;
  faultCode?: string;
  faultCodeDescription?: string;
  faultCodeLabourQuantity?: number;
  technicianNote?: string;
  priceSummary?: {
    discount: number;
    grossAmount: number;
    netAmount: number;
    suggestedNetPrice: number;
    taxAmount: number;
    totalAmount: number;
    discountAmount?: number;
  };
}

export const postValidateAndSave = async (
  jobId: string,
  payload: Record<string, unknown>,
): Promise<ValidateAndSaveResponse> => {
  try {
    const response = await axiosClient.post(`/v1/jobs/flow/validate-and-save`, {
      jobId,
      ...payload,
    });
    return response.data;
  } catch (error) {
    console.error(`Error validating and saving job ${jobId}:`, error);
    throw error;
  }
};

export const postDiagnostic = async (
  jobId: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  try {
    await axiosClient.post(`/v1/diagnostic`, {
      jobId,
      ...payload,
    });
  } catch (error) {
    console.error(`Error posting diagnostic for job ${jobId}:`, error);
    throw error;
  }
};

export const updateJobAttachments = async (
  jobId: string,
  attachments: Attachment[],
): Promise<void> => {
  try {
    await axiosClient.put(`/v1/jobs/${jobId}/attachments`, { attachments });
  } catch (error) {
    console.error(`Error updating attachments for job ${jobId}:`, error);
    throw error;
  }
};
