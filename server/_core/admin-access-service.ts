/**
 * Administration dashboard access — platform owner + owner-granted staff roles.
 * Staff never receive full platform owner powers (all AIs, sandbox tiers, etc.).
 */

import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";

export const ADMIN_STAFF_ROLES = [
  "viewer",
  "support",
  "ops_manager",
  "campaign_manager",
  "full_admin",
] as const;

export type AdminStaffRole = (typeof ADMIN_STAFF_ROLES)[number];

export type AdminPermission =
  | "admin_dashboard_access"
  | "view_ops_dashboard"
  | "view_incidents"
  | "manage_incidents"
  | "view_notifications"
  | "mark_notifications_read"
  | "chat_ops_ai"
  | "run_health_scan"
  | "grant_user_access"
  | "campaign_admin"
  | "manage_ai_sessions"
  | "manage_admin_staff";

export type AdminStaffGrant = {
  id: string;
  userEmail: string;
  userId?: string;
  role: AdminStaffRole;
  note?: string;
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  grantedBy: "platform_owner";
};

export type AdminAccessSnapshot = {
  canAccessAdminDashboard: boolean;
  isPlatformOwner: boolean;
  role: "owner" | AdminStaffRole | null;
  roleLabel: string | null;
  permissions: AdminPermission[];
};

const ALL_PERMISSIONS: AdminPermission[] = [
  "admin_dashboard_access",
  "view_ops_dashboard",
  "view_incidents",
  "manage_incidents",
  "view_notifications",
  "mark_notifications_read",
  "chat_ops_ai",
  "run_health_scan",
  "grant_user_access",
  "campaign_admin",
  "manage_ai_sessions",
  "manage_admin_staff",
];

const ROLE_LABELS: Record<AdminStaffRole, string> = {
  viewer: "Read-only viewer",
  support: "Support — alerts & ops chat",
  ops_manager: "Ops manager — incidents & scans",
  campaign_manager: "Campaign admin only",
  full_admin: "Full admin (no staff management)",
};

const ROLE_PERMISSIONS: Record<AdminStaffRole, AdminPermission[]> = {
  viewer: [
    "admin_dashboard_access",
    "view_ops_dashboard",
    "view_incidents",
    "view_notifications",
  ],
  support: [
    "admin_dashboard_access",
    "view_ops_dashboard",
    "view_incidents",
    "view_notifications",
    "mark_notifications_read",
    "chat_ops_ai",
  ],
  ops_manager: [
    "admin_dashboard_access",
    "view_ops_dashboard",
    "view_incidents",
    "manage_incidents",
    "view_notifications",
    "mark_notifications_read",
    "chat_ops_ai",
    "run_health_scan",
    "grant_user_access",
  ],
  campaign_manager: [
    "admin_dashboard_access",
    "view_ops_dashboard",
    "campaign_admin",
    "manage_ai_sessions",
  ],
  full_admin: ALL_PERMISSIONS.filter((p) => p !== "manage_admin_staff"),
};

const staffStore = new Map<string, AdminStaffGrant>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isStaffGrantActive(grant: AdminStaffGrant, now = Date.now()): boolean {
  if (grant.revokedAt) return false;
  if (grant.expiresAt && new Date(grant.expiresAt).getTime() < now) return false;
  return true;
}

function findActiveStaffGrant(
  userId: string | number | undefined,
  email: string | null | undefined,
): AdminStaffGrant | null {
  const normalized = email ? normalizeEmail(email) : null;
  for (const grant of staffStore.values()) {
    if (!isStaffGrantActive(grant)) continue;
    if (normalized && normalizeEmail(grant.userEmail) === normalized) return grant;
    if (userId != null && grant.userId === String(userId)) return grant;
  }
  return null;
}

export function getRoleLabel(role: AdminStaffRole): string {
  return ROLE_LABELS[role];
}

export function permissionsForRole(role: AdminStaffRole): AdminPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function getAdminAccessForUser(params: {
  userId?: string | number | null;
  email?: string | null;
  isPlatformOwner: boolean;
}): AdminAccessSnapshot {
  if (params.isPlatformOwner) {
    return {
      canAccessAdminDashboard: true,
      isPlatformOwner: true,
      role: "owner",
      roleLabel: "Platform owner — full control",
      permissions: ALL_PERMISSIONS,
    };
  }

  const grant = findActiveStaffGrant(params.userId ?? undefined, params.email);
  if (!grant) {
    return {
      canAccessAdminDashboard: false,
      isPlatformOwner: false,
      role: null,
      roleLabel: null,
      permissions: [],
    };
  }

  const permissions = permissionsForRole(grant.role);
  return {
    canAccessAdminDashboard: permissions.includes("admin_dashboard_access"),
    isPlatformOwner: false,
    role: grant.role,
    roleLabel: getRoleLabel(grant.role),
    permissions,
  };
}

export function assertAdminPermission(
  access: AdminAccessSnapshot,
  permission: AdminPermission,
): void {
  if (!access.canAccessAdminDashboard) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administration dashboard access is restricted to the platform owner and authorized staff.",
    });
  }
  if (!access.permissions.includes(permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your admin role does not include: ${permission.replace(/_/g, " ")}.`,
    });
  }
}

export function grantAdminStaffAccess(params: {
  userEmail: string;
  role: AdminStaffRole;
  note?: string;
  expiresAt?: string;
}): AdminStaffGrant {
  const email = normalizeEmail(params.userEmail);
  for (const grant of staffStore.values()) {
    if (isStaffGrantActive(grant) && normalizeEmail(grant.userEmail) === email) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This user already has active administration access. Revoke or update their role first.",
      });
    }
  }

  const grant: AdminStaffGrant = {
    id: randomUUID(),
    userEmail: email,
    role: params.role,
    note: params.note,
    grantedAt: new Date().toISOString(),
    expiresAt: params.expiresAt,
    grantedBy: "platform_owner",
  };
  staffStore.set(grant.id, grant);
  return grant;
}

export function revokeAdminStaffAccess(grantId: string): boolean {
  const grant = staffStore.get(grantId);
  if (!grant || grant.revokedAt) return false;
  grant.revokedAt = new Date().toISOString();
  staffStore.set(grantId, grant);
  return true;
}

export function listAdminStaff(includeRevoked = false): AdminStaffGrant[] {
  return [...staffStore.values()]
    .filter((g) => includeRevoked || isStaffGrantActive(g))
    .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime());
}

export function listAdminRoleOptions(): Array<{ id: AdminStaffRole; label: string; permissions: AdminPermission[] }> {
  return ADMIN_STAFF_ROLES.map((id) => ({
    id,
    label: ROLE_LABELS[id],
    permissions: ROLE_PERMISSIONS[id],
  }));
}
