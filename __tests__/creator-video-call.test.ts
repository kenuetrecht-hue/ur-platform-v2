import { afterEach, describe, expect, it } from "vitest";
import {
  CREATOR_VIDEO_CALL_MAX_CENTS,
  CREATOR_VIDEO_CALL_MIN_CENTS,
  CREATOR_VIDEO_CALL_SKU,
  creatorCallPriceError,
  dollarsToCallPriceCents,
  isAllowedCreatorCallPriceCents,
} from "../lib/creator-call-pricing";
import {
  enrollContentCreator,
  getCreatorCallOffer,
  setCreatorVideoCallPrice,
  _resetPartnerProgramForTests,
} from "../server/_core/partner-program-service";
import {
  createCreatorVideoCall,
  createVideoCall,
  endVideoCall,
  joinVideoCall,
  toPublicVideoCall,
  _resetVideoCallsForTests,
} from "../server/_core/video-call-service";
import {
  getCreatorCallTicketById,
  grantCreatorCallTicket,
  getOpenCreatorCallTicket,
  consumeCreatorCallTicket,
  _resetCreatorCallTicketsForTests,
} from "../server/_core/creator-call-ticket-service";
import {
  acceptFriendRequest,
  registerSocialUser,
  sendFriendRequest,
} from "../server/_core/social-service";
import {
  fulfillStripeCheckoutSession,
  fulfillCreatorCallPaymentIntent,
  settleCreatorCallOnEnd,
  STRIPE_CREATOR_SALE_KIND,
  _resetStripeCheckoutForTests,
} from "../server/_core/stripe-checkout-service";
import { splitCreatorStripeCharge } from "../lib/stripe-connect-split";
import { CREATOR_PAYOUT_SHARE, getCreatorPayoutDashboard } from "../server/_core/creator-payout-service";
import { calculateCustomerCheckout } from "../lib/stripe-checkout-pricing";
import { issueCallAccessToken, verifyCallAccessToken } from "../server/_core/call-access-token";
import {
  endCallMeter,
  markCallJoin,
  startCallMeter,
  wasCallAnswered,
  _resetCallMetersForTests,
} from "../server/_core/call-meter-service";
import { mintCoturnRestCredentials, _resetTurnIceForTests, _setTurnEnvForTests, isTurnConfigured, getIceServersForCall } from "../server/_core/turn-ice-service";
import { parseTurnUrls } from "../lib/webrtc-ice";

describe("creator 1-to-1 call pricing", () => {
  it("allows $1 and $5000 and blocks $5.00", () => {
    expect(isAllowedCreatorCallPriceCents(CREATOR_VIDEO_CALL_MIN_CENTS)).toBe(true);
    expect(isAllowedCreatorCallPriceCents(CREATOR_VIDEO_CALL_MAX_CENTS)).toBe(true);
    expect(isAllowedCreatorCallPriceCents(499)).toBe(true);
    expect(isAllowedCreatorCallPriceCents(501)).toBe(true);
    expect(isAllowedCreatorCallPriceCents(500)).toBe(false);
    expect(creatorCallPriceError(500)).toMatch(/\$5\.00/);
    expect(isAllowedCreatorCallPriceCents(99)).toBe(false);
    expect(isAllowedCreatorCallPriceCents(500_001)).toBe(false);
    expect(dollarsToCallPriceCents("1")).toBe(100);
    expect(dollarsToCallPriceCents("5000")).toBe(500_000);
  });
});

describe("millisecond call meter", () => {
  afterEach(() => _resetCallMetersForTests());

  it("tracks connected time to the millisecond", () => {
    startCallMeter({ roomId: "room-ms", createdMs: 1_000 });
    markCallJoin({
      roomId: "room-ms",
      userId: "caller",
      callerUserId: "caller",
      calleeUserId: "callee",
      atMs: 1_250,
    });
    markCallJoin({
      roomId: "room-ms",
      userId: "callee",
      callerUserId: "caller",
      calleeUserId: "callee",
      atMs: 1_337,
    });
    const ended = endCallMeter({ roomId: "room-ms", atMs: 4_001 });
    expect(wasCallAnswered(ended)).toBe(true);
    expect(ended.connectedStartMs).toBe(1_337);
    expect(ended.connectedMs).toBe(2_664);
    expect(ended.events.some((e) => e.type === "connected")).toBe(true);
  });
});

