import { describe, it, expect } from "vitest";
import {
  getAdminAccessForUser,
  grantAdminStaffAccess,
  revokeAdminStaffAccess,
  permissionsForRole,
} from "../server/_core/admin-access-service";

describe("Administration access control", () => {
  it("grants platform owner full permissions", () => {
    const access = getAdminAccessForUser({
      userId: 1,
      email: "owner@example.com",
      isPlatformOwner: true,
    });
    expect(access.canAccessAdminDashboard).toBe(true);
    expect(access.role).toBe("owner");
    expect(access.permissions).toContain("manage_admin_staff");
  });

  it("denies random users", () => {
    const access = getAdminAccessForUser({
      userId: 2,
      email: "user@example.com",
      isPlatformOwner: false,
    });
    expect(access.canAccessAdminDashboard).toBe(false);
    expect(access.permissions).toEqual([]);
  });

  it("grants limited staff permissions by role", () => {
    grantAdminStaffAccess({
      userEmail: "staff@example.com",
      role: "viewer",
    });
    const access = getAdminAccessForUser({
      email: "staff@example.com",
      isPlatformOwner: false,
    });
    expect(access.canAccessAdminDashboard).toBe(true);
    expect(access.role).toBe("viewer");
    expect(access.permissions).toContain("view_incidents");
    expect(access.permissions).not.toContain("manage_incidents");
    expect(access.permissions).not.toContain("manage_admin_staff");
  });

  it("ops manager can manage incidents but not staff", () => {
    grantAdminStaffAccess({
      userEmail: "ops@example.com",
      role: "ops_manager",
    });
    const perms = permissionsForRole("ops_manager");
    expect(perms).toContain("manage_incidents");
    expect(perms).not.toContain("manage_admin_staff");
  });

  it("revokes staff access", () => {
    const grant = grantAdminStaffAccess({
      userEmail: "temp@example.com",
      role: "support",
    });
    revokeAdminStaffAccess(grant.id);
    const access = getAdminAccessForUser({
      email: "temp@example.com",
      isPlatformOwner: false,
    });
    expect(access.canAccessAdminDashboard).toBe(false);
  });
});
