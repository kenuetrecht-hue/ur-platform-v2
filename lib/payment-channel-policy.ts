/**
 * UR payment routing — enforced in UI and server mutations.
 *
 * - Exactly $5.00 service purchases → native app (in-app purchase)
 * - All other services (AI day/week/month subs, $1 talk packs, etc.) → web browser
 */

export type PaymentChannel = "in_app" | "web_browser";

export type ClientPlatform = "web" | "native";

/** Service subtotal that must checkout through the mobile app. */
export const IN_APP_ONLY_SUBTOTAL_CENTS = 500;

export const PAYMENT_CHANNEL_POLICY_HEADLINE = "How UR payments work";

export const PAYMENT_CHANNEL_POLICY_SUMMARY =
  "$5 purchases must be completed in the UR mobile app. All other services — including every AI " +
  "subscription (day, week, month) and $1 talk packs — must be purchased through your web browser.";

export const AI_SUBSCRIPTION_PRICING_SUMMARY =
  "Each AI specialist: $5.99 for 24 hours · $9.99 for one week · $14.99 for one month.";

export const AI_TALK_PRICING_SUMMARY =
  "AI voice talk-back: 25¢ per minute. Every $1 buys 5 minutes. $5 buys 25 minutes (mobile app only).";

export function getRequiredPaymentChannel(subtotalCents: number): PaymentChannel {
  return subtotalCents === IN_APP_ONLY_SUBTOTAL_CENTS ? "in_app" : "web_browser";
}

export function clientPlatformFromOs(os: string): ClientPlatform {
  return os === "web" ? "web" : "native";
}

export function channelForClientPlatform(platform: ClientPlatform): PaymentChannel {
  return platform === "web" ? "web_browser" : "in_app";
}

export function isPaymentChannelAllowed(params: {
  subtotalCents: number;
  clientPlatform: ClientPlatform;
}): boolean {
  const required = getRequiredPaymentChannel(params.subtotalCents);
  const attempted = channelForClientPlatform(params.clientPlatform);
  return required === attempted;
}

export function getPaymentChannelBlockedMessage(params: {
  subtotalCents: number;
  clientPlatform: ClientPlatform;
}): string {
  const required = getRequiredPaymentChannel(params.subtotalCents);
  if (required === "in_app") {
    return (
      "This $5.00 purchase must be completed in the UR mobile app (in-app purchase). " +
      "Open the app on your phone to continue."
    );
  }
  return (
    "AI subscriptions and this purchase must be completed in your web browser. " +
    "Tap “Continue in browser” to open secure checkout."
  );
}

export function getPaymentChannelLabel(channel: PaymentChannel): string {
  return channel === "in_app" ? "Mobile app (in-app purchase)" : "Web browser checkout";
}
