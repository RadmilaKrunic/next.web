import { useCallback, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Formik, Form, useFormikContext } from "formik";
import { Button, ActivityIndicator, Notification } from "@bosch/react-frok";
import { useBreadcrumbs } from "../../../hooks/useBreadcrumbs";
import DatePicker from "../../../components/ui/DatePicker/DatePicker";
import axiosClient from "../../../api/axios-client/axiosClient";
import { format } from "date-fns";
import "./BiqicReport.scss";
import { MessagesContext } from "../../../contexts/messagescontext";

interface BiqicReportFormValues {
  fromDate: string | null;
  toDate: string | null;
}

const baseCalendarConfig = {
  maxDate: "",
  minDate: "",
  defaultDate: "",
  startYear: 2000,
  endYear: 2035,
  startMonth: 1,
  endMonth: 12,
  useDateInput: true,
  useDatePicker: true,
  dateFormat: "dd.MM.yyyy",
  allowDateRange: false,
  setDefaultToday: false,
};

function DateChangeObserver({ onDateChange }: { onDateChange: () => void }) {
  const { values } = useFormikContext<BiqicReportFormValues>();

  useEffect(() => {
    onDateChange();
  }, [values.fromDate, values.toDate, onDateChange]);

  return null;
}
function BiqicReport() {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const { setMessages } = useContext(MessagesContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromCalendarConfig = {
    ...baseCalendarConfig,
    startOfTheDay: true,
    endOfTheDay: false,
  };
  const toCalendarConfig = {
    ...baseCalendarConfig,
    startOfTheDay: false,
    endOfTheDay: true,
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useBreadcrumbs([
    { label: t("reports"), href: "/reports" },
    { label: t("biqic"), href: "/reports/biqic-report" },
  ]);

  const handleGenerateReport = async (
    values: BiqicReportFormValues,
    { resetForm }: { resetForm: () => void },
  ) => {
    if (!values.fromDate || !values.toDate) {
      setError(t("biqicSelectDatesError"));
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const fromDate = format(new Date(values.fromDate), "yyyy-MM-dd");
      const toDate = format(new Date(values.toDate), "yyyy-MM-dd");

      const response = await axiosClient.post("/v1/biqic/export", null, {
        params: { fromDate, toDate },
        responseType: "blob",
        timeout: 120000,
        headers: { Accept: "application/octet-stream" },
      });

      const contentType = response.headers["content-type"] as string;
      const contentLength = response.headers["content-length"];

      if (contentType?.includes("application/json")) {
        const text = await (response.data as Blob).text();
        throw new Error(text || "Unexpected error from server.");
      }

      if (contentLength === "0" || (response.data as Blob).size === 0) {
        setError(t("biqicNoClaimsError"));
        return;
      }

      const blob = response.data as Blob;

      const filename =
        (response.headers["content-disposition"] as string)
          ?.split("filename=")[1]
          ?.replaceAll('"', "") ?? `biqic-report-${fromDate}-${toDate}`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10000);

      resetForm();
      setMessages((prev) => [
        ...prev,
        { text: t("biqicReportSuccess"), type: "success", duration: 5000 },
      ]);
    } catch {
      setError(t("biqicReportError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="biqic-report">
      <Formik<BiqicReportFormValues>
        initialValues={{ fromDate: null, toDate: null }}
        onSubmit={handleGenerateReport}
      >
        {({ values }) => (
          <Form>
            <DateChangeObserver onDateChange={clearError} />
            {error && (
              <div className="biqic-report__notification">
                <Notification
                  type="error"
                  variant="banner"
                  open
                  onCloseClick={() => setError(null)}
                >
                  {error}
                </Notification>
              </div>
            )}
            <div className="biqic-report__section">
              <h3 className="biqic-report__section-title">{t("biqicReportTitle")}</h3>
              <div className="biqic-report__fields">
                <DatePicker name="fromDate" label={t("fromDate")} calendar={fromCalendarConfig} />
                <DatePicker
                  name="toDate"
                  label={t("toDate")}
                  calendar={{ ...toCalendarConfig, minDate: values.fromDate ?? "" }}
                />
              </div>
            </div>
            <div className="biqic-report__actions">
              <Button type="submit" mode="primary" disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" /> : t("biqicButtonLabel")}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}

export default BiqicReport;
