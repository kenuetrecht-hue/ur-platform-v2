/**
 * Content-creator tips — 100% of the listed amount to the creator.
 * The fan pays the Stripe card fee on top. Not stamps. Not class 85/15.
 */

import { TRPCError } from "@trpc/server";
import { recordTransaction } from "./transaction-ledger-service";
import { processInstantCreatorPayout } from "./creator-payout-service";
import { creditCreatorTipEarnings, getContentCreatorProfile } from "./partner-program-service";
import { sanitizeUserText } from "./input-sanitize";
import {
  CREATOR_TIPS_PURPOSE,
  creatorTipCheckout,
  getCreatorTipPack,
  CREATOR_TIP_PACKS,
  type CreatorTipPackId,
} from "../../lib/creator-tips";

export function getCreatorTipsCatalog() {
  return {
    purpose: CREATOR_TIPS_PURPOSE,
    packs: CREATOR_TIP_PACKS.map((p) => ({
      ...p,
      checkout: creatorTipCheckout(p.priceCents),
    })),
  };
}

export function sendCreatorTip(params: {
  fromUserId: string;
  fromEmail: string;
  fromName?: string;
  creatorUserId: string;
  packId: CreatorTipPackId;
  billingStateCode?: string | null;
}): {
  creatorGetsCents: number;
  chargeCents: number;
  feeCents: number;
  notice: string;
} {
  if (params.fromUserId === params.creatorUserId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot tip yourself." });
  }
  const pack = getCreatorTipPack(params.packId);
  if (!pack) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown tip amount." });
  }
  if (pack.priceCents === 500) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tips cannot be priced at exactly $5.00." });
  }
  const creator = getContentCreatorProfile(params.creatorUserId);
  if (!creator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tips go to enrolled content creators. Casual members pass stamps — like emojis — instead.",
    });
  }

  const checkout = creatorTipCheckout(pack.priceCents, params.billingStateCode);
  creditCreatorTipEarnings(params.creatorUserId, pack.priceCents);

  const note = sanitizeUserText(
    `Tip ${checkout.creatorLabel} to ${creator.displayName} — creator keeps 100%; fan paid ${checkout.chargeLabel} including ${checkout.taxLabel} tax and ${checkout.feeLabel} card fee`,
    240,
  );

  recordTransaction({
    type: "tip",
    amountCents: pack.priceCents,
    description: note,
    payerUserId: params.fromUserId,
    payerEmail: params.fromEmail,
    payeeUserId: params.creatorUserId,
    payeeEmail: creator.userEmail,
    metadata: {
      creatorTip: true,
      packId: pack.id,
      chargeCents: checkout.chargeCents,
      stripeFeeCents: checkout.feeCents,
      salesTaxCents: checkout.taxCents,
      creatorSharePercent: 100,
    },
  });

  processInstantCreatorPayout({
    creatorUserId: params.creatorUserId,
    grossCents: pack.priceCents,
    kind: "tip",
    description: `Creator tip ${checkout.creatorLabel} — 100% to creator (fan paid card fee)`,
  });

  const from = (params.fromName ?? "A member").split(/\s+/)[0] ?? "A member";
  return {
    creatorGetsCents: checkout.creatorGetsCents,
    chargeCents: checkout.chargeCents,
    feeCents: checkout.feeCents,
    notice: `${from} tipped ${creator.displayName} ${checkout.creatorLabel}. They keep all of it. You paid ${checkout.chargeLabel} including ${checkout.taxLabel} tax and the ${checkout.feeLabel} card fee. Not a stamp.`,
  };
}
