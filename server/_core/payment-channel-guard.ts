import { TRPCError } from "@trpc/server";
import {
  type ClientPlatform,
  getPaymentChannelBlockedMessage,
  isPaymentChannelAllowed,
  getRequiredPaymentChannel,
  getPaymentChannelLabel,
} from "../../lib/payment-channel-policy";
import { ENV } from "./env";

export function assertPaymentChannelAllowed(params: {
  subtotalCents: number;
  clientPlatform: ClientPlatform;
}): { channel: ReturnType<typeof getRequiredPaymentChannel> } {
  if (!isPaymentChannelAllowed(params)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: getPaymentChannelBlockedMessage(params),
    });
  }
  return { channel: getRequiredPaymentChannel(params.subtotalCents) };
}

export function paymentChannelNote(subtotalCents: number): string {
  const channel = getRequiredPaymentChannel(subtotalCents);
  return `Checkout via ${getPaymentChannelLabel(channel)}.`;
}

/** Block dev-only simulated checkout from granting entitlements in production. */
export function assertSimulatedPurchaseAllowed(): void {
  if (ENV.isProduction) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Payment verification is required. Complete checkout through the secure payment flow — simulated purchases are disabled in production.",
    });
  }
}
