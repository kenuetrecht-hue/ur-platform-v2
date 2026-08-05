import { z } from "zod";
import { secureProcedure, router, TRPCError } from "../_core/trpc";
import { assertAiEntitled } from "../_core/access-entitlements";
import {
  createGameSandboxProject,
  executeGameBuild,
  getGameSandboxProject,
  getGameSandboxStatus,
  listGameSandboxProjects,
  runGameSandboxTest,
  saveGameSandboxFile,
  upgradeGameSandboxTier,
  type SandboxTierId,
  GAME_SANDBOX_TIERS,
} from "../_core/game-dev-sandbox-service";
import { getStripeIntegration } from "../stripe-integration";
import { ENV } from "../_core/env";

const tierSchema = z.enum(["starter", "builder", "studio", "enterprise"]);
const pending = new Map<string, { userId: string; tierId: SandboxTierId }>();

function assertAccess(ctx: { user: { id: unknown; email?: string | null }; isPlatformOwner: boolean }) {
  assertAiEntitled({
    userId: ctx.user.id,
    email: ctx.user.email,
    isPlatformOwner: ctx.isPlatformOwner,
    feature: "ai_sandbox",
  });
}

export const gameDevSandboxRouter = router({
  getStatus: secureProcedure("gameDevSandbox").query(async ({ ctx }) => {
    assertAccess(ctx);
    return getGameSandboxStatus(String(ctx.user.id), ctx.isPlatformOwner);
  }),

  listProjects: secureProcedure("gameDevSandbox").query(async ({ ctx }) => {
    assertAccess(ctx);
    return listGameSandboxProjects(String(ctx.user.id), ctx.isPlatformOwner);
  }),

  createProject: secureProcedure("gameDevSandbox")
    .input(z.object({ name: z.string().min(1).max(120), description: z.string().max(2000).optional(), engine: z.string().max(64).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      return createGameSandboxProject({ userId: String(ctx.user.id), isPlatformOwner: ctx.isPlatformOwner, ...input });
    }),

  saveFile: secureProcedure("gameDevSandbox")
    .input(z.object({
      projectId: z.string().min(4).max(128),
      path: z.string().min(1).max(512),
      content: z.string().max(5_000_000),
      persistToCloud: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      return saveGameSandboxFile({ userId: String(ctx.user.id), isPlatformOwner: ctx.isPlatformOwner, ...input });
    }),

  runTest: secureProcedure("gameDevSandbox")
    .input(z.object({ projectId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      return runGameSandboxTest({ userId: String(ctx.user.id), isPlatformOwner: ctx.isPlatformOwner, projectId: input.projectId });
    }),

  executeBuild: secureProcedure("gameDevSandbox")
    .input(z.object({ projectId: z.string().min(4).max(128) }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      return executeGameBuild({ userId: String(ctx.user.id), isPlatformOwner: ctx.isPlatformOwner, projectId: input.projectId });
    }),

  upgradeTier: secureProcedure("gameDevSandbox")
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      if (!ctx.isPlatformOwner) throw new TRPCError({ code: "BAD_REQUEST", message: "Use createUpgradeCheckout for paid tiers." });
      return upgradeGameSandboxTier({
        userId: String(ctx.user.id),
        targetTier: input.tier as SandboxTierId,
        isPlatformOwner: ctx.isPlatformOwner,
        actingAsOwner: true,
      });
    }),

  createUpgradeCheckout: secureProcedure("gameDevSandbox")
    .input(z.object({ tier: tierSchema }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      if (ctx.isPlatformOwner) {
        return upgradeGameSandboxTier({
          userId: String(ctx.user.id),
          targetTier: input.tier as SandboxTierId,
          isPlatformOwner: true,
          actingAsOwner: true,
        });
      }
      const tier = GAME_SANDBOX_TIERS[input.tier as SandboxTierId];
      if (!tier.upgradePriceUsd) throw new TRPCError({ code: "BAD_REQUEST", message: "Tier not purchasable." });
      const amountCents = Math.round(tier.upgradePriceUsd * 100);
      const stripe = getStripeIntegration();
      const customer = await stripe.getOrCreateCustomer(String(ctx.user.id), ctx.user.email ?? "", ctx.user.name ?? "UR User");
      const intent = await stripe.createPaymentIntent(customer.id, amountCents, "USD", { product: "gameforge_sandbox", tierId: input.tier });
      pending.set(intent.id, { userId: String(ctx.user.id), tierId: input.tier as SandboxTierId });
      return { mode: "checkout" as const, paymentIntentId: intent.id, clientSecret: intent.clientSecret, amountCents, tier };
    }),

  confirmUpgradePayment: secureProcedure("gameDevSandbox")
    .input(z.object({ paymentIntentId: z.string().min(4).max(128), paymentMethodId: z.string().max(128).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertAccess(ctx);
      const p = pending.get(input.paymentIntentId);
      if (!p || p.userId !== String(ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Checkout expired." });
      const stripe = getStripeIntegration();
      let methodId = input.paymentMethodId;
      if (!methodId && !ENV.isProduction) {
        const customer = await stripe.getOrCreateCustomer(String(ctx.user.id), "dev@urplatform.local", "Dev");
        methodId = (await stripe.addPaymentMethod(customer.id, "card", "4242", "visa", 12, 2030, true)).id;
      }
      if (!methodId) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment method required." });
      await stripe.confirmPaymentIntent(input.paymentIntentId, methodId);
      pending.delete(input.paymentIntentId);
      return upgradeGameSandboxTier({
        userId: String(ctx.user.id),
        targetTier: p.tierId,
        isPlatformOwner: ctx.isPlatformOwner,
      });
    }),
});
