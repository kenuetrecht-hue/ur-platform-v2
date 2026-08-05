/**
 * AI Playroom build plans — step-by-step 3D scenes the AIs "plan and build."
 * Old MacDonald E-I-E-I-O farm, house with eye windows, and a car.
 */

import type { DesignLayer } from "./workspace-design-types";
import { createCustomLayer, createEmptyDesignState, createPrimitiveLayer } from "./workspace-design-utils";

export type PlayroomPlanId = "eieio_farm" | "house_with_eyes" | "car";

export type PlayroomBuildStep = {
  id: string;
  aiPlanner: string;
  aiBuilder: string;
  layers: DesignLayer[];
  pauseMs: number;
};

export type PlayroomPlan = {
  id: PlayroomPlanId;
  title: string;
  emoji: string;
  description: string;
  songLine?: string;
  steps: PlayroomBuildStep[];
};

function ground(): DesignLayer {
  return createCustomLayer({
    name: "Playroom floor",
    color: "#2d5a3d",
    primitive: { type: "plane", width: 60, height: 60 },
    transform: { position: { x: 0, y: 0, z: 0 } },
    createdBy: "playroom-ai",
  });
}

function letterE(x: number, z: number, color: string): DesignLayer[] {
  const y = 2.5;
  const bar = (name: string, py: number) =>
    createCustomLayer({
      name,
      color,
      primitive: { type: "box", width: 3, height: 0.8, depth: 0.8 },
      transform: { position: { x, y: py, z } },
      createdBy: "playroom-ai",
    });
  const spine = createCustomLayer({
    name: "E spine",
    color,
    primitive: { type: "box", width: 0.8, height: 3.2, depth: 0.8 },
    transform: { position: { x: x - 1.1, y, z } },
    createdBy: "playroom-ai",
  });
  return [spine, bar("E top", y + 1.2), bar("E mid", y), bar("E bot", y - 1.2)];
}

function letterI(x: number, z: number, color: string): DesignLayer[] {
  return [
    createCustomLayer({
      name: "Letter I",
      color,
      primitive: { type: "box", width: 0.9, height: 3.5, depth: 0.9 },
      transform: { position: { x, y: 2.5, z } },
      createdBy: "playroom-ai",
    }),
  ];
}

function letterO(x: number, z: number, color: string): DesignLayer[] {
  return [
    createCustomLayer({
      name: "Letter O",
      color,
      primitive: { type: "torus", diameter: 3.2, tessellation: 24 },
      transform: { position: { x, y: 2.5, z }, rotation: { x: 90, y: 0, z: 0 } },
      createdBy: "playroom-ai",
    }),
  ];
}

