import { BUSINESS_STEWARD_AI_ID } from "./owner-platform-ops-catalog";

/** Admin lives in the tab bar so owner/staff keep Home / AIs / Profile while running the site. */
export const ADMIN_TAB_HREF = "/(tabs)/admin" as const;

export function adminTabHref(ai?: string) {
  if (ai) {
    return { pathname: ADMIN_TAB_HREF, params: { ai } } as const;
  }
  return ADMIN_TAB_HREF;
}

export const BUSINESS_STEWARD_ADMIN_HREF = adminTabHref(BUSINESS_STEWARD_AI_ID);

export const ADMIN_QUICK_HREFS = {
  allAis: "/(tabs)/ais",
  lab3d: "/3d-workspace",
  world: "/world",
  create: "/(tabs)/create",
  discover: "/(tabs)/discover",
} as const;
