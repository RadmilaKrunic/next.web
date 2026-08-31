import { Dialog } from "@bosch/react-frok";
import { Formik, Form } from "formik";
import GenericField from "../../../../components/generics/Field/GenericField";
import axiosClient from "../../../../api/axios-client/axiosClient";
import { useContext } from "react";
import { MessagesContext } from "../../../../contexts/messagescontext";
import { useTranslation } from "react-i18next";
import "./ClaimListExportDialog.scss";
import { dateRangeField } from "./ClaimListExportDialog.data";
interface ClaimExportFormValues {
  dateRange: string | null;
}

function ClaimListExportDialog({
  setIsExportOpen,
}: {
  readonly setIsExportOpen: (isOpen: boolean) => void;
}) {
  const { setMessages } = useContext(MessagesContext);
  const { t } = useTranslation("translation", { keyPrefix: "app" });

  const exportClaimsCsv = async (
    dateRange: ClaimExportFormValues["dateRange"],
    setFieldError: (field: string, message: string | undefined) => void,
    setFieldTouched: (
      field: string,
      touched?: boolean,
      shouldValidate?: boolean,
    ) => Promise<void | object>,
  ) => {
    const [fromDate = "", toDate = ""] = (dateRange ?? "").split(",");
    if (!fromDate || !toDate) {
      await setFieldTouched("dateRange", true, false);
      setFieldError("dateRange", t("dateRangeNotSet"));
      return;
    }

    setFieldError("dateRange", undefined);

    try {
      const response = await axiosClient.post(
        "/v1/claims/csv-export",
        { fromDate: fromDate.split("T")[0], toDate: toDate.split("T")[0] },
        {
          responseType: "blob",
          timeout: 120000,
          headers: { Accept: "text/csv" },
        },
      );

      const blob = response.data as Blob;

      const filename =
        (response.headers["content-disposition"] as string)
          ?.split("filename=")[1]
          ?.replaceAll('"', "") ?? `claims_${fromDate?.split("T")[0]}-${toDate?.split("T")[0]}.csv`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setMessages((prev) => [...prev, { type: "error", text: t("errorExportClaims") }]);
    } finally {
      setIsExportOpen(false);
    }
  };
  return (
    <Formik<ClaimExportFormValues> initialValues={{ dateRange: null }} onSubmit={() => undefined}>
      {({ values, setFieldError, setFieldTouched }) => (
        <Dialog
          className="claim-list-export-dialog"
          cancelLabel={t("cancel")}
          confirmLabel={t("export")}
          title={t("exportClaims")}
          onCancel={() => setIsExportOpen(false)}
          onClose={() => setIsExportOpen(false)}
          modal
          onConfirm={() => {
            void exportClaimsCsv(values.dateRange, setFieldError, setFieldTouched);
          }}
          open={true}
        >
          <div className="dialog-description">{t("claimExportDescription")}</div>
          <div className="dialog-instruction">
            <b>{t("selectDateRange")}</b>
          </div>
          <Form>
            <GenericField field={dateRangeField} />
          </Form>
        </Dialog>
      )}
    </Formik>
  );
}

export default ClaimListExportDialog;
