import type { AiSubscriptionPlan } from "../../lib/ai-subscription-pricing";
import type { CartoonCreatorPlanId } from "../../lib/cartoon-creator-pricing";
import type { CartoonStyleId } from "../../lib/cartoon-studio";
import { quoteCartoonStudio, type CartoonStudioTierId } from "../../lib/cartoon-studio-pricing";
import type { MusicStudioPlanId } from "../../lib/music-studio-pricing";
import type { CreditProductId, BillingPeriod } from "../../lib/usage-caps-catalog";
import type { UrThanksStampPackId } from "../../lib/ur-thanks-stamps";
import type { UrWorldLookFundChipId } from "../../lib/ur-world-look-fund";
import type { UrWorldWalletPackId } from "../../lib/ur-world-economy";
import type { Workspace3dPlanId } from "../../lib/workspace-3d-pricing";
import { purchaseExtraConcurrentSlot } from "./ai-platform-pass-slots";
import { purchaseAiSubscription } from "./ai-subscription-service";
import { purchaseCartoonCreatorPlan } from "./cartoon-creator-entitlement-service";
import { createCartoonVideo } from "./cartoon-studio-service";
import { upgradeSandboxTier, type SandboxTierId } from "./coder-sandbox-service";
import { upgradeGameSandboxTier } from "./game-dev-sandbox-service";
import { purchaseLandingPlatformPass } from "./landing-checkout-service";
import { purchaseMusicStudioPlan } from "./music-studio-entitlement-service";
import { purchaseThanksStampPack } from "./ur-thanks-stamps-service";
import { chipInLookFund } from "./ur-world-look-fund-service";
import { purchaseCosmeticPack } from "./ur-world-locker-service";
import { creditCityWallet } from "./ur-world-service";
import { grantCreditLot } from "./usage-credits-service";
import { purchaseWorkspace3dExtraSlot, purchaseWorkspace3dPlan } from "./workspace-3d-subscription-service";
import { grantReplayFromStripe } from "./class-replay-service";
import { grantCreatorSocialPush } from "./creator-social-push-service";
import { placeMemberPrintifyOrder } from "./commerce-fulfillment-adapters";
import { grantOfficeAgent } from "./office-agent-service";

const PLATFORM_KINDS = new Set([
  "usage_credit",
  "text_pass",
  "concurrent_slot",
  "platform_pass",
  "workspace_plan",
  "workspace_slot",
  "thanks_pack",
  "music_studio",
  "cartoon_plan",
  "cartoon_video",
  "city_wallet",
  "apparel",
  "look_tip",
  "coder_sandbox",
  "game_sandbox",
  "class_replay",
  "creator_social_push",
  "member_printify",
  "office_agent",
]);

function emailOf(metadata: Record<string, string>): string {
  return metadata.userEmail?.trim() ?? "";
}

