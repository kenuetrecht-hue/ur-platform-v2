import { useLandingDemoConversion } from "@/hooks/use-landing-demo-conversion";

/** Links landing demo sessions to new accounts after auth. */
export function LandingDemoConversionTracker() {
  useLandingDemoConversion();
  return null;
}
