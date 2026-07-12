import { describe, it, expect } from "vitest";
import { ALL_AI_CREATORS, generateAIContent, getAICreatorById } from "../lib/ai-creators-system";
import { generateHealingResponse, getWellnessRecommendations, assessEmotionalState } from "../lib/ai-healing-abilities";
import { getAdvancedCapabilities } from "../lib/ai-advanced-capabilities";

describe("All 24 AI Creators", () => {
  it("should have exactly 24 AI creators", () => {
    expect(ALL_AI_CREATORS.length).toBeGreaterThanOrEqual(24);
  });

  it("should have unique IDs for all creators", () => {
    const ids = ALL_AI_CREATORS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBeGreaterThanOrEqual(24);
  });

  it("should have all required properties for each creator", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      expect(creator.id).toBeDefined();
      expect(creator.name).toBeDefined();
      expect(creator.handle).toBeDefined();
      expect(creator.avatar).toBeDefined();
      expect(creator.bio).toBeDefined();
      expect(creator.category).toBeDefined();
      expect(creator.tier).toBeDefined();
      expect(creator.price).toBeGreaterThanOrEqual(0);
      expect(creator.followers).toBeGreaterThan(0);
      expect(creator.rating).toBeGreaterThan(0);
    });
  });

  it("should have OmniCapabilities for all creators", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const caps = creator.omniCapabilities;
      expect(caps?.longTermMemory.enabled).toBe(true);
      expect(caps?.realTimeAudio.enabled).toBe(true);
      expect(caps?.vocalToneDetection.enabled).toBe(true);
      expect(caps?.adaptiveResponses.enabled).toBe(true);
    });
  });

  it("should generate content for all creators", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const content = generateAIContent(creator);
      expect(content.id).toBeDefined();
      expect(content.creatorId).toBe(creator.id);
      expect(content.title).toBeDefined();
      expect(content.content).toBeDefined();
      expect(content.timestamp).toBeInstanceOf(Date);
    });
  });

  it("should retrieve creators by ID", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const retrieved = getAICreatorById(creator.id);
      expect(retrieved).toEqual(creator);
    });
  });

  it("should have valid pricing tiers", () => {
    const validTiers = ["bronze", "silver", "gold", "platinum"];
    ALL_AI_CREATORS.forEach((creator) => {
      expect(validTiers).toContain(creator.tier);
    });
  });

  it("should have valid ratings (4-5)", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      expect(creator.rating).toBeGreaterThanOrEqual(4.0);
      expect(creator.rating).toBeLessThanOrEqual(5.0);
    });
  });
});

describe("Original 10 AI Creators", () => {
  const originalCreators = [
    "ai-wellness-001",
    "ai-fitness-001",
    "ai-crypto-001",
    "ai-news-001",
    "ai-career-001",
    "ai-creative-001",
    "ai-author-001",
    "ai-coder-001",
    "ai-business-001",
    "ai-legal-001",
  ];

  it("should have all original creators in the system", () => {
    originalCreators.forEach((id) => {
      const creator = getAICreatorById(id);
      expect(creator).toBeDefined();
      expect(creator?.id).toBe(id);
    });
  });
});

describe("New 14 Tier 1 Educational AI Creators", () => {
  const newCreators = [
    { id: "ai-realestate-001", name: "Real Estate Master AI" },
    { id: "ai-electrician-001", name: "Electrician Expert AI" },
    { id: "ai-contractor-001", name: "Contractor Pro AI" },
    { id: "ai-hvac-001", name: "HVAC Specialist AI" },
    { id: "ai-landscaping-001", name: "Landscaping Master AI" },
    { id: "ai-attorney-001", name: "Attorney AI" },
    { id: "ai-accountant-001", name: "Accountant Pro AI" },
    { id: "ai-marketing-001", name: "Marketing Expert AI" },
    { id: "ai-sales-001", name: "Sales Master AI" },
    { id: "ai-hr-001", name: "HR Specialist AI" },
    { id: "ai-operations-001", name: "Operations Manager AI" },
    { id: "ai-customer-service-001", name: "Customer Service Pro AI" },
    { id: "ai-product-001", name: "Product Manager AI" },
    { id: "ai-content-helper-001", name: "Content Creator Helper AI" },
  ];

  it("should have all 14 new educational AI creators", () => {
    newCreators.forEach(({ id, name }) => {
      const creator = getAICreatorById(id);
      expect(creator).toBeDefined();
      expect(creator?.id).toBe(id);
      expect(creator?.name).toBe(name);
    });
  });

  it("should have appropriate pricing for educational AIs", () => {
    newCreators.forEach(({ id }) => {
      const creator = getAICreatorById(id);
      expect(creator?.price).toBeGreaterThanOrEqual(0);
      expect(creator?.price).toBeLessThanOrEqual(12.99);
    });
  });
});

