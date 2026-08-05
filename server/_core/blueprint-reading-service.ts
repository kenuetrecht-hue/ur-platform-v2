/**
 * Blueprint & schematic reading — classification, analysis, and industry trends.
 * Supports any schematic type: architectural, MEP, structural, PCB, P&ID, etc.
 */

export const BLUEPRINT_READER_AI_ID = "ai-blueprint-reader-001";

export type SchematicType =
  | "architectural"
  | "structural"
  | "electrical"
  | "plumbing_pid"
  | "mechanical_hvac"
  | "site_civil"
  | "pcb_electronic"
  | "automotive_wiring"
  | "robotics_urdf"
  | "piping_isometric"
  | "fire_protection"
  | "landscape"
  | "marine"
  | "aerospace"
  | "general_engineering";

export type SchematicTypeInfo = {
  id: SchematicType;
  label: string;
  emoji: string;
  symbolStandards: string[];
  commonFormats: string[];
};

export const SCHEMATIC_TYPES: SchematicTypeInfo[] = [
  {
    id: "architectural",
    label: "Architectural floor plans",
    emoji: "🏠",
    symbolStandards: ["AIA CAD Layer Guidelines", "ISO 128", "National CAD Standard"],
    commonFormats: ["PDF", "DWG", "DXF", "RVT (Revit)"],
  },
  {
    id: "structural",
    label: "Structural drawings",
    emoji: "🏗️",
    symbolStandards: ["AISC", "ACI 318", "Eurocode"],
    commonFormats: ["PDF", "DWG", "IFC"],
  },
  {
    id: "electrical",
    label: "Electrical one-lines & wiring",
    emoji: "⚡",
    symbolStandards: ["IEEE", "IEC 60617", "NEC"],
    commonFormats: ["PDF", "DWG", "SVG"],
  },
  {
    id: "plumbing_pid",
    label: "Plumbing & P&ID",
    emoji: "🔧",
    symbolStandards: ["ISA S5.1", "ISO 14617", "UPC/IPC"],
    commonFormats: ["PDF", "DWG", "P&ID exports"],
  },
  {
    id: "mechanical_hvac",
    label: "Mechanical / HVAC",
    emoji: "❄️",
    symbolStandards: ["ASHRAE", "SMACNA", "ISO 10628"],
    commonFormats: ["PDF", "DWG", "RVT"],
  },
  {
    id: "site_civil",
    label: "Site & civil",
    emoji: "🛤️",
    symbolStandards: ["ASCE", "AASHTO", "Local DOT standards"],
    commonFormats: ["PDF", "DWG", "DGN"],
  },
  {
    id: "pcb_electronic",
    label: "PCB & electronics",
    emoji: "🔌",
    symbolStandards: ["IEEE 315", "IEC 60617"],
    commonFormats: ["Gerber", "PDF", "KiCad", "Altium"],
  },
  {
    id: "automotive_wiring",
    label: "Automotive wiring",
    emoji: "🚗",
    symbolStandards: ["SAE J1216", "OEM schematics"],
    commonFormats: ["PDF", "SVG", "Proprietary EWD"],
  },
  {
    id: "robotics_urdf",
    label: "Robotics / URDF / CAD assembly",
    emoji: "🤖",
    symbolStandards: ["URDF", "STEP", "ISO 10303"],
    commonFormats: ["URDF", "STL", "STEP", "PDF assembly"],
  },
  {
    id: "piping_isometric",
    label: "Piping isometrics",
    emoji: "⛽",
    symbolStandards: ["ASME B31.3", "ISO 10628"],
    commonFormats: ["PDF", "DWG", "Isogen"],
  },
  {
    id: "fire_protection",
    label: "Fire protection / sprinkler",
    emoji: "🧯",
    symbolStandards: ["NFPA 13", "NFPA 170"],
    commonFormats: ["PDF", "DWG"],
  },
  {
    id: "landscape",
    label: "Landscape & irrigation",
    emoji: "🌳",
    symbolStandards: ["ASLA", "Irrigation symbols"],
    commonFormats: ["PDF", "DWG"],
  },
  {
    id: "marine",
    label: "Marine / naval",
    emoji: "⚓",
    symbolStandards: ["ABS", "DNV", "ISO 128"],
    commonFormats: ["PDF", "DWG"],
  },
  {
    id: "aerospace",
    label: "Aerospace",
    emoji: "✈️",
    symbolStandards: ["ASME Y14.5", "MIL-STD"],
    commonFormats: ["PDF", "CATIA", "STEP"],
  },
  {
    id: "general_engineering",
    label: "General engineering",
    emoji: "📐",
    symbolStandards: ["ISO 128", "ASME Y14.5", "Company standards"],
    commonFormats: ["PDF", "DWG", "Any"],
  },
];

