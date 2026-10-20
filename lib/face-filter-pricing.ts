/**
 * Face-filter prices.
 * Everyday looks are free, the same way TikTok and Snapchat effects are free.
 * Logo & Brand's Monday set is the paid extra.
 * Snapchat Plus is about $3.99 a month. $1.99 for one week and $2.99 for 30 days sit under that.
 * A 99-cent charge keeps too little after the card fee, so the week starts at $1.99.
 * UR keeps these sales. They are the platform's looks, not a creator's.
 */

export const FACE_FILTER_AI_ID = "ai-logo-brand-001";
export const FACE_FILTER_AI_NAME = "Logo & Brand";

export const FACE_FILTER_WEEK_CENTS = 199;
export const FACE_FILTER_MONTH_CENTS = 299;

export const FACE_FILTER_PRICE_NOTE =
  "Six looks are free. Logo & Brand posts four new ones every Monday for everyone. $1.99 opens this week. $2.99 opens 30 days. Snapchat Plus is about $3.99 a month. Tax and the card fee are added at checkout. UR keeps this sale. The picture stays on your device.";

export type FaceFilterPlanId = "week" | "month";

export function faceFilterPlanCents(planId: FaceFilterPlanId): number {
  return planId === "week" ? FACE_FILTER_WEEK_CENTS : FACE_FILTER_MONTH_CENTS;
}

export function faceFilterPlanLabel(planId: FaceFilterPlanId): string {
  return planId === "week" ? "This week · $1.99" : "30 days · $2.99";
}
