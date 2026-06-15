import { describe, expect, it } from "vitest";

import {
  canAccessWorkspace,
  resolveWorkspaceRole,
} from "@/lib/auth/guards";

describe("workspace role guards", () => {
  it("allows access only when the account owns the requested role", () => {
    expect(canAccessWorkspace(["customer"], "customer")).toBe(true);
    expect(canAccessWorkspace(["customer"], "developer")).toBe(false);
    expect(
      canAccessWorkspace(["customer", "developer"], "developer"),
    ).toBe(true);
  });

  it("ignores invalid or unauthorized role cookies", () => {
    expect(resolveWorkspaceRole(["customer"], "admin")).toBe("customer");
    expect(resolveWorkspaceRole(["customer"], "developer")).toBe("customer");
  });

  it("prefers an authorized cookie role and otherwise uses customer first", () => {
    expect(
      resolveWorkspaceRole(["customer", "developer"], "developer"),
    ).toBe("developer");
    expect(resolveWorkspaceRole(["developer", "customer"], undefined)).toBe(
      "customer",
    );
  });
});
