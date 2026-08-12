/**
 * Legal Masters — full Learn tab curriculum (parity with Attorney AI + field specialties).
 */

import type { LearningLevel, LearningMode, LearningModule } from "./ai-learning-mode";

export type LegalExercise = {
  id: string;
  title: string;
  level: LearningLevel;
  topic: string;
  prompt: string;
};

export type SelfPacedStep = {
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  moduleTitle: string;
};

/** Shared attorney-grade foundation — every Legal Master includes these. */
const LEGAL_FOUNDATION_MODULES: Omit<LearningModule, "id">[] = [
  { title: "Legal research fundamentals", description: "Cases, statutes, regulations, and credible sources." },
  { title: "Reading & briefing cases", description: "Issue, rule, analysis, conclusion (educational)." },
  { title: "Document drafting basics", description: "Outlines, defined terms, and plain-language clarity." },
  { title: "Compliance & ethics awareness", description: "Professional responsibility concepts (educational)." },
  { title: "When to hire a licensed attorney", description: "Scope limits, UPL awareness, escalation paths." },
];

const MODULES_BY_CREATOR: Record<string, Omit<LearningModule, "id">[]> = {
  "ai-attorney-criminal-001": [
    ...LEGAL_FOUNDATION_MODULES,
    { title: "Criminal procedure overview", description: "Arrest, charges, arraignment, and trial stages." },
    { title: "Constitutional rights", description: "Fourth, Fifth, Sixth Amendment concepts (educational)." },
    { title: "Misdemeanors vs felonies", description: "Classification, sentencing ranges, and collateral consequences." },
    { title: "Evidence & discovery basics", description: "Relevance, hearsay overview, Brady concepts." },
    { title: "Plea bargaining & diversion", description: "Options, trade-offs, and record relief paths." },
    { title: "Sentencing & appeals orientation", description: "Guidelines awareness and appellate basics." },
    {
      title: "Criminal law exam & bar orientation",
      description: "Crim law / procedure study drills (educational only).",
      certificationPrep: true,
    },
  ],
  "ai-attorney-realestate-001": [
    ...LEGAL_FOUNDATION_MODULES,
    { title: "Purchase & sale agreements", description: "Contingencies, disclosures, and closing timelines." },
    { title: "Title, escrow & closing", description: "Title insurance, liens, and settlement statements." },
    { title: "Landlord–tenant law basics", description: "Leases, evictions overview, habitability (educational)." },
    { title: "Zoning & land use", description: "Permits, variances, HOAs, and restrictions." },
    { title: "Foreclosure & short sale concepts", description: "Process overview and homeowner options." },
    { title: "1031 & investment property law", description: "Tax-deferred exchange concepts (with CPA/tax attorney)." },
    {
      title: "Real estate bar & license prep orientation",
      description: "Property law study paths (educational only).",
      certificationPrep: true,
    },
  ],
  "ai-attorney-accountant-001": [
    ...LEGAL_FOUNDATION_MODULES,
    { title: "Business entity selection", description: "LLC, S-Corp, partnership — legal and tax angles." },
    { title: "Financial statement literacy", description: "Balance sheet, P&L, cash flow for legal review." },
    { title: "Internal controls & fraud red flags", description: "Governance concepts for owners and advisors." },
    { title: "Audit & regulatory inquiries", description: "Document retention and response prep (educational)." },
    { title: "Contract terms for finance teams", description: "Payment terms, warranties, indemnities." },
    { title: "M&A diligence checklist", description: "Legal + accounting review coordination." },
    {
      title: "CPA / accounting law crossover prep",
      description: "Regulation and business law study orientation.",
      certificationPrep: true,
    },
  ],
  "ai-attorney-tax-001": [
    ...LEGAL_FOUNDATION_MODULES,
    { title: "Individual income tax framework", description: "Brackets, deductions, credits (conceptual)." },
    { title: "Business & self-employment tax", description: "Schedule C, payroll, estimated payments." },
    { title: "IRS notices & collections", description: "CP letters, installment agreements, OIC overview." },
    { title: "Audit defense preparation", description: "Organizing records and representation rights." },
    { title: "State & local tax awareness", description: "Nexus, sales tax, franchise tax concepts." },
    { title: "Tax controversy & appeals", description: "Administrative paths before litigation." },
    {
      title: "Tax law & EA/ bar tax prep orientation",
      description: "Tax specialty study drills (educational only).",
      certificationPrep: true,
    },
  ],
  "ai-attorney-credit-001": [
    ...LEGAL_FOUNDATION_MODULES,
    { title: "How credit scores work", description: "FICO factors, reports, and scoring models." },
    { title: "Reading your credit reports", description: "Bureaus, tradelines, inquiries, public records." },
    { title: "Disputes & corrections", description: "FCRA dispute process, documentation, follow-up." },
    { title: "Debt validation & collections law", description: "FDCPA concepts and consumer rights (educational)." },
    { title: "Building credit from scratch", description: "Secured cards, authorized user, credit mix." },
    { title: "Using credit strategically", description: "Utilization, timing, rewards without overspending." },
    { title: "Bankruptcy & hardship options", description: "When to consult licensed counsel — overview only." },
    {
      title: "Consumer finance literacy certification prep",
      description: "HUD / CFPB-style education orientation.",
      certificationPrep: true,
    },
  ],
};

