import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, secureCheckoutProcedure, secureProcedure } from "../_core/trpc";
import { getContentCreatorProfile } from "../_core/partner-program-service";
import { sanitizeUserText } from "../_core/input-sanitize";
import { mapServiceErrorToTrpc } from "../_core/service-errors";
import { assertPaymentChannelAllowed, assertSimulatedPurchaseAllowed } from "../_core/payment-channel-guard";
import { createCreatorMarketplaceCheckout } from "../_core/stripe-checkout-service";
import { isSimulatedCommerceMode, getCommerceMode, LIVE_CHECKOUT_UNAVAILABLE_NOTICE } from "../../lib/dev-commerce-mode";
import { isStripeConnectReady } from "../_core/stripe-connect-service";
import { optionalBillingStateSchema } from "../../lib/billing-state-schema";
import {
  LIVE_FEED_MAX_PRICE_CENTS,
  LIVE_FEED_MIN_PRICE_CENTS,
  LIVE_FEED_PRODUCT,
  assertCanWatchLiveFeed,
  createCoHostInvite,
  endLiveFeed,
  enterLiveFeed,
  getLiveFeed,
  grantLiveFeedTicket,
  listHostLiveFeeds,
  listInterviewSignals,
  listLiveFeedCohosts,
  listLiveFeedSpeakers,
  postInterviewSignal,
  redeemCoHostInvite,
  startLiveFeed,
} from "../_core/live-feed-service";
import { createOrGetMuxLiveStream, publicMuxLiveHost, refreshMuxLiveForSession, signMuxPlayback } from "../_core/mux-video-engine";

function displayName(user: { name?: string | null }): string {
  return sanitizeUserText(user.name ?? "", 40) || "Member";
}

function feedView(feedId: string, userId: string, name: string) {
  const entered = enterLiveFeed({ feedId, userId, name });
  return {
    id: entered.feed.id,
    title: entered.feed.title,
    hostName: entered.feed.hostName,
    hostUserId: entered.feed.hostUserId,
    access: entered.feed.access,
    priceCents: entered.feed.priceCents,
    status: entered.feed.status,
    role: entered.role,
    canWatch: entered.canWatch,
    needsPayment: entered.needsPayment,
    watchPath: `/live-feed/${entered.feed.id}`,
    cohosts: listLiveFeedCohosts(entered.feed.id),
    speakers: entered.canWatch ? listLiveFeedSpeakers(entered.feed.id) : [],
  };
}