describe("TURN ice", () => {
  afterEach(() => {
    _resetTurnIceForTests();
  });

  it("parses turn URLs and mints coturn REST credentials", () => {
    expect(parseTurnUrls("turn:1.2.3.4:3478?transport=udp, turns:1.2.3.4:5349")).toEqual([
      "turn:1.2.3.4:3478?transport=udp",
      "turns:1.2.3.4:5349",
    ]);
    const minted = mintCoturnRestCredentials({
      secret: "unit-secret",
      userId: "user-1",
      nowMs: 1_700_000_000_000,
      ttlSec: 3600,
    });
    expect(minted.username).toMatch(/^[0-9]+:user-1$/);
    expect(minted.credential.length).toBeGreaterThan(10);
  });

  it("includes TURN when coturn env is set", async () => {
    _setTurnEnvForTests({
      TURN_URLS: "turn:turn.example:3478?transport=udp",
      TURN_AUTH_SECRET: "shared-secret",
    });
    expect(isTurnConfigured()).toBe(true);
    const ice = await getIceServersForCall({ userId: "u1" });
    expect(ice.turn.provider).toBe("coturn");
    expect(ice.iceServers.some((s) => JSON.stringify(s.urls).includes("turn:turn.example"))).toBe(true);
    expect(ice.iceServers.some((s) => s.username && s.credential)).toBe(true);
  });

  it("ignores EXPO_PUBLIC TURN secrets so they cannot leak from the client bundle", async () => {
    _setTurnEnvForTests({
      EXPO_PUBLIC_TURN_URLS: "turn:evil.example:3478",
      EXPO_PUBLIC_TURN_AUTH_SECRET: "leaked-secret",
    });
    expect(isTurnConfigured()).toBe(false);
    const ice = await getIceServersForCall({ userId: "u1" });
    expect(JSON.stringify(ice.iceServers)).not.toContain("evil.example");
  });
});