function buildEieioFarmSteps(): PlayroomBuildStep[] {
  return [
    {
      id: "farm-ground",
      aiPlanner: "🧠 Planner AI: Lay out Old MacDonald's farm — E-I-E-I-O starts with open green fields!",
      aiBuilder: "🚜 Builder AI: Rolling out the pasture…",
      pauseMs: 700,
      layers: [ground()],
    },
    {
      id: "farm-barn",
      aiPlanner: "🧠 Planner: Every farm needs a barn before we sing the letters.",
      aiBuilder: "🔨 Builder: Raising the red barn…",
      pauseMs: 800,
      layers: [
        createCustomLayer({
          name: "Barn body",
          color: "#b91c1c",
          primitive: { type: "box", width: 12, height: 7, depth: 8 },
          transform: { position: { x: -14, y: 3.5, z: -8 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Barn roof",
          color: "#7f1d1d",
          primitive: { type: "box", width: 13, height: 1.2, depth: 9 },
          transform: { position: { x: -14, y: 7.8, z: -8 }, rotation: { x: 0, y: 0, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Silo",
          color: "#cbd5e1",
          primitive: { type: "cylinder", diameter: 3.5, height: 10, tessellation: 20 },
          transform: { position: { x: -8, y: 5, z: -10 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "letter-e1",
      aiPlanner: "🧠 Planner: E — first letter of E-I-E-I-O! Old MacDonald had a farm…",
      aiBuilder: "✏️ Builder: Stacking the big E…",
      pauseMs: 900,
      layers: letterE(-2, 10, "#f59e0b"),
    },
    {
      id: "letter-i1",
      aiPlanner: "🧠 Planner: I — straight and tall, like a silo!",
      aiBuilder: "✏️ Builder: Placing I…",
      pauseMs: 700,
      layers: letterI(3, 10, "#22c55e"),
    },
    {
      id: "letter-e2",
      aiPlanner: "🧠 Planner: E again — E-I-E-I-O!",
      aiBuilder: "✏️ Builder: Another E goes up…",
      pauseMs: 700,
      layers: letterE(8, 10, "#f59e0b"),
    },
    {
      id: "letter-i2",
      aiPlanner: "🧠 Planner: I — the farmers watch from here.",
      aiBuilder: "✏️ Builder: Second I in place…",
      pauseMs: 700,
      layers: letterI(13, 10, "#22c55e"),
    },
    {
      id: "letter-o",
      aiPlanner: "🧠 Planner: O — round like a hay bale! …E-I-E-I-O!",
      aiBuilder: "⭕ Builder: Spinning the O ring…",
      pauseMs: 800,
      layers: letterO(18, 10, "#3b82f6"),
    },
    {
      id: "farm-animals",
      aiPlanner: "🧠 Planner: Add life — sun, cow, and fence posts!",
      aiBuilder: "🐄 Builder: MacDonald's friends arrive…",
      pauseMs: 900,
      layers: [
        createPrimitiveLayer({
          name: "Sun",
          type: "sphere",
          color: "#fde047",
          primitive: { diameter: 4 },
          transform: { position: { x: 20, y: 16, z: -18 }, scale: { x: 1, y: 1, z: 1 } },
          createdBy: "playroom-ai",
        }),
        createPrimitiveLayer({
          name: "Cow body",
          type: "box",
          color: "#fafafa",
          primitive: { width: 5, height: 3, depth: 2.5 },
          transform: { position: { x: 6, y: 2, z: -4 } },
          createdBy: "playroom-ai",
        }),
        createPrimitiveLayer({
          name: "Cow spots",
          type: "sphere",
          color: "#1f2937",
          primitive: { diameter: 1.2 },
          transform: { position: { x: 6.5, y: 2.8, z: -3.2 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
  ];
}

function buildHouseSteps(): PlayroomBuildStep[] {
  return [
    {
      id: "house-ground",
      aiPlanner: "🧠 Planner: Time to build a whole house — with eyes in the windows!",
      aiBuilder: "🏗️ Builder: Clearing the lot…",
      pauseMs: 700,
      layers: [
        createCustomLayer({
          name: "House lot",
          color: "#6b7280",
          primitive: { type: "plane", width: 40, height: 40 },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "house-body",
      aiPlanner: "🧠 Planner: Main walls — cozy cube with room for two big eyes.",
      aiBuilder: "🧱 Builder: Stacking walls…",
      pauseMs: 800,
      layers: [
        createCustomLayer({
          name: "House walls",
          color: "#fef3c7",
          primitive: { type: "box", width: 14, height: 8, depth: 10 },
          transform: { position: { x: 0, y: 4, z: 0 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "house-roof",
      aiPlanner: "🧠 Planner: A-point roof — classic home shape.",
      aiBuilder: "🔺 Builder: Lifting the roof…",
      pauseMs: 700,
      layers: [
        createCustomLayer({
          name: "Roof",
          color: "#92400e",
          primitive: { type: "box", width: 15, height: 1.5, depth: 11 },
          transform: { position: { x: 0, y: 9.2, z: 0 }, rotation: { x: 0, y: 0, z: 8 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Roof peak",
          color: "#78350f",
          primitive: { type: "box", width: 15, height: 1.5, depth: 11 },
          transform: { position: { x: 0, y: 9.2, z: 0 }, rotation: { x: 0, y: 0, z: -8 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "house-eyes",
      aiPlanner: "🧠 Planner: The eyes! Two round windows that watch the whole playroom.",
      aiBuilder: "👀 Builder: Installing the eyes (windows)…",
      pauseMs: 900,
      layers: [
        createCustomLayer({
          name: "Left eye window",
          color: "#38bdf8",
          primitive: { type: "cylinder", diameter: 2.2, height: 0.3, tessellation: 24 },
          transform: { position: { x: -3, y: 5.5, z: 5.05 }, rotation: { x: 90, y: 0, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Right eye window",
          color: "#38bdf8",
          primitive: { type: "cylinder", diameter: 2.2, height: 0.3, tessellation: 24 },
          transform: { position: { x: 3, y: 5.5, z: 5.05 }, rotation: { x: 90, y: 0, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Left pupil",
          color: "#0f172a",
          primitive: { type: "sphere", diameter: 0.9, tessellation: 16 },
          transform: { position: { x: -3, y: 5.5, z: 5.3 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Right pupil",
          color: "#0f172a",
          primitive: { type: "sphere", diameter: 0.9, tessellation: 16 },
          transform: { position: { x: 3, y: 5.5, z: 5.3 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "house-door-o",
      aiPlanner: "🧠 Planner: Round door — that's our O! Welcome home.",
      aiBuilder: "🚪 Builder: Cutting the round O doorway…",
      pauseMs: 800,
      layers: [
        createCustomLayer({
          name: "O door frame",
          color: "#451a03",
          primitive: { type: "torus", diameter: 3, tessellation: 24 },
          transform: { position: { x: 0, y: 3.2, z: 5.05 }, rotation: { x: 90, y: 0, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Door step",
          color: "#78716c",
          primitive: { type: "box", width: 4, height: 0.5, depth: 2 },
          transform: { position: { x: 0, y: 0.25, z: 6 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Chimney",
          color: "#dc2626",
          primitive: { type: "box", width: 1.5, height: 4, depth: 1.5 },
          transform: { position: { x: 5, y: 10, z: -2 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
  ];
}

function buildCarSteps(): PlayroomBuildStep[] {
  return [
    {
      id: "car-ground",
      aiPlanner: "🧠 Planner: Vroom! Blueprint for a playroom car — what a ride!",
      aiBuilder: "🛣️ Builder: Paving the road…",
      pauseMs: 600,
      layers: [
        createCustomLayer({
          name: "Road",
          color: "#374151",
          primitive: { type: "plane", width: 50, height: 20 },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "car-body",
      aiPlanner: "🧠 Planner: Low sporty body — aerodynamic box.",
      aiBuilder: "🏎️ Builder: Welding the chassis…",
      pauseMs: 800,
      layers: [
        createCustomLayer({
          name: "Car body",
          color: "#2563eb",
          primitive: { type: "box", width: 14, height: 3, depth: 6 },
          transform: { position: { x: 0, y: 2.2, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Cabin",
          color: "#1d4ed8",
          primitive: { type: "box", width: 7, height: 2.5, depth: 5 },
          transform: { position: { x: -1, y: 4.5, z: 0 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Windshield",
          color: "#93c5fd",
          primitive: { type: "plane", width: 6, height: 2.2 },
          transform: { position: { x: 2.8, y: 4.5, z: 0 }, rotation: { x: 0, y: 90, z: -20 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "car-wheels",
      aiPlanner: "🧠 Planner: Four wheels — can't drive without 'em!",
      aiBuilder: "⚙️ Builder: Bolting on tires…",
      pauseMs: 900,
      layers: [
        createCustomLayer({
          name: "Wheel FL",
          color: "#111827",
          primitive: { type: "cylinder", diameter: 3, height: 1.2, tessellation: 24 },
          transform: { position: { x: 4.5, y: 1.5, z: 3.2 }, rotation: { x: 0, y: 0, z: 90 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Wheel FR",
          color: "#111827",
          primitive: { type: "cylinder", diameter: 3, height: 1.2, tessellation: 24 },
          transform: { position: { x: 4.5, y: 1.5, z: -3.2 }, rotation: { x: 0, y: 0, z: 90 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Wheel RL",
          color: "#111827",
          primitive: { type: "cylinder", diameter: 3, height: 1.2, tessellation: 24 },
          transform: { position: { x: -4.5, y: 1.5, z: 3.2 }, rotation: { x: 0, y: 0, z: 90 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Wheel RR",
          color: "#111827",
          primitive: { type: "cylinder", diameter: 3, height: 1.2, tessellation: 24 },
          transform: { position: { x: -4.5, y: 1.5, z: -3.2 }, rotation: { x: 0, y: 0, z: 90 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
    {
      id: "car-details",
      aiPlanner: "🧠 Planner: Headlights and bumpers — what a car, what a car!",
      aiBuilder: "💡 Builder: Final polish…",
      pauseMs: 700,
      layers: [
        createCustomLayer({
          name: "Headlight L",
          color: "#fef08a",
          primitive: { type: "sphere", diameter: 1, tessellation: 12 },
          transform: { position: { x: 7.2, y: 2.5, z: 1.8 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Headlight R",
          color: "#fef08a",
          primitive: { type: "sphere", diameter: 1, tessellation: 12 },
          transform: { position: { x: 7.2, y: 2.5, z: -1.8 } },
          createdBy: "playroom-ai",
        }),
        createCustomLayer({
          name: "Spoiler",
          color: "#1e3a8a",
          primitive: { type: "box", width: 1, height: 0.4, depth: 6.5 },
          transform: { position: { x: -7.2, y: 3.2, z: 0 } },
          createdBy: "playroom-ai",
        }),
      ],
    },
  ];
}

export const PLAYROOM_PLANS: Record<PlayroomPlanId, PlayroomPlan> = {
  eieio_farm: {
    id: "eieio_farm",
    title: "E-I-E-I-O Farm",
    emoji: "🚜",
    description: "Old MacDonald's farm — barn, letters E-I-E-I-O, sun & cow",
    songLine: "Old MacDonald had a farm… E-I-E-I-O!",
    steps: buildEieioFarmSteps(),
  },
  house_with_eyes: {
    id: "house_with_eyes",
    title: "House with Eyes",
    emoji: "👀",
    description: "A cozy home — round eye windows and an O-shaped door",
    songLine: "The house is watching the playroom…",
    steps: buildHouseSteps(),
  },
  car: {
    id: "car",
    title: "What a Car!",
    emoji: "🏎️",
    description: "Sporty blue car — body, cabin, four wheels, headlights",
    songLine: "What a car, what a car — vroom vroom!",
    steps: buildCarSteps(),
  },
};

export function getPlayroomPlan(id: PlayroomPlanId): PlayroomPlan {
  return PLAYROOM_PLANS[id];
}

export function countPlanLayers(plan: PlayroomPlan): number {
  return plan.steps.reduce((n, s) => n + s.layers.length, 0);
}

/** Fresh design state before a playroom build animates in. */
export function playroomStartState(): ReturnType<typeof createEmptyDesignState> {
  return {
    ...createEmptyDesignState(),
    layers: [],
    selectedLayerId: null,
    gridEnabled: true,
    snapEnabled: true,
  };
}

export function allPlayroomPlans(): PlayroomPlan[] {
  return Object.values(PLAYROOM_PLANS);
}
