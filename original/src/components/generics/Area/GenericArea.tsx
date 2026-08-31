import "./GenericArea.scss";
import Area from "./GenericArea.types";
import GenericField from "../Field/GenericField";
import GenericAction from "../Action/GenericAction";
import { useTranslation } from "react-i18next";
import { useFormikContext } from "formik";
import { isDependedAndVisible } from "../utils";
import { getCustomArea } from "./CustomAreasMapper";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
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
  const prevAreaValuesKeyRef = useRef<string>("");
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
        const wrappedSetFieldValue = (field: string, value: unknown) => {
          void setFieldValue(field, value);
        };

        const wrappedSetTouched = async (touched: Record<string, boolean>) => {
          await setTouched(touched);
          return undefined as void | Record<string, string>;
        };

        const result = callback(formValues, {
          setFieldValue: wrappedSetFieldValue,
          setErrors,
          setTouched: wrappedSetTouched,
        });
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

  useEffect(() => {
    const areaValues = area.fields.reduce(
      (acc, field) => {
        acc[field.name] = formValues[field.name];
        return acc;
      },
      {} as Record<string, unknown>,
    );

    const areaValuesKey = JSON.stringify(areaValues);

    if (prevAreaValuesKeyRef.current === "") {
      prevAreaValuesKeyRef.current = areaValuesKey;
      return;
    }

    if (prevAreaValuesKeyRef.current !== areaValuesKey) {
      prevAreaValuesKeyRef.current = areaValuesKey;
      onAreaValueChange?.(area.name, formValues);
    }
  }, [area.fields, area.name, formValues, onAreaValueChange]);

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
    onAreaValueChange?.(area.name, formValues);
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
