/** Tracks free landing demo → signup funnel (website + app). */

export type LandingDemoPlatform = "web" | "ios" | "android" | "unknown";

export type LandingDemoAttributionRecord = {
  id: string;
  ipFingerprint: string;
  creatorId: string;
  platform: LandingDemoPlatform;
  demoAt: string;
  signupClickedAt: string | null;
  convertedAt: string | null;
  userId: string | null;
};

export type LandingDemoConversionStats = {
  totalDemos: number;
  totalSignupClicks: number;
  totalConversions: number;
  demoToClickRate: number;
  demoToSignupRate: number;
  byCreator: Array<{
    creatorId: string;
    demos: number;
    signupClicks: number;
    conversions: number;
  }>;
  byPlatform: Array<{
    platform: LandingDemoPlatform;
    demos: number;
    conversions: number;
  }>;
  recentConversions: Array<{
    attributionId: string;
    creatorId: string;
    platform: LandingDemoPlatform;
    demoAt: string;
    convertedAt: string;
    userId: string;
  }>;
};

export const LANDING_DEMO_ATTRIBUTION_STORAGE_KEY = "ur_landing_demo_attribution_id";
