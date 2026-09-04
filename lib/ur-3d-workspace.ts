/**
 * UR 3D Workspace — the build lab.
 * Distinct from UR World (hang out / talk). Educational modeling, not sealed CAD.
 */

export const UR_3D_WORKSPACE_PRODUCT_NAME = "UR 3D Workspace";

export const UR_3D_WORKSPACE_ROUTE = "/3d-workspace";

export const WORKSPACE_3D_PROJECT_TYPES = [
  "merchandise",
  "3d_printing",
  "architecture",
  "construction",
  "hvac",
  "robotics",
  "software",
  "marine",
  "general",
] as const;

export type Workspace3dProjectType = (typeof WORKSPACE_3D_PROJECT_TYPES)[number];

export const UR_3D_WORKSPACE_VS_WORLD =
  "UR World is the Civic Plaza — hang out and talk. UR 3D Workspace is the CAD-style build lab. " +
  "Draw walls on a plan, snap to the grid, run HVAC and pipe, stage a robot cell. Same account; different rooms.";

export const UR_3D_WORKSPACE_PURPOSE =
  "UR 3D Workspace is a CAD-style 3D build area for construction, HVAC, robotics, architecture, and creator merch. " +
  "You draw centerline walls and runs in feet, then trade AIs sit in the same session to talk through the drawing.";

export const UR_3D_WORKSPACE_NOW: readonly string[] = [
  "CAD drawing on React Three Fiber + three.js: wall, slab, HVAC duct, pipe — click start/end, 1 ft snap, ortho lock",
  "Plan / front / right / iso cameras (ortho plan like a floor drawing)",
  "Babylon.js engine on the same model — STL, merch preview, print-oriented view",
  "Physics: Rapier or Cannon.js (cannon-es) — drop tests, gravity in feet, walls stay fixed",
  "Dimensioned pieces in feet-inches; stretch length, height, and thickness",
  "Starter 12×12×8 ft room with walls that meet at corners",
  "Educational takeoffs: wall area, slab area, duct/pipe length, room volume, shop CFM estimate",
  "Blueprint Reader panel plus construction, HVAC, robotics, and 3D AIs in-session",
];

export const UR_3D_WORKSPACE_LATER: readonly string[] = [
  "PDF / DWG / IFC import (not just a description of a drawing)",
  "Code-grade HVAC (Manual J / D, ASHRAE energy models)",
  "Clash detection, schedules, and multi-user live co-edit",
  "Licensed PE / stamped construction documents",
];

export const UR_3D_WORKSPACE_LEGAL =
  "CAD-style teaching model — snap, ortho, and takeoffs. This is not Revit, AutoCAD, or a sealed drawing. " +
  "Confirm sizes, loads, and HVAC with a licensed engineer or contractor before you build in the real world.";

export const UR_3D_WORKSPACE_SHORT_FOOTER =
  "UR 3D Workspace is a teaching lab, not stamped engineering. UR Platform LLC.";

export const UR_3D_WORKSPACE_SUBTITLE =
  "Draw a room in feet — teaching lab, not AutoCAD";

export const UR_3D_WORKSPACE_ENGINES = [
  {
    id: "r3f" as const,
    label: "CAD · R3F",
    stack: "three.js + React Three Fiber",
    hint: "Plan drawing, snap, ortho — the build canvas",
  },
  {
    id: "babylon" as const,
    label: "Babylon.js",
    stack: "Babylon.js",
    hint: "Same model — STL, merch, print-style preview",
  },
] as const;

export type Ur3dWorkspaceEngineId = (typeof UR_3D_WORKSPACE_ENGINES)[number]["id"];

/** Air changes per hour used only for the shop teaching CFM estimate. */
export const UR_3D_WORKSPACE_SHOP_ACH = 6;
