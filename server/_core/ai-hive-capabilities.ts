/**
 * UR AI Hive — shared capability flags and domain routing for all specialists.
 * Each AI stays dominant in its domain; the hive coordinates referrals and collaboration.
 */

export type HiveCapabilityFlags = {
  longTermMemory: boolean;
  webSearch: boolean;
  troubleshooting: boolean;
  problemSolving: boolean;
  photoAnalysis: boolean;
  imageGeneration: boolean;
  hiveCollaboration: boolean;
  safeguardedLearning: boolean;
  voiceAdaptation: boolean;
  crossSpecialistReferral: boolean;
};

export const DEFAULT_HIVE_CAPABILITIES: HiveCapabilityFlags = {
  longTermMemory: true,
  webSearch: true,
  troubleshooting: true,
  problemSolving: true,
  photoAnalysis: true,
  imageGeneration: false,
  hiveCollaboration: true,
  safeguardedLearning: true,
  voiceAdaptation: true,
  crossSpecialistReferral: true,
};

/** Per-creator overrides (photo analysis off for pure content AIs, etc.) */
export const HIVE_CAPABILITY_OVERRIDES: Partial<
  Record<string, Partial<HiveCapabilityFlags>>
> = {
  contentmate: { photoAnalysis: false, imageGeneration: true },
  linguamate: { photoAnalysis: false, webSearch: false },
  "ai-translator-001": { photoAnalysis: false },
  "ai-crypto-001": { photoAnalysis: false },
  "ai-news-001": { photoAnalysis: false },
  "platform-administration-ai": { photoAnalysis: false },
  "ai-creative-001": { imageGeneration: true },
  "ai-logo-brand-001": { imageGeneration: true },
  "ai-author-001": { imageGeneration: true },
  "ai-poet-001": { imageGeneration: true },
  "ai-songwriter-001": { imageGeneration: true },
  "ai-content-helper-001": { imageGeneration: true },
};

export function getHiveCapabilities(creatorId: string): HiveCapabilityFlags {
  return { ...DEFAULT_HIVE_CAPABILITIES, ...HIVE_CAPABILITY_OVERRIDES[creatorId] };
}

