export interface JobActionConfig {
  link: string;
  name: string;
  show: boolean;
  icon: string;
}

export const JOB_ACTION_CONFIG: {
  [key: string]: Omit<JobActionConfig, "link"> & {
    link: (jobId: string, orderId?: string) => string;
  };
} = {
  DRAFT: {
    link: (orderId: string) => `/edit-order/${orderId}`,
    name: "createJob",
    show: true,
    icon: "document-add",
  },
  WAITING_FOR_TOOL: {
    link: (jobId: string) => `/job-overview/${jobId}`,
    name: "confirmToolReceived",
    show: true,
    icon: "drill-driver-cordless-check",
  },
  WAITING_FOR_APPROVAL: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  DELIVERED: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  IN_DIAGNOSTICS: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  REPAIR_DONE: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  IN_REPAIR: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  READY_FOR_REPAIR: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  BOSCH_APPROVAL_PENDING: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  CUSTOMER_APPROVAL_PENDING: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  MULTIPLE_APPROVAL_PENDING: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  REJECTED: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  REVISED: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  EXCHANGE: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  SCRAP_TOOL: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  RETURN_UNASSEMBLY: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
  RETURN_ASSEMBLY: {
    link: (jobId: string) => `/job-overview/${jobId}#diagnosticData`,
    name: "goToDiagnostics",
    show: true,
    icon: "user-mechanic",
  },
};

export function getJobActionConfig(
  jobStatus: string,
  jobId: string,
  orderId?: string,
): JobActionConfig | null {
  const configTemplate = JOB_ACTION_CONFIG[jobStatus];

  if (!configTemplate) return null;

  const linkParam = jobStatus === "DRAFT" ? (orderId ?? jobId) : jobId;

  return {
    link: configTemplate.link(linkParam),
    name: configTemplate.name,
    show: configTemplate.show,
    icon: configTemplate.icon,
  };
}
