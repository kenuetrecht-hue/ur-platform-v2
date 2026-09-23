/** Wide web/desktop turns the bottom tabs into a left sidebar. Phones stay on the bottom bar. */
export const DASHBOARD_SIDEBAR_BREAKPOINT = 1024;
export const DASHBOARD_SIDEBAR_WIDTH = 220;

export function isWideDashboard(width: number, platform: string): boolean {
  return platform === "web" && width >= DASHBOARD_SIDEBAR_BREAKPOINT;
}