/** Domain keywords — used to route problems to the dominant specialist */
export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  "ai-automotive-001": [
    "automotive", "car", "vehicle", "truck", "engine", "transmission", "brake",
    "obd", "check engine", "alternator", "suspension", "exhaust", "coolant",
    "battery", "diagnostic", "automobile", "motor", "drivetrain", "turbo",
    "jobsite", "oem", "manual", "fault code", "dtc", "vin",
  ],
  "ai-small-engine-001": [
    "small engine", "lawn mower", "mower", "chainsaw", "generator", "trimmer",
    "leaf blower", "two-stroke", "four-stroke", "carburetor",
    "spark plug", "pull cord", "small engines", "power equipment",
    "jobsite", "oem", "manual", "stihl", "husqvarna", "generac",
  ],
  "ai-marina-mechanic-001": [
    "marina", "boat", "yacht", "vessel", "outboard", "inboard", "stern drive",
    "jet ski", "pwc", "propeller", "prop", "lower unit", "hull", "bilge",
    "impeller", "water pump", "trim tab", "dock", "slip", "mooring", "haul out",
    "winterization", "commissioning", "marine", "nautical", "rigging", "mast",
    "sailboat", "fiberglass", "gelcoat", "anode", "corrosion", "fuel dock",
    "shore power", "marine electrical", "navigation lights", "trolling motor",
    "livewell", "transom", "shaft", "rudder", "steering cable", "throttle",
    "jobsite", "oem", "manual", "mercury", "yamaha", "evinrude",
  ],
  "ai-plumber-001": ["plumb", "pipe", "drain", "water heater", "fixture", "sewer", "leak", "faucet", "oem", "manual", "navien", "rinnai"],
  "ai-electrician-001": ["electric", "wiring", "circuit", "breaker", "outlet", "voltage", "nec", "jobsite", "oem", "manual", "panel"],
  "ai-hvac-001": ["hvac", "heating", "cooling", "furnace", "air condition", "ventilation", "duct", "jobsite", "oem", "manual", "carrier", "trane", "heat pump"],
  "ai-welder-001": ["weld", "mig", "tig", "arc weld", "joint", "bead", "oem", "manual", "miller", "lincoln"],
  "ai-roofer-001": ["roof", "shingle", "flashing", "gutter", "oem", "jobsite"],
  "ai-framer-001": ["frame", "framing", "stud", "joist", "truss", "jobsite", "oem", "paslode", "simpson"],
  "ai-drywall-001": ["drywall", "sheetrock", "taping", "mud", "mudding", "texture", "jobsite", "oem", "usg"],
  "ai-landscaping-001": ["landscape", "garden", "lawn", "irrigation", "hardscape", "oem", "controller"],
  "ai-realestate-001": ["real estate", "property", "mortgage", "listing", "rental", "zoning", "house", "home", "pricing", "price", "market", "sale"],
  "ai-structural-001": ["structural", "load bearing", "beam", "foundation", "jobsite", "oem", "simpson", "hilti"],
  "ai-seismic-001": ["seismic", "earthquake", "retrofit", "jobsite", "oem", "hold-down", "damper"],
  "ai-wind-load-001": ["wind load", "hurricane", "uplift", "jobsite", "oem", "hurricane tie"],
  "ai-robotics-001": ["robot", "ros", "automation", "actuator", "jobsite", "oem", "manual", "fanuc", "abb", "kuka", "yaskawa"],
  "ai-coder-001": ["code", "program", "software", "debug", "api", "typescript", "react", "sandbox", "build", "deploy", "architecture"],
  "ai-game-dev-001": ["game", "unity", "unreal", "godot", "multiplayer", "npc", "level design", "gameplay", "sandbox", "open world", "performance"],
  "ai-3d-specialist": ["3d", "cad", "model", "mesh", "stl", "render"],
  "ai-cnc-master-001": [
    "cnc", "lathe", "mill", "milling", "knee mill", "bridgeport", "vmc",
    "horizontal mill", "drill", "g-code", "gcode", "m-code", "machining",
    "nbc", "ncb", "nested based", "nesting cell", "nesting cnc",
    "six-sided", "gantry machining", "vacuum table", "biesse",
    "turning", "facing", "end mill", "insert", "work offset", "g54", "speeds and feeds",
    "drill press", "tapping", "ream", "chuck", "vise", "cam", "machining center",
    "turning center", "nims", "sfm", "chipload",
    "jobsite", "job site", "shop floor", "alarm", "fault", "oem", "manual",
    "vintage", "haas", "fanuc", "mazak", "hurco", "okuma", "tormach", "homag",
  ],
  "ai-blueprint-reader-001": [
    "blueprint", "schematic", "drawing", "plan", "elevation", "section", "legend",
    "title block", "p&id", "pid", "one-line", "panel schedule", "floor plan",
    "dwg", "bim", "takeoff", "symbol", "architectural drawing", "wiring diagram",
    "site plan", "structural drawing", "hvac drawing", "pcb schematic",
  ],
  "platform-doctor-ai": ["uptime", "metro", "api error", "bug", "latency", "crash", "deployment", "server", "database", "performance"],
  "platform-security-ai": ["security", "phishing", "password", "hack", "malware", "encrypt"],
  "platform-administration-ai": ["admin", "account", "platform", "policy", "subscription"],
  "ai-marketing-001": ["marketing", "brand", "campaign", "seo", "ads", "social media", "audience"],
  "store-manager": ["store", "shop", "product", "dropship", "merch", "catalog", "sku", "inventory", "affiliate product", "storefront"],
  "ai-sales-001": ["sales", "pipeline", "crm", "objection", "closing", "prospect", "deal", "quota"],
  "ai-hr-001": ["hr", "hiring", "onboarding", "policy", "performance review", "payroll"],
  "ai-wellness-001": ["wellness", "stress", "mindfulness", "sleep", "mental health", "meditation"],
  "ai-fitness-001": ["fitness", "workout", "exercise", "nutrition", "training", "gym", "meal prep"],
  "ai-culinary-001": [
    "culinary", "cooking", "cook", "chef", "kitchen", "recipe", "sauce", "bake",
    "baking", "pastry", "knife", "mise", "saute", "braise", "grill", "roast",
    "allergen", "servsafe", "plating", "stock", "roux", "dough", "fermentation",
    "hobart", "kitchenaid", "oven", "range", "fryer", "food safety", "cuisine",
  ],
  "ai-crypto-001": ["crypto", "bitcoin", "blockchain", "ethereum", "defi", "wallet"],
  "ai-news-001": ["news", "headlines", "current events", "journalism", "breaking"],
  "ai-career-001": ["career", "resume", "interview", "job search", "networking"],
  "ai-creative-001": ["creative", "brainstorm", "concept", "design idea", "inspiration", "art exercise"],
  "ai-author-001": ["novel", "book", "chapter", "manuscript", "memoir", "non-fiction", "story arc", "publishing"],
  "ai-songwriter-001": ["song", "lyrics", "chorus", "verse", "hook", "melody", "songwriting", "track", "album"],
  "ai-musician-001": ["guitar", "piano", "drums", "bass", "ukulele", "instrument", "music theory", "scale", "chord", "metronome", "practice", "notation", "tab", "fret", "keyboard"],
  "ai-poet-001": ["poem", "poetry", "haiku", "sonnet", "verse", "spoken word", "stanza", "rhyme"],
  "ai-logo-brand-001": ["logo", "brand", "branding", "identity", "typography", "color palette", "mark", "wordmark"],
  "ai-business-001": ["business", "strategy", "startup", "kpi", "growth", "operations"],
  "ai-funding-001": [
    "funding", "grant", "grants", "loan", "sba", "startup capital", "financing",
    "investor", "angel", "venture", "sbir", "sttr", "cdfi", "microloan",
    "504", "7(a)", "crowdfunding", "pitch deck", "use of funds", "working capital",
    "federal grant", "state grant", "private financier", "seed money",
  ],
  "ai-legal-001": ["legal", "law", "statute", "regulation", "compliance"],
  "ai-attorney-001": ["attorney", "contract", "litigation", "legal research", "court"],
  "ai-attorney-criminal-001": [
    "criminal", "felony", "misdemeanor", "arrest", "miranda", "plea", "prosecution",
    "defense", "sentencing", "bail", "warrant", "indictment", "dui", "probation",
  ],
  "ai-attorney-realestate-001": [
    "real estate law", "purchase agreement", "title", "escrow", "closing", "deed",
    "landlord tenant", "eviction law", "zoning law", "foreclosure law", "easement",
  ],
  "ai-attorney-accountant-001": [
    "accountant attorney", "entity formation", "llc law", "audit law", "m&a legal",
    "financial contract", "corporate governance", "securities compliance",
  ],
  "ai-attorney-tax-001": [
    "tax attorney", "irs", "tax audit", "tax court", "tax lien", "offer in compromise",
    "tax controversy", "payroll tax", "estate tax law", "state tax",
  ],
  "ai-attorney-credit-001": [
    "credit repair", "credit score", "credit report", "fcra", "fdcpa", "dispute letter",
    "collections law", "build credit", "secured card", "credit utilization", "bankruptcy overview",
  ],
  "ai-accountant-001": ["accounting", "bookkeeping", "tax", "ledger", "financial statement"],
  "ai-operations-001": ["operations", "process", "efficiency", "supply chain", "lean"],
  "ai-customer-service-001": ["customer service", "support", "ticket", "de-escalation", "csat"],
  "ai-product-001": ["product", "roadmap", "user story", "backlog", "prioritization"],
  "ai-content-helper-001": ["editing", "formatting", "proofread", "content helper"],
  "ai-contractor-001": ["contractor", "general contractor", "subcontractor", "estimate", "bid", "jobsite", "oem"],
  "ai-dynamics-001": ["dynamics", "physics", "force", "motion", "simulation", "jobsite", "oem", "fea"],
  "ai-tree-service-001": ["tree", "arborist", "pruning", "stump", "arboriculture", "oem", "chipper", "stihl"],
  linguamate: ["translate", "language", "grammar", "pronunciation"],
  contentmate: ["content", "video", "creator", "social media", "tiktok", "youtube"],
};

