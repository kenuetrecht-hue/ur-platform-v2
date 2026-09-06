/**
 * UR payment routing — enforced in UI and server mutations.
 *
 * - Exactly $5.00 service purchases → native app (in-app purchase)
 * - All other services (AI day/week/month subs, $1 talk packs, $120 / 500-min and $200 / 1,000-min packs, etc.) → web browser
 */

export type PaymentChannel = "in_app" | "web_browser";

export type ClientPlatform = "web" | "native";

/** Service subtotal that must checkout through the mobile app. */
export const IN_APP_ONLY_SUBTOTAL_CENTS = 500;

export const PAYMENT_CHANNEL_POLICY_HEADLINE = "How UR payments work";

export const PAYMENT_CHANNEL_POLICY_SUMMARY =
  "$5 purchases — including Talk Time and social stamp packs — must be completed in the UR mobile app. All other services — including every AI " +
  "subscription (day, week, month), $1 talk packs, the $120 / 500-minute and $200 / 1,000-minute packs, Cartoon Studio, and Cartoon Me Creator Platform — must be purchased through your web browser.";

export const AI_SUBSCRIPTION_PRICING_SUMMARY =
  "Platform text pass (every specialist, one at a time): $7.99/day = 35 messages · $15.99/week = 130 messages · $24.99/month = 350 messages (+ 10 web searches/day). Extra concurrent slot: $4.99/day · $9.99/week · $14.99/month.";

export const AI_TALK_PRICING_SUMMARY =
  "AI voice talk-back: 25¢ per minute. Every $1 buys 5 minutes. $5 buys 20 minutes (mobile app only). $120 buys 500 minutes (web). $200 buys 1,000 minutes (web).";

export const CARTOON_STUDIO_CHANNEL_SUMMARY =
  "Cartoon Studio is web checkout: Draft 25¢/sec · Lite 29¢/sec · Mid 49¢/sec · Cinema 99¢/sec · Premiere 4K $1.49/sec. Tax and Stripe on top. No refunds.";

export const CARTOON_CREATOR_CHANNEL_SUMMARY =
  "Cartoon Me Creator Platform (web): Channel $49.99 / 12 live hours · Studio $149.99 / 40 hours · Network $399.99 / 120 hours. 30 days. Tax and Stripe on top. No refunds.";

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
