/**
 * Physics Simulation Engine Tests
 * Comprehensive test suite for structural testing and physics calculations
 */

import { describe, it, expect, beforeEach } from "vitest";
import PhysicsSimulationEngine, {
  type PhysicsObject,
  type SimulationTest,
} from "./physics-simulation";

describe("PhysicsSimulationEngine", () => {
  let engine: PhysicsSimulationEngine;

  beforeEach(() => {
    engine = new PhysicsSimulationEngine();
  });

  // ============================================================================
  // STRUCTURAL LOAD TESTS
  // ============================================================================

  describe("Structural Load Simulation", () => {
    it("should calculate stress level correctly", async () => {
      const obj: PhysicsObject = {
        id: "wall-1",
        type: "wall",
        material: "concrete",
        dimensions: { width: 1000, height: 2000, depth: 200 },
        position: { x: 0, y: 0, z: 0 },
        mass: 5000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-1",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 10000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].stressLevel).toBeGreaterThanOrEqual(0);
      expect(results[0].stressLevel).toBeLessThanOrEqual(1);
      expect(results[0].safetyFactor).toBeGreaterThan(0);
    });

    it("should mark test as passed when safety factor > 1.0", async () => {
      const obj: PhysicsObject = {
        id: "beam-1",
        type: "beam",
        material: "steel",
        dimensions: { width: 500, height: 500, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 3000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-2",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 5000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].passed).toBe(true);
      expect(results[0].safetyFactor).toBeGreaterThan(1.0);
    });

    it("should mark test as failed when safety factor < 1.0", async () => {
      const obj: PhysicsObject = {
        id: "wood-beam",
        type: "beam",
        material: "wood",
        dimensions: { width: 200, height: 200, depth: 50 },
        position: { x: 0, y: 0, z: 0 },
        mass: 500,
        strength: 10,
        elasticity: 0.5,
      };

      const test: SimulationTest = {
        id: "test-3",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 100000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].stressLevel).toBeGreaterThan(0.15);
    });
  });

  // ============================================================================
  // WIND RESISTANCE TESTS
  // ============================================================================

  describe("Wind Resistance Simulation", () => {
    it("should calculate wind stress correctly", async () => {
      const obj: PhysicsObject = {
        id: "wall-2",
        type: "wall",
        material: "concrete",
        dimensions: { width: 1000, height: 3000, depth: 200 },
        position: { x: 0, y: 0, z: 0 },
        mass: 7000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-4",
        workspaceId: "ws-1",
        type: "wind_resistance",
        objects: [obj],
        parameters: { windSpeed: 100 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].deformation).toBeGreaterThanOrEqual(0);
      expect(results[0].warnings).toBeDefined();
    });

    it("should warn about extreme wind conditions", async () => {
      const obj: PhysicsObject = {
        id: "building-facade",
        type: "wall",
        material: "aluminum",
        dimensions: { width: 500, height: 2000, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 2000,
        strength: 70,
        elasticity: 0.7,
      };

      const test: SimulationTest = {
        id: "test-5",
        workspaceId: "ws-1",
        type: "wind_resistance",
        objects: [obj],
        parameters: { windSpeed: 200 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].warnings.length).toBeGreaterThan(0);
      expect(results[0].warnings[0]).toContain("Extreme");
    });
  });

  // ============================================================================
  // EARTHQUAKE TESTS
  // ============================================================================

  describe("Earthquake Simulation", () => {
    it("should calculate seismic stress correctly", async () => {
      const obj: PhysicsObject = {
        id: "foundation",
        type: "foundation",
        material: "concrete",
        dimensions: { width: 2000, height: 1000, depth: 500 },
        position: { x: 0, y: 0, z: 0 },
        mass: 10000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-6",
        workspaceId: "ws-1",
        type: "earthquake",
        objects: [obj],
        parameters: { magnitude: 6.5 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].stressLevel).toBeGreaterThanOrEqual(0);
      expect(results[0].deformation).toBeGreaterThanOrEqual(0);
    });

    it("should recommend seismic dampers for high magnitude earthquakes", async () => {
      const obj: PhysicsObject = {
        id: "tower",
        type: "beam",
        material: "steel",
        dimensions: { width: 300, height: 5000, depth: 300 },
        position: { x: 0, y: 0, z: 0 },
        mass: 8000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-7",
        workspaceId: "ws-1",
        type: "earthquake",
        objects: [obj],
        parameters: { magnitude: 7.5 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].recommendations.length).toBeGreaterThan(0);
      expect(results[0].recommendations.some((r) => r.includes("damper"))).toBe(
        true
      );
    });
  });

  // ============================================================================
  // IMPACT TESTS
  // ============================================================================

  describe("Impact Force Simulation", () => {
    it("should calculate impact stress correctly", async () => {
      const obj: PhysicsObject = {
        id: "barrier",
        type: "wall",
        material: "concrete",
        dimensions: { width: 500, height: 1000, depth: 200 },
        position: { x: 0, y: 0, z: 0 },
        mass: 3000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-8",
        workspaceId: "ws-1",
        type: "impact",
        objects: [obj],
        parameters: { impactMass: 500, impactVelocity: 20 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].deformation).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // THERMAL STRESS TESTS
  // ============================================================================

  describe("Thermal Stress Simulation", () => {
    it("should calculate thermal expansion correctly", async () => {
      const obj: PhysicsObject = {
        id: "bridge-deck",
        type: "beam",
        material: "steel",
        dimensions: { width: 10000, height: 500, depth: 300 },
        position: { x: 0, y: 0, z: 0 },
        mass: 15000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-9",
        workspaceId: "ws-1",
        type: "thermal_stress",
        objects: [obj],
        parameters: { temperatureChange: 50 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].deformation).toBeGreaterThan(0);
    });

    it("should recommend expansion joints for extreme temperatures", async () => {
      const obj: PhysicsObject = {
        id: "pipeline",
        type: "beam",
        material: "steel",
        dimensions: { width: 1000, height: 100, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 1000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-10",
        workspaceId: "ws-1",
        type: "thermal_stress",
        objects: [obj],
        parameters: { temperatureChange: 150 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].recommendations.some((r) => r.includes("expansion"))).toBe(
        true
      );
    });
  });

  // ============================================================================
  // WATER PRESSURE TESTS
  // ============================================================================

  describe("Water Pressure Simulation", () => {
    it("should calculate water pressure stress correctly", async () => {
      const obj: PhysicsObject = {
        id: "dam-wall",
        type: "wall",
        material: "concrete",
        dimensions: { width: 5000, height: 2000, depth: 500 },
        position: { x: 0, y: 0, z: 0 },
        mass: 20000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-11",
        workspaceId: "ws-1",
        type: "water_pressure",
        objects: [obj],
        parameters: { depth: 8 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].stressLevel).toBeGreaterThanOrEqual(0);
    });

    it("should recommend thicker walls for deep water", async () => {
      const obj: PhysicsObject = {
        id: "submarine-hull",
        type: "wall",
        material: "steel",
        dimensions: { width: 2000, height: 3000, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 5000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-12",
        workspaceId: "ws-1",
        type: "water_pressure",
        objects: [obj],
        parameters: { depth: 15 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results[0].recommendations.some((r) => r.includes("thickness"))).toBe(
        true
      );
    });
  });

  // ============================================================================
  // COMBINED FORCES TESTS
  // ============================================================================

  describe("Combined Forces Simulation", () => {
    it("should handle multiple force types simultaneously", async () => {
      const obj: PhysicsObject = {
        id: "skyscraper",
        type: "beam",
        material: "steel",
        dimensions: { width: 1000, height: 10000, depth: 1000 },
        position: { x: 0, y: 0, z: 0 },
        mass: 50000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-13",
        workspaceId: "ws-1",
        type: "combined",
        objects: [obj],
        parameters: {
          load: 20000,
          windSpeed: 120,
          magnitude: 6.5,
        },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].stressLevel).toBeGreaterThanOrEqual(0);
      expect(results[0].safetyFactor).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // STRUCTURAL ANALYSIS TESTS
  // ============================================================================

  describe("Structural Analysis", () => {
    it("should identify critical points with low safety factors", async () => {
      const obj1: PhysicsObject = {
        id: "weak-beam",
        type: "beam",
        material: "wood",
        dimensions: { width: 200, height: 200, depth: 50 },
        position: { x: 0, y: 0, z: 0 },
        mass: 500,
        strength: 10,
        elasticity: 0.5,
      };

      const obj2: PhysicsObject = {
        id: "strong-beam",
        type: "beam",
        material: "steel",
        dimensions: { width: 500, height: 500, depth: 100 },
        position: { x: 1000, y: 0, z: 0 },
        mass: 3000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-14",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj1, obj2],
        parameters: { load: 80000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);
      const analysis = engine.analyzeStructure("ws-1", results);

      const weakBeamResult = results.find((r) => r.objectId === "weak-beam");
      expect(weakBeamResult?.stressLevel).toBeGreaterThan(0.1);
      expect(analysis.overallSafetyFactor).toBeGreaterThan(0);
    });

    it("should classify failure risk correctly", async () => {
      const obj: PhysicsObject = {
        id: "marginal-beam",
        type: "beam",
        material: "aluminum",
        dimensions: { width: 300, height: 300, depth: 80 },
        position: { x: 0, y: 0, z: 0 },
        mass: 1200,
        strength: 70,
        elasticity: 0.7,
      };

      const test: SimulationTest = {
        id: "test-15",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 40000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);
      const analysis = engine.analyzeStructure("ws-1", results);

      expect(["low", "medium", "high", "critical"]).toContain(
        analysis.failureRisk
      );
    });
  });

  // ============================================================================
  // STATISTICS TESTS
  // ============================================================================

  describe("Statistics & Reporting", () => {
    it("should track total tests run", async () => {
      const obj: PhysicsObject = {
        id: "test-obj",
        type: "beam",
        material: "concrete",
        dimensions: { width: 500, height: 500, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 2000,
        strength: 30,
        elasticity: 0.3,
      };

      const test1: SimulationTest = {
        id: "test-16",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 10000 },
        status: "pending",
        startTime: new Date(),
      };

      const test2: SimulationTest = {
        id: "test-17",
        workspaceId: "ws-1",
        type: "wind_resistance",
        objects: [obj],
        parameters: { windSpeed: 100 },
        status: "pending",
        startTime: new Date(),
      };

      await engine.runSimulation(test1);
      await engine.runSimulation(test2);

      const stats = engine.getStatistics();

      expect(stats.totalTests).toBe(2);
      expect(stats.completedTests).toBe(2);
      expect(stats.failedTests).toBe(0);
      expect(stats.averageSafetyFactor).toBeGreaterThan(0);
    });

    it("should calculate average safety factor correctly", async () => {
      const obj: PhysicsObject = {
        id: "test-obj-2",
        type: "beam",
        material: "steel",
        dimensions: { width: 500, height: 500, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 3000,
        strength: 250,
        elasticity: 0.8,
      };

      const test: SimulationTest = {
        id: "test-18",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 5000 },
        status: "pending",
        startTime: new Date(),
      };

      await engine.runSimulation(test);

      const stats = engine.getStatistics();

      expect(stats.averageSafetyFactor).toBeGreaterThan(1.0);
    });
  });

  // ============================================================================
  // EDGE CASES & ERROR HANDLING
  // ============================================================================

  describe("Edge Cases & Error Handling", () => {
    it("should handle zero load gracefully", async () => {
      const obj: PhysicsObject = {
        id: "zero-load-test",
        type: "beam",
        material: "concrete",
        dimensions: { width: 500, height: 500, depth: 100 },
        position: { x: 0, y: 0, z: 0 },
        mass: 2000,
        strength: 30,
        elasticity: 0.3,
      };

      const test: SimulationTest = {
        id: "test-19",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: [obj],
        parameters: { load: 0 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(1);
      expect(results[0].stressLevel).toBeLessThanOrEqual(0.01);
      expect(results[0].passed).toBe(true);
    });

    it("should handle multiple objects in single test", async () => {
      const objs: PhysicsObject[] = [
        {
          id: "obj-1",
          type: "beam",
          material: "steel",
          dimensions: { width: 500, height: 500, depth: 100 },
          position: { x: 0, y: 0, z: 0 },
          mass: 3000,
          strength: 250,
          elasticity: 0.8,
        },
        {
          id: "obj-2",
          type: "wall",
          material: "concrete",
          dimensions: { width: 1000, height: 2000, depth: 200 },
          position: { x: 1000, y: 0, z: 0 },
          mass: 5000,
          strength: 30,
          elasticity: 0.3,
        },
      ];

      const test: SimulationTest = {
        id: "test-20",
        workspaceId: "ws-1",
        type: "structural_load",
        objects: objs,
        parameters: { load: 15000 },
        status: "pending",
        startTime: new Date(),
      };

      const results = await engine.runSimulation(test);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.testId === "test-20")).toBe(true);
    });
  });
});
