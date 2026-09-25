import {
  OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS,
  ownerOpsShouldAutoSpeak,
  sumMonthPlatformRevenueCents,
} from "../../lib/owner-ops-auto-speak";
import { subscriptionRevenueCentsThisMonth } from "./ai-subscription-service";
import { listAllTransactions } from "./transaction-ledger-service";

export function getOwnerOpsAutoSpeakStatus(now = new Date()) {
  const revenueCents =
    sumMonthPlatformRevenueCents(listAllTransactions(), now) + subscriptionRevenueCentsThisMonth(now);
  return {
    autoSpeak: ownerOpsShouldAutoSpeak(revenueCents),
    revenueCents,
    thresholdCents: OWNER_OPS_AUTO_SPEAK_MONTHLY_CENTS,
  };
}
