import { describe, it, expect } from "vitest";
import {
  connectCryptoWallet,
  completeUpholdConnection,
  processInstantCreatorPayout,
  getCreatorPayoutDashboard,
  CREATOR_PAYOUT_SHARE,
} from "../server/_core/creator-payout-service";
import { enrollContentCreator } from "../server/_core/partner-program-service";

describe("Creator Uphold / blockchain payouts", () => {
  it("requires payout setup before instant transfer", () => {
    enrollContentCreator({
      userId: "cr-pay-1",
      userEmail: "c@test.com",
      displayName: "Creator",
    });
    const result = processInstantCreatorPayout({
      creatorUserId: "cr-pay-1",
      grossCents: 1000,
    });
    expect(result).toBeNull();
    const dash = getCreatorPayoutDashboard("cr-pay-1");
    expect(dash.payout.pendingBalanceCents).toBe(Math.round(1000 * CREATOR_PAYOUT_SHARE));
  });

  it("sends instant USDC payout after Uphold connect", () => {
    completeUpholdConnection({
      userId: "cr-pay-2",
      upholdEmail: "creator@uphold.com",
    });
    const tx = processInstantCreatorPayout({
      creatorUserId: "cr-pay-2",
      grossCents: 2000,
    });
    expect(tx?.status).toBe("completed");
    expect(tx?.netCents).toBe(Math.round(2000 * CREATOR_PAYOUT_SHARE));
    expect(tx?.blockchainTxHash).toBeTruthy();
    const dash = getCreatorPayoutDashboard("cr-pay-2");
    expect(dash.canReceiveInstantPayouts).toBe(true);
  });

  it("supports direct crypto wallet payouts", () => {
    connectCryptoWallet({
      userId: "cr-pay-3",
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    });
    const tx = processInstantCreatorPayout({
      creatorUserId: "cr-pay-3",
      grossCents: 500,
    });
    expect(tx?.method).toBe("crypto_wallet");
    expect(tx?.asset).toBe("USDC");
  });
});