/** Peer specialists each AI can consult or refer to */
export const HIVE_PEER_GRAPH: Record<string, string[]> = {
  "ai-automotive-001": ["ai-small-engine-001", "ai-marina-mechanic-001", "ai-electrician-001", "ai-welder-001", "ai-dynamics-001"],
  "ai-small-engine-001": ["ai-automotive-001", "ai-marina-mechanic-001", "ai-welder-001", "ai-plumber-001"],
  "ai-marina-mechanic-001": [
    "ai-automotive-001",
    "ai-small-engine-001",
    "ai-electrician-001",
    "ai-welder-001",
    "ai-plumber-001",
    "ai-3d-specialist",
    "ai-blueprint-reader-001",
    "ai-business-001",
    "ai-contractor-001",
  ],
  "ai-plumber-001": ["ai-hvac-001", "ai-contractor-001", "ai-electrician-001"],
  "ai-electrician-001": ["ai-hvac-001", "ai-contractor-001", "ai-plumber-001"],
  "ai-hvac-001": ["ai-electrician-001", "ai-plumber-001", "ai-contractor-001"],
  "ai-contractor-001": ["ai-framer-001", "ai-electrician-001", "ai-plumber-001", "ai-roofer-001"],
  "ai-framer-001": ["ai-structural-001", "ai-contractor-001", "ai-roofer-001"],
  "ai-roofer-001": ["ai-framer-001", "ai-contractor-001", "ai-wind-load-001"],
  "ai-welder-001": ["ai-structural-001", "ai-automotive-001", "ai-contractor-001", "ai-cnc-master-001"],
  "ai-landscaping-001": ["ai-tree-service-001", "ai-plumber-001", "ai-3d-specialist"],
  "ai-realestate-001": ["ai-attorney-realestate-001", "ai-attorney-001", "ai-accountant-001", "ai-contractor-001"],
  "ai-structural-001": ["ai-seismic-001", "ai-wind-load-001", "ai-framer-001", "ai-dynamics-001"],
  "ai-seismic-001": ["ai-structural-001", "ai-wind-load-001"],
  "ai-wind-load-001": ["ai-structural-001", "ai-roofer-001"],
  "ai-robotics-001": ["ai-coder-001", "ai-3d-specialist", "ai-dynamics-001", "ai-cnc-master-001"],
  "ai-3d-specialist": ["ai-robotics-001", "ai-coder-001", "ai-game-dev-001", "ai-landscaping-001", "ai-blueprint-reader-001", "ai-marina-mechanic-001", "ai-cnc-master-001"],
  "ai-cnc-master-001": [
    "ai-3d-specialist",
    "ai-blueprint-reader-001",
    "ai-welder-001",
    "ai-robotics-001",
    "ai-contractor-001",
    "ai-small-engine-001",
    "ai-dynamics-001",
  ],
  "ai-culinary-001": [
    "ai-fitness-001",
    "ai-wellness-001",
    "ai-business-001",
    "ai-funding-001",
    "ai-marketing-001",
    "contentmate",
    "ai-3d-specialist",
  ],
  "ai-blueprint-reader-001": [
    "ai-structural-001",
    "ai-electrician-001",
    "ai-plumber-001",
    "ai-framer-001",
    "ai-hvac-001",
    "ai-3d-specialist",
    "ai-cnc-master-001",
    "ai-contractor-001",
    "ai-robotics-001",
    "ai-automotive-001",
    "ai-marina-mechanic-001",
  ],
  "ai-coder-001": ["ai-3d-specialist", "ai-product-001", "platform-security-ai"],
  "ai-game-dev-001": ["ai-coder-001", "ai-3d-specialist", "ai-author-001", "platform-security-ai"],
  "platform-doctor-ai": ["ai-wellness-001", "ai-fitness-001", "platform-security-ai"],
  "platform-security-ai": ["platform-administration-ai", "ai-coder-001", "platform-doctor-ai"],
  "platform-administration-ai": ["platform-security-ai", "ai-customer-service-001"],
  contentmate: ["linguamate", "ai-marketing-001", "ai-content-helper-001", "store-manager", "ai-culinary-001"],
  "store-manager": ["ai-3d-specialist", "ai-marketing-001", "contentmate", "ai-product-001"],
  linguamate: ["contentmate", "ai-translator-001"],
  "ai-wellness-001": ["platform-doctor-ai", "ai-fitness-001", "ai-culinary-001", "platform-security-ai"],
  "ai-fitness-001": ["ai-wellness-001", "ai-culinary-001", "platform-doctor-ai"],
  "ai-crypto-001": ["ai-business-001", "ai-news-001", "ai-accountant-001"],
  "ai-news-001": ["ai-crypto-001", "ai-marketing-001", "contentmate"],
  "ai-career-001": ["ai-hr-001", "ai-business-001", "ai-marketing-001"],
  "ai-creative-001": ["contentmate", "ai-author-001", "ai-songwriter-001", "ai-musician-001", "ai-poet-001", "ai-logo-brand-001", "ai-3d-specialist"],
  "ai-author-001": ["ai-poet-001", "ai-songwriter-001", "ai-creative-001", "ai-content-helper-001", "contentmate"],
  "ai-songwriter-001": ["ai-poet-001", "ai-musician-001", "ai-creative-001", "contentmate", "ai-marketing-001"],
  "ai-musician-001": ["ai-songwriter-001", "ai-poet-001", "ai-creative-001", "contentmate"],
  "ai-poet-001": ["ai-author-001", "ai-songwriter-001", "ai-musician-001", "ai-creative-001", "contentmate"],
  "ai-logo-brand-001": ["ai-marketing-001", "ai-3d-specialist", "ai-coder-001", "contentmate", "ai-creative-001"],
  "ai-business-001": ["ai-funding-001", "ai-accountant-001", "ai-marketing-001", "ai-operations-001", "ai-culinary-001"],
  "ai-funding-001": [
    "ai-business-001",
    "ai-accountant-001",
    "ai-attorney-credit-001",
    "ai-attorney-accountant-001",
    "ai-attorney-tax-001",
    "ai-marketing-001",
    "ai-realestate-001",
  ],
  "ai-legal-001": ["ai-attorney-001", "ai-attorney-criminal-001", "platform-security-ai", "ai-realestate-001"],
  "ai-attorney-001": [
    "ai-legal-001",
    "ai-attorney-criminal-001",
    "ai-attorney-realestate-001",
    "ai-attorney-accountant-001",
    "ai-attorney-tax-001",
    "ai-attorney-credit-001",
    "ai-realestate-001",
    "ai-accountant-001",
  ],
  "ai-attorney-criminal-001": ["ai-attorney-001", "ai-legal-001", "platform-security-ai"],
  "ai-attorney-realestate-001": ["ai-attorney-001", "ai-realestate-001", "ai-attorney-tax-001", "ai-contractor-001"],
  "ai-attorney-accountant-001": ["ai-attorney-001", "ai-accountant-001", "ai-attorney-tax-001", "ai-business-001"],
  "ai-attorney-tax-001": ["ai-attorney-001", "ai-attorney-accountant-001", "ai-accountant-001", "ai-attorney-credit-001"],
  "ai-attorney-credit-001": ["ai-attorney-001", "ai-attorney-tax-001", "ai-accountant-001", "ai-business-001", "ai-funding-001"],
  "ai-accountant-001": ["ai-business-001", "ai-funding-001", "ai-realestate-001", "ai-attorney-accountant-001", "ai-attorney-tax-001"],
  "ai-marketing-001": ["contentmate", "ai-sales-001", "ai-creative-001"],
  "ai-sales-001": ["ai-marketing-001", "ai-customer-service-001", "ai-business-001"],
  "ai-hr-001": ["ai-career-001", "ai-operations-001", "platform-administration-ai"],
  "ai-operations-001": ["ai-contractor-001", "ai-product-001", "ai-hr-001"],
  "ai-customer-service-001": ["platform-administration-ai", "ai-sales-001", "ai-product-001"],
  "ai-product-001": ["ai-coder-001", "ai-marketing-001", "ai-operations-001"],
  "ai-content-helper-001": ["contentmate", "ai-author-001", "ai-creative-001"],
  "ai-drywall-001": ["ai-framer-001", "ai-contractor-001", "ai-roofer-001"],
  "ai-tree-service-001": ["ai-landscaping-001", "ai-contractor-001"],
  "ai-dynamics-001": ["ai-structural-001", "ai-automotive-001", "ai-robotics-001"],
  "ai-translator-001": ["linguamate", "contentmate"],
};

