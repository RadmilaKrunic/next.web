import { Job } from "@/modules/JobManagement/JobList/JobList.types";

export interface JobsCardProps {
  title?: string;
  jobs?: Job[];
  onViewMore?: () => void;
  viewMoreLabel?: string;
  className?: string;
  actionButton?: {
    icon: string;
    label: string;
    onClick: () => void;
  };
}
