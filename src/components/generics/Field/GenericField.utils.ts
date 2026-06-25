import { FormikContextType, FormikErrors } from "formik";
import { TFunction } from "i18next";
import { getManufacturedDate } from "../../../api/services/orders/orders";
import Field from "./GenericField.types";

export const getSerialNumberErrorKey = (
  value: string,
  brandValue: unknown,
): "serialNumberMustHave" | "dremelSerialNumberMustHave" | null => {
  if (
    (value.length < 9 && value.length !== 3 && value !== "999") ||
    value.length === 10 ||
    value.length === 11
  ) {
    return brandValue === "DREMEL" ? "dremelSerialNumberMustHave" : "serialNumberMustHave";
  }
  return null;
};

export const updateDependentFields = (
  field: Field,
  formikContext: FormikContextType<Record<string, unknown>>,
  allFields: Field[],
  t: TFunction<"translation", "app">,
  value: string,
): true | void => {
  const { setFieldValue, setFieldError, setFieldTouched, values } = formikContext;
  switch (field?.fieldMapping?.originalName) {
    case "serialNumber":
      {
        const manufacturedDateName = field.name.replace("serialNumber", "manufacturedDate");
        if (values[manufacturedDateName]) {
          void setFieldValue(manufacturedDateName, "");
        }
        const manufacturedDateField = allFields.find((f) => f.name === manufacturedDateName);
        const strippedValue = value.replaceAll(/[^a-zA-Z0-9]/g, "");
        const strippedLength = strippedValue.length;
        const brandKey = field.name.split("_serialNumber")[0] + "_brand";
        const brandValue = values[brandKey];

        if (
          strippedLength === 9 ||
          (strippedLength === 3 && strippedValue === "999") ||
          (strippedLength === 3 && brandValue === "DREMEL") ||
          strippedLength === 12 ||
          strippedLength === 13 ||
          strippedLength === 14
        ) {
          void (async () => {
            try {
              const manufacturedDate = await getManufacturedDate(value);
              if (
                manufacturedDate &&
                typeof manufacturedDate === "string" &&
                manufacturedDate.length === 6
              ) {
                const year = Number(manufacturedDate.slice(0, 4));
                const month = Number(manufacturedDate.slice(4, 6));
                if (manufacturedDateField?.name) {
                  void setFieldValue(manufacturedDateField.name, `${month}/${year}`);
                }
              } else if (
                manufacturedDate &&
                typeof manufacturedDate === "string" &&
                manufacturedDate.length === 3
              ) {
                if (manufacturedDateField?.name) {
                  void setFieldValue(manufacturedDateField.name, manufacturedDate);
                }
              } else {
                setFieldError(field.name, t("toolNotFound", { id: value }));
                await setFieldTouched(field.name, true, false);
              }
            } catch {
              setFieldError(field.name, t("toolNotFound", { id: value }));
              await setFieldTouched(field.name, true, false);
              const manufacturedDateLabel = manufacturedDateField?.label
                ? t(manufacturedDateField.label)
                : t("manufacturedDate");
              setFieldError(manufacturedDateName, `${manufacturedDateLabel} ${t("isRequired")}`);
              await setFieldTouched(manufacturedDateName, true, false);
            }
          })();
        }

        if (strippedLength > 14) {
          return true;
        }
      }
      break;
    case "brand":
      {
        const manufacturedDateName = field.name.replace("brand", "manufacturedDate");
        const serialNumberName = field.name.replace("brand", "serialNumber");
        void setFieldValue(manufacturedDateName ?? "", "");
        void setFieldValue(serialNumberName ?? "", "");
      }
      break;
    default:
      break;
  }
};

export const onBlurActions = (
  field: Field,
  e: React.FocusEvent<HTMLInputElement>,
  formikContext: FormikContextType<Record<string, unknown>>,
  t: TFunction<"translation", "app">,
): void => {
  const { setFieldError, setFieldTouched, values } = formikContext;
  if (field?.fieldMapping?.originalName === "serialNumber") {
    const brandKey = field.name.split("_serialNumber")[0] + "_brand";
    const brandValue = values[brandKey];
    const serialErrorKey = getSerialNumberErrorKey(e.target.value, brandValue);
    if (serialErrorKey) {
      void setFieldTouched(field.name, true, false);
      setFieldError(field.name, t(serialErrorKey));
    }
  }
};

/**
 * Handles populating related fields when a fault code is selected from the dropdown.
 * Sets faultCode, faultCodeDescription, faultCodeLabourQuantity from the raw API item,
 * and updates the quantity on any spare parts row whose position is "LA".
 */
export const handleFaultCodeSelection = (
  rawItem: Record<string, unknown>,
  setFieldValue: (field: string, value: unknown) => Promise<void | FormikErrors<unknown>>,
  allFields: Field[] | null,
  formValues: Record<string, unknown>,
): void => {
  if (!allFields) return;

  const faultCodeNameList = ["faultCode", "faultCodeDescription", "faultCodeLabourQuantity"];

  for (const fieldName of faultCodeNameList) {
    void setFieldValue(fieldName, rawItem?.[fieldName]);
  }

  const labourQty = Number(rawItem?.faultCodeLabourQuantity) || 0;
  const labourPosition = allFields.find(
    (f) => f.subtype === "diagnosticPosition" && formValues[f.name] === "LA",
  );
  if (!labourPosition) return;

  const labourRow = allFields.filter(
    (qf) => qf.fieldMapping?.nameStartsWith === labourPosition.fieldMapping?.nameStartsWith,
  );

  const qtyField = labourRow.find((f) => f.subtype === "diagnosticQuantity");
  if (qtyField) {
    void setFieldValue(qtyField.name, labourQty);
  }
};

export const resolveIsRequired = (
  field: Field,
  values: Record<string, unknown>,
): boolean | undefined => {
  const dep = field.requiredDependentFields;
  if (!dep || (!dep.byValueOr?.length && !dep.byValueAnd?.length)) {
    return field.isRequired;
  }
  const andMet = dep.byValueAnd?.length
    ? dep.byValueAnd.every((el) => values[el.fieldName] === el.fieldValue)
    : false;
  const orMet = dep.byValueOr?.length
    ? dep.byValueOr.some((el) => values[el.fieldName] === el.fieldValue)
    : false;
  return andMet || orMet;
};
