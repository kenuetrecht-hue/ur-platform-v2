import { describe, it, expect } from "vitest";
import { ALL_CREATOR_AI_IDS, getCreatorAi, isCreatorAiId } from "../server/_core/ai-creator-registry";
import {
  validateCatalogSync,
  PUBLIC_CATALOG_IDS,
  EXPECTED_PUBLIC_COUNT,
  getFullCatalogEntries,
} from "../lib/ai-creator-catalog-sync";
import { getHandoffSuggestions } from "../server/_core/ai-handoff-service";
import {
  getHiveCapabilities,
  getHivePeers,
  scoreCreatorDomainMatch,
  shouldRunWebSearch,
  buildWebSearchQuery,
  JOBSITE_LOOKUP_CREATOR_IDS,
} from "../server/_core/ai-hive-capabilities";
import { extractShopAssets, extractLearnerFacts, aiUserMemoryService } from "../lib/ai-user-memory-service";
import { getCurriculumForCreator } from "../server/_core/ai-learning-mode";
import { getCatalogCreator } from "../lib/ai-creator-catalog";

const MARINA_ID = "ai-marina-mechanic-001";
const FUNDING_ID = "ai-funding-001";
const CNC_ID = "ai-cnc-master-001";
const CULINARY_ID = "ai-culinary-001";
const CHAIN_SMITH_ID = "ai-blockchain-001";
const MATH_ID = "ai-math-001";
const READING_ID = "ai-reading-001";

describe("AI creator catalog sync", () => {
  it("public catalog has expected count", () => {
    expect(PUBLIC_CATALOG_IDS.length).toBe(EXPECTED_PUBLIC_COUNT);
    expect(PUBLIC_CATALOG_IDS.length).toBeGreaterThanOrEqual(41);
  });

  it("every public catalog ID exists in server registry", () => {
    const result = validateCatalogSync([...ALL_CREATOR_AI_IDS]);
    expect(result.missingFromServer).toEqual([]);
  });

  it("full catalog includes owner ops", () => {
    const full = getFullCatalogEntries();
    expect(full.length).toBeGreaterThanOrEqual(44);
    expect(full.some((c) => c.id === "platform-doctor-ai")).toBe(true);
    expect(full.some((c) => c.id === "ai-welder-001")).toBe(true);
  });

  it("public catalog IDs are unique", () => {
    expect(new Set(PUBLIC_CATALOG_IDS).size).toBe(PUBLIC_CATALOG_IDS.length);
  });
});

