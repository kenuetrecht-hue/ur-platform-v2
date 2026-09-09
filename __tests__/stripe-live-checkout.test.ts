import { afterEach, describe, expect, it } from "vitest";
import {
  getCommerceMode,
  hasLiveStripeKeys,
  hasStripeWebhookSecret,
  isSimulatedCommerceMode,
  isStripeLiveCheckoutReady,
} from "../lib/dev-commerce-mode";
import { isAllowedCheckoutUrl } from "../lib/checkout-url-policy";
import { assertServerSecretsSafe, redactSecrets } from "../server/_core/secrets";
import {
  fulfillStripeCheckoutSession,
  verifyStripeWebhookEvent,
  createTalkPackCheckoutSession,
  createStripeTestSignatureHeader,
  _resetStripeCheckoutForTests,
} from "../server/_core/stripe-checkout-service";
import { InternalServiceError } from "../server/_core/service-errors";
import {
  getAiTalkMinutesRemaining,
  hasAiTalkAccess,
} from "../server/_core/ai-premium-media-service";
import { _clearTalkTimeForTests } from "../server/_core/ai-talk-time-tracker";

/** Built at runtime so GitHub push protection does not treat test fixtures as live keys. */
const FAKE_LIVE_SECRET = ["sk", "live", "notarealkeyfortests"].join("_");
const FAKE_LIVE_PUBLISHABLE = ["pk", "live", "notarealkeyfortests"].join("_");
const FAKE_WEBHOOK_SECRET = ["whsec", "notarealkeyfortests"].join("_");

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
};

function restoreStripeEnv(): void {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  process.env.STRIPE_SECRET_KEY = originalEnv.STRIPE_SECRET_KEY;
  process.env.STRIPE_PUBLISHABLE_KEY = originalEnv.STRIPE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = originalEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = originalEnv.STRIPE_WEBHOOK_SECRET;
}

describe("commerce mode", () => {
  afterEach(() => {
    restoreStripeEnv();
  });

  it("stays simulated outside production even if live keys are present", () => {
    process.env.NODE_ENV = "test";
    process.env.STRIPE_SECRET_KEY = FAKE_LIVE_SECRET;
    process.env.STRIPE_PUBLISHABLE_KEY = FAKE_LIVE_PUBLISHABLE;
    process.env.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET;
    expect(getCommerceMode()).toBe("simulated");
    expect(isSimulatedCommerceMode()).toBe(true);
    expect(isStripeLiveCheckoutReady()).toBe(false);
  });

  it("requires sk_live_ and pk_live_ prefixes", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_not_live";
    process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_not_live";
    expect(hasLiveStripeKeys()).toBe(false);
  });

  it("is unavailable in production without a webhook secret", () => {
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = FAKE_LIVE_SECRET;
    process.env.STRIPE_PUBLISHABLE_KEY = FAKE_LIVE_PUBLISHABLE;
    process.env.STRIPE_WEBHOOK_SECRET = "";
    expect(hasStripeWebhookSecret()).toBe(false);
    expect(getCommerceMode()).toBe("unavailable");
    expect(isStripeLiveCheckoutReady()).toBe(false);
  });

  it("is live in production only with live keys and webhook secret", () => {
    process.env.NODE_ENV = "production";
    process.env.STRIPE_SECRET_KEY = FAKE_LIVE_SECRET;
    process.env.STRIPE_PUBLISHABLE_KEY = FAKE_LIVE_PUBLISHABLE;
    process.env.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET;
    expect(getCommerceMode()).toBe("live");
    expect(isStripeLiveCheckoutReady()).toBe(true);
  });
});

