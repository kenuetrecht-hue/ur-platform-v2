import { PublicLegalScreen } from "@/components/public-legal-screen";
import { TERMS_EFFECTIVE_DATE } from "@/lib/platform-terms-of-use";
import { REFUND_AND_RETURN_SECTIONS } from "@/lib/stripe-website-policies";

export default function PublicRefundsScreen() {
  return (
    <PublicLegalScreen
      kicker="PUBLIC LEGAL"
      title="Refunds, returns, and delivery"
      lede="How digital access is delivered, why there is no physical return, and how to write us about a charge. All prices are in USD."
      effectiveDate={TERMS_EFFECTIVE_DATE}
      sections={REFUND_AND_RETURN_SECTIONS}
    />
  );
}