export const liveFeedRouter = router({
  mine: secureProcedure("video").query(({ ctx }) => listHostLiveFeeds(String(ctx.user.id))),

  start: secureProcedure("video")
    .input(
      z.object({
        title: z.string().trim().min(1).max(80),
        access: z.enum(["free", "paid"]),
        priceCents: z.number().int().min(0).max(LIVE_FEED_MAX_PRICE_CENTS).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const hostUserId = String(ctx.user.id);
      if (!getContentCreatorProfile(hostUserId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Enroll as a content creator before you go live." });
      }
      if (input.access === "paid" && (input.priceCents == null || input.priceCents < LIVE_FEED_MIN_PRICE_CENTS)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A paid live feed costs from $1.00 to $200.00." });
      }
      const feed = startLiveFeed({
        hostUserId,
        hostName: displayName(ctx.user),
        title: input.title,
        access: input.access,
        priceCents: input.priceCents,
      });
      return feedView(feed.id, hostUserId, displayName(ctx.user));
    }),

  end: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .mutation(({ ctx, input }) => endLiveFeed({ feedId: input.feedId, hostUserId: String(ctx.user.id) })),

  get: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      if (!getLiveFeed(input.feedId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Live feed not found." });
      }
      return feedView(input.feedId, String(ctx.user.id), displayName(ctx.user));
    }),

  pay: secureCheckoutProcedure("video")
    .input(
      z.object({
        feedId: z.string().uuid(),
        clientPlatform: z.enum(["web", "native"]),
        billingStateCode: optionalBillingStateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feed = getLiveFeed(input.feedId);
      if (!feed || feed.status !== "live" || feed.access !== "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This paid live feed is not open." });
      }
      const buyerUserId = String(ctx.user.id);
      if (buyerUserId === feed.hostUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are the host." });
      }
      assertPaymentChannelAllowed({ subtotalCents: feed.priceCents, clientPlatform: input.clientPlatform });
      if (!isSimulatedCommerceMode()) {
        if (getCommerceMode() !== "live") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: LIVE_CHECKOUT_UNAVAILABLE_NOTICE });
        }
        const billingStateCode = input.billingStateCode?.trim().toUpperCase();
        if (!billingStateCode) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Select your billing state so tax and the card fee go on your card." });
        }
        if (!isStripeConnectReady(feed.hostUserId)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "This creator has not connected a Stripe bank account yet.",
          });
        }
        try {
          const checkout = await createCreatorMarketplaceCheckout({
            buyerUserId,
            buyerEmail: ctx.user.email ?? "",
            creatorUserId: feed.hostUserId,
            kind: "sale",
            subtotalCents: feed.priceCents,
            billingStateCode,
            productName: `Paid live feed ${feed.title}`,
            successPath: `/live-feed/${feed.id}?paid=1`,
            cancelPath: `/live-feed/${feed.id}?paid=0`,
            extraMetadata: { product: LIVE_FEED_PRODUCT, feedId: feed.id },
          });
          return { mode: "checkout" as const, checkoutUrl: checkout.checkoutUrl, priceCents: feed.priceCents };
        } catch (error) {
          mapServiceErrorToTrpc(error);
        }
      }
      assertSimulatedPurchaseAllowed();
      grantLiveFeedTicket({
        feedId: feed.id,
        userId: buyerUserId,
        priceCents: feed.priceCents,
        name: displayName(ctx.user),
      });
      return { mode: "granted" as const, priceCents: feed.priceCents, ...feedView(feed.id, buyerUserId, displayName(ctx.user)) };
    }),

  inviteCoHost: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      const invite = createCoHostInvite({ feedId: input.feedId, hostUserId: String(ctx.user.id) });
      return {
        seatsLeft: invite.seatsLeft,
        guestPath: `/live-feed/${input.feedId}?guest=${invite.token}`,
      };
    }),

  redeemCoHost: secureProcedure("video")
    .input(z.object({ token: z.string().trim().min(20).max(80) }))
    .mutation(({ ctx, input }) =>
      redeemCoHostInvite({
        token: input.token,
        userId: String(ctx.user.id),
        name: displayName(ctx.user),
      }),
    ),

  startBroadcast: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const feed = getLiveFeed(input.feedId);
      const userId = String(ctx.user.id);
      if (!feed || feed.hostUserId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the host can start the live picture." });
      }
      if (feed.status !== "live") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This live feed has ended." });
      }
      try {
        const live = await createOrGetMuxLiveStream({ ownerUserId: userId, sessionId: feed.id });
        return publicMuxLiveHost(live);
      } catch (error) {
        if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Live video is not turned on yet. The platform owner still needs to connect the video account.",
          });
        }
        throw error;
      }
    }),

  watch: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      assertCanWatchLiveFeed(input.feedId, String(ctx.user.id));
      const live = await refreshMuxLiveForSession(input.feedId);
      if (!live?.playbackId) return { status: live?.status ?? "not_started", playback: null, locked: false };
      try {
        const playback = await signMuxPlayback(live.playbackId);
        return { status: live.status, playback, locked: false };
      } catch (error) {
        if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") {
          return { status: live.status, playback: null, locked: true };
        }
        throw error;
      }
    }),

  signal: secureProcedure("video")
    .input(
      z.object({
        feedId: z.string().uuid(),
        peerUserId: z.string().trim().min(1).max(80),
        kind: z.enum(["offer", "answer", "ice"]),
        payload: z.string().min(2).max(50_000),
      }),
    )
    .mutation(({ ctx, input }) =>
      postInterviewSignal({
        feedId: input.feedId,
        userId: String(ctx.user.id),
        peerUserId: input.peerUserId,
        kind: input.kind,
        payload: input.payload,
      }),
    ),

  signals: secureProcedure("video")
    .input(z.object({ feedId: z.string().uuid() }))
    .query(({ ctx, input }) => listInterviewSignals({ feedId: input.feedId, userId: String(ctx.user.id) })),
});
