export type AccountRole = "customer" | "developer" | "admin";
export type WorkspaceRole = Exclude<AccountRole, "admin">;

const workspaceRoles = new Set<WorkspaceRole>(["customer", "developer"]);

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && workspaceRoles.has(value as WorkspaceRole);
}

export function canAccessWorkspace(
  roles: readonly string[],
  requestedRole: unknown,
): requestedRole is WorkspaceRole {
  return isWorkspaceRole(requestedRole) && roles.includes(requestedRole);
}

export function resolveWorkspaceRole(
  roles: readonly string[],
  requestedRole: unknown,
): WorkspaceRole | null {
  if (canAccessWorkspace(roles, requestedRole)) {
    return requestedRole;
  }

  if (roles.includes("customer")) {
    return "customer";
  }

  if (roles.includes("developer")) {
    return "developer";
  }

  return null;
}

