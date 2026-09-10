import { PublicLegalScreen } from "@/components/public-legal-screen";
import { TERMS_EFFECTIVE_DATE } from "@/lib/platform-terms-of-use";
import { CONTACT_SECTIONS } from "@/lib/stripe-website-policies";

export default function PublicContactScreen() {
  return (
    <PublicLegalScreen
      kicker="PUBLIC LEGAL"
      title="Contact UR Platform"
      lede="Email is the public way to reach UR Platform LLC. No account is required to write us."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={CONTACT_SECTIONS}
    />
  );
}
