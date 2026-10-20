import { TRPCError } from "@trpc/server";
import {
  applyBetaBasicDiscountCents,
  qualifiesForBetaBasicDiscount,
} from "../../lib/beta-test-offer";
import {
  getCommerceMode,
  isSimulatedCommerceMode,
  LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
} from "../../lib/dev-commerce-mode";
import { getUserById } from "../db";
import { createPlatformCheckoutSession } from "./stripe-checkout-service";
import { mapServiceErrorToTrpc } from "./service-errors";

export const LIVE_CARD_CHECKOUT_MESSAGE =
  "Continue in the secure Stripe window. Enter your card there. The purchase is added after Stripe confirms payment.";

export type LiveCheckoutRedirect = {
  mode: "checkout";
  checkoutUrl: string;
  sessionId: string;
  totalCents: number;
  message: string;
};

/** Production opens Stripe. Development keeps the existing practice purchase. */
export async function redirectToLiveCheckout(params: {
  userId: string;
  userEmail: string;
  productName: string;
  description: string;
  priceCents: number;
  billingStateCode?: string | null;
  successPath: string;
  cancelPath: string;
  metadata: Record<string, string>;
}): Promise<LiveCheckoutRedirect | null> {
  if (isSimulatedCommerceMode()) return null;
  if (getCommerceMode() !== "live") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
    });
  }
  const chargeSubtotalCents = await betaBasicChargeCents(params.userId, params.priceCents);
  const description =
    chargeSubtotalCents < params.priceCents
      ? `${params.description} Beta member price, 10% off until launch day.`
      : params.description;
  try {
    const checkout = await createPlatformCheckoutSession({
      userId: params.userId,
      userEmail: params.userEmail,
      productName: params.productName,
      description,
      priceCents: params.priceCents,
      chargeSubtotalCents,
      billingStateCode: params.billingStateCode ?? "",
      successPath: params.successPath,
      cancelPath: params.cancelPath,
      metadata: {
        ...params.metadata,
        userEmail: params.userEmail,
      },
    });
    return {
      mode: "checkout",
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      totalCents: checkout.totalCents,
      message: LIVE_CARD_CHECKOUT_MESSAGE,
    };
  } catch (error) {
    mapServiceErrorToTrpc(error);
  }
}

/** Basic beta members pay 10% less on UR-owned prices. Creators keep the full catalog price. */
async function betaBasicChargeCents(userId: string, listCents: number): Promise<number> {
  const id = Number(userId);
  if (!Number.isInteger(id) || id < 1) return listCents;
  try {
    const { hydrateCreatorRosterFromDatabase, getContentCreatorProfile } = await import(
      "./partner-program-service"
    );
    await hydrateCreatorRosterFromDatabase();
    if (getContentCreatorProfile(userId)) return listCents;
  } catch {
    return listCents;
  }
  const user = await getUserById(id);
  const joinedAt = user?.createdAt ? new Date(user.createdAt) : null;
  if (!joinedAt || Number.isNaN(joinedAt.getTime())) return listCents;
  if (!qualifiesForBetaBasicDiscount(joinedAt)) return listCents;
  return applyBetaBasicDiscountCents(listCents);
}
