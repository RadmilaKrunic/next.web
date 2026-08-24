export const rolesMap: Record<string, string> = {
  ASC_MANAGER: "ASC Manager",
  ASC_MANAGER_WITHOUT_CLAIM: "ASC Manager without Claim",
  ASC_CLAIM: "ASC Claim",
  ASC_TECHNICIAN: "ASC Technician",
  ASC_RECEPTIONIST: "ASC Receptionist",
};

export const mapAccountRolesToAPIFormat = (
  accountRoles: string[],
): { id: string; name: string }[] => {
  if (!accountRoles || accountRoles?.length === 0) {
    return [];
  }

  return accountRoles.map((roleId) => ({
    id: roleId,
    name: rolesMap[roleId],
  }));
};
