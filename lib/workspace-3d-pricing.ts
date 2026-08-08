/**
 * 3D Workspace bundle pricing (Option A) — workspace access + concurrent AI slots.
 * Text chat still uses per-specialist subscriptions; voice uses Talk Time packs.
 */

export type Workspace3dPlanId = "day_pass" | "solo" | "pro" | "studio";

export type Workspace3dAddonId = "extra_ai_slot";

export type Workspace3dPlanQuote = {
  planId: Workspace3dPlanId;
  label: string;
  priceCents: number;
  priceDisplay: string;
  durationDays: number;
  concurrentAiSlots: number;
  tagline: string;
  highlights: string[];
};

/** Extra concurrent AI slot add-on — requires an active workspace plan. */
export const WORKSPACE_3D_EXTRA_AI_SLOT_CENTS = 899;

export const WORKSPACE_3D_PLAN_CENTS: Record<Workspace3dPlanId, number> = {
  day_pass: 799,
  solo: 1999,
  pro: 3999,
  studio: 6999,
};

export const WORKSPACE_3D_CONCURRENT_SLOTS: Record<Workspace3dPlanId, number> = {
  day_pass: 2,
  solo: 1,
  pro: 3,
  studio: 5,
};

export const WORKSPACE_3D_PLAN_DAYS: Record<Workspace3dPlanId, number> = {
  day_pass: 1,
  solo: 30,
  pro: 30,
  studio: 30,
};

const PLAN_META: Record<
  Workspace3dPlanId,
  { label: string; tagline: string; highlights: string[] }
> = {
  day_pass: {
    label: "Day Pass",
    tagline: "Full lab for 24 hours",
    highlights: [
      "Babylon viewport, layers, STL upload",
      "Blueprint panel & print export",
      "2 specialists collaborating at once",
    ],
  },
  solo: {
    label: "Solo",
    tagline: "One specialist in the lab",
    highlights: [
      "Unlimited workspace sessions",
      "1 concurrent AI slot (any specialist)",
      "Equipment hub & design save",
    ],
  },
  pro: {
    label: "Pro",
    tagline: "Multi-specialist projects",
    highlights: [
      "3 concurrent AIs in one session",
      "Ideal for build + blueprint + engineering",
      "Priority session save & export",
    ],
  },
  studio: {
    label: "Studio",
    tagline: "Full team in the lab",
    highlights: [
      "5 concurrent AIs working together",
      "Marine, robotics, architecture workflows",
      "Blueprint + print export priority",
    ],
  },
};

export const WORKSPACE_3D_PRICING_SUMMARY =
  "3D Workspace: $7.99 day pass (2 AIs) · Solo $19.99/mo (1 AI) · Pro $39.99/mo (3 AIs) · Studio $69.99/mo (5 AIs). " +
  "Extra AI slot: $8.99/mo each.";

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getWorkspace3dPlanPriceCents(planId: Workspace3dPlanId): number {
  return WORKSPACE_3D_PLAN_CENTS[planId];
}

export function getWorkspace3dConcurrentSlots(planId: Workspace3dPlanId): number {
  return WORKSPACE_3D_CONCURRENT_SLOTS[planId];
}

export function getWorkspace3dPlans(): Workspace3dPlanQuote[] {
  const order: Workspace3dPlanId[] = ["day_pass", "solo", "pro", "studio"];
  return order.map((planId) => {
    const meta = PLAN_META[planId];
    const priceCents = WORKSPACE_3D_PLAN_CENTS[planId];
    return {
      planId,
      label: meta.label,
      priceCents,
      priceDisplay: formatUsd(priceCents),
      durationDays: WORKSPACE_3D_PLAN_DAYS[planId],
      concurrentAiSlots: WORKSPACE_3D_CONCURRENT_SLOTS[planId],
      tagline: meta.tagline,
      highlights: meta.highlights,
    };
  });
}

export function getWorkspace3dPlanLabel(planId: Workspace3dPlanId): string {
  return PLAN_META[planId].label;
}
