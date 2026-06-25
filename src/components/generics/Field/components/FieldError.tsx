import { ErrorMessage } from "formik";

function normalizeErrorMsg(msg: string): string {
  const trimmed = msg.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return (parsed as string[]).join(". ");
      }
    } catch {
      return "Error";
    }
  }
  return msg;
}

function FieldError({ name }: Readonly<{ name: string }>) {
  return (
    <ErrorMessage name={name}>
      {(errorMsg) => {
        const displayMsg = normalizeErrorMsg(errorMsg);
        return (
          <div className="text-input-error-message" title={displayMsg}>
            {displayMsg}
          </div>
        );
      }}
    </ErrorMessage>
  );
}

export default FieldError;
