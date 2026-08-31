import "./GenericAction.scss";
import { Button } from "@bosch/react-frok";
import { useTranslation } from "react-i18next";
import { GenericActions } from "./GenericAction.types";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "types/user.type";
import { FormikContext } from "formik";
import { useContext } from "react";
import { GenericFormContext } from "../Form/GenericForm.context";
import { checkActionCondition, ActionDependencyContext } from "./actionDependency";

export type { GenericActions } from "./GenericAction.types";

interface GenericActionProps {
  actions: GenericActions[];
  onActionClick: (actionName: string | undefined) => void;
  currentMode?: "view" | "edit" | "create";
  currentStatus?: string;
  isGloballyDisabled?: boolean;
  isOnHold?: boolean;
}

function GenericAction({
  actions,
  onActionClick,
  currentMode,
  currentStatus,
  isGloballyDisabled = false,
  isOnHold = false,
}: Readonly<GenericActionProps>) {
  const { t } = useTranslation("translation", { keyPrefix: "app" });
  const queryClient = useQueryClient();
  const userData = queryClient.getQueryData<User>(["user"]);
  const formikContext = useContext(FormikContext);
  const formValues: Record<string, unknown> =
    (formikContext?.values as Record<string, unknown>) ?? {};
  const { actionCallbacks } = useContext(GenericFormContext);

  const ctx: ActionDependencyContext = {
    currentMode,
    currentStatus,
    formValues,
    user: userData,
    actionCallbacks,
  };

  if (!actions || actions.length === 0) {
    return null;
  }

  // Filter actions based on showAction dependencies
  const visibleActions = actions.filter((action) =>
    checkActionCondition(action.dependency?.showAction, ctx),
  );

  if (!visibleActions || visibleActions.length === 0) {
    return null;
  }

  const getActionLabel = (action: GenericActions): string => {
    if (action.name === "onHold" && isOnHold) {
      return t("removeFromHold");
    }
    return t(action.name ?? "");
  };

  const isActionDisabled = (action: GenericActions): boolean => {
    if (isGloballyDisabled) return true;
    if (isOnHold && action.name !== "onHold") return true;
    return !checkActionCondition(action.dependency?.enableAction, ctx);
  };

  return (
    <div className="actions">
      {visibleActions.some((action) => action?.cssContainer === "full") && (
        <div className="full">
          {visibleActions
            .filter((action) => action?.cssContainer === "full")
            .map((action) => {
              const isDisabled = isActionDisabled(action);
              return (
                <Button
                  key={action.name}
                  className={action.cssButton || "full-width"}
                  type="button"
                  mode={action.mode}
                  label={getActionLabel(action)}
                  onClick={() => onActionClick(action.onAction)}
                  disabled={isDisabled}
                />
              );
            })}
        </div>
      )}
      <div className="left">
        {visibleActions
          .filter((action) => action?.cssContainer?.includes("left"))
          .map((action) => {
            const isDisabled = isActionDisabled(action);
            return (
              <Button
                key={action.name}
                className={action.cssButton || "full-width"}
                type="button"
                mode={action.mode}
                label={getActionLabel(action)}
                onClick={() => onActionClick(action.onAction)}
                disabled={isDisabled}
              />
            );
          })}
      </div>
      <div className="right">
        {visibleActions
          .filter((action) => action?.cssContainer?.includes("right"))
          .map((action) => {
            const isDisabled = isActionDisabled(action);
            return (
              <Button
                key={action.name}
                className={action.cssButton || "full-width"}
                type="button"
                mode={action.mode}
                label={getActionLabel(action)}
                onClick={() => onActionClick(action.onAction)}
                disabled={isDisabled}
              />
            );
          })}
      </div>
    </div>
  );
}

export default GenericAction;
