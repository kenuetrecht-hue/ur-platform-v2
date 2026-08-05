import { describe, it, expect } from "vitest";
import {
  PLAYROOM_PLANS,
  allPlayroomPlans,
  countPlanLayers,
  getPlayroomPlan,
  playroomStartState,
} from "../lib/workspace-playroom-plans";
import { MAX_DESIGN_LAYERS } from "../lib/workspace-design-types";
import { addLayer } from "../lib/workspace-design-utils";

describe("AI Playroom plans", () => {
  it("exposes three build missions", () => {
    const plans = allPlayroomPlans();
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => p.id)).toEqual(["eieio_farm", "house_with_eyes", "car"]);
  });

  it("E-I-E-I-O farm plan includes letter steps", () => {
    const farm = getPlayroomPlan("eieio_farm");
    expect(farm.songLine).toContain("E-I-E-I-O");
    const stepIds = farm.steps.map((s) => s.id);
    expect(stepIds).toContain("letter-e1");
    expect(stepIds).toContain("letter-o");
  });

  it("house plan includes eye windows", () => {
    const house = getPlayroomPlan("house_with_eyes");
    const eyeStep = house.steps.find((s) => s.id === "house-eyes");
    expect(eyeStep?.layers.some((l) => l.name.includes("eye"))).toBe(true);
  });

  it("car plan includes four wheels", () => {
    const car = getPlayroomPlan("car");
    const wheelStep = car.steps.find((s) => s.id === "car-wheels");
    expect(wheelStep?.layers).toHaveLength(4);
  });

  it("each plan stays within max layer budget", () => {
    for (const plan of Object.values(PLAYROOM_PLANS)) {
      expect(countPlanLayers(plan)).toBeLessThanOrEqual(MAX_DESIGN_LAYERS);
    }
  });

  it("simulates full farm build into design state", () => {
    let state = playroomStartState();
    const farm = getPlayroomPlan("eieio_farm");
    for (const step of farm.steps) {
      for (const layer of step.layers) {
        state = addLayer(state, layer);
      }
    }
    expect(state.layers.length).toBe(countPlanLayers(farm));
    expect(state.layers.some((l) => l.name.includes("Letter O"))).toBe(true);
  });
});
