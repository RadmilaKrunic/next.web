import { useEffect, useRef } from "react";
import { Chip, Icon, Button } from "@bosch/react-frok";
import { Form, Formik, useFormikContext } from "formik";
import type { TFunction } from "i18next";
import DatePicker from "components/ui/DatePicker/DatePicker";
import { ScrollablePopover } from "components/ui/ScrollablePopover/ScrollablePopover";
import { QuickFilter } from "components/ui/List/List.types";
import { DateFilterValues, getDateRangeCalendarConfigs } from "./ReimbursementDateFilter.utils";

export function DateChangeObserver({
  onDateChange,
}: {
  onDateChange: (values: DateFilterValues) => void;
}) {
  const { values, setFieldValue } = useFormikContext<DateFilterValues>();
  const prevValuesRef = useRef<DateFilterValues | null>(null);

  useEffect(() => {
    if (!values.fromDate || !values.toDate) return;

    // Auto-correct toDate if fromDate > toDate
    const fromDate = new Date(values.fromDate);
    const toDate = new Date(values.toDate);
    if (fromDate > toDate) {
      setFieldValue("toDate", values.fromDate);
      return;
    }

    const valuesChanged =
      prevValuesRef.current?.fromDate !== values.fromDate ||
      prevValuesRef.current?.toDate !== values.toDate;

    if (valuesChanged) {
      onDateChange(values);
      prevValuesRef.current = values;
    }
  }, [values, onDateChange, setFieldValue]);

  return null;
}

export function DateRangeFilterForm({
  dateValues,
  onDateChange,
  t,
}: Readonly<{
  dateValues: DateFilterValues;
  onDateChange: (values: DateFilterValues) => void;
  t: TFunction;
}>) {
  const { fromCalendarConfig, toCalendarConfig } = getDateRangeCalendarConfigs();

  return (
    <Formik<DateFilterValues> initialValues={dateValues} onSubmit={() => {}} enableReinitialize>
      {({ values }) => (
        <div className="inline-date-filter">
          <Form>
            <DateChangeObserver onDateChange={onDateChange} />
            <DatePicker name="fromDate" label={t("fromDate")} calendar={fromCalendarConfig} />
            <DatePicker
              name="toDate"
              label={t("toDate")}
              calendar={{ ...toCalendarConfig, minDate: values.fromDate ?? "" }}
            />
          </Form>
        </div>
      )}
    </Formik>
  );
}

export function QuickFilterChips({
  quickFilters,
  onToggle,
  t,
}: Readonly<{
  quickFilters: QuickFilter[];
  onToggle: (key: string) => void;
  t: TFunction;
}>) {
  return (
    <div className="quick-filters">
      {quickFilters.map((quickFilter: QuickFilter) => (
        <Chip
          key={quickFilter.key}
          chipLabelId={quickFilter.key}
          label={t(quickFilter.label)}
          selected={!!quickFilter.selected}
          tabIndex={0}
          onClick={() => onToggle(quickFilter.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(quickFilter.key);
            }
          }}
        />
      ))}
    </div>
  );
}

export function ReimbursementReceiptAction({
  reimbursementId,
  iconName,
  t,
  onGenerateReceipt,
}: Readonly<{
  reimbursementId: string;
  iconName: string;
  t: TFunction;
  onGenerateReceipt: (reimbursementId: string, receiptWindow: Window | null) => void;
}>) {
  return (
    <ScrollablePopover
      data-testid={`reimbursement-actions-popover-${reimbursementId}`}
      trigger={
        <Button
          icon={"options"}
          className="actions-popover-trigger"
          tabIndex={0}
          aria-label="More reimbursement options"
          data-testid={`reimbursement-actions-popover-trigger-${reimbursementId}`}
        />
      }
      className="actions-popover"
    >
      <button
        type="button"
        className="reimbursement-action-button"
        data-testid="reimbursement-receipt-action"
        onClick={() => {
          const receiptWindow = window.open("", "_blank");
          onGenerateReceipt(reimbursementId, receiptWindow);
        }}
      >
        <Icon iconName={iconName} aria-hidden="true" />
        <span>{t("createReceipt")}</span>
      </button>
    </ScrollablePopover>
  );
}
