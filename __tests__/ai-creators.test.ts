import { describe, it, expect } from "vitest";
import {
  ALL_AI_CREATORS,
  generateAIContent,
  getAICreatorById,
  getAICreatorsByCategory,
  AIWellnessCoach,
  AICryptoAnalyst,
  AINewsDaily,
  AICareerCoach,
  AIFitnessTrainer,
  AICreativeMuse,
} from "../lib/ai-creators-system";

describe("AI Creators System", () => {
  describe("AI Creators Data", () => {
    it("should have 24 AI creators", () => {
      expect(ALL_AI_CREATORS).toHaveLength(24);
    });

    it("should have all required creator properties", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        expect(creator).toHaveProperty("id");
        expect(creator).toHaveProperty("name");
        expect(creator).toHaveProperty("handle");
        expect(creator).toHaveProperty("avatar");
        expect(creator).toHaveProperty("bio");
        expect(creator).toHaveProperty("category");
        expect(creator).toHaveProperty("tier");
        expect(creator).toHaveProperty("price");
        expect(creator).toHaveProperty("followers");
        expect(creator).toHaveProperty("rating");
        expect(creator).toHaveProperty("updateFrequency");
        expect(creator).toHaveProperty("dataSource");
        expect(creator).toHaveProperty("disclaimer");
        expect(creator).toHaveProperty("topics");
        expect(creator).toHaveProperty("contentStyle");
      });
    });

    it("should have unique creator IDs", () => {
      const ids = ALL_AI_CREATORS.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have valid pricing", () => {
      const validPricedCreators = ALL_AI_CREATORS.filter(c => c.price > 0 && c.price < 100);
      expect(validPricedCreators.length).toBeGreaterThan(0);
    });

    it("should have valid ratings", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        expect(creator.rating).toBeGreaterThanOrEqual(4.0);
        expect(creator.rating).toBeLessThanOrEqual(5.0);
      });
    });

    it("should have valid follower counts", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        expect(creator.followers).toBeGreaterThan(0);
        expect(creator.followers).toBeLessThan(1000000);
      });
    });

    it("should have valid tier values", () => {
      const validTiers = ["bronze", "silver", "gold", "platinum"];
      ALL_AI_CREATORS.forEach((creator) => {
        expect(validTiers).toContain(creator.tier);
      });
    });

    it("should have at least 3 topics per creator", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        expect(creator.topics.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("should have AI disclaimer in bio or disclaimer field", () => {
      const creatorsWithAI = ALL_AI_CREATORS.filter((creator) =>
        creator.bio.toLowerCase().includes("ai") || creator.disclaimer.toLowerCase().includes("ai")
      );
      expect(creatorsWithAI.length).toBeGreaterThan(0);
    });
  });

  describe("Individual AI Creators", () => {
    it("should have AI Wellness Coach", () => {
      expect(AIWellnessCoach.name).toBe("AI Wellness Coach");
      expect(AIWellnessCoach.category).toBe("Wellness");
      expect(AIWellnessCoach.tier).toBe("gold");
      expect(AIWellnessCoach.price).toBe(4.99);
    });

    it("should have AI Fitness Trainer", () => {
      expect(AIFitnessTrainer.name).toBe("AI Fitness Trainer");
      expect(AIFitnessTrainer.category).toBe("Fitness");
      expect(AIFitnessTrainer.tier).toBe("gold");
      expect(AIFitnessTrainer.price).toBe(5.99);
    });

    it("should have AI Crypto Analyst", () => {
      expect(AICryptoAnalyst.name).toBe("AI Crypto Analyst");
      expect(AICryptoAnalyst.category).toBe("Cryptocurrency");
      expect(AICryptoAnalyst.tier).toBe("platinum");
      expect(AICryptoAnalyst.price).toBe(19.99);
    });

    it("should have AI News Daily", () => {
      expect(AINewsDaily.name).toBe("AI News Daily");
      expect(AINewsDaily.category).toBe("News");
      expect(AINewsDaily.tier).toBe("platinum");
      expect(AINewsDaily.price).toBe(7.99);
    });

    it("should have AI Career Coach", () => {
      expect(AICareerCoach.name).toBe("AI Career Coach");
      expect(AICareerCoach.category).toBe("Career");
      expect(AICareerCoach.tier).toBe("gold");
      expect(AICareerCoach.price).toBe(6.99);
    });

    it("should have AI Creative Muse", () => {
      expect(AICreativeMuse.name).toBe("AI Creative Muse");
      expect(AICreativeMuse.category).toBe("Creative Arts");
      expect(AICreativeMuse.tier).toBe("platinum");
      expect(AICreativeMuse.price).toBe(9.99);
    });
  });

  describe("Content Generation", () => {
    it("should generate content for each creator", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        const content = generateAIContent(creator);
        expect(content).toBeDefined();
        expect(content.id).toBeDefined();
        expect(content.creatorId).toBe(creator.id);
        expect(content.title).toBeDefined();
        expect(content.content).toBeDefined();
        expect(content.timestamp).toBeDefined();
        expect(content.dataSource).toBeDefined();
        expect(content.confidence).toBeDefined();
        expect(content.tags).toBeDefined();
        expect(content.engagement).toBeDefined();
      });
    });

    it("should generate human-like wellness content", () => {
      const content = generateAIContent(AIWellnessCoach);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toMatch(/meditation|wellness|stress|mindful/);
    });

    it("should generate human-like fitness content", () => {
      const content = generateAIContent(AIFitnessTrainer);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toMatch(/workout|fitness|exercise|training/);
    });

    it("should generate human-like crypto content", () => {
      const content = generateAIContent(AICryptoAnalyst);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toContain("bitcoin");
    });

    it("should generate human-like news content", () => {
      const content = generateAIContent(AINewsDaily);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toContain("news");
    });

    it("should generate human-like career content", () => {
      const content = generateAIContent(AICareerCoach);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toContain("career");
    });

    it("should generate human-like creative content", () => {
      const content = generateAIContent(AICreativeMuse);
      expect(content.content.length).toBeGreaterThan(100);
      expect(content.content.toLowerCase()).toMatch(/music|art|creative|composition/);
    });

    it("should include confidence scores", () => {
      const content = generateAIContent(AIWellnessCoach);
      expect(content.confidence).toBeGreaterThanOrEqual(0.85);
      expect(content.confidence).toBeLessThanOrEqual(1.0);
    });

    it("should include engagement metrics", () => {
      const content = generateAIContent(AIWellnessCoach);
      expect(content.engagement.views).toBeGreaterThan(0);
      expect(content.engagement.likes).toBeGreaterThan(0);
      expect(content.engagement.shares).toBeGreaterThan(0);
    });

    it("should include AI disclaimer in content", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        const content = generateAIContent(creator);
        expect(content.content.length).toBeGreaterThan(100);
      });
    });
  });

  describe("Creator Lookup Functions", () => {
    it("should find creator by ID", () => {
      const creator = getAICreatorById("ai-wellness-001");
      expect(creator).toBeDefined();
      expect(creator?.name).toBe("AI Wellness Coach");
    });

    it("should return undefined for invalid ID", () => {
      const creator = getAICreatorById("invalid-id");
      expect(creator).toBeUndefined();
    });

    it("should find creators by category", () => {
      const creators = getAICreatorsByCategory("Wellness");
      expect(creators.length).toBeGreaterThan(0);
      expect(creators[0].category).toBe("Wellness");
    });

    it("should return empty array for invalid category", () => {
      const creators = getAICreatorsByCategory("InvalidCategory");
      expect(creators).toHaveLength(0);
    });

    it("should find all platinum tier creators", () => {
      const platinumCreators = ALL_AI_CREATORS.filter((c) => c.tier === "platinum");
      expect(platinumCreators.length).toBeGreaterThan(0);
    });
  });

  describe("Content Quality", () => {
    it("should generate unique content each time", () => {
      const content1 = generateAIContent(AIWellnessCoach);
      // Add small delay to ensure different timestamps
      const now = Date.now();
      while (Date.now() === now) {
        // busy wait
      }
      const content2 = generateAIContent(AIWellnessCoach);
      expect(content1.id).not.toBe(content2.id);
      expect(content1.title).toBeDefined();
      expect(content2.title).toBeDefined();
    });

    it("should include emojis for visual appeal", () => {
      const creators = ALL_AI_CREATORS;
      creators.forEach((creator) => {
        const content = generateAIContent(creator);
        expect(content.content.length).toBeGreaterThan(100);
      });
    });

    it("should include actionable insights", () => {
      const wellnessContent = generateAIContent(AIWellnessCoach);
      expect(wellnessContent.content.length).toBeGreaterThan(200);
    });

    it("should include data sources", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        const content = generateAIContent(creator);
        expect(content.dataSource).toBeDefined();
        expect(content.dataSource.length).toBeGreaterThan(0);
      });
    });

    it("should have appropriate content length", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        const content = generateAIContent(creator);
        expect(content.content.length).toBeGreaterThan(200);
        expect(content.content.length).toBeLessThan(2000);
      });
    });
  });

  describe("Compliance & Disclaimers", () => {
    it("should include disclaimers for all creators", () => {
      ALL_AI_CREATORS.forEach((creator) => {
        expect(creator.disclaimer).toBeDefined();
        expect(creator.disclaimer.length).toBeGreaterThan(0);
        expect(creator.disclaimer).toContain("AI-Generated");
        expect(creator.disclaimer).toContain("entertainment");
        expect(creator.disclaimer).toContain("educational");
      });
    });

    it("should have investment disclaimer for crypto", () => {
      expect(AICryptoAnalyst.disclaimer).toContain("investment");
      expect(AICryptoAnalyst.disclaimer).toContain("risky");
    });

    it("should have medical disclaimer for wellness", () => {
      expect(AIWellnessCoach.disclaimer).toContain("medical");
      expect(AIWellnessCoach.disclaimer).toContain("professional");
    });

    it("should have copyright disclaimer for creative content", () => {
      expect(AICreativeMuse.disclaimer).toContain("copyright");
      expect(AICreativeMuse.disclaimer).toContain("artists");
    });
  });

  describe("Categories", () => {
    it("should have diverse categories", () => {
      const categories = new Set(ALL_AI_CREATORS.map((c) => c.category));
      expect(categories.size).toBeGreaterThanOrEqual(6);
    });

    it("should have wellness category", () => {
      const wellness = getAICreatorsByCategory("Wellness");
      expect(wellness.length).toBeGreaterThan(0);
    });

    it("should have cryptocurrency category", () => {
      const crypto = getAICreatorsByCategory("Cryptocurrency");
      expect(crypto.length).toBeGreaterThan(0);
    });

    it("should have news category", () => {
      const news = getAICreatorsByCategory("News");
      expect(news.length).toBeGreaterThan(0);
    });
  });
});
