import { PublicLegalScreen } from "@/components/public-legal-screen";
import {
  PLATFORM_PRIVACY_SECTIONS,
  PRIVACY_EFFECTIVE_DATE,
} from "@/lib/platform-privacy-policy";

export default function PublicPrivacyScreen() {
  return (
    <PublicLegalScreen
      kicker="PUBLIC LEGAL"
      title="Privacy Policy"
      lede="What UR Platform LLC stores, what we do not keep, and that we do not sell your information."
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      sections={PLATFORM_PRIVACY_SECTIONS}
    />
  );
}