const TAGLINES: Record<string, string> = {
  "ai-attorney-criminal-001": "Learn criminal law & procedure — research, rights, pleas, and trial basics.",
  "ai-attorney-realestate-001": "Learn real estate law — contracts, title, leases, zoning, and closings.",
  "ai-attorney-accountant-001": "Learn where law meets accounting — entities, audits, contracts, and M&A diligence.",
  "ai-attorney-tax-001": "Learn tax law concepts — IRS notices, audits, business tax, and controversy paths.",
  "ai-attorney-credit-001": "Learn credit repair & building — disputes, scores, smart credit use (educational).",
};

export const LEGAL_MASTER_CREATOR_IDS = new Set(Object.keys(MODULES_BY_CREATOR));

export function isLegalMasterTeachingCreator(creatorId: string): boolean {
  return LEGAL_MASTER_CREATOR_IDS.has(creatorId);
}

export function getLegalMasterTeachingModules(creatorId: string): LearningModule[] {
  const items = MODULES_BY_CREATOR[creatorId] ?? LEGAL_FOUNDATION_MODULES;
  return items.map((item, index) => ({
    id: `legal-mod-${creatorId}-${index + 1}`,
    ...item,
  }));
}

export function getLegalMasterTeachingTagline(creatorId: string): string {
  return TAGLINES[creatorId] ?? "Learn legal concepts step by step — educational reference only.";
}

export function getLegalMasterSelfPacedPath(_creatorId: string, _level: LearningLevel): SelfPacedStep[] {
  return [];
}

const EXERCISES: Record<string, LegalExercise[]> = {
  "ai-attorney-criminal-001": [
    {
      id: "crim-miranda",
      title: "Miranda scenario",
      level: "beginner",
      topic: "Constitutional rights",
      prompt: "Walk me through a hypothetical arrest scenario and explain Miranda-related concepts (educational only).",
    },
  ],
  "ai-attorney-realestate-001": [
    {
      id: "re-psa",
      title: "Review a PSA outline",
      level: "intermediate",
      topic: "Purchase & sale agreements",
      prompt: "Teach me the key clauses in a residential purchase agreement and what to watch for.",
    },
  ],
  "ai-attorney-accountant-001": [
    {
      id: "acct-entity",
      title: "Pick an entity",
      level: "beginner",
      topic: "Business entity selection",
      prompt: "Compare LLC vs S-Corp for a small service business — legal and accounting angles (educational).",
    },
  ],
  "ai-attorney-tax-001": [
    {
      id: "tax-notice",
      title: "IRS notice drill",
      level: "intermediate",
      topic: "IRS notices & collections",
      prompt: "Explain common IRS notice types and first steps to respond (not personalized tax advice).",
    },
  ],
  "ai-attorney-credit-001": [
    {
      id: "credit-dispute",
      title: "Dispute letter practice",
      level: "beginner",
      topic: "Disputes & corrections",
      prompt: "Teach me how to draft a factual FCRA dispute letter framework (educational template).",
    },
    {
      id: "credit-build",
      title: "Build credit plan",
      level: "beginner",
      topic: "Building credit from scratch",
      prompt: "Create a 6-month educational plan to establish credit responsibly from zero.",
    },
  ],
};

export function getLegalMasterPracticeExercises(params: {
  creatorId: string;
  count: number;
}): LegalExercise[] {
  return (EXERCISES[params.creatorId] ?? []).slice(0, params.count);
}

export function buildLegalMasterTeachingPromptAddition(
  creatorId: string,
  level: LearningLevel,
  mode: LearningMode,
  topic?: string,
): string {
  const tagline = getLegalMasterTeachingTagline(creatorId);
  return `
## Legal Masters academy (${tagline})
Level: ${level}. Mode: ${mode}. Topic: ${topic ?? "legal fundamentals"}.
- You are an AI assistant — NOT a licensed attorney or human legal professional.
- Educational legal reference ONLY — for entertainment and educational purposes.
- Always remind users: if they want professional legal advice, consult a qualified licensed attorney in their jurisdiction.
- Offers or affiliate links may appear; UR Platform may earn a commission on qualifying purchases (disclose per affiliate rules).
- Use **Learning goal → Rules/concepts → Example → Practice → Check questions → Next module**.
`.trim();
}
