import { PublicLegalScreen } from "@/components/public-legal-screen";
import { TERMS_EFFECTIVE_DATE } from "@/lib/platform-terms-of-use";
import { CANCELLATION_SECTIONS } from "@/lib/stripe-website-policies";

export default function PublicCancellationsScreen() {
  return (
    <PublicLegalScreen
      kicker="PUBLIC LEGAL"
      title="Cancellation policy"
      lede="How to stop auto-renew, what happens to prepaid time, and when a live class cancels. Cancelling is not a refund."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={CANCELLATION_SECTIONS}
    />
  );
}
