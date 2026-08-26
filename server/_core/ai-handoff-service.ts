/**
 * Cross-specialist handoff — competitive with multi-tool workflows (Cursor → deploy, Game → 3D).
 */

import { getCreatorAi } from "./ai-creator-registry";

export type HandoffSuggestion = {
  targetCreatorId: string;
  targetName: string;
  reason: string;
  prefillPrompt: string;
  route: string;
};

const HANDOFF_GRAPH: Record<string, HandoffSuggestion[]> = {
  "ai-coder-001": [
    {
      targetCreatorId: "ai-game-dev-001",
      targetName: "GameForge",
      reason: "Turn your app logic into a playable game.",
      prefillPrompt: "Help me gamify my project — core loop, mechanics, and first playable slice.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Add 3D assets and visual design.",
      prefillPrompt: "I need 3D assets and visual direction for my app/game.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-product-001",
      targetName: "Product Manager AI",
      reason: "Ship roadmap and user stories.",
      prefillPrompt: "Review my build and suggest a launch roadmap.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-game-dev-001": [
    {
      targetCreatorId: "ai-coder-001",
      targetName: "TechBuilder",
      reason: "Backend, APIs, and platform code.",
      prefillPrompt: "Help me build the server/backend for my game (auth, APIs, database).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Meshes, textures, and 3D pipeline.",
      prefillPrompt: "Import 3D assets into my game project — GLB pipeline and optimization.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-author-001",
      targetName: "AI Author Muse",
      reason: "Story, lore, and quest design.",
      prefillPrompt: "Help me write the story and quest lines for my game world.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-3d-specialist": [
    {
      targetCreatorId: "ai-cnc-master-001",
      targetName: "Master CNC & Mill AI",
      reason: "Turn this CAD into a machinable setup — lathe, mill, or drill.",
      prefillPrompt: "I have a 3D/CAD part. Help me plan a CNC or lathe setup: workholding, tools, and a safe first program.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Read plans and schematics for your 3D build.",
      prefillPrompt: "I have a drawing — help me interpret dimensions and symbols before I model it in 3D.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-game-dev-001",
      targetName: "GameForge",
      reason: "Use your 3D assets in a playable game.",
      prefillPrompt: "Help me import my 3D assets into a Godot/Unity game project.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-coder-001",
      targetName: "TechBuilder",
      reason: "Integrate 3D viewer into your app.",
      prefillPrompt: "Help me embed a 3D model viewer in my React Native app.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-blueprint-reader-001": [
    {
      targetCreatorId: "ai-cnc-master-001",
      targetName: "Master CNC & Mill AI",
      reason: "Machine this print on a lathe, mill, or CNC.",
      prefillPrompt: "Help me set up this print on a lathe or CNC mill — datums, stock, tools, and a safe first cut.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Turn this drawing into a 3D model.",
      prefillPrompt: "Based on the blueprint we read, help me build it in the 3D workspace.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-structural-001",
      targetName: "AI Structural Engineer",
      reason: "Structural load and framing review.",
      prefillPrompt: "Review this structural sheet — loads, connections, and red flags.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-electrician-001",
      targetName: "Electrician Expert AI",
      reason: "Electrical one-line and panel interpretation.",
      prefillPrompt: "Walk me through this electrical drawing — panels, circuits, and NEC notes.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-contractor-001",
      targetName: "Contractor Pro AI",
      reason: "Build from these plans on site.",
      prefillPrompt: "I'm taking this plan set to the job site — walk me through execution order.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-framer-001": [
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Learn to read framing plans faster.",
      prefillPrompt: "Teach me to read this framing plan — studs, headers, and load paths.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-attorney-001": [
    {
      targetCreatorId: "ai-attorney-criminal-001",
      targetName: "Criminal Justice Attorney AI",
      reason: "Criminal charges, rights, pleas, and procedure.",
      prefillPrompt: "I need help understanding criminal procedure and my rights (educational only).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-realestate-001",
      targetName: "Real Estate Attorney AI",
      reason: "Contracts, title, leases, and closing law.",
      prefillPrompt: "Help me understand the legal side of my real estate transaction.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-tax-001",
      targetName: "Tax Attorney AI",
      reason: "IRS notices, audits, and tax controversy.",
      prefillPrompt: "I received an IRS notice — walk me through my options (educational).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-accountant-001",
      targetName: "Accountant Attorney AI",
      reason: "Entity law, audits, and finance contracts.",
      prefillPrompt: "Help me review the legal side of my business entity and financial contracts.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-credit-001",
      targetName: "Credit & Consumer Attorney AI",
      reason: "Credit repair, disputes, and building good credit.",
      prefillPrompt: "Teach me how to dispute errors on my credit report and build credit responsibly.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-attorney-credit-001": [
    {
      targetCreatorId: "ai-attorney-tax-001",
      targetName: "Tax Attorney AI",
      reason: "Tax liens and IRS collections affecting credit.",
      prefillPrompt: "How do tax liens and IRS collections interact with my credit report?",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-accountant-001",
      targetName: "Accountant Attorney AI",
      reason: "Business credit and entity structure.",
      prefillPrompt: "Help me understand business credit and entity setup for my LLC.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-attorney-realestate-001": [
    {
      targetCreatorId: "ai-realestate-001",
      targetName: "Real Estate Master AI",
      reason: "Market analysis and transaction strategy.",
      prefillPrompt: "Combine legal review with market analysis for my property deal.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-tax-001",
      targetName: "Tax Attorney AI",
      reason: "1031 exchanges and property tax implications.",
      prefillPrompt: "Explain the tax law side of my real estate investment strategy.",
      route: "/(tabs)/ais",
    },
  ],
  contentmate: [
    {
      targetCreatorId: "ai-marketing-001",
      targetName: "Marketing Expert AI",
      reason: "Turn content into a campaign.",
      prefillPrompt: "Turn my latest content ideas into a marketing campaign plan.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-author-001": [
    {
      targetCreatorId: "ai-poet-001",
      targetName: "Poet AI",
      reason: "Poetry, verse, and lyrical passages for your book.",
      prefillPrompt: "Help me write a poem or lyrical passage for my book.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-songwriter-001",
      targetName: "Songwriter AI",
      reason: "Theme song or lyrics tied to your story.",
      prefillPrompt: "Write a theme song or lyrics inspired by my book's story.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-logo-brand-001",
      targetName: "Logo & Brand AI",
      reason: "Author brand and book cover direction.",
      prefillPrompt: "Help me define my author brand and visual direction for my book.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-songwriter-001": [
    {
      targetCreatorId: "ai-musician-001",
      targetName: "Musician AI",
      reason: "Learn chords and melody on your instrument.",
      prefillPrompt: "Teach me the chord progression for my song on guitar (or piano).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-poet-001",
      targetName: "Poet AI",
      reason: "Lyrical depth and imagery for your lyrics.",
      prefillPrompt: "Polish my lyrics with stronger imagery and poetic rhythm.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "contentmate",
      targetName: "ContentMate",
      reason: "Promote your song on social media.",
      prefillPrompt: "Help me promote my new song on social — hooks, captions, and schedule.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-musician-001": [
    {
      targetCreatorId: "ai-songwriter-001",
      targetName: "Songwriter AI",
      reason: "Turn your riff into a full song with lyrics.",
      prefillPrompt: "I have a chord progression — help me write lyrics and song structure.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-poet-001",
      targetName: "Poet AI",
      reason: "Lyrical writing for vocal melodies.",
      prefillPrompt: "Help me write poetic lyrics for the melody I composed.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "contentmate",
      targetName: "ContentMate",
      reason: "Share your music journey online.",
      prefillPrompt: "Help me post my practice progress and new song clip on social media.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-poet-001": [
    {
      targetCreatorId: "ai-author-001",
      targetName: "AI Author Muse",
      reason: "Turn poems into a chapbook or memoir.",
      prefillPrompt: "Help me organize my poems into a chapbook or collection.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-songwriter-001",
      targetName: "Songwriter AI",
      reason: "Adapt your poem into song lyrics.",
      prefillPrompt: "Turn this poem into song lyrics with verse and chorus structure.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-logo-brand-001": [
    {
      targetCreatorId: "ai-coder-001",
      targetName: "TechBuilder",
      reason: "Build your brand into a website or app.",
      prefillPrompt: "Help me build a landing page that uses my brand kit colors and typography.",
      route: "/tech-builder",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "3D logo mockups and product visuals.",
      prefillPrompt: "Help me visualize my logo in 3D for merch or signage.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-marketing-001",
      targetName: "Marketing Expert AI",
      reason: "Launch your brand with a campaign.",
      prefillPrompt: "Help me launch my new brand with a marketing campaign plan.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-business-001": [
    {
      targetCreatorId: "ai-funding-001",
      targetName: "Funding AI",
      reason: "Find grants, loans, and startup capital for the plan.",
      prefillPrompt: "Help me find financing for my business — grants, SBA loans, state programs, or private capital. I'll share my industry, state, and use of funds.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-accountant-001",
      targetName: "Accountant Pro AI",
      reason: "Books and projections lenders will ask for.",
      prefillPrompt: "Help me build clean books and a simple projection package for a loan or grant application.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-funding-001": [
    {
      targetCreatorId: "ai-business-001",
      targetName: "AI Business Advisor",
      reason: "Tighten the business plan and entity setup before you apply.",
      prefillPrompt: "Help me strengthen my business plan and entity setup so I am ready for funding.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-accountant-001",
      targetName: "Accountant Pro AI",
      reason: "Financial statements and use-of-funds math.",
      prefillPrompt: "Help me prepare financial statements and a use-of-funds budget for a grant or loan package.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-attorney-credit-001",
      targetName: "Credit & Consumer Attorney AI",
      reason: "Personal and business credit readiness (educational).",
      prefillPrompt: "Help me understand business credit, personal credit, and what lenders typically review (educational).",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-marketing-001",
      targetName: "Marketing Expert AI",
      reason: "Pitch story and traction narrative.",
      prefillPrompt: "Help me write a funding pitch narrative and traction story for investors or a grant.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-marina-mechanic-001": [
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Visualize engine layout, rigging, or hull components.",
      prefillPrompt: "Help me model this marine component or dock layout in the 3D workspace.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-electrician-001",
      targetName: "Electrician Expert AI",
      reason: "Marine electrical, batteries, panels, and shore power.",
      prefillPrompt: "Review my boat's electrical system — batteries, panels, wiring, and corrosion protection.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Read marine wiring diagrams and hull schematics.",
      prefillPrompt: "Help me interpret this marine schematic — wiring, plumbing, or hull drawing.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-business-001",
      targetName: "AI Business Advisor",
      reason: "Marina business planning and operations.",
      prefillPrompt: "Help me plan marina operations — slips, pricing, fuel dock, and seasonal workflow.",
      route: "/(tabs)/ais",
    },
  ],
  "ai-cnc-master-001": [
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Model the part or fixture before you cut metal.",
      prefillPrompt: "Help me model this part or fixture in 3D so I can plan toolpaths.",
      route: "/3d-workspace",
    },
    {
      targetCreatorId: "ai-blueprint-reader-001",
      targetName: "Blueprint Reader AI",
      reason: "Decode the print, GD&T, and title block.",
      prefillPrompt: "Read this machining print — datums, tolerances, and what the shop needs to hold.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-welder-001",
      targetName: "AI Welder",
      reason: "Weldment or fabrication before or after machining.",
      prefillPrompt: "This job is a weldment — help me with joint prep and what to machine after weld.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-robotics-001",
      targetName: "AI Robotics Engineer",
      reason: "Automation, probing, or robot tending.",
      prefillPrompt: "Help me think through probing or robot tending for this CNC cell (educational).",
      route: "/(tabs)/ais",
    },
  ],
  "ai-culinary-001": [
    {
      targetCreatorId: "ai-fitness-001",
      targetName: "AI Fitness Trainer",
      reason: "Macros and training around the meals you cook.",
      prefillPrompt: "Help me plan training and macros around the meals Culinary Arts AI is teaching me to cook.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-business-001",
      targetName: "AI Business Advisor",
      reason: "Turn the kitchen into a food business plan.",
      prefillPrompt: "Help me plan a food business — pop-up, catering, or restaurant — around what I can actually cook.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-funding-001",
      targetName: "Funding AI",
      reason: "Find capital for a kitchen, truck, or restaurant.",
      prefillPrompt: "Help me find financing for a food business — kitchen equipment, a truck, or a small restaurant.",
      route: "/(tabs)/ais",
    },
    {
      targetCreatorId: "ai-3d-specialist",
      targetName: "AI 3D Designer",
      reason: "Layout the kitchen, pass, or food truck.",
      prefillPrompt: "Help me model this kitchen or food-truck layout in the 3D workspace.",
      route: "/3d-workspace",
    },
  ],
};

export function getHandoffSuggestions(creatorId: string): HandoffSuggestion[] {
  return HANDOFF_GRAPH[creatorId] ?? [];
}

export function buildHandoffMessage(fromCreatorId: string, toCreatorId: string, context: string): string {
  const from = getCreatorAi(fromCreatorId);
  const to = getCreatorAi(toCreatorId);
  return [
    `Handoff from ${from?.name ?? "specialist"} to ${to?.name ?? "specialist"}:`,
    context.slice(0, 1500),
    "",
    "Continue this work in your domain. Reference prior context above.",
  ].join("\n");
}
