import { TRPCError } from "@trpc/server";
import {
  getCommerceMode,
  isSimulatedCommerceMode,
  LIVE_CHECKOUT_UNAVAILABLE_NOTICE,
} from "../../lib/dev-commerce-mode";
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
  try {
    const checkout = await createPlatformCheckoutSession({
      userId: params.userId,
      userEmail: params.userEmail,
      productName: params.productName,
      description: params.description,
      priceCents: params.priceCents,
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
