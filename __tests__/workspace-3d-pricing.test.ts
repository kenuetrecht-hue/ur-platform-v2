import { describe, it, expect, beforeEach } from "vitest";
import {
  getWorkspace3dPlans,
  getWorkspace3dPlanPriceCents,
  WORKSPACE_3D_PLAN_CENTS,
  WORKSPACE_3D_CONCURRENT_SLOTS,
} from "../lib/workspace-3d-pricing";
import {
  _clearWorkspace3dSubscriptionsForTests,
  getWorkspace3dAccessQuote,
  hasActiveWorkspace3dSubscription,
  purchaseWorkspace3dExtraSlot,
  purchaseWorkspace3dPlan,
  assertWorkspaceAiSlotLimit,
} from "../server/_core/workspace-3d-subscription-service";
import { TRPCError } from "@trpc/server";

describe("workspace-3d-pricing", () => {
  it("defines Option A bundle prices", () => {
    expect(WORKSPACE_3D_PLAN_CENTS.day_pass).toBe(799);
    expect(WORKSPACE_3D_PLAN_CENTS.solo).toBe(1999);
    expect(WORKSPACE_3D_PLAN_CENTS.pro).toBe(3999);
    expect(WORKSPACE_3D_PLAN_CENTS.studio).toBe(6999);
  });

  it("maps concurrent AI slots per plan", () => {
    expect(WORKSPACE_3D_CONCURRENT_SLOTS.day_pass).toBe(2);
    expect(WORKSPACE_3D_CONCURRENT_SLOTS.solo).toBe(1);
    expect(WORKSPACE_3D_CONCURRENT_SLOTS.pro).toBe(3);
    expect(WORKSPACE_3D_CONCURRENT_SLOTS.studio).toBe(5);
  });

  it("returns four plan quotes", () => {
    const plans = getWorkspace3dPlans();
    expect(plans).toHaveLength(4);
    expect(getWorkspace3dPlanPriceCents("pro")).toBe(3999);
  });
});

describe("workspace-3d-subscription-service", () => {
  beforeEach(() => _clearWorkspace3dSubscriptionsForTests());

  it("grants workspace access after purchase", () => {
    purchaseWorkspace3dPlan({
      userId: "user-1",
      userEmail: "fan@example.com",
      plan: "pro",
      billingStateCode: "FL",
    });
    expect(hasActiveWorkspace3dSubscription("user-1")).toBe(true);
    const access = getWorkspace3dAccessQuote("user-1", false);
    expect(access.maxConcurrentAiSlots).toBe(3);
  });

  it("stacks extra AI slots", () => {
    purchaseWorkspace3dPlan({
      userId: "user-1",
      userEmail: "fan@example.com",
      plan: "solo",
      billingStateCode: "FL",
    });
    purchaseWorkspace3dExtraSlot({
      userId: "user-1",
      userEmail: "fan@example.com",
      billingStateCode: "FL",
    });
    expect(getWorkspace3dAccessQuote("user-1", false).maxConcurrentAiSlots).toBe(2);
  });

  it("blocks too many concurrent AIs", () => {
    purchaseWorkspace3dPlan({
      userId: "user-1",
      userEmail: "fan@example.com",
      plan: "solo",
      billingStateCode: "FL",
    });
    expect(() =>
      assertWorkspaceAiSlotLimit({
        userId: "user-1",
        isPlatformOwner: false,
        activeAiIds: ["a", "b"],
      }),
    ).toThrow(TRPCError);
  });

  it("owner bypasses slot limits", () => {
    expect(() =>
      assertWorkspaceAiSlotLimit({
        userId: "user-1",
        isPlatformOwner: true,
        activeAiIds: ["a", "b", "c", "d", "e"],
      }),
    ).not.toThrow();
  });
});
