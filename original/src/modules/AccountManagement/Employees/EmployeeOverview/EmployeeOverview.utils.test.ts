import { describe, it, expect } from "vitest";
import { rolesMap, mapAccountRolesToAPIFormat } from "./EmployeeOverview.utils";

describe("mapAccountRolesToAPIFormat", () => {
  it("maps known role ids to id/name pairs", () => {
    expect(mapAccountRolesToAPIFormat(["ASC_MANAGER", "ASC_TECHNICIAN"])).toEqual([
      { id: "ASC_MANAGER", name: "ASC Manager" },
      { id: "ASC_TECHNICIAN", name: "ASC Technician" },
    ]);
  });

  it("returns an empty array when accountRoles is empty", () => {
    expect(mapAccountRolesToAPIFormat([])).toEqual([]);
  });

  it("returns an empty array when accountRoles is undefined", () => {
    expect(mapAccountRolesToAPIFormat(undefined as unknown as string[])).toEqual([]);
  });

  it("maps all roles present in rolesMap", () => {
    const ids = Object.keys(rolesMap);
    const result = mapAccountRolesToAPIFormat(ids);
    expect(result).toHaveLength(ids.length);
    result.forEach((entry, index) => {
      expect(entry.id).toBe(ids[index]);
      expect(entry.name).toBe(rolesMap[ids[index]]);
    });
  });

  it("maps unknown role id to undefined name", () => {
    expect(mapAccountRolesToAPIFormat(["UNKNOWN_ROLE"])).toEqual([
      { id: "UNKNOWN_ROLE", name: undefined },
    ]);
  });
});
