import { PublicLegalScreen } from "@/components/public-legal-screen";
import {
  PLATFORM_TERMS_SECTIONS,
  TERMS_EFFECTIVE_DATE,
} from "@/lib/platform-terms-of-use";
import { WHAT_WE_SELL_SECTIONS } from "@/lib/stripe-website-policies";

export default function PublicTermsScreen() {
  return (
    <PublicLegalScreen
      kicker="PUBLIC LEGAL"
      title="Terms of Use"
      lede="What you agree to when you use UR Platform. No account is required to read this page."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={[...WHAT_WE_SELL_SECTIONS, ...PLATFORM_TERMS_SECTIONS]}
    />
  );
}