/** Industry trends relevant to blueprint reading & digital construction. */
export const BLUEPRINT_INDUSTRY_TRENDS = [
  {
    id: "bim_level2",
    title: "BIM & digital twins",
    summary: "Models linked to live sensor data — read drawings as living documents, not static PDFs.",
    relevance: ["architectural", "structural", "mechanical_hvac", "site_civil"],
  },
  {
    id: "ai_takeoff",
    title: "AI-assisted quantity takeoff",
    summary: "Trend: auto-count symbols, areas, and lengths from PDF/DWG with human verification.",
    relevance: ["architectural", "electrical", "plumbing_pid", "general_engineering"],
  },
  {
    id: "iso_19650",
    title: "ISO 19650 information management",
    summary: "Global trend for organizing construction drawing sets and revision control.",
    relevance: ["architectural", "structural", "site_civil"],
  },
  {
    id: "digital_egs",
    title: "Digital as-builts & redlines",
    summary: "Field teams mark up PDFs on tablets — learn to read revision clouds and delta notes.",
    relevance: ["general_engineering", "architectural", "electrical"],
  },
  {
    id: "open_bim",
    title: "OpenBIM & IFC interoperability",
    summary: "Exchange models between tools — schematics become multi-discipline coordinated sets.",
    relevance: ["structural", "architectural", "mechanical_hvac"],
  },
  {
    id: "pcb_hd",
    title: "High-density PCB schematics",
    summary: "Trend: multi-layer HDI boards — schematic ↔ layout cross-reference is critical.",
    relevance: ["pcb_electronic"],
  },
  {
    id: "ev_wiring",
    title: "EV & high-voltage automotive diagrams",
    summary: "Orange cable routing, isolation, and safety interlocks dominate modern EWDs.",
    relevance: ["automotive_wiring"],
  },
];

const TYPE_KEYWORDS: Record<SchematicType, string[]> = {
  architectural: ["floor plan", "elevation", "section", "architectural", "room", "door schedule", "window"],
  structural: ["beam", "column", "foundation", "rebar", "structural", "load", "framing plan"],
  electrical: ["one-line", "panel schedule", "circuit", "voltage", "breaker", "electrical", "nec", "wiring diagram"],
  plumbing_pid: ["pid", "p&id", "plumbing", "pipe", "valve", "fixture", "drain", "water supply"],
  mechanical_hvac: ["hvac", "duct", "air handler", "mechanical", "vav", "chiller", "cfm"],
  site_civil: ["grading", "contour", "utility", "civil", "site plan", "easement", "topographic"],
  pcb_electronic: ["pcb", "schematic", "resistor", "capacitor", "gerber", "netlist", "footprint"],
  automotive_wiring: ["automotive", "ecu", "obd", "harness", "connector pin", "vehicle wiring"],
  robotics_urdf: ["urdf", "robot", "joint", "link", "actuator", "kinematic", "assembly"],
  piping_isometric: ["isometric", "spool", "weld", "pipe run", "flange"],
  fire_protection: ["sprinkler", "fire alarm", "nfpa", "standpipe", "fire protection"],
  landscape: ["landscape", "irrigation", "planting plan", "hardscape"],
  marine: ["marine", "naval", "hull", "deck plan", "bilge"],
  aerospace: ["aerospace", "airframe", "tolerance", "gd&t", "asme y14"],
  general_engineering: ["drawing", "blueprint", "schematic", "diagram", "plan view"],
};

export function detectSchematicType(text: string): { type: SchematicType; confidence: number; hints: string[] } {
  const lower = text.toLowerCase();
  let best: SchematicType = "general_engineering";
  let bestScore = 0;
  const hints: string[] = [];

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [SchematicType, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += 1;
        hints.push(kw);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }

  const confidence = bestScore === 0 ? 0.35 : Math.min(0.95, 0.4 + bestScore * 0.12);
  return { type: best, confidence, hints: [...new Set(hints)].slice(0, 8) };
}

export type BlueprintAnalysis = {
  detectedType: SchematicType;
  typeLabel: string;
  confidence: number;
  summary: string;
  readingChecklist: string[];
  symbolLegendTips: string[];
  measurementGuide: string[];
  safetyNotes: string[];
  industryTrends: Array<{ title: string; summary: string }>;
  teachingPath: string[];
  suggestedSpecialists: string[];
  revisionTips: string[];
};