describe("checkout URL allowlist", () => {
  it("allows Stripe HTTPS and local development URLs only", () => {
    expect(isAllowedCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_a")).toBe(true);
    expect(isAllowedCheckoutUrl("http://localhost:8082/ais")).toBe(true);
    expect(isAllowedCheckoutUrl("http://evil.example/phish")).toBe(false);
    expect(isAllowedCheckoutUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("secret redaction and public env guards", () => {
  it("redacts Stripe live secrets in logs", () => {
    const sampleSecret = ["sk", "live", "abc123xyz"].join("_");
    const sampleWebhook = ["whsec", "abc123xyz"].join("_");
    const redacted = redactSecrets(`key=${sampleSecret} webhook=${sampleWebhook}`);
    expect(redacted).not.toContain(sampleSecret);
    expect(redacted).not.toContain(sampleWebhook);
    expect(redacted).toContain("[REDACTED_STRIPE_SECRET]");
    expect(redacted).toContain("[REDACTED_STRIPE_WEBHOOK]");
  });

  it("rejects a Stripe secret on a public env prefix", () => {
    process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY = FAKE_LIVE_SECRET;
    try {
      expect(() => assertServerSecretsSafe()).toThrow(/must not be exposed to the client/i);
    } finally {
      delete process.env.EXPO_PUBLIC_STRIPE_SECRET_KEY;
    }
  });
});

describe("Stripe webhook fulfillment", () => {
  afterEach(() => {
    restoreStripeEnv();
    _resetStripeCheckoutForTests();
    _clearTalkTimeForTests();
  });

  it("rejects a webhook with a bad signature", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_testsecretfortests1234567890";
    expect(() => verifyStripeWebhookEvent("{}", "t=1,v1=deadbeef")).toThrow();
  });

  it("grants talk minutes only after a signed paid checkout session", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_testsecretfortests1234567890";
    const userId = "stripe-talk-user-1";
    const payload = JSON.stringify({
      id: "evt_test_talk_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_talk_1",
          object: "checkout.session",
          payment_status: "paid",
          metadata: {
            kind: "talk_pack",
            userId,
            packId: "talk_1",
            billingStateCode: "IN",
            priceCents: "100",
          },
        },
      },
    });
    const signature = createStripeTestSignatureHeader(
      payload,
      "whsec_testsecretfortests1234567890",
    );
    const event = verifyStripeWebhookEvent(payload, signature);
    expect(event.type).toBe("checkout.session.completed");
    const session = event.data.object as {
      id: string;
      payment_status?: string;
      metadata?: Record<string, string>;
    };
    expect(hasAiTalkAccess(userId)).toBe(false);
    const first = fulfillStripeCheckoutSession(session);
    expect(first.handled).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(5);
    const second = fulfillStripeCheckoutSession(session);
    expect(second.handled).toBe(true);
    expect(getAiTalkMinutesRemaining(userId)).toBe(5);
  });

  it("does not grant talk time for an unpaid session", () => {
    const userId = "stripe-talk-unpaid";
    const result = fulfillStripeCheckoutSession({
      id: "cs_test_unpaid",
      payment_status: "unpaid",
      metadata: {
        kind: "talk_pack",
        userId,
        packId: "talk_1",
        billingStateCode: "IN",
        priceCents: "100",
      },
    });
    expect(result.ignored).toBe(true);
    expect(hasAiTalkAccess(userId)).toBe(false);
  });
});

describe("live Stripe checkout guard", () => {
  afterEach(() => {
    restoreStripeEnv();
    _resetStripeCheckoutForTests();
  });

  it("never opens live Stripe checkout from tests or local development", async () => {
    process.env.NODE_ENV = "test";
    process.env.STRIPE_SECRET_KEY = FAKE_LIVE_SECRET;
    process.env.STRIPE_PUBLISHABLE_KEY = FAKE_LIVE_PUBLISHABLE;
    process.env.STRIPE_WEBHOOK_SECRET = FAKE_WEBHOOK_SECRET;
    await expect(
      createTalkPackCheckoutSession({
        userId: "user-1",
        userEmail: "member@example.com",
        packId: "talk_1",
        billingStateCode: "IN",
      }),
    ).rejects.toBeInstanceOf(InternalServiceError);
  });
});
