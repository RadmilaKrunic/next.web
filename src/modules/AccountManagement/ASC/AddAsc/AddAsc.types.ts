import { FormikErrors } from "formik";

export type SetErrorsType = (errors: FormikErrors<Record<string, unknown>>) => void;
export type SetTouchedType = (
  touched: Record<string, boolean>,
) => Promise<void | Record<string, string>>;

export type SetFieldValueType = (field: string, value: unknown) => void;
