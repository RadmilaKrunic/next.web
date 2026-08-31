import { describe, it, expect, vi } from "vitest";
import type { GenericActions } from "./GenericAction.types";
import {
  checkActionCondition,
  isActionEffectivelyDisabled,
  areAllActionsDisabled,
  type ActionDependencyContext,
} from "./actionDependency";

const makeContext = (
  overrides: Partial<ActionDependencyContext> = {},
): ActionDependencyContext => ({
  currentMode: "edit",
  currentStatus: "DRAFT",
  formValues: { a: "x", b: "", list: [] },
  user: { permissions: ["P1", "P2"], roles: ["R1"] },
  actionCallbacks: {},
  ...overrides,
});

const makeAction = (overrides: Partial<GenericActions> = {}): GenericActions => ({
  name: "save",
  mode: "primary",
  cssContainer: "right",
  onAction: "onSave",
  ...overrides,
});

describe("checkActionCondition", () => {
  it("returns true when condition is undefined", () => {
    expect(checkActionCondition(undefined, makeContext())).toBe(true);
  });

  it("returns false when mode is not allowed", () => {
    const condition = { modes: ["view" as const] };
    expect(checkActionCondition(condition, makeContext({ currentMode: "edit" }))).toBe(false);
  });

  it("returns false when required permission is missing", () => {
    const condition = { permissions: ["ADMIN"] };
    expect(checkActionCondition(condition, makeContext())).toBe(false);
  });

  it("returns false when required role is missing", () => {
    const condition = { roles: ["MANAGER"] };
    expect(checkActionCondition(condition, makeContext())).toBe(false);
  });

  it("returns false when status is missing or not allowed", () => {
    const condition = { statuses: ["APPROVED"] };
    expect(checkActionCondition(condition, makeContext({ currentStatus: "DRAFT" }))).toBe(false);
    expect(checkActionCondition(condition, makeContext({ currentStatus: undefined }))).toBe(false);
  });

  it("evaluates nonEmpty across string, array, undefined values", () => {
    const nonEmptyPass = { nonEmpty: ["a"] };
    expect(checkActionCondition(nonEmptyPass, makeContext())).toBe(true);

    const nonEmptyFail = { nonEmpty: ["b", "list", "missing"] };
    expect(checkActionCondition(nonEmptyFail, makeContext())).toBe(false);
  });

  it("evaluates method callback and handles missing handler", () => {
    const truthy = vi.fn(() => true);
    const falsy = vi.fn(() => false);

    expect(
      checkActionCondition(
        { method: "canShow" },
        makeContext({ actionCallbacks: { canShow: truthy } }),
      ),
    ).toBe(true);

    expect(
      checkActionCondition(
        { method: "canShow" },
        makeContext({ actionCallbacks: { canShow: falsy } }),
      ),
    ).toBe(false);

    expect(checkActionCondition({ method: "unknown" }, makeContext())).toBe(true);
  });
});

describe("isActionEffectivelyDisabled", () => {
  it("is disabled when showAction condition fails", () => {
    const action = makeAction({ dependency: { showAction: { statuses: ["APPROVED"] } } });
    expect(isActionEffectivelyDisabled(action, makeContext({ currentStatus: "DRAFT" }))).toBe(true);
  });

  it("is disabled when enableAction condition fails", () => {
    const action = makeAction({
      dependency: {
        showAction: { statuses: ["DRAFT"] },
        enableAction: { permissions: ["ADMIN"] },
      },
    });
    expect(isActionEffectivelyDisabled(action, makeContext())).toBe(true);
  });

  it("is enabled when both showAction and enableAction pass", () => {
    const action = makeAction({
      dependency: {
        showAction: { statuses: ["DRAFT"] },
        enableAction: { permissions: ["P1"], roles: ["R1"] },
      },
    });
    expect(isActionEffectivelyDisabled(action, makeContext())).toBe(false);
  });
});

describe("areAllActionsDisabled", () => {
  it("returns true for visible flagged actions that are all effectively disabled", () => {
    const actions: GenericActions[] = [
      makeAction({
        dependency: {
          shouldDisableSection: true,
          showAction: { statuses: ["DRAFT"] },
          enableAction: { permissions: ["ADMIN"] },
        },
      }),
      makeAction({
        name: "approve",
        dependency: {
          shouldDisableSection: true,
          showAction: { statuses: ["DRAFT"] },
          enableAction: { statuses: ["APPROVED"] },
        },
      }),
    ];

    expect(areAllActionsDisabled(actions, makeContext())).toBe(true);
  });

  it("returns false when at least one flagged action is enabled", () => {
    const actions: GenericActions[] = [
      makeAction({
        dependency: {
          shouldDisableSection: true,
          showAction: { statuses: ["DRAFT"] },
          enableAction: { statuses: ["DRAFT"] },
        },
      }),
      makeAction({
        name: "secondary",
        dependency: {
          shouldDisableSection: true,
          showAction: { statuses: ["DRAFT"] },
          enableAction: { permissions: ["ADMIN"] },
        },
      }),
    ];

    expect(areAllActionsDisabled(actions, makeContext())).toBe(false);
  });

  it("handles no flagged actions and empty actions list", () => {
    const noFlaggedActions: GenericActions[] = [
      makeAction({ dependency: { showAction: { statuses: ["DRAFT"] } } }),
      makeAction({ name: "secondary", dependency: { showAction: { statuses: ["APPROVED"] } } }),
    ];

    expect(areAllActionsDisabled(noFlaggedActions, makeContext())).toBe(false);
    expect(areAllActionsDisabled([], makeContext())).toBe(false);
  });
});