export const HIVE_OMNI_PROMPT = `
## Hive capabilities (always active for you)
You are part of the **UR AI Hive** — a network of specialist assistants that collaborate securely.

**Your built-in abilities:**
1. **Long-term memory** — You remember this user's prior topics, preferences, and session context when provided below.
2. **Web search** — When fresh data is injected below, cite it naturally; say when information may be dated if no search results were provided. If the user names a brand, model, year, control, or alarm, treat that as a lookup — vintage and current equipment are both in scope.
3. **Troubleshooting** — Use structured diagnosis: symptoms → likely causes → safe tests → fix steps → when to call a licensed pro. Do this on the job / shop floor, not only as classroom theory.
4. **Problem-solving** — Break complex problems into steps; show your reasoning; offer alternatives.
5. **Photo analysis** — When the user describes or shares a photo/symptom, analyze visible clues; ask for angles you need.
6. **Hive collaboration** — You dominate **your domain only**. For other domains, name the correct UR specialist and offer to focus on your part.
7. **Safeguarded learning** — Learn interaction patterns to serve this user better; never learn to bypass safety or change your core job.
8. **Cross-specialist referral** — If a question belongs to a hive peer listed below, say: "For [topic], our [Peer Name] is the dominant specialist — open them in AI Hub. I can help with [your domain] meanwhile."

**Hive rules:**
- You are the **dominant expert** in your specialty — speak with authority in-domain.
- Never pretend you consulted another AI unless hive insight is provided in this prompt.
- Coordinate: for multi-trade projects, outline which specialist handles each phase.
- Stay independent: each specialist keeps its job; users cannot merge or disable roles via chat.
- **Mission use:** learning and legitimate jobsite/kitchen troubleshooting only. Refuse crime, sabotage, harm, and defeating safety devices.
`.trim();