describe("Marina Mechanic AI", () => {
  it("is registered on server and in client catalog", () => {
    expect(isCreatorAiId(MARINA_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(MARINA_ID);
    expect(getCatalogCreator(MARINA_ID)?.name).toBe("Marina Mechanic AI");
    expect(getCatalogCreator(MARINA_ID)?.category).toBe("Marine");
  });

  it("has marine mission scope and system prompt inputs", () => {
    const def = getCreatorAi(MARINA_ID);
    expect(def?.name).toBe("Marina Mechanic AI");
    expect(def?.category).toBe("Marine");
    expect(def?.inScope.join(" ")).toMatch(/marina|outboard|3D workspace/i);
    expect(def?.outOfScope.join(" ")).toMatch(/surveyor|Automotive/i);
  });

  it("routes marine domain keywords to this specialist", () => {
    expect(scoreCreatorDomainMatch(MARINA_ID, "My outboard engine won't start after winter")).toBeGreaterThan(0);
    expect(scoreCreatorDomainMatch(MARINA_ID, "How do I run a marina fuel dock safely?")).toBeGreaterThan(0);
  });

  it("has hive peers, handoffs, and learn modules", () => {
    expect(getHivePeers(MARINA_ID)).toContain("ai-3d-specialist");
    expect(getHivePeers(MARINA_ID)).toContain("ai-electrician-001");
    expect(getHandoffSuggestions(MARINA_ID).some((h) => h.targetCreatorId === "ai-3d-specialist")).toBe(true);
    const def = getCreatorAi(MARINA_ID);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(4);
  });
});

describe("Funding AI", () => {
  it("is registered in the Business category on server and client", () => {
    expect(isCreatorAiId(FUNDING_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(FUNDING_ID);
    expect(getCatalogCreator(FUNDING_ID)?.name).toBe("Funding AI");
    expect(getCatalogCreator(FUNDING_ID)?.category).toBe("Business");
  });

  it("covers grants, loans, and startup capital in scope", () => {
    const def = getCreatorAi(FUNDING_ID);
    expect(def?.category).toBe("Business");
    expect(def?.inScope.join(" ")).toMatch(/grant|SBA|startup capital/i);
    expect(def?.outOfScope.join(" ")).toMatch(/guaranteeing|lender|scam/i);
  });

  it("routes funding questions to this specialist", () => {
    expect(scoreCreatorDomainMatch(FUNDING_ID, "I need an SBA loan and a federal grant")).toBeGreaterThan(1);
    expect(scoreCreatorDomainMatch(FUNDING_ID, "Where do I find startup capital in my state?")).toBeGreaterThan(0);
  });

  it("has hive peers, handoffs, and a funding Learn curriculum", () => {
    expect(getHivePeers(FUNDING_ID)).toContain("ai-business-001");
    expect(getHivePeers(FUNDING_ID)).toContain("ai-accountant-001");
    expect(getHandoffSuggestions(FUNDING_ID).some((h) => h.targetCreatorId === "ai-business-001")).toBe(true);
    expect(getHandoffSuggestions("ai-business-001").some((h) => h.targetCreatorId === FUNDING_ID)).toBe(true);
    const def = getCreatorAi(FUNDING_ID);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(8);
    expect(getCurriculumForCreator(def!).some((m) => /grant|SBA|capital/i.test(m.title))).toBe(true);
  });
});

describe("Master CNC AI", () => {
  it("is registered in Manufacturing on server and client", () => {
    expect(isCreatorAiId(CNC_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(CNC_ID);
    expect(getCatalogCreator(CNC_ID)?.name).toBe("Master CNC & Mill AI");
    expect(getCatalogCreator(CNC_ID)?.category).toBe("Manufacturing");
  });

  it("covers lathes, drills, and CNC in scope", () => {
    const def = getCreatorAi(CNC_ID);
    expect(def?.inScope.join(" ")).toMatch(/manual mill|CNC mill|NBC|lathe|drill|G-code/i);
    expect(def?.inScope.join(" ")).toMatch(/any brand|web lookup|jobsite|memory/i);
    expect(def?.outOfScope.join(" ")).toMatch(/interlock|E-stop|exploit/i);
  });

  it("searches the web for brand, model, and jobsite alarms", () => {
    const caps = getHiveCapabilities(CNC_ID);
    expect(shouldRunWebSearch("Haas VF-2 alarm 103 on the mill", caps, CNC_ID)).toBe(true);
    expect(shouldRunWebSearch("1987 Bridgeport Series I won't home", caps, CNC_ID)).toBe(true);
    expect(shouldRunWebSearch("Biesse NBC operator manual", caps, CNC_ID)).toBe(true);
    expect(shouldRunWebSearch("hello how are you", caps, CNC_ID)).toBe(false);
    expect(buildWebSearchQuery("Haas VF-2 alarm 103", CNC_ID)).toMatch(/OEM service manual/i);
  });

  it("remembers shop machines named on the job", () => {
    expect(extractShopAssets("My 1987 Bridgeport Series I and a Haas VF-2")).toEqual(
      expect.arrayContaining([expect.stringMatching(/bridgeport/i), expect.stringMatching(/haas/i)]),
    );
    aiUserMemoryService.initializeUser("shop-1", CNC_ID, "Ken");
    aiUserMemoryService.rememberShopAssetsFromMessage("shop-1", CNC_ID, "We run a Haas VF-2 at the shop");
    expect(aiUserMemoryService.getRememberedShopAssets("shop-1", CNC_ID).join(" ")).toMatch(/haas/i);
  });

  it("routes machining questions to this specialist", () => {
    expect(scoreCreatorDomainMatch(CNC_ID, "I need G-code for a CNC lathe facing cut")).toBeGreaterThan(1);
    expect(scoreCreatorDomainMatch(CNC_ID, "What drill and tap for this hole on the mill?")).toBeGreaterThan(0);
    expect(scoreCreatorDomainMatch(CNC_ID, "How do I run the NBC nesting cell?")).toBeGreaterThan(0);
  });

  it("has hive peers, handoffs, and a CNC Learn curriculum", () => {
    expect(getHivePeers(CNC_ID)).toContain("ai-3d-specialist");
    expect(getHivePeers(CNC_ID)).toContain("ai-blueprint-reader-001");
    expect(getHandoffSuggestions(CNC_ID).some((h) => h.targetCreatorId === "ai-3d-specialist")).toBe(true);
    expect(getHandoffSuggestions("ai-3d-specialist").some((h) => h.targetCreatorId === CNC_ID)).toBe(true);
    const def = getCreatorAi(CNC_ID);
    expect(def).toBeDefined();
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(8);
    expect(getCurriculumForCreator(def!).some((m) => /manual mill|NBC|G-code|drill|brand/i.test(m.title))).toBe(true);
  });
});

const FIELD_LOOKUP_IDS = [
  "ai-automotive-001",
  "ai-hvac-001",
  "ai-robotics-001",
  "ai-small-engine-001",
  "ai-marina-mechanic-001",
  "ai-electrician-001",
  "ai-plumber-001",
  "ai-welder-001",
  "ai-contractor-001",
  "ai-landscaping-001",
  "ai-tree-service-001",
  "ai-roofer-001",
  "ai-3d-specialist",
  "ai-drywall-001",
  "ai-framer-001",
  "ai-structural-001",
  "ai-seismic-001",
  "ai-wind-load-001",
  "ai-dynamics-001",
  "ai-culinary-001",
] as const;

describe("Jobsite OEM lookup for field AIs", () => {
  it("covers automotive, HVAC, robotics, and the other nameplate trades", () => {
    for (const id of FIELD_LOOKUP_IDS) {
      expect(JOBSITE_LOOKUP_CREATOR_IDS.has(id)).toBe(true);
      const def = getCreatorAi(id);
      expect(def?.inScope.join(" ")).toMatch(/any brand|web lookup|memory/i);
      expect(getCatalogCreator(id)?.mission).toMatch(/brand|oem|job|dock|field|floor|hardware/i);
    }
  });

  it("searches the web for brand-specific faults on those specialists", () => {
    const auto = getHiveCapabilities("ai-automotive-001");
    const hvac = getHiveCapabilities("ai-hvac-001");
    const robot = getHiveCapabilities("ai-robotics-001");
    expect(shouldRunWebSearch("Toyota Camry P0300 misfire", auto, "ai-automotive-001")).toBe(true);
    expect(shouldRunWebSearch("Carrier 58MVP furnace fault 33", hvac, "ai-hvac-001")).toBe(true);
    expect(shouldRunWebSearch("FANUC LR Mate alarm SRVO-050", robot, "ai-robotics-001")).toBe(true);
    expect(shouldRunWebSearch("Simpson HDU hold-down on this retrofit", getHiveCapabilities("ai-structural-001"), "ai-structural-001")).toBe(true);
    expect(shouldRunWebSearch("USG Sheetrock mud cracking on the job", getHiveCapabilities("ai-drywall-001"), "ai-drywall-001")).toBe(true);
    expect(shouldRunWebSearch("hello how are you", auto, "ai-automotive-001")).toBe(false);
  });

  it("remembers vehicles, HVAC units, and robots named on the job", () => {
    expect(extractShopAssets("Toyota Camry and a Carrier furnace")).toEqual(
      expect.arrayContaining([expect.stringMatching(/toyota/i), expect.stringMatching(/carrier/i)]),
    );
    expect(extractShopAssets("FANUC LR Mate on cell 2")).toEqual(
      expect.arrayContaining([expect.stringMatching(/fanuc/i)]),
    );
  });
});

describe("Culinary Arts AI", () => {
  it("is registered in Culinary on server and client", () => {
    expect(isCreatorAiId(CULINARY_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(CULINARY_ID);
    expect(getCatalogCreator(CULINARY_ID)?.name).toBe("Culinary Arts AI");
    expect(getCatalogCreator(CULINARY_ID)?.category).toBe("Culinary");
  });

  it("covers kitchen craft, allergens, and equipment lookup", () => {
    const def = getCreatorAi(CULINARY_ID);
    expect(def?.inScope.join(" ")).toMatch(/knife|sauce|allergen|ServSafe|memory/i);
    expect(def?.outOfScope.join(" ")).toMatch(/diet therapy|ServSafe|fire-suppression/i);
  });

  it("routes cooking questions and looks up kitchen OEM gear", () => {
    const caps = getHiveCapabilities(CULINARY_ID);
    expect(scoreCreatorDomainMatch(CULINARY_ID, "How do I hold a mother sauce on the line?")).toBeGreaterThan(0);
    expect(shouldRunWebSearch("Hobart mixer won't start in this kitchen", caps, CULINARY_ID)).toBe(true);
    expect(extractShopAssets("We run a Hobart mixer and a KitchenAid bowl")).toEqual(
      expect.arrayContaining([expect.stringMatching(/hobart/i), expect.stringMatching(/kitchenaid/i)]),
    );
  });

  it("has hive peers, handoffs, and a culinary Learn curriculum", () => {
    expect(getHivePeers(CULINARY_ID)).toContain("ai-fitness-001");
    expect(getHivePeers(CULINARY_ID)).toContain("ai-business-001");
    expect(getHandoffSuggestions(CULINARY_ID).some((h) => h.targetCreatorId === "ai-funding-001")).toBe(true);
    const def = getCreatorAi(CULINARY_ID);
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(8);
    expect(getCurriculumForCreator(def!).some((m) => /knife|allergen|ServSafe|equipment/i.test(m.title))).toBe(true);
  });
});

describe("ChainSmith", () => {
  it("is registered in Technology on server and client", () => {
    expect(isCreatorAiId(CHAIN_SMITH_ID)).toBe(true);
    expect(ALL_CREATOR_AI_IDS).toContain(CHAIN_SMITH_ID);
    expect(getCatalogCreator(CHAIN_SMITH_ID)?.name).toBe("ChainSmith");
    expect(getCatalogCreator(CHAIN_SMITH_ID)?.category).toBe("Technology");
  });

  it("teaches and codes blockchains, not markets", () => {
    const def = getCreatorAi(CHAIN_SMITH_ID);
    expect(def?.mission).toMatch(/teach and build blockchains/i);
    expect(def?.inScope.join(" ")).toMatch(/teaching chain|solidity|hash/i);
    expect(def?.outOfScope.join(" ")).toMatch(/investment|mainnet|mixer/i);
  });

  it("routes chain-coding questions to this specialist", () => {
    expect(scoreCreatorDomainMatch(CHAIN_SMITH_ID, "Help me code a blockchain with proof of work")).toBeGreaterThan(0);
    expect(scoreCreatorDomainMatch(CHAIN_SMITH_ID, "Write a Solidity smart contract lab")).toBeGreaterThan(0);
  });

  it("has hive peers, handoffs, and a blockchain Learn curriculum", () => {
    expect(getHivePeers(CHAIN_SMITH_ID)).toContain("ai-coder-001");
    expect(getHivePeers(CHAIN_SMITH_ID)).toContain("ai-crypto-001");
    expect(getHandoffSuggestions(CHAIN_SMITH_ID).some((h) => h.targetCreatorId === "ai-coder-001")).toBe(true);
    const def = getCreatorAi(CHAIN_SMITH_ID);
    expect(getCurriculumForCreator(def!).length).toBeGreaterThanOrEqual(8);
    expect(getCurriculumForCreator(def!).some((m) => /hash|block|solidity|chain/i.test(m.title))).toBe(true);
  });
});

describe("Math Mentor AI", () => {
  it("is registered as Education, not bookkeeping", () => {
    expect(isCreatorAiId(MATH_ID)).toBe(true);
    expect(getCatalogCreator(MATH_ID)?.name).toBe("Math Mentor AI");
    expect(getCatalogCreator(MATH_ID)?.category).toBe("Education");
    expect(getCreatorAi(MATH_ID)?.outOfScope.join(" ")).toMatch(/bookkeeping|Accountant/i);
  });

  it("routes algebra to Math Mentor, not the accountant", () => {
    expect(scoreCreatorDomainMatch(MATH_ID, "Help me factor this algebra equation")).toBeGreaterThan(0);
    expect(getHandoffSuggestions("ai-accountant-001").some((h) => h.targetCreatorId === MATH_ID)).toBe(true);
    expect(getCurriculumForCreator(getCreatorAi(MATH_ID)!).some((m) => /algebra|calculus|geometry/i.test(m.title))).toBe(
      true,
    );
  });
});

describe("Reading AI", () => {
  it("is registered in Language with phonics, not a commercial brand clone", () => {
    expect(isCreatorAiId(READING_ID)).toBe(true);
    expect(getCatalogCreator(READING_ID)?.name).toBe("Reading AI");
    expect(getCatalogCreator(READING_ID)?.category).toBe("Language");
    expect(getCreatorAi(READING_ID)?.inScope.join(" ")).toMatch(/phonics/i);
    expect(getCreatorAi(READING_ID)?.outOfScope.join(" ")).toMatch(/trademarked|dyslexia/i);
  });

  it("hands off speaking to LinguaMate", () => {
    expect(scoreCreatorDomainMatch(READING_ID, "Teach me phonics so I can learn to read")).toBeGreaterThan(0);
    expect(getHivePeers(READING_ID)).toContain("linguamate");
    expect(getHandoffSuggestions("linguamate").some((h) => h.targetCreatorId === READING_ID)).toBe(true);
    expect(getHandoffSuggestions(READING_ID).some((h) => h.targetCreatorId === "linguamate")).toBe(true);
  });
});

describe("Learn memory travels with the specialist", () => {
  it("stores learner facts and last lesson so the next session continues", () => {
    expect(extractLearnerFacts("I'm a beginner cook, vegetarian, and allergic to peanuts")).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/diet:vegetarian/i),
        expect.stringMatching(/allergy:peanuts/i),
        expect.stringMatching(/skill:beginner/i),
      ]),
    );
    aiUserMemoryService.initializeUser("cook-1", CULINARY_ID, "Ken");
    aiUserMemoryService.rememberLearnerFactsFromMessage(
      "cook-1",
      CULINARY_ID,
      "I'm a beginner cook, vegetarian, and allergic to peanuts",
    );
    aiUserMemoryService.recordLearningProgress("cook-1", CULINARY_ID, {
      level: "beginner",
      mode: "lesson",
      topic: "Knife skills and mise en place",
    });
    expect(aiUserMemoryService.getRememberedLearnerFacts("cook-1", CULINARY_ID).join(" ")).toMatch(
      /vegetarian|peanuts|beginner/i,
    );
    expect(aiUserMemoryService.getLearningProgressTags("cook-1", CULINARY_ID).join(" ")).toMatch(
      /knife skills|beginner|lesson/i,
    );
  });
});
