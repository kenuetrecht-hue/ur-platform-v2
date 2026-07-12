import { describe, it, expect, beforeEach } from "vitest";
import { MultiAICollaborationEngine } from "./multi-ai-collaboration";

describe("MultiAICollaborationEngine", () => {
  let engine: MultiAICollaborationEngine;

  beforeEach(() => {
    engine = new MultiAICollaborationEngine();
  });

  describe("Problem Analysis", () => {
    it("should analyze problems and recommend AIs", () => {
      const analysis = engine.analyzeProblem("I need to design a 3D printed bracket");
      expect(analysis).toHaveProperty("problemDescription");
      expect(analysis).toHaveProperty("recommendedAIs");
      expect(analysis).toHaveProperty("collaborationPlan");
      expect(analysis).toHaveProperty("estimatedComplexity");
    });

    it("should prioritize user-suggested AIs", () => {
      const suggestedAIs = ["AI_3D_SPECIALIST", "AI_ELECTRICIAN"];
      const analysis = engine.analyzeProblem("Design a system", suggestedAIs);

      const recommendedIds = analysis.recommendedAIs.map((a) => a.aiId);
      expect(recommendedIds).toContain("AI_3D_SPECIALIST");
      expect(recommendedIds).toContain("AI_ELECTRICIAN");
    });

    it("should estimate complexity based on AI count", () => {
      const simple = engine.analyzeProblem("Simple task", ["AI_3D_SPECIALIST"]);
      expect(simple.estimatedComplexity).toBe("simple");

      const complex = engine.analyzeProblem("Complex system", [
        "AI_3D_SPECIALIST",
        "AI_ELECTRICIAN",
        "AI_MECHANIC",
        "AI_ENGINEER",
      ]);
      expect(complex.estimatedComplexity).toBe("complex");
    });

    it("should generate collaboration plan", () => {
      const analysis = engine.analyzeProblem("Design an automated system");
      expect(analysis.collaborationPlan).toBeDefined();
      expect(analysis.collaborationPlan.length).toBeGreaterThan(0);
    });
  });

  describe("Collaboration Sessions", () => {
    it("should create collaboration session", () => {
      const session = engine.createSession("Design a 3D printed part", ["AI_3D_SPECIALIST"]);

      expect(session).toHaveProperty("sessionId");
      expect(session.problemDescription).toBe("Design a 3D printed part");
      expect(session.participatingAIs.length).toBe(1);
      expect(session.status).toBe("active");
    });

    it("should add multiple AIs to session", () => {
      const aiIds = ["AI_3D_SPECIALIST", "AI_ELECTRICIAN", "AI_MECHANIC"];
      const session = engine.createSession("Complex project", aiIds);

      expect(session.participatingAIs.length).toBe(3);
      expect(session.participatingAIs.map((a) => a.aiId)).toEqual(aiIds);
    });

    it("should retrieve session details", () => {
      const created = engine.createSession("Test problem", ["AI_3D_SPECIALIST"]);
      const retrieved = engine.getSession(created.sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(created.sessionId);
      expect(retrieved?.problemDescription).toBe("Test problem");
    });

    it("should list active sessions", () => {
      engine.createSession("Problem 1", ["AI_3D_SPECIALIST"]);
      engine.createSession("Problem 2", ["AI_ELECTRICIAN"]);

      const sessions = engine.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.every((s) => s.status === "active")).toBe(true);
    });

    it("should close sessions", () => {
      const session = engine.createSession("Test", ["AI_3D_SPECIALIST"]);
      engine.closeSession(session.sessionId);

      const retrieved = engine.getSession(session.sessionId);
      expect(retrieved?.status).toBe("completed");
    });
  });

  describe("AI Contributions", () => {
    it("should add AI contribution to session", () => {
      const session = engine.createSession("Design task", ["AI_3D_SPECIALIST"]);

      const contribution = engine.addContribution(
        session.sessionId,
        "AI_3D_SPECIALIST",
        "I recommend using SLA printing for precision",
        "3D printing expert",
        ["Use SLA printer", "Select appropriate resin"]
      );

      expect(contribution).toHaveProperty("aiId");
      expect(contribution).toHaveProperty("contribution");
      expect(contribution).toHaveProperty("recommendations");
      expect(contribution.recommendations.length).toBe(2);
    });

    it("should throw error for invalid session", () => {
      expect(() => {
        engine.addContribution("invalid_session", "AI_3D_SPECIALIST", "Test", "Expert", []);
      }).toThrow();
    });

    it("should throw error for invalid AI", () => {
      const session = engine.createSession("Test", ["AI_3D_SPECIALIST"]);

      expect(() => {
        engine.addContribution(session.sessionId, "INVALID_AI", "Test", "Expert", []);
      }).toThrow();
    });
  });

  describe("Solution Synthesis", () => {
    it("should synthesize collaborative solution", () => {
      const session = engine.createSession("Design a bracket", ["AI_3D_SPECIALIST", "AI_MECHANIC"]);

      engine.addContribution(
        session.sessionId,
        "AI_3D_SPECIALIST",
        "Use SLA printing for precision",
        "3D expert",
        ["Use SLA printer", "Select resin"]
      );

      engine.addContribution(
        session.sessionId,
        "AI_MECHANIC",
        "Ensure load-bearing capacity",
        "Mechanical expert",
        ["Calculate stress", "Test prototype"]
      );

      const solution = engine.synthesizeSolution(session.sessionId);

      expect(solution).toHaveProperty("synthesizedSolution");
      expect(solution).toHaveProperty("actionItems");
      expect(solution.contributions.length).toBe(2);
      expect(solution.actionItems.length).toBeGreaterThan(0);
    });

    it("should handle empty contributions", () => {
      const session = engine.createSession("Test", ["AI_3D_SPECIALIST"]);
      const solution = engine.synthesizeSolution(session.sessionId);

      expect(solution.contributions.length).toBe(0);
      expect(solution.synthesizedSolution).toContain("No contributions");
    });

    it("should extract action items from contributions", () => {
      const session = engine.createSession("Project", ["AI_3D_SPECIALIST"]);

      engine.addContribution(
        session.sessionId,
        "AI_3D_SPECIALIST",
        "Design the part",
        "Expert",
        ["Step 1", "Step 2", "Step 3"]
      );

      const solution = engine.synthesizeSolution(session.sessionId);
      expect(solution.actionItems.length).toBe(3);
    });
  });

  describe("Collaboration Flow", () => {
    it("should complete full collaboration workflow", () => {
      // 1. Analyze problem
      const analysis = engine.analyzeProblem("Design a robotic arm");
      // Analysis may return 0 recommendations for mock data
      const aiIds = analysis.recommendedAIs.length > 0 
        ? analysis.recommendedAIs.slice(0, 2).map((a) => a.aiId)
        : ["AI_3D_SPECIALIST", "AI_MECHANIC"];

      // 2. Create session
      const session = engine.createSession("Design a robotic arm", aiIds);
      expect(session.status).toBe("active");

      // 3. Add contributions
      for (const ai of session.participatingAIs) {
        engine.addContribution(
          session.sessionId,
          ai.aiId,
          `${ai.displayName} analysis`,
          `${ai.field} expert`,
          ["Recommendation 1", "Recommendation 2"]
        );
      }

      // 4. Synthesize solution
      const solution = engine.synthesizeSolution(session.sessionId);
      expect(solution.contributions.length).toBe(aiIds.length);
      expect(solution.actionItems.length).toBeGreaterThan(0);

      // 5. Close session
      engine.closeSession(session.sessionId);
      const closed = engine.getSession(session.sessionId);
      expect(closed?.status).toBe("completed");
    });
  });
});
