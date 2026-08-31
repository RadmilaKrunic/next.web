import { GenericActions } from "./GenericAction.types";

type ActionCondition = NonNullable<NonNullable<GenericActions["dependency"]>["showAction"]>;

interface UserLike {
  permissions: string[];
  roles: string[];
}

export interface ActionDependencyContext {
  currentMode?: "view" | "edit" | "create";
  currentStatus?: string;
  formValues: Record<string, unknown>;
  user: UserLike | undefined;
  actionCallbacks: Record<string, (...args: unknown[]) => unknown>;
}

function isNonEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  return !Array.isArray(value) || value.length > 0;
}

function hasRequiredPermission(permissions: string[], user: UserLike | undefined): boolean {
  return permissions.some((perm) => user?.permissions.includes(perm));
}

function hasRequiredRole(roles: string[], user: UserLike | undefined): boolean {
  return roles.some((role) => user?.roles.includes(role));
}

function isCurrentStatusAllowed(statuses: string[], currentStatus: string | undefined): boolean {
  return !!currentStatus && statuses.includes(currentStatus);
}

export function checkActionCondition(
  condition: ActionCondition | undefined,
  ctx: ActionDependencyContext,
): boolean {
  if (!condition) return true;

  if (condition.modes?.length && (!ctx.currentMode || !condition.modes.includes(ctx.currentMode))) {
    return false;
  }

  if (condition.permissions?.length && !hasRequiredPermission(condition.permissions, ctx.user)) {
    return false;
  }

  if (condition.roles?.length && !hasRequiredRole(condition.roles, ctx.user)) {
    return false;
  }

  if (
    condition.statuses?.length &&
    !isCurrentStatusAllowed(condition.statuses, ctx.currentStatus)
  ) {
    return false;
  }

  if (
    condition.nonEmpty?.length &&
    !condition.nonEmpty.every((fn) => isNonEmptyValue(ctx.formValues[fn]))
  ) {
    return false;
  }

  if (condition.method) {
    const handler = ctx.actionCallbacks[condition.method];
    return typeof handler !== "function" || Boolean(handler());
  }

  return true;
}

export function isActionEffectivelyDisabled(
  action: GenericActions,
  ctx: ActionDependencyContext,
): boolean {
  const isVisible = checkActionCondition(action.dependency?.showAction, ctx);
  if (!isVisible) return true;
  const isEnabled = checkActionCondition(action.dependency?.enableAction, ctx);
  return !isEnabled;
}

function checkActionConditionStatic(
  condition: ActionCondition | undefined,
  ctx: ActionDependencyContext,
): boolean {
  if (!condition) return true;

  if (condition.permissions && condition.permissions.length > 0) {
    const hasPermission = condition.permissions.some((perm) =>
      ctx.user?.permissions.includes(perm),
    );
    if (!hasPermission) return false;
  }

  if (condition.statuses && condition.statuses.length > 0) {
    if (!ctx.currentStatus || !condition.statuses.includes(ctx.currentStatus)) return false;
  }

  return true;
}

function isActionEffectivelyDisabledStatic(
  action: GenericActions,
  ctx: ActionDependencyContext,
): boolean {
  const isVisible = checkActionConditionStatic(action.dependency?.showAction, ctx);
  if (!isVisible) return true;
  const isEnabled = checkActionConditionStatic(action.dependency?.enableAction, ctx);
  return !isEnabled;
}

export function areAllActionsDisabled(
  actions: GenericActions[],
  ctx: ActionDependencyContext,
): boolean {
  const flagged = actions.filter((a) => a.dependency?.shouldDisableSection === true);
  if (flagged.length > 0) {
    const visibleFlagged = flagged.filter((action) =>
      checkActionConditionStatic(action.dependency?.showAction, ctx),
    );

    if (visibleFlagged.length === 0) {
      return true;
    }

    return visibleFlagged.every((action) => isActionEffectivelyDisabledStatic(action, ctx));
  }
  if (actions.length === 0) return false;
  return actions.every((action) => isActionEffectivelyDisabled(action, ctx));
}
