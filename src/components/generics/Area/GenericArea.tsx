import "./GenericArea.scss";
import Area from "./GenericArea.types";
import GenericField from "../Field/GenericField";
import GenericAction from "../Action/GenericAction";
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import { isDependedAndVisible } from "../utils";
import { getCustomArea } from "./CustomAreasMapper";
import { useCallback, useContext, useEffect, useState } from "react";
import { GenericFormContext } from "../Form/GenericForm.context";
import { useHasPermission } from "hooks/useHasPermission";

function GenericArea({
  area,
  readOnly,
  currentMode,
  currentStatus,
  isGloballyDisabled,
}: Readonly<{
  area: Area;
  readOnly?: boolean;
  currentMode?: "view" | "edit" | "create";
  currentStatus?: string;
  isGloballyDisabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const title = area.label.trim();
  const { dependFieldCondition, dependentFields, isSubArea } = area;
  const {
    values: formValues,
    setFieldValue,
    setErrors,
    setTouched,
  } = useFormikContext<Record<string, unknown>>();
  const { allFields, actionCallbacks, onAreaValueChange } = useContext(GenericFormContext);
  const [isEditing, setIsEditing] = useState(false);
  const hasPermission = useHasPermission(area.permissions);

  useEffect(() => {
    setIsEditing(false);
  }, [readOnly]);

  const hasTextareaField = area.fields.some((field) => field.type === "textarea");
  const hasActions = area.actions && area.actions.length > 0;
  const shouldShowActionsOnEdit = hasTextareaField && hasActions;

  const handleActionClick = useCallback(
    (actionName: string | undefined) => {
      if (!actionName) return;
      const callback = actionCallbacks[actionName];
      if (callback) {
        const result = callback(formValues, { setFieldValue, setErrors, setTouched });
        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            console.error(`Action ${actionName} failed:`, error);
          });
        }
        if (shouldShowActionsOnEdit) {
          setIsEditing(false);
        }
      }
    },
    [actionCallbacks, formValues, setFieldValue, setErrors, setTouched, shouldShowActionsOnEdit],
  );

  if (
    isSubArea &&
    !isDependedAndVisible(formValues, allFields ?? [], dependentFields, dependFieldCondition)
  ) {
    return null;
  }

  if (!hasPermission) return null;

  const customArea = getCustomArea(area);
  if (customArea) return customArea;

  const shouldShowActions = !readOnly && (!shouldShowActionsOnEdit || isEditing);

  const handleFieldInteraction = () => {
    if (shouldShowActionsOnEdit && !isEditing) {
      setIsEditing(true);
    }
  };

  const handleAreaChange = () => {
    handleFieldInteraction();
    onAreaValueChange?.(area.name);
  };

  return (
    <div className="generic-area">
      {title && <div className="area-title">{t(title)}</div>}
      <div
        className="area-fields"
        onFocusCapture={handleFieldInteraction}
        onChangeCapture={handleAreaChange}
      >
        {area.fields
          .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((field) => (
            <GenericField field={field} key={field.name} />
          ))}
      </div>
      {shouldShowActions && (
        <GenericAction
          actions={area.actions ?? []}
          onActionClick={handleActionClick}
          currentMode={currentMode}
          currentStatus={currentStatus}
          isGloballyDisabled={isGloballyDisabled}
        />
      )}
    </div>
  );
}

export default GenericArea;