/** Grants the product after Stripe says the card payment succeeded. */
export function fulfillPlatformPurchase(
  metadata: Record<string, string>,
): { handled: boolean; ignored: boolean } | null {
  const kind = metadata.kind ?? "";
  if (!PLATFORM_KINDS.has(kind)) return null;
  const userId = metadata.userId?.trim();
  if (!userId) return { handled: false, ignored: true };
  const priceCents = Number.parseInt(metadata.priceCents ?? "", 10);
  const billing = metadata.billingStateCode?.trim() || "IN";
  const email = emailOf(metadata);

  switch (kind) {
    case "usage_credit":
      grantCreditLot({
        userId,
        productId: metadata.productId as CreditProductId,
        period: metadata.period ? (metadata.period as BillingPeriod) : undefined,
        addonId: metadata.addonId || undefined,
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
        source: "stripe",
      });
      return { handled: true, ignored: false };
    case "text_pass":
      purchaseAiSubscription({
        userId,
        userEmail: email,
        creatorId: metadata.creatorId ?? "",
        plan: metadata.plan as AiSubscriptionPlan,
        billingStateCode: billing,
        source: "stripe",
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
      });
      return { handled: true, ignored: false };
    case "concurrent_slot":
      purchaseExtraConcurrentSlot({
        userId,
        userEmail: email,
        creatorId: metadata.creatorId ?? "",
        plan: metadata.plan as AiSubscriptionPlan,
        billingStateCode: billing,
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
      });
      return { handled: true, ignored: false };
    case "platform_pass":
      purchaseLandingPlatformPass({
        email,
        ip: "stripe-webhook",
        userId,
        billingStateCode: billing,
      });
      return { handled: true, ignored: false };
    case "workspace_plan":
      purchaseWorkspace3dPlan({
        userId,
        userEmail: email,
        plan: metadata.plan as Workspace3dPlanId,
        billingStateCode: billing,
        source: "stripe",
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
      });
      return { handled: true, ignored: false };
    case "workspace_slot":
      purchaseWorkspace3dExtraSlot({
        userId,
        userEmail: email,
        billingStateCode: billing,
        source: "stripe",
        priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
      });
      return { handled: true, ignored: false };
    case "thanks_pack":
      purchaseThanksStampPack({
        userId,
        userEmail: email,
        packId: metadata.packId as UrThanksStampPackId,
        billingStateCode: billing,
      });
      return { handled: true, ignored: false };
    case "music_studio":
      purchaseMusicStudioPlan({ userId, planId: metadata.planId as MusicStudioPlanId });
      return { handled: true, ignored: false };
    case "cartoon_plan":
      purchaseCartoonCreatorPlan({
        userId,
        userEmail: email,
        displayName: metadata.displayName || "Creator",
        planId: metadata.planId as CartoonCreatorPlanId,
      });
      return { handled: true, ignored: false };
    case "cartoon_video": {
      const seconds = Number.parseInt(metadata.seconds ?? "8", 10);
      const quote = quoteCartoonStudio(metadata.tierId as CartoonStudioTierId, seconds);
      void createCartoonVideo({
        userId,
        isPlatformOwner: false,
        idea: metadata.idea || "A short cartoon",
        style: (metadata.style || "classic") as CartoonStyleId,
        quote,
        footageNotes: metadata.footageNotes || undefined,
        useCartoonSelf: metadata.useCartoonSelf === "1",
      }).catch(() => undefined);
      return { handled: true, ignored: false };
    }
    case "city_wallet":
      creditCityWallet({
        userId,
        userEmail: email,
        packId: metadata.packId as UrWorldWalletPackId,
      });
      return { handled: true, ignored: false };
    case "apparel":
      purchaseCosmeticPack({
        userId,
        userEmail: email,
        packId: metadata.packId ?? "",
        displayName: metadata.displayName || undefined,
      });
      return { handled: true, ignored: false };
    case "look_tip":
      chipInLookFund({
        userId,
        userEmail: email,
        displayName: metadata.displayName || undefined,
        packId: metadata.packId as UrWorldLookFundChipId,
      });
      return { handled: true, ignored: false };
    case "coder_sandbox":
      void upgradeSandboxTier({
        userId,
        targetTier: metadata.tier as SandboxTierId,
        isPlatformOwner: false,
      }).catch(() => undefined);
      return { handled: true, ignored: false };
    case "game_sandbox":
      void upgradeGameSandboxTier({
        userId,
        targetTier: metadata.tier as SandboxTierId,
        isPlatformOwner: false,
      }).catch(() => undefined);
      return { handled: true, ignored: false };
    case "class_replay":
      grantReplayFromStripe({ userId, replayId: metadata.replayId ?? "" });
      return { handled: true, ignored: false };
    case "creator_social_push":
      grantCreatorSocialPush({ userId, planId: metadata.planId ?? "" });
      return { handled: true, ignored: false };
    case "office_agent":
      grantOfficeAgent(userId);
      return { handled: true, ignored: false };
    case "member_printify":
      void placeMemberPrintifyOrder({
        productId: metadata.productId ?? "",
        variantId: metadata.variantId ?? "",
        externalId: userId,
        email,
        firstName: metadata.firstName ?? "UR",
        lastName: metadata.lastName ?? "Member",
        phone: metadata.phone ?? "",
        address1: metadata.address1 ?? "",
        city: metadata.city ?? "",
        region: metadata.region ?? "",
        zip: metadata.zip ?? "",
        country: metadata.country ?? "US",
      }).catch(() => undefined);
      return { handled: true, ignored: false };
    default:
      return { handled: false, ignored: true };
  }
}