export function analyzeSchematicInput(input: {
  description: string;
  schematicType?: SchematicType;
  fileName?: string;
}): BlueprintAnalysis {
  const combined = [input.description, input.fileName ?? ""].filter(Boolean).join(" ");
  const detected = input.schematicType
    ? { type: input.schematicType, confidence: 0.9, hints: [] as string[] }
    : detectSchematicType(combined);

  const typeInfo = SCHEMATIC_TYPES.find((t) => t.id === detected.type)!;

  const trends = BLUEPRINT_INDUSTRY_TRENDS.filter(
    (t) => t.relevance.includes(detected.type) || t.relevance.includes("general_engineering"),
  ).slice(0, 4);

  const specialists: Record<SchematicType, string[]> = {
    architectural: ["ai-framer-001", "ai-contractor-001", "ai-3d-specialist"],
    structural: ["ai-structural-001", "ai-framer-001", "ai-seismic-001"],
    electrical: ["ai-electrician-001", "ai-hvac-001"],
    plumbing_pid: ["ai-plumber-001", "ai-hvac-001"],
    mechanical_hvac: ["ai-hvac-001", "ai-electrician-001"],
    site_civil: ["ai-landscaping-001", "ai-contractor-001"],
    pcb_electronic: ["ai-electrician-001", "ai-coder-001", "ai-robotics-001"],
    automotive_wiring: ["ai-automotive-001", "ai-electrician-001"],
    robotics_urdf: ["ai-robotics-001", "ai-3d-specialist", "ai-coder-001"],
    piping_isometric: ["ai-plumber-001", "ai-welder-001"],
    fire_protection: ["ai-contractor-001", "ai-electrician-001"],
    landscape: ["ai-landscaping-001", "ai-tree-service-001"],
    marine: ["ai-structural-001", "ai-welder-001"],
    aerospace: ["ai-dynamics-001", "ai-structural-001"],
    general_engineering: ["ai-3d-specialist", "ai-contractor-001", "ai-structural-001"],
  };

  return {
    detectedType: detected.type,
    typeLabel: typeInfo.label,
    confidence: detected.confidence,
    summary: `Identified as **${typeInfo.label}** (${Math.round(detected.confidence * 100)}% confidence). Standards: ${typeInfo.symbolStandards.join(", ")}.`,
    readingChecklist: [
      "Confirm drawing scale, north arrow, and revision block (date, number, author).",
      "Read the title block — project name, sheet index, discipline code (A/S/E/P/M).",
      "Cross-reference sheet index — find detail callouts and section cuts.",
      "Check general notes and legend before interpreting symbols.",
      "Verify units (imperial vs metric) and level datums (FFE, TOS, invert elevations).",
    ],
    symbolLegendTips: [
      `Use ${typeInfo.symbolStandards[0] ?? "industry standards"} for symbol meanings.`,
      "Match line weights: heavy = cut objects, light = beyond or hidden.",
      "Dashed lines often mean hidden, overhead, or demo/remove.",
      ...typeInfo.symbolStandards.slice(1, 3).map((s) => `Reference: ${s}`),
    ],
    measurementGuide: [
      "Use scale bar or written scale — never assume 1:1 on screen.",
      "Add dimensions chain; watch for ordinate vs linear dimension styles.",
      "For area takeoff: break irregular shapes into rectangles/triangles.",
      "Note ceiling heights vs plan dimensions on architectural sets.",
    ],
    safetyNotes: [
      "Drawings are not permission to work — verify permits and site conditions.",
      "De-energize before interpreting live electrical or plumbing isolation.",
      "Structural changes require licensed review — educational reading only.",
    ],
    industryTrends: trends.map((t) => ({ title: t.title, summary: t.summary })),
    teachingPath: [
      `Start with ${typeInfo.label} fundamentals (Learn tab).`,
      "Practice: describe one sheet section; identify 5 symbols.",
      "On-the-job mode: walk a mock site using this drawing set.",
    ],
    suggestedSpecialists: specialists[detected.type] ?? ["ai-3d-specialist"],
    revisionTips: [
      "Cloud revisions mark changed areas — always read the revision log.",
      "Compare sheet dates — newest revision governs conflicts.",
      "RFI markers may appear as numbered flags linking to clarifications.",
    ],
  };
}

export function buildBlueprintReaderContextForChat(userId: string): string {
  return `
## Blueprint Reader live context
User ID: ${userId}
You can read ANY schematic type: architectural, structural, electrical, plumbing/P&ID, HVAC, civil, PCB, automotive, robotics, piping, fire, landscape, marine, aerospace.
When users describe or upload drawings: use **Sheet index → Legend → Plans → Details → Schedules** reading order.
Surface industry trends (BIM, digital twins, AI takeoff) when relevant.
Offer Learn mode modules for blueprint literacy. Refer trade work to hive peers (electrician, structural, plumber, 3D designer).
`.trim();
}
