import express, { type Express, type Request, type Response } from "express";
import { InternalServiceError } from "./service-errors";
import { getStripeWebhookSecret, redactSecrets } from "./secrets";
import { fulfillStripeCheckoutSession, verifyStripeWebhookEvent } from "./stripe-checkout-service";
import { applyStripeAccountWebhook } from "./stripe-connect-service";
import { attachStripeConnectPayout } from "./creator-payout-service";

export function registerStripeWebhook(app: Express): void {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    (req: Request, res: Response) => {
      if (!getStripeWebhookSecret().startsWith("whsec_")) {
        res.status(503).json({ ok: false });
        return;
      }

      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
      const signature =
        typeof req.headers["stripe-signature"] === "string" ? req.headers["stripe-signature"] : "";
      if (!rawBody || !signature) {
        res.status(400).json({ ok: false });
        return;
      }

      try {
        const event = verifyStripeWebhookEvent(rawBody, signature);
        if (event.type === "account.updated") {
          const account = applyStripeAccountWebhook(event.data.object as {
            id?: string;
            charges_enabled?: boolean;
            payouts_enabled?: boolean;
            details_submitted?: boolean;
            metadata?: Record<string, string> | null;
          });
          if (account?.chargesEnabled && account.payoutsEnabled) {
            attachStripeConnectPayout(account.userId, account.stripeAccountId);
          }
          res.status(200).json({ ok: true, handled: Boolean(account) });
          return;
        }
        if (
          event.type !== "checkout.session.completed" &&
          event.type !== "checkout.session.async_payment_succeeded"
        ) {
          res.status(200).json({ ok: true, ignored: true });
          return;
        }
        const sessionUnknown = event.data.object;
        const session = {
          id: typeof sessionUnknown.id === "string" ? sessionUnknown.id : "",
          payment_status:
            typeof sessionUnknown.payment_status === "string" ? sessionUnknown.payment_status : null,
          metadata:
            sessionUnknown.metadata && typeof sessionUnknown.metadata === "object"
              ? (sessionUnknown.metadata as Record<string, string>)
              : null,
        };
        if (!session.id) {
          res.status(400).json({ ok: false });
          return;
        }
        const result = fulfillStripeCheckoutSession(session);
        res.status(200).json({ ok: true, handled: result.handled, ignored: result.ignored });
      } catch (error) {
        if (error instanceof InternalServiceError && error.code === "NOT_CONFIGURED") {
          res.status(503).json({ ok: false });
          return;
        }
        const message = error instanceof Error ? error.message : "webhook";
        console.warn("[stripe-webhook]", redactSecrets(message));
        res.status(400).json({ ok: false });
      }
    },
  );
}