describe("creator video call rooms", () => {
  afterEach(() => {
    _resetPartnerProgramForTests();
    _resetVideoCallsForTests();
    _resetCreatorCallTicketsForTests();
    _resetStripeCheckoutForTests();
    _resetCallMetersForTests();
  });

  it("lets a creator set $1 or $5000 and keeps 85% for the creator", () => {
    enrollContentCreator({
      userId: "creator-call-1",
      userEmail: "c1@test.com",
      displayName: "Caller",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(setCreatorVideoCallPrice({ creatorUserId: "creator-call-1", priceCents: 100 }).videoCallPriceCents).toBe(100);
    expect(setCreatorVideoCallPrice({ creatorUserId: "creator-call-1", priceCents: 500_000 }).videoCallPriceCents).toBe(
      500_000,
    );
    expect(getCreatorCallOffer("creator-call-1").priceCents).toBe(500_000);

    const priced = calculateCustomerCheckout(100, "IN");
    const split = splitCreatorStripeCharge({
      kind: "sale",
      subtotalCents: priced.subtotalCents,
      salesTaxCents: priced.salesTaxCents,
      stateFeeCents: priced.stateFeeCents,
      saleShare: CREATOR_PAYOUT_SHARE,
    });
    expect(split.creatorCents).toBe(85);
    expect(split.platformFeeCents).toBe(15);
  });

  it("rejects $5.00 as a creator call price", () => {
    enrollContentCreator({
      userId: "creator-call-5",
      userEmail: "c5@test.com",
      displayName: "Five",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(() => setCreatorVideoCallPrice({ creatorUserId: "creator-call-5", priceCents: 500 })).toThrow(/\$5\.00/);
  });

  it("keeps friend calls free and requires a paid ticket for creator calls", () => {
    registerSocialUser({ userId: "u1", email: "a@test.com", displayName: "A" });
    registerSocialUser({ userId: "u2", email: "b@test.com", displayName: "B" });
    const req = sendFriendRequest({
      fromUserId: "u1",
      fromEmail: "a@test.com",
      fromName: "A",
      toEmail: "b@test.com",
    });
    acceptFriendRequest({ userId: "u2", friendshipId: req.id });
    const friendRoom = createVideoCall({ callerUserId: "u1", calleeUserId: "u2" });
    expect(friendRoom.kind).toBe("friend");
    expect(friendRoom.paidCents).toBeUndefined();

    enrollContentCreator({
      userId: "creator-paid-call",
      userEmail: "cp@test.com",
      displayName: "Paid",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(() =>
      createCreatorVideoCall({ callerUserId: "u1", creatorUserId: "creator-paid-call" }),
    ).toThrow(/Authorize this 1-to-1 call first/);

    grantCreatorCallTicket({
      buyerUserId: "u1",
      creatorUserId: "creator-paid-call",
      priceCents: 2500,
      sourceTransactionId: "sim-1",
    });
    const paid = createCreatorVideoCall({ callerUserId: "u1", creatorUserId: "creator-paid-call" });
    expect(paid.kind).toBe("creator");
    expect(paid.paidCents).toBe(2500);
    expect(paid.calleeUserId).toBe("creator-paid-call");
    expect(getOpenCreatorCallTicket({ buyerUserId: "u1", creatorUserId: "creator-paid-call" })).toBeNull();
  });

  it("holds the card on checkout without taking the money yet", () => {
    enrollContentCreator({
      userId: "creator-fulfill-call",
      userEmail: "cf@test.com",
      displayName: "Fulfill",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const result = fulfillStripeCheckoutSession({
      id: "cs_test_creator_call_1",
      payment_status: "unpaid",
      payment_intent: "pi_hold_1",
      metadata: {
        kind: STRIPE_CREATOR_SALE_KIND,
        sku: CREATOR_VIDEO_CALL_SKU,
        userId: "fan-1",
        creatorUserId: "creator-fulfill-call",
        priceCents: "1000",
        creatorCents: "850",
        platformFeeCents: "150",
      },
    });
    expect(result.handled).toBe(true);
    expect(getOpenCreatorCallTicket({ buyerUserId: "fan-1", creatorUserId: "creator-fulfill-call" })?.status).toBe(
      "authorized",
    );
    expect(getCreatorPayoutDashboard("creator-fulfill-call").recentPayouts).toHaveLength(0);
  });

  it("captures after both people connect and voids if nobody answers", async () => {
    enrollContentCreator({
      userId: "creator-settle-call",
      userEmail: "cs@test.com",
      displayName: "Settle",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const answeredTicket = grantCreatorCallTicket({
      buyerUserId: "fan-ok",
      creatorUserId: "creator-settle-call",
      priceCents: 1000,
      sourceTransactionId: "cs_ok",
      paymentIntentId: "sim_pi_ok",
    });
    const answeredRoom = createCreatorVideoCall({
      callerUserId: "fan-ok",
      creatorUserId: "creator-settle-call",
    });
    joinVideoCall({ roomId: answeredRoom.id, userId: "fan-ok" });
    joinVideoCall({ roomId: answeredRoom.id, userId: "creator-settle-call" });
    const ended = endVideoCall({ roomId: answeredRoom.id, userId: "fan-ok" });
    const captured = await settleCreatorCallOnEnd({
      roomId: ended.id,
      kind: ended.kind,
      ticketId: ended.ticketId,
      paymentIntentId: ended.paymentIntentId,
      callerUserId: ended.callerUserId,
      calleeUserId: ended.calleeUserId,
    });
    expect(captured.action).toBe("captured");
    expect(getCreatorCallTicketById(answeredTicket.id)?.status).toBe("captured");
    expect(getCreatorPayoutDashboard("creator-settle-call").recentPayouts[0]?.netCents).toBe(850);

    const missedTicket = grantCreatorCallTicket({
      buyerUserId: "fan-miss",
      creatorUserId: "creator-settle-call",
      priceCents: 2000,
      sourceTransactionId: "cs_miss",
      paymentIntentId: "sim_pi_miss",
    });
    const missedRoom = createCreatorVideoCall({
      callerUserId: "fan-miss",
      creatorUserId: "creator-settle-call",
    });
    joinVideoCall({ roomId: missedRoom.id, userId: "fan-miss" });
    const missedEnd = endVideoCall({ roomId: missedRoom.id, userId: "fan-miss" });
    const voided = await settleCreatorCallOnEnd({
      roomId: missedEnd.id,
      kind: missedEnd.kind,
      ticketId: missedEnd.ticketId,
      paymentIntentId: missedEnd.paymentIntentId,
      callerUserId: missedEnd.callerUserId,
      calleeUserId: missedEnd.calleeUserId,
    });
    expect(voided.action).toBe("voided");
    expect(getCreatorCallTicketById(missedTicket.id)?.status).toBe("voided");
    const payouts = getCreatorPayoutDashboard("creator-settle-call").recentPayouts;
    expect(payouts.filter((p) => p.sourceTransactionId === "sim_pi_ok")).toHaveLength(1);
    expect(payouts.filter((p) => p.sourceTransactionId === "sim_pi_miss")).toHaveLength(0);
  });

  it("issues a call access token the native app can open in the browser", () => {
    const token = issueCallAccessToken({ roomId: "11111111-1111-4111-8111-111111111111", userId: "u1" });
    const parsed = verifyCallAccessToken(token);
    expect(parsed?.userId).toBe("u1");
    expect(parsed?.roomId).toBe("11111111-1111-4111-8111-111111111111");
    expect(verifyCallAccessToken("not-a-token")).toBeNull();
  });

  it("never sends Stripe payment ids to the call client", () => {
    enrollContentCreator({
      userId: "creator-public-room",
      userEmail: "pub@test.com",
      displayName: "Public",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    grantCreatorCallTicket({
      buyerUserId: "fan-public",
      creatorUserId: "creator-public-room",
      priceCents: 1000,
      sourceTransactionId: "pub_1",
      paymentIntentId: "pi_secret_should_not_leak",
    });
    const room = createCreatorVideoCall({
      callerUserId: "fan-public",
      creatorUserId: "creator-public-room",
    });
    expect(room.paymentIntentId).toBe("pi_secret_should_not_leak");
    const publicRoom = toPublicVideoCall(room);
    expect(publicRoom).not.toHaveProperty("ticketId");
    expect(publicRoom).not.toHaveProperty("paymentIntentId");
    expect(JSON.stringify(publicRoom)).not.toContain("pi_secret_should_not_leak");
  });

  it("will not capture a hold when the ticket does not match the room people", async () => {
    enrollContentCreator({
      userId: "creator-mismatch",
      userEmail: "mm@test.com",
      displayName: "Mismatch",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    const ticket = grantCreatorCallTicket({
      buyerUserId: "fan-a",
      creatorUserId: "creator-mismatch",
      priceCents: 1000,
      sourceTransactionId: "mm_1",
      paymentIntentId: "pi_mm_1",
    });
    const skipped = await settleCreatorCallOnEnd({
      roomId: "00000000-0000-4000-8000-000000000099",
      kind: "creator",
      ticketId: ticket.id,
      paymentIntentId: ticket.paymentIntentId,
      callerUserId: "someone-else",
      calleeUserId: "creator-mismatch",
    });
    expect(skipped.action).toBe("skipped");
    expect(getCreatorCallTicketById(ticket.id)?.status).toBe("authorized");
  });

  it("does not book a creator payout from a webhook while the call is still unanswered", () => {
    enrollContentCreator({
      userId: "creator-webhook-guard",
      userEmail: "wg@test.com",
      displayName: "Webhook",
      enrolledAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    grantCreatorCallTicket({
      buyerUserId: "fan-wg",
      creatorUserId: "creator-webhook-guard",
      priceCents: 1000,
      sourceTransactionId: "wg_1",
      paymentIntentId: "pi_wg_1",
    });
    consumeCreatorCallTicket({ buyerUserId: "fan-wg", creatorUserId: "creator-webhook-guard" });
    const result = fulfillCreatorCallPaymentIntent({
      id: "pi_wg_1",
      status: "succeeded",
      metadata: { sku: CREATOR_VIDEO_CALL_SKU },
    });
    expect(result.ignored).toBe(true);
    expect(getCreatorPayoutDashboard("creator-webhook-guard").recentPayouts).toHaveLength(0);
  });
});
