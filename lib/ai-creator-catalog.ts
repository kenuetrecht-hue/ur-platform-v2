/** Client-side AI catalog — always available for browsing (synced with server registry). */
export type AiCreatorCatalogEntry = {
  id: string;
  name: string;
  avatar: string;
  category: string;
  mission: string;
};

export const AI_CREATOR_CATALOG: AiCreatorCatalogEntry[] = [
  { id: "contentmate", name: "ContentMate", avatar: "✨", category: "Platform", mission: "Personal AI content assistant for the UR creator platform." },
  { id: "linguamate", name: "LinguaMate", avatar: "🌍", category: "Platform", mission: "Universal language translator and teacher for the UR platform." },
  { id: "ai-coder-001", name: "TechBuilder", avatar: "💻", category: "Platform", mission: "UR Platform lead coder — ship on the same stack UR runs. Chat, Learn, Build sandbox, voice, hive, live sessions." },
  { id: "ai-wellness-001", name: "AI Wellness Coach", avatar: "🧘", category: "Health & Wellness", mission: "Holistic wellness coaching and mindfulness." },
  { id: "ai-fitness-001", name: "AI Fitness Trainer", avatar: "💪", category: "Health & Fitness", mission: "Fitness programming and exercise guidance." },
  { id: "ai-crypto-001", name: "AI Crypto Analyst", avatar: "₿", category: "Finance", mission: "Cryptocurrency market analysis and education." },
  { id: "ai-news-001", name: "AI News Daily", avatar: "📰", category: "News", mission: "Daily news summaries and context." },
  { id: "ai-career-001", name: "AI Career Coach", avatar: "🎯", category: "Career", mission: "Career development and job search coaching." },
  { id: "ai-creative-001", name: "AI Creative Muse", avatar: "🎨", category: "Creative", mission: "Cross-media creative inspiration — brainstorming, mood boards, and artistic exercises." },
  { id: "ai-author-001", name: "AI Author Muse", avatar: "📚", category: "Writing", mission: "Books, novels, memoirs, and long-form writing — outline, draft, edit, and publish." },
  { id: "ai-songwriter-001", name: "Songwriter AI", avatar: "🎵", category: "Creative", mission: "Write songs and lyrics — hooks, verses, bridges, melody ideas, any genre." },
  { id: "ai-musician-001", name: "Musician AI", avatar: "🎸", category: "Creative", mission: "Learn to play instruments, read music, practice routines, and write your own songs." },
  { id: "ai-poet-001", name: "Poet AI", avatar: "🪶", category: "Writing", mission: "Poems, haiku, spoken word, and lyrical verse — any mood, any language." },
  { id: "ai-logo-brand-001", name: "Logo & Brand AI", avatar: "🏷️", category: "Creative", mission: "Logo concepts, brand identity, color palettes, typography, and brand kits." },
  { id: "ai-game-dev-001", name: "GameForge", avatar: "🎮", category: "Game Development", mission: "Teach and build video games — from jam games to massive worlds, with a secure sandbox." },
  { id: "ai-business-001", name: "AI Business Advisor", avatar: "📊", category: "Business", mission: "Business strategy and operations guidance." },
  { id: "ai-funding-001", name: "Funding AI", avatar: "💰", category: "Business", mission: "Find startup capital and business financing — grants, loans, state/federal programs, and private financiers." },
  { id: "ai-legal-001", name: "AI Legal Reference Assistant", avatar: "⚖️", category: "Legal Reference", mission: "General legal information and research pointers." },
  { id: "ai-realestate-001", name: "Real Estate Master AI", avatar: "🏠", category: "Real Estate", mission: "Real estate education, market analysis, and transaction guidance." },
  { id: "ai-electrician-001", name: "Electrician Expert AI", avatar: "⚡", category: "Construction", mission: "Any brand, any year — look up the OEM panel or device, remember this site's gear, and troubleshoot electrical on the job." },
  { id: "ai-contractor-001", name: "Contractor Pro AI", avatar: "🔨", category: "Construction", mission: "Any brand, any year — look up jobsite equipment, remember this site's gear, and solve problems on the job." },
  { id: "ai-hvac-001", name: "HVAC Specialist AI", avatar: "❄️", category: "Construction", mission: "Any brand, any year — look up the OEM furnace, heat pump, or AC, remember this site's systems, and troubleshoot HVAC on the job." },
  { id: "ai-landscaping-001", name: "Landscaping Master AI", avatar: "🌳", category: "Construction", mission: "Any brand, any year — look up irrigation and outdoor equipment, remember this site's gear, and troubleshoot in the field." },
  { id: "ai-attorney-001", name: "Attorney AI", avatar: "👔", category: "Legal Reference", mission: "General legal hub — research and templates; open Legal Masters for field specialists." },
  { id: "ai-attorney-criminal-001", name: "Criminal Justice Attorney AI", avatar: "🏛️", category: "Legal Masters", mission: "Criminal law & procedure — rights, charges, pleas, evidence, and trial basics (educational)." },
  { id: "ai-attorney-realestate-001", name: "Real Estate Attorney AI", avatar: "🏘️", category: "Legal Masters", mission: "Real estate law — contracts, title, leases, zoning, closings, and foreclosure concepts." },
  { id: "ai-attorney-accountant-001", name: "Accountant Attorney AI", avatar: "📒", category: "Legal Masters", mission: "Law meets accounting — entities, audits, finance contracts, and M&A diligence (educational)." },
  { id: "ai-attorney-tax-001", name: "Tax Attorney AI", avatar: "🧾", category: "Legal Masters", mission: "Tax law concepts — IRS notices, audits, business tax, and controversy paths (educational)." },
  { id: "ai-attorney-credit-001", name: "Credit & Consumer Attorney AI", avatar: "💳", category: "Legal Masters", mission: "Credit repair, disputes, building good credit, and using credit strategically (educational)." },
  { id: "ai-accountant-001", name: "Accountant Pro AI", avatar: "🧮", category: "Finance", mission: "Accounting and bookkeeping guidance." },
  { id: "ai-marketing-001", name: "Marketing Expert AI", avatar: "📣", category: "Marketing", mission: "Marketing strategy and campaign planning." },
  { id: "ai-sales-001", name: "Sales Master AI", avatar: "🤝", category: "Sales", mission: "Sales techniques and pipeline management." },
  { id: "ai-hr-001", name: "HR Specialist AI", avatar: "👥", category: "Human Resources", mission: "HR policies and people operations." },
  { id: "ai-operations-001", name: "Operations Manager AI", avatar: "⚙️", category: "Operations", mission: "Operational efficiency and process improvement." },
  { id: "ai-customer-service-001", name: "Customer Service Pro AI", avatar: "🎧", category: "Support", mission: "Customer support best practices and scripts." },
  { id: "ai-product-001", name: "Product Manager AI", avatar: "📱", category: "Product", mission: "Product management and roadmap planning." },
  { id: "ai-content-helper-001", name: "Content Creator Helper AI", avatar: "✍️", category: "Creative", mission: "Writing, editing, and formatting assistance for creators." },
  { id: "ai-3d-specialist", name: "AI 3D Designer", avatar: "🎮", category: "3D & Design", mission: "3D modeling plus any printer or scanner brand — look up the OEM, remember this shop's machines, and troubleshoot the hardware." },
  { id: "ai-cnc-master-001", name: "Master CNC & Mill AI", avatar: "🔩", category: "Manufacturing", mission: "Any brand, any year — look up the OEM model, remember this shop's machines, and troubleshoot mills, lathes, CNC, and NBC on the job." },
  { id: "ai-culinary-001", name: "Culinary Arts AI", avatar: "🍳", category: "Culinary", mission: "Any cuisine, any kitchen — look up the OEM mixer or range, remember this cook's skill and allergies, and coach on the line." },
  { id: "ai-blueprint-reader-001", name: "Blueprint Reader AI", avatar: "📐", category: "Blueprint & Schematics", mission: "Read, teach, and interpret any blueprint or schematic — any discipline, any trend." },
  { id: "ai-plumber-001", name: "Plumber AI", avatar: "🔧", category: "Construction", mission: "Any brand, any year — look up the OEM water heater or fixture, remember this site's gear, and troubleshoot plumbing on the job." },
  { id: "ai-welder-001", name: "AI Welder", avatar: "🔥", category: "Construction", mission: "Any brand, any year — look up the OEM welder or cutter, remember this shop's machines, and troubleshoot on the job." },
  { id: "ai-roofer-001", name: "Roofer AI", avatar: "🏗️", category: "Construction", mission: "Any brand, any year — look up roofing materials and tools, remember this site's gear, and diagnose leaks on the job." },
  { id: "ai-drywall-001", name: "Dry Waller AI", avatar: "🧱", category: "Construction", mission: "Any brand, any year — look up the OEM board, mud, or tool, remember this site's gear, and troubleshoot finishing on the job." },
  { id: "ai-framer-001", name: "Framer AI", avatar: "🪵", category: "Construction", mission: "Any brand, any year — look up the OEM connector, nailer, or lumber system, remember this site's gear, and solve framing problems on the job." },
  { id: "ai-automotive-001", name: "Automotive AI", avatar: "🚗", category: "Automotive", mission: "Any brand, any year — look up the OEM vehicle, remember this shop's cars, and diagnose on the job." },
  { id: "ai-marina-mechanic-001", name: "Marina Mechanic AI", avatar: "⚓", category: "Marine", mission: "Any brand, any year — look up the OEM outboard or drive, remember this marina's fleet, and troubleshoot on the dock." },
  { id: "ai-small-engine-001", name: "Small Engine AI", avatar: "🛠️", category: "Small Engines", mission: "Any brand, any year — look up the OEM mower, saw, or generator, remember this site's equipment, and troubleshoot in the field." },
  { id: "ai-robotics-001", name: "AI Robotics Engineer", avatar: "🤖", category: "Engineering", mission: "Any brand, any year — look up the OEM robot or controller, remember this cell's machines, and troubleshoot automation on the floor." },
  { id: "ai-dynamics-001", name: "AI Dynamics Analyst", avatar: "⚙️", category: "Engineering", mission: "Any brand, any year — look up the OEM part or analysis tool, remember this site's equipment, and work the physics on the job." },
  { id: "ai-tree-service-001", name: "AI Tree Service Expert", avatar: "🌲", category: "Outdoor", mission: "Any brand, any year — look up the OEM saw or chipper, remember this crew's gear, and troubleshoot in the field." },
  { id: "ai-wind-load-001", name: "AI Wind Load Analyst", avatar: "💨", category: "Engineering", mission: "Any brand, any year — look up hurricane hardware and codes, remember this site's systems, and work wind problems on the job." },
  { id: "ai-structural-001", name: "AI Structural Engineer", avatar: "🏛️", category: "Engineering", mission: "Any brand, any year — look up connectors and analysis tools, remember this site's systems, and work structural problems on the job." },
  { id: "ai-seismic-001", name: "AI Seismic Analysis Specialist", avatar: "🌊", category: "Engineering", mission: "Any brand, any year — look up retrofit hardware and codes, remember this site's systems, and work seismic problems on the job." },
  { id: "ai-translator-001", name: "AI Universal Language Translator", avatar: "🌐", category: "Language", mission: "Real-time translation and language teaching across 100+ languages." },
];

export function getCatalogCreator(id: string): AiCreatorCatalogEntry | undefined {
  return AI_CREATOR_CATALOG.find((c) => c.id === id);
}
