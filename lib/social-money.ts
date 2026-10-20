/** Listed prices. The fan pays tax and the card fee on top. Never exactly $5.00. */

export const CREATOR_CHANNEL_CENTS = 299;
export const CREATOR_CHANNEL_DAYS = 30;
export const FEED_PIN_CENTS = 199;
export const FEED_PIN_HOURS = 24;
export const CREATOR_CHANNEL_PRODUCT = "creator_channel";
export const FEED_PIN_KIND = "feed_pin";

const SOCIAL_DAILY_PROMPTS = [
  "Show today's look. The free filters stay on this phone.",
  "Post one line about what you made today.",
  "Tell a friend what you are working on. Keep it short.",
];

export function socialDailyPrompt(at = new Date()): string {
  const start = Date.UTC(at.getUTCFullYear(), 0, 0);
  const day = Math.floor((at.getTime() - start) / 86_400_000);
  const index = ((day % SOCIAL_DAILY_PROMPTS.length) + SOCIAL_DAILY_PROMPTS.length) % SOCIAL_DAILY_PROMPTS.length;
  return SOCIAL_DAILY_PROMPTS[index] ?? SOCIAL_DAILY_PROMPTS[0]!;
}

export function formatSocialUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