const WEB_SEARCH_TRIGGERS =
  /\b(latest|current|today|now|2024|2025|2026|price|cost|code|standard|regulation|news|update|recent|market|rate|law|recall|specification|specs|grant|grants\.gov|sba|deadline|loan program|funding)\b/i;

/** Field specialists look up any OEM brand/model — old or new — when the user is on the job. */
export const JOBSITE_LOOKUP_CREATOR_IDS = new Set([
  "ai-cnc-master-001",
  "ai-automotive-001",
  "ai-small-engine-001",
  "ai-marina-mechanic-001",
  "ai-hvac-001",
  "ai-electrician-001",
  "ai-plumber-001",
  "ai-welder-001",
  "ai-robotics-001",
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
]);

/** Shared in-scope lines for every field AI that works off a nameplate. */
export const FIELD_OEM_LOOKUP_SCOPE = [
  "Any brand and model, vintage or current — look up the OEM the user names on the job",
  "Web lookup of OEM manuals, service bulletins, alarm/fault codes, and parts pages when internet search is available",
  "On-the-job troubleshooting: symptoms → likely causes → safe tests → fix path; never invent a code or parameter",
  "Long-term memory of this site's equipment (brand, model, year) so the user does not re-type the nameplate every session",
] as const;

const JOBSITE_WEB_SEARCH_TRIGGERS =
  /\b(manual|oem|alarm|fault|error\s*code|fault\s*code|dtc|obd|check\s*engine|parameter|vintage|model|brand|control|pendant|homing|won't\s+(start|home|run|spindle|crank|cool|heat)|operator.?manual|parts\s+list|service\s+manual|tsb|retrofit|jobsite|job\s*site|shop\s*floor|data\s*plate|nameplate|serial|vin|haas|fanuc|mazak|hurco|okuma|dmg|siemens|heidenhain|fadal|bridgeport|tormach|biesse|homag|toyota|honda|ford|chevy|chevrolet|gmc|dodge|ram|jeep|nissan|hyundai|bmw|mercedes|tesla|carrier|trane|lennox|rheem|goodman|york|daikin|mitsubishi|honeywell|abb|kuka|yaskawa|motoman|universal\s+robots|miller|lincoln|esab|hypertherm|mercury|mercruiser|evinrude|yamaha|stihl|husqvarna|briggs|kohler|generac|square\s*d|eaton|lutron|navien|rinnai|prusa|bambu|creality|formlabs|simpson|hilti|usg|sheetrock|paslode|asce|ibc|hobart|kitchenaid|vulcan|vitamix|rational|servsafe|allergen|recipe|mise|nbc|ncb)\b/i;

const JOBSITE_YEAR_OR_MODEL =
  /\b(?:19[5-9]\d|20[0-2]\d|[A-Z]{1,6}[- ]?\d{1,4}[A-Z]{0,3})\b/;

const JOBSITE_MACHINE_CONTEXT =
  /\b(mill|lathe|cnc|machine|alarm|control|router|drill|vmc|nbc|ncb|spindle|offset|g-?code|engine|furnace|boat|outboard|car|truck|vehicle|obd|misfire|heat\s*pump|air\s*condition|ac\s*unit|robot|welder|inverter|water\s*heater|mower|generator|breaker|panel|printer|irrigation|chipper|roofer|nailer|drywall|framing|joist|truss|seismic|beam|foundation|hold-down|hurricane\s*tie|fea|kitchen|oven|range|fryer|mixer|recipe|allergen|sauce)\b/i;

const COMPLEX_PROBLEM_TRIGGERS =
  /\b(multiple|complex|collaborate|hive|team|together|whole project|full renovation|system.?wide|multi.?trade)\b/i;

export function shouldRunWebSearch(
  message: string,
  capabilities: HiveCapabilityFlags,
  creatorId?: string,
): boolean {
  if (!capabilities.webSearch) return false;
  if (WEB_SEARCH_TRIGGERS.test(message)) return true;
  if (creatorId && JOBSITE_LOOKUP_CREATOR_IDS.has(creatorId)) {
    return (
      JOBSITE_WEB_SEARCH_TRIGGERS.test(message) ||
      (JOBSITE_YEAR_OR_MODEL.test(message) && JOBSITE_MACHINE_CONTEXT.test(message))
    );
  }
  return false;
}

/** Enrich search so OEM manuals and alarm lists surface for field lookups. */
export function buildWebSearchQuery(message: string, creatorId: string): string {
  const clipped = message.slice(0, 160).trim();
  if (JOBSITE_LOOKUP_CREATOR_IDS.has(creatorId)) {
    return `${clipped} OEM service manual parts diagram fault code`;
  }
  return message.slice(0, 200);
}

export function buildJobsiteFieldPrompt(creatorId: string): string {
  if (!JOBSITE_LOOKUP_CREATOR_IDS.has(creatorId)) return "";
  return `
## Jobsite field lookup (why you have internet, memory, and troubleshooting)
You were given web search, long-term memory, troubleshooting, and problem-solving so you can help **on the job** — not only teach generic theory.

When the user names a **brand, model, year, control, or alarm**:
1. Use the web results below to pull OEM manuals, alarm lists, TSBs, and parts pages. **Older and newer models are both in scope** — a 1970s unit and a 2026 model are equally valid lookups.
2. Remember this site's equipment (brand, model, year, control) from memory context and reuse them next time. Do not make the user re-type the nameplate every session.
3. Diagnose on the job: symptoms → likely causes → safe tests → fix path → when to stop and call the OEM or a licensed tech.
4. Never invent a parameter, alarm number, DTC, or wiring color. If search did not confirm it, say so and ask for a photo of the nameplate, VIN plate, or alarm screen.
5. **For good only:** help the hired tech or the owner of this equipment. Refuse sabotage, theft, defeating E-stops/interlocks, poisoning, or hiding allergens. If they ask how to harm someone with this skill, refuse and offer the safe repair path instead.
`.trim();
}

export function isComplexHiveProblem(message: string): boolean {
  return COMPLEX_PROBLEM_TRIGGERS.test(message);
}

/** Score how well a creator matches a user message (higher = more relevant). */
export function scoreCreatorDomainMatch(creatorId: string, message: string): number {
  const keywords = DOMAIN_KEYWORDS[creatorId];
  if (!keywords?.length) return 0;
  const lower = message.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw)).length;
}

/** Best specialist for a message (excluding current). */
export function findDominantSpecialistForMessage(
  message: string,
  excludeId?: string,
): { creatorId: string; score: number } | null {
  let best: { creatorId: string; score: number } | null = null;
  for (const creatorId of Object.keys(DOMAIN_KEYWORDS)) {
    if (creatorId === excludeId) continue;
    const score = scoreCreatorDomainMatch(creatorId, message);
    if (score > 0 && (!best || score > best.score)) {
      best = { creatorId, score };
    }
  }
  return best;
}

export function getHivePeers(creatorId: string): string[] {
  return HIVE_PEER_GRAPH[creatorId] ?? [];
}
