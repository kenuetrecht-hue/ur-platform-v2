/**
 * Owner-only Business Steward — Learn academy for running UR Platform LLC.
 * Educational operator training. Not CPA, legal, or investment advice.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const BUSINESS_STEWARD_AI_ID = "platform-business-steward-ai";

export function isOwnerBusinessTeachingCreator(creatorId: string): boolean {
  return creatorId === BUSINESS_STEWARD_AI_ID;
}

export type StewardExercise = {
  id: string;
  title: string;
  level: LearningLevel;
  topic: string;
  prompt: string;
};

export type StewardSelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

const STEWARD_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "UR Platform positioning",
    description: "Who you serve (creators, specialists, 18+), why urplatform.llc, and the one-sentence pitch.",
  },
  {
    title: "Offer stack & pricing",
    description: "Talk time, live classes (85% creator share), AI chat, shop — what is live vs simulated in development.",
  },
  {
    title: "Acquisition channels",
    description: "Search, social, creator referrals, affiliates — pick 1–2 channels and measure weekly.",
  },
  {
    title: "Content and ads engine",
    description: "Weekly calendar, hooks, landing copy, and ads that send people to signup — not vanity likes.",
  },
  {
    title: "Conversion path",
    description: "Welcome → account → (later) 18+ ID → first specialist chat. Find where people drop.",
  },
  {
    title: "Creator marketplace trust",
    description: "85% payouts, content protection, impersonation rules — why creators stay.",
  },
  {
    title: "Creator recruitment flywheel",
    description: "Where to find teachers, outreach scripts, first-class quality bar, and referral loops.",
  },
  {
    title: "Cash, runway, and AI cost",
    description: "LLC vs personal money, $2,500 buffer, Gemini spend, never spend creator payout float.",
  },
  {
    title: "Unit economics",
    description: "Cost per AI chat vs stamps/membership, CAC vs first paid conversion, when to raise prices.",
  },
  {
    title: "Tax and INBiz calendar",
    description: "1040-ES / ES-40 dates, annual returns, biennial Business Entity Report — reminders only.",
  },
  {
    title: "Go-live checklist",
    description: "Hosting, Stripe, Turnstile, Apple $99, Play $25, support@urplatform.llc.",
  },
  {
    title: "App Store & Play listing",
    description: "ASO title/subtitle, screenshots, 18+ age rating, review replies, and what gets rejected.",
  },
  {
    title: "Paid ads policy & landing",
    description: "Meta/Google/TikTok adult-policy, landing-page match, and spend caps before Stripe is live.",
  },
  {
    title: "Weekly operator metrics",
    description: "Signups, first AI chat, paid conversion, AI cost per active user, support tickets.",
  },
  {
    title: "Retention after first chat",
    description: "Day-1 specialist match, second session habit, live classes, and why people churn.",
  },
  {
    title: "Support and reputation",
    description: "Reply templates, incident honesty, App Store / Play review hygiene.",
  },
  {
    title: "Launch week playbook",
    description: "Seven-day sequence: pitch, one channel, one metric, support inbox, cash check.",
  },
  {
    title: "Operator certification orientation",
    description: "Self-check: cash, calendar, one acquisition channel, one metric, CPA booked (educational).",
    certificationPrep: true,
  },
];

const SELF_PACED: Record<LearningLevel, StewardSelfPacedStep[]> = {
  beginner: [
    {
      order: 1,
      title: "Write the one-sentence pitch",
      description: "Name who UR is for, the 18+ rule, and why specialists beat generic chatbots.",
      estimatedMinutes: 20,
      moduleTitle: "UR Platform positioning",
    },
    {
      order: 2,
      title: "Map the offer stack",
      description: "List what is live today vs simulated in development. Do not sell fake checkout.",
      estimatedMinutes: 20,
      moduleTitle: "Offer stack & pricing",
    },
    {
      order: 3,
      title: "Pick one acquisition channel",
      description: "Choose search, one social, or creator outreach — not all three this week.",
      estimatedMinutes: 25,
      moduleTitle: "Acquisition channels",
    },
    {
      order: 4,
      title: "Set the cash buffer",
      description: "LLC operating cash vs creator payout float. Target ~$2,500 operating buffer.",
      estimatedMinutes: 20,
      moduleTitle: "Cash, runway, and AI cost",
    },
  ],
  intermediate: [
    {
      order: 1,
      title: "Walk the signup funnel",
      description: "Time each step from landing to first specialist chat and note the drop-off.",
      estimatedMinutes: 30,
      moduleTitle: "Conversion path",
    },
    {
      order: 2,
      title: "Ship one content/ad asset",
      description: "Write a hook + CTA to https://urplatform.llc. Screenshot it for Steward review.",
      estimatedMinutes: 35,
      moduleTitle: "Content and ads engine",
    },
    {
      order: 3,
      title: "Draft creator outreach",
      description: "One DM/email that leads with 85% class share and content protection.",
      estimatedMinutes: 25,
      moduleTitle: "Creator recruitment flywheel",
    },
    {
      order: 4,
      title: "Score this week's metrics",
      description: "Signups, first chats, tickets, Gemini spend. One number you will improve next week.",
      estimatedMinutes: 20,
      moduleTitle: "Weekly operator metrics",
    },
  ],
  advanced: [
    {
      order: 1,
      title: "Go-live gap list",
      description: "Stripe, KYC, Turnstile, Apple $99, Play $25, support inbox — what blocks real pay.",
      estimatedMinutes: 30,
      moduleTitle: "Go-live checklist",
    },
    {
      order: 2,
      title: "Unit-economics worksheet",
      description: "AI cost per active user vs membership/stamps. Decide a price test, not a guess.",
      estimatedMinutes: 35,
      moduleTitle: "Unit economics",
    },
    {
      order: 3,
      title: "Store listing pass",
      description: "ASO title, 18+ rating, screenshots, and a review-reply template.",
      estimatedMinutes: 30,
      moduleTitle: "App Store & Play listing",
    },
    {
      order: 4,
      title: "Operator self-check",
      description: "Cash, calendar, one channel, one metric, CPA booked. Educational only.",
      estimatedMinutes: 25,
      moduleTitle: "Operator certification orientation",
    },
  ],
};

const EXERCISES: StewardExercise[] = [
  {
    id: "steward-pitch",
    title: "One-sentence pitch",
    level: "beginner",
    topic: "UR Platform positioning",
    prompt:
      "Coach me to write a one-sentence pitch for urplatform.llc. Ask who I serve, then critique my draft. Do not invent fake live checkout.",
  },
  {
    id: "steward-calendar",
    title: "Weekly content calendar",
    level: "beginner",
    topic: "Content and ads engine",
    prompt:
      "Give me a 7-day content calendar with hooks that send people to signup, not vanity likes. Include one creator-recruitment post.",
  },
  {
    id: "steward-funnel",
    title: "Find the drop-off",
    level: "intermediate",
    topic: "Conversion path",
    prompt:
      "Walk me through the conversion path: landing → account → 18+ ID (production) → first specialist chat. Give me a worksheet to find where people drop.",
  },
  {
    id: "steward-float",
    title: "Payout float vs operating cash",
    level: "intermediate",
    topic: "Cash, runway, and AI cost",
    prompt:
      "Quiz me on why creator class payouts (~85%) cannot fund Gemini or hosting. Give a model answer and a weekly cash-check ritual.",
  },
  {
    id: "steward-tax",
    title: "Next tax date",
    level: "beginner",
    topic: "Tax and INBiz calendar",
    prompt:
      "Using the Indiana LLC educational calendar, list the next 3 due dates from today and what I should ask a CPA. Do not file anything.",
  },
  {
    id: "steward-ads",
    title: "Ad + landing match",
    level: "intermediate",
    topic: "Paid ads policy & landing",
    prompt:
      "Review a Meta/Google/TikTok ad concept for an 18+ creator marketplace. Flag policy traps and require the landing page to match the ad. Stripe is not live until I configure it.",
  },
  {
    id: "steward-creator",
    title: "Creator outreach DM",
    level: "intermediate",
    topic: "Creator recruitment flywheel",
    prompt:
      "Help me draft a short outreach message for a teacher/creator. Lead with 85% class share and content protection. Keep it honest about production pay status.",
  },
  {
    id: "steward-unit",
    title: "Cost per chat vs stamps",
    level: "advanced",
    topic: "Unit economics",
    prompt:
      "Give me a unit-economics exercise: estimate AI cost per active user vs stamps/membership. I will plug in my numbers. Do not promise profit.",
  },
  {
    id: "steward-aso",
    title: "Store listing bullets",
    level: "advanced",
    topic: "App Store & Play listing",
    prompt:
      "Coach me through ASO title/subtitle and 18+ age rating for UR. Give a rubric, not a fake 'guaranteed featured' claim.",
  },
  {
    id: "steward-launch",
    title: "Seven-day launch sequence",
    level: "advanced",
    topic: "Launch week playbook",
    prompt:
      "Build a 7-day operator sequence: one pitch, one channel, one metric, support inbox check, cash check, next tax date. Educational only.",
  },
];

export function getOwnerBusinessTeachingModules(): LearningModule[] {
  return STEWARD_MODULES.map((item, index) => ({
    id: `steward-mod-${index + 1}`,
    ...item,
  }));
}

export function getOwnerBusinessTeachingTagline(): string {
  return "Private operator academy for UR Platform LLC — marketing, cash, calendar, go-live, and weekly metrics. Educational only.";
}

export function getOwnerBusinessSelfPacedPath(level: LearningLevel): StewardSelfPacedStep[] {
  return SELF_PACED[level] ?? [];
}

export function getOwnerBusinessPracticeExercises(params: {
  count: number;
  level?: LearningLevel;
}): StewardExercise[] {
  const filtered = params.level ? EXERCISES.filter((e) => e.level === params.level) : EXERCISES;
  const source = filtered.length > 0 ? filtered : EXERCISES;
  return source.slice(0, params.count);
}

export function buildOwnerBusinessTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## UR Platform operator academy (owner only)
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "UR Platform positioning"}.

You are training the platform owner to run UR Platform LLC successfully — not a public business-school chatbot.

Teach with this product in mind:
- Site: https://urplatform.llc · Entity: Indiana LLC · Support: support@urplatform.llc
- Public specialists (Marketing Expert, Business Advisor) are for members. This Learn path is the owner's private academy.
- Production pay is not live until Stripe is configured; do not pretend checkout is charging cards in development.
- Creators keep ~85% of class sales — the LLC must keep payout float separate from operating cash.
- 18+ ID (front, back, selfie) is required in production; local DEV_SKIP_AGE_KYC is testing only.

Operator loop every week:
1. One acquisition action (post, ad, or creator outreach).
2. One metric (signups, first chat, or cash in LLC).
3. One cost check (Gemini, hosting).
4. Next tax/INBiz date from the steward calendar.

On-the-job mode: treat this week as a real operating week. Give a dated checklist the owner can execute today, not theory.

Practice mode: give worksheets, rubrics, and critique of the owner's drafts (pitch, ads, outreach, cash split). Do not invent live revenue.

Rules:
- Educational only. Not CPA, attorney, or registered-advisor advice.
- Do not file taxes or send money.
- Prefer official sources: IRS.gov, INTIME / in.gov, INBiz, Apple/Google developer docs, Stripe docs, Meta/Google ads policies.
- Use long-term memory of this owner's notes and continue from the last completed module.
`.trim();
}