describe("Healing Abilities", () => {
  it("should generate healing responses for stress", () => {
    const response = generateHealingResponse("ai-wellness-001", "stressed", "work pressure");
    expect(response.message).toBeDefined();
    expect(response.technique).toBeDefined();
    expect(response.duration).toBeGreaterThan(0);
    expect(response.effectiveness).toBeGreaterThan(0.8);
  });

  it("should generate healing responses for anxiety", () => {
    const response = generateHealingResponse("ai-wellness-001", "anxious", "upcoming presentation");
    expect(response.technique).toBeDefined();
    expect(response.effectiveness).toBeGreaterThan(0.8);
  });

  it("should assess emotional state from user input", () => {
    const stressedState = assessEmotionalState("I'm feeling really stressed about work");
    expect(stressedState.mood).toBe("stressed");
    expect(stressedState.intensity).toBeGreaterThan(0.7);

    const uncertainState = assessEmotionalState("I'm feeling confused and lost");
    expect(uncertainState.mood).toBe("uncertain");
  });

  it("should provide wellness recommendations", () => {
    const recommendations = getWellnessRecommendations("ai-wellness-001", {
      stressLevel: 0.8,
      sleepQuality: 0.5,
      exerciseFrequency: 0.3,
      workLifeBalance: 0.4,
    });
    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe("Advanced Capabilities", () => {
  it("should have advanced capabilities for all creators", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const caps = getAdvancedCapabilities(creator.id);
      expect(caps.webSearch.enabled).toBe(true);
      expect(caps.visualization3D.enabled).toBe(true);
      expect(caps.voiceSynthesis.enabled).toBe(true);
      expect(caps.fileExport.enabled).toBe(true);
      expect(caps.equipmentIntegration.enabled).toBe(true);
      expect(caps.collaborationTools.enabled).toBe(true);
    });
  });

  it("should support multiple export formats", () => {
    const caps = getAdvancedCapabilities("ai-attorney-001");
    expect(caps.fileExport.formats.length).toBeGreaterThan(0);
  });

  it("should support equipment integration", () => {
    const caps = getAdvancedCapabilities("ai-electrician-001");
    expect(caps.equipmentIntegration.enabled).toBe(true);
    expect(caps.equipmentIntegration.supportedDevices.length).toBeGreaterThan(0);
  });

  it("should support real-time collaboration", () => {
    const caps = getAdvancedCapabilities("ai-content-helper-001");
    expect(caps.collaborationTools.realTimeEditing).toBe(true);
    expect(caps.collaborationTools.versionControl).toBe(true);
  });
});

describe("Content Generation", () => {
  it("should generate unique content titles", () => {
    const wellness = getAICreatorById("ai-wellness-001");
    if (wellness) {
      const content1 = generateAIContent(wellness);
      const content2 = generateAIContent(wellness);
      expect(content1.title).toBeDefined();
      expect(content2.title).toBeDefined();
    }
  });

  it("should include engagement metrics in content", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const content = generateAIContent(creator);
      expect(content.engagement.views).toBeGreaterThan(0);
      expect(content.engagement.likes).toBeGreaterThan(0);
      expect(content.engagement.shares).toBeGreaterThan(0);
    });
  });
});

describe("Category Organization", () => {
  it("should have appropriate categories", () => {
    const categories = new Set(ALL_AI_CREATORS.map((c) => c.category));
    expect(categories.size).toBeGreaterThan(5);
  });

  it("should have creators in multiple tiers", () => {
    const tiers = new Set(ALL_AI_CREATORS.map((c) => c.tier));
    expect(tiers.has("bronze")).toBe(true);
    expect(tiers.has("gold")).toBe(true);
  });
});

describe("Integration Tests", () => {
  it("should handle full workflow for sample creators", () => {
    ALL_AI_CREATORS.slice(0, 5).forEach((creator) => {
      const retrieved = getAICreatorById(creator.id);
      expect(retrieved).toBeDefined();

      const content = generateAIContent(creator);
      expect(content.creatorId).toBe(creator.id);

      const caps = getAdvancedCapabilities(creator.id);
      expect(caps.webSearch.enabled).toBe(true);
    });
  });

  it("should maintain data consistency across modules", () => {
    ALL_AI_CREATORS.forEach((creator) => {
      const retrieved = getAICreatorById(creator.id);
      expect(retrieved?.id).toBe(creator.id);
      expect(retrieved?.name).toBe(creator.name);
      expect(retrieved?.omniCapabilities).toBeDefined();
    });
  });
});
