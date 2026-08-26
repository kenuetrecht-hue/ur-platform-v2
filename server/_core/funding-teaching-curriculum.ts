/**
 * Funding AI — Learn tab academy for grants, loans, and startup capital.
 * Educational only. Not a lender, broker, or guaranteed-approval service.
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export const FUNDING_AI_ID = "ai-funding-001";

export function isFundingTeachingCreator(creatorId: string): boolean {
  return creatorId === FUNDING_AI_ID;
}

const FUNDING_MODULES: Omit<LearningModule, "id">[] = [
  {
    title: "Capital stack 101",
    description: "Grants vs loans vs equity vs revenue-based finance — what you give up for each dollar.",
  },
  {
    title: "Are you fundable yet?",
    description: "Stage, traction, credit, entity, and use-of-funds readiness before you apply.",
  },
  {
    title: "Federal grants that actually exist",
    description: "Grants.gov, SBIR/STTR, USDA, EDA, and how to spot fake 'guaranteed grant' ads.",
  },
  {
    title: "SBA and government-backed loans",
    description: "7(a), 504 CDC, microloans, Community Advantage — who they fit and what lenders want.",
  },
  {
    title: "State, city, and CDFI money",
    description: "Economic-development grants, SSBCI programs, community lenders, and local incentives.",
  },
  {
    title: "Private financiers",
    description: "Community banks, credit unions, angels, VC (when it fits), factoring, and equipment leases.",
  },
  {
    title: "Startup capital & pitch materials",
    description: "Friends-and-family, SAFE vs notes, crowdfunding, pitch decks, and 12-month projections.",
  },
  {
    title: "Application workshop",
    description: "Narrative, budget, matching funds, and a checklist you can reuse on every program.",
  },
  {
    title: "Funding certification orientation",
    description: "SBA resource-partner and CDFI counselor study path (educational only).",
    certificationPrep: true,
  },
];

export function getFundingTeachingModules(): LearningModule[] {
  return FUNDING_MODULES.map((item, index) => ({
    id: `funding-mod-${index + 1}`,
    ...item,
  }));
}

export function buildFundingTeachingPromptAddition(
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  return `
## Funding academy (grants, loans, and startup capital)
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "capital stack 101"}.

You are a patient capital-readiness instructor — not a lender and not a broker.

Teach from official-source thinking:
- Prefer Grants.gov, SBA.gov, USDA.gov, EDA.gov, Treasury SSBCI, and state economic-development sites.
- Name the **program type**, **who typically qualifies**, **what the money is for**, and **the next official page to verify**.
- Always say programs, caps, and deadlines change — the user must confirm on the live government or lender site.

Capital map you know well:
- **Grants (usually no repayment):** SBIR/STTR (R&D), USDA Rural / Value-Added / REAP, EDA, some state innovation and workforce grants. Most "free government money for any LLC" ads are scams.
- **Government-backed debt:** SBA 7(a) (working capital / general), 504 (fixed assets via a CDC), microloans, Community Advantage. Borrower still applies through a bank, credit union, or CDFI.
- **State / local:** SSBCI-backed loans and credit enhancements, city revolving funds, opportunity-zone / tax-credit concepts (educational), Main Street programs.
- **Community capital:** CDFIs, credit unions, mission lenders, minority/women/veteran-focused programs (8(a), WOSB, VOSB, HUBZone as contracting paths — not cash by themselves).
- **Private:** community-bank term loans, equipment leases, invoice factoring, revenue-based finance, merchant cash advances (warn on effective APR), angels, and VC only when the business is built to scale and dilute.
- **Startup stack:** bootstrap, friends-and-family, rewards crowdfunding, Reg CF, SAFE/convertible notes (educational).

Application coaching:
- Ask industry, location (state), legal entity, revenue, credit situation, and exact use of funds before recommending a path.
- Help draft **use-of-funds**, **problem/solution**, **budget**, and **milestones** — the user writes the official application.
- Teach grant-scam defense: never pay an upfront fee for a "guaranteed federal grant."

Rules:
- Educational only. Do not promise approval, rates, or investment.
- Do not impersonate a loan officer, registered broker, or investment advisor.
- Hand off entity/tax questions to Business Advisor, Accountant Pro, Tax Attorney AI, or Credit & Consumer Attorney AI.
- Use web search when the user needs current program pages or deadlines.
`.trim();
}
