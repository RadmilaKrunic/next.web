import { Button } from "@bosch/react-frok";
import JobAction from "../JobAction/JobAction";
import { useNavigate } from "react-router-dom";
import { Job } from "../../JobList.types";
import { getOrderReceipt } from "../../../../../api/services/orders/orders";
import { usePostJobStatusStartDiagnostic } from "../../../../../api/services/jobs/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";

export default function JobActionsFlyout({
  job,
  setSelectedJobId,
  setShowDocumentModal,
  setShowMessagesModal,
}: Readonly<{
  job: Job;
  setSelectedJobId: (jobId: string) => void;
  setShowDocumentModal: (show: boolean) => void;
  setShowMessagesModal: (show: boolean) => void;
}>) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const postJobStatusMutation = usePostJobStatusStartDiagnostic({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] }).catch(() => undefined);
      queryClient.invalidateQueries({ queryKey: ["job", job.jobId] }).catch(() => undefined);
    },
    onError: (error) => {
      console.error("Failed to update job status:", error);
    },
  });

  const handleGoToDiagnostics = () => {
    postJobStatusMutation.mutate(
      { jobId: job.jobId },
      {
        onSuccess: () => {
          const navigateResult = navigate(`/job-overview/${job.jobId}#diagnosticData`);
          if (navigateResult instanceof Promise) {
            navigateResult.catch(() => undefined);
          }
        },
      },
    );
  };

  const handlePrintJobReceipt = async () => {
    try {
      const blob = await getOrderReceipt(job.orderId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, "_blank");

        if (newWindow) {
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        } else {
          console.error("Failed to open new window. Popup may have been blocked.");
        }
      } else {
        console.error("Failed to fetch order receipt");
      }
    } catch (error) {
      console.error("Error handling order receipt:", error);
    }
  };

  return (
    <ScrollablePopover
      data-testid={`job-actions-popover-${job.jobId}`}
      className={`job-actions-popover`}
      trigger={
        <Button
          icon={"options"}
          className="job-actions-popover-trigger"
          tabIndex={0}
          aria-label="More job options"
          data-testid={`job-actions-popover-trigger-${job.jobId}`}
        />
      }
    >
      {job.jobStatus === "READY_FOR_DIAGNOSTIC" ? (
        <JobAction
          iconName="user-mechanic"
          jobId={job.jobId}
          jobStatus={job.jobStatus}
          orderId={job.orderId}
          actionName={"startDiagnostics"}
          onClick={handleGoToDiagnostics}
        />
      ) : (
        <JobAction
          iconName="user-mechanic"
          jobId={job.jobId}
          jobStatus={job.jobStatus}
          orderId={job.orderId}
        />
      )}

      {job.jobStatus?.toLowerCase() !== "draft" && (
        <JobAction
          iconName="watch-on"
          actionName={"jobOverview"}
          onClick={() => {
            const navigateResult = navigate(`/job-overview/${job.jobId}`);
            if (navigateResult instanceof Promise) {
              navigateResult.catch(() => undefined);
            }
          }}
          jobId={job.jobId}
        />
      )}
      {job.jobStatus?.toLowerCase() !== "draft" && (
        <JobAction
          iconName="message"
          actionName={"messages"}
          onClick={() => {
            setSelectedJobId(job.jobId);
            setShowMessagesModal(true);
          }}
          jobId={job.jobId}
        />
      )}
      <JobAction
        iconName="document-view"
        actionName={"documents"}
        onClick={() => {
          setSelectedJobId(job.jobId);
          setShowDocumentModal(true);
        }}
        jobId={job.jobId}
      />
      {job?.jobStatus?.toLowerCase() !== "draft" && (
        <JobAction
          iconName="print"
          actionName={"printJobReceipt"}
          onClick={() => {
            handlePrintJobReceipt().catch(() => undefined);
          }}
          jobId={job.jobId}
        />
      )}
    </ScrollablePopover>
  );
}
