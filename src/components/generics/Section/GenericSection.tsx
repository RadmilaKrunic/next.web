import "./GenericSection.scss";
import GenericArea from "../Area/GenericArea";
import GenericAction from "../Action/GenericAction";
import { useTranslation } from "react-i18next";
import { Icon } from "@bosch/react-frok";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { GenericFormContext } from "../Form/GenericForm.context";
import { useHasPermission } from "hooks/useHasPermission";

import Section from "./GenericSection.types";

function GenericSection({
  section,
  isCollapsed = false,
  collapsedTitle,
  getCollapsedTitle,
  children,
  onDelete,
  onEdit,
  onHeaderClick,
  currentMode,
  currentStatus,
  isGloballyDisabled,
}: Readonly<{
  section: Section;
  isCollapsed?: boolean;
  collapsedTitle?: string;
  getCollapsedTitle?: (values: Record<string, unknown>) => string;
  children?: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  onHeaderClick?: () => void;
  currentMode?: "view" | "edit" | "create";
  currentStatus?: string;
  isGloballyDisabled?: boolean;
}>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const [isOpen, setIsOpen] = useState(!isCollapsed);
  const {
    values: formValues,
    setFieldValue,
    setErrors,
    setTouched,
  } = useFormikContext<Record<string, unknown>>();
  const { actionCallbacks } = useContext(GenericFormContext);
  const hasPermission = useHasPermission(section.permissions);

  // Generate collapsed title dynamically from current formValues
  const dynamicCollapsedTitle = useMemo(
    () => (getCollapsedTitle ? getCollapsedTitle(formValues) : collapsedTitle),
    [getCollapsedTitle, formValues, collapsedTitle],
  );

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
      }
    },
    [actionCallbacks, formValues, setFieldValue, setErrors, setTouched],
  );

  useEffect(() => {
    setIsOpen(!isCollapsed);
  }, [isCollapsed]);
  const { isAccordion, isDisabled, label, areas, index, isHidden, hiddenForStatuses } = section;
  if (isHidden || (hiddenForStatuses && currentStatus && hiddenForStatuses.includes(currentStatus)))
    return null;
  if (!hasPermission) return null;

  const titleContent = (
    <>
      {isAccordion && (
        <Icon
          iconName={isOpen ? "up-small" : "down-small"}
          className="accordion-icon"
          aria-hidden="true"
        />
      )}

      <span>
        {t(label)} {index ? index + 1 : ""}
      </span>
      {!isOpen && dynamicCollapsedTitle && (
        <span className="section-collapsed-data">
          <span>{dynamicCollapsedTitle}</span>
        </span>
      )}
    </>
  );

  return (
    <section className="generic-section">
      <h5 className="section-title">
        {onHeaderClick ? (
          <button type="button" className="section-title-button" onClick={onHeaderClick}>
            {titleContent}
          </button>
        ) : (
          titleContent
        )}
        <span className="actions">
          {!isOpen && dynamicCollapsedTitle && (
            <Icon iconName="edit" onClick={() => setIsOpen(!isOpen)} />
          )}

          {onDelete && index !== undefined && index > 0 && (
            <Icon iconName="delete" onClick={onDelete} title={`Delete ${t(label)} ${index + 1}`} />
          )}

          {onEdit && isOpen && isDisabled && <Icon iconName="edit" onClick={onEdit} />}
        </span>
      </h5>
      {isOpen &&
        areas
          .toSorted((a, b) => a.position - b.position)
          .map((area) => (
            <GenericArea
              key={area.name}
              area={area}
              readOnly={isDisabled}
              currentMode={currentMode}
              currentStatus={currentStatus}
              isGloballyDisabled={isGloballyDisabled}
            />
          ))}
      {isOpen && children}
      {isOpen && !isDisabled && (
        <GenericAction
          actions={section.actions ?? []}
          onActionClick={handleActionClick}
          currentMode={currentMode}
          currentStatus={currentStatus}
          isGloballyDisabled={isGloballyDisabled}
        />
      )}
    </section>
  );
}

export default GenericSection;
