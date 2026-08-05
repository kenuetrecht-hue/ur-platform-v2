/** Client-safe admin access types (mirrors server/_core/admin-access-service). */

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

export type AdminAccessSnapshot = {
  canAccessAdminDashboard: boolean;
  isPlatformOwner: boolean;
  role: "owner" | AdminStaffRole | null;
  roleLabel: string | null;
  permissions: AdminPermission[];
};
