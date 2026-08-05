import { useMemo } from "react";

import { useAuth } from "@/lib/auth-context";

import { trpc } from "@/lib/trpc";

import { PLATFORM_OWNER_NAME } from "@/lib/platform-owner-config";

import type { AdminPermission, AdminStaffRole } from "@/lib/admin-access-types";



/**

 * Platform owner status — SERVER-VERIFIED ONLY.

 * Staff administration access is separate from full owner platform powers.

 */

export function usePlatformOwner() {

  const { isAuthenticated, accessToken } = useAuth();



  const ownerAccess = trpc.platformOps.checkAccess.useQuery(undefined, {

    retry: 1,

    enabled: Boolean(accessToken) && isAuthenticated,

  });

  const authMe = trpc.auth.me.useQuery(undefined, {

    retry: 1,

    enabled: Boolean(accessToken) && isAuthenticated,

  });

  const myAccess = trpc.platformOps.getMyAccess.useQuery(undefined, {

    retry: 1,

    enabled: Boolean(accessToken) && isAuthenticated,

  });

  const adminAccess = trpc.platformOps.getMyAdminAccess.useQuery(undefined, {

    retry: 1,

    enabled: Boolean(accessToken) && isAuthenticated,

  });



  const isPlatformOwner = Boolean(

    ownerAccess.data?.isPlatformOwner || authMe.data?.isPlatformOwner,

  );



  const canAccessAdminDashboard = Boolean(

    ownerAccess.data?.canAccessAdminDashboard ?? adminAccess.data?.canAccessAdminDashboard,

  );



  const adminPermissions = useMemo(

    () =>

      (ownerAccess.data?.adminPermissions ??

        adminAccess.data?.permissions ??

        []) as AdminPermission[],

    [ownerAccess.data?.adminPermissions, adminAccess.data?.permissions],

  );



  const adminRole = (ownerAccess.data?.adminRole ?? adminAccess.data?.role ?? null) as

    | "owner"

    | AdminStaffRole

    | null;



  const adminRoleLabel =

    ownerAccess.data?.adminRoleLabel ?? adminAccess.data?.roleLabel ?? null;



  const ownerDisplayName = useMemo(

    () => ownerAccess.data?.ownerDisplayName ?? PLATFORM_OWNER_NAME,

    [ownerAccess.data?.ownerDisplayName],

  );



  const hasAdminPermission = (permission: AdminPermission) =>

    adminPermissions.includes(permission);



  return {

    isPlatformOwner,

    /** Full platform owner powers — never granted to hired staff. */

    hasFullPlatformAccess: isPlatformOwner,

    hasFullAiAccess: isPlatformOwner,

    canAccessAdminDashboard,

    adminRole,

    adminRoleLabel,

    adminPermissions,

    hasAdminPermission,

    ownerDisplayName,

    isAuthenticated,

    isLoading: ownerAccess.isLoading || authMe.isLoading || adminAccess.isLoading,

    myAccess: myAccess.data,

    hasAiEntitlement: isPlatformOwner || Boolean(myAccess.data?.hasAiAccess),

  };

}

