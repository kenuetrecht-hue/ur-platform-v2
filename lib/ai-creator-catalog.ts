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
  { id: "ai-wellness-001", name: "AI Wellness Coach", avatar: "🧘", category: "Health & Wellness", mission: "Holistic wellness coaching and mindfulness." },
  { id: "ai-fitness-001", name: "AI Fitness Trainer", avatar: "💪", category: "Health & Fitness", mission: "Fitness programming and exercise guidance." },
  { id: "ai-crypto-001", name: "AI Crypto Analyst", avatar: "₿", category: "Finance", mission: "Cryptocurrency market analysis and education." },
  { id: "ai-news-001", name: "AI News Daily", avatar: "📰", category: "News", mission: "Daily news summaries and context." },
  { id: "ai-career-001", name: "AI Career Coach", avatar: "🎯", category: "Career", mission: "Career development and job search coaching." },
  { id: "ai-creative-001", name: "AI Creative Muse", avatar: "🎨", category: "Creative", mission: "Creative inspiration across media." },
  { id: "ai-author-001", name: "AI Author Muse", avatar: "📚", category: "Writing", mission: "Writing and storytelling assistance." },
  { id: "ai-coder-001", name: "TechBuilder", avatar: "💻", category: "Technology", mission: "Teach and build software — learn to code on your own, with sandbox projects." },
  { id: "ai-game-dev-001", name: "GameForge", avatar: "🎮", category: "Game Development", mission: "Teach and build video games — from jam games to massive worlds, with a secure sandbox." },
  { id: "ai-business-001", name: "AI Business Advisor", avatar: "📊", category: "Business", mission: "Business strategy and operations guidance." },
  { id: "ai-legal-001", name: "AI Legal Reference Assistant", avatar: "⚖️", category: "Legal Reference", mission: "General legal information and research pointers." },
  { id: "ai-realestate-001", name: "Real Estate Master AI", avatar: "🏠", category: "Real Estate", mission: "Real estate education, market analysis, and transaction guidance." },
  { id: "ai-electrician-001", name: "Electrician Expert AI", avatar: "⚡", category: "Construction", mission: "Electrical systems, wiring, and NEC-oriented guidance." },
  { id: "ai-contractor-001", name: "Contractor Pro AI", avatar: "🔨", category: "Construction", mission: "General contracting and project management." },
  { id: "ai-hvac-001", name: "HVAC Specialist AI", avatar: "❄️", category: "Construction", mission: "Heating, ventilation, and air conditioning systems." },
  { id: "ai-landscaping-001", name: "Landscaping Master AI", avatar: "🌳", category: "Construction", mission: "Landscape design and outdoor space planning." },
  { id: "ai-attorney-001", name: "Attorney AI", avatar: "👔", category: "Legal Reference", mission: "Legal research and document drafting assistance." },
  { id: "ai-accountant-001", name: "Accountant Pro AI", avatar: "🧮", category: "Finance", mission: "Accounting and bookkeeping guidance." },
  { id: "ai-marketing-001", name: "Marketing Expert AI", avatar: "📣", category: "Marketing", mission: "Marketing strategy and campaign planning." },
  { id: "ai-sales-001", name: "Sales Master AI", avatar: "🤝", category: "Sales", mission: "Sales techniques and pipeline management." },
  { id: "ai-hr-001", name: "HR Specialist AI", avatar: "👥", category: "Human Resources", mission: "HR policies and people operations." },
  { id: "ai-operations-001", name: "Operations Manager AI", avatar: "⚙️", category: "Operations", mission: "Operational efficiency and process improvement." },
  { id: "ai-customer-service-001", name: "Customer Service Pro AI", avatar: "🎧", category: "Support", mission: "Customer support best practices and scripts." },
  { id: "ai-product-001", name: "Product Manager AI", avatar: "📱", category: "Product", mission: "Product management and roadmap planning." },
  { id: "ai-content-helper-001", name: "Content Creator Helper AI", avatar: "✍️", category: "Creative", mission: "Writing, editing, and formatting assistance for creators." },
  { id: "ai-3d-specialist", name: "AI 3D Designer", avatar: "🎮", category: "3D & Design", mission: "3D modeling, visualization, and design workflows." },
  { id: "ai-blueprint-reader-001", name: "Blueprint Reader AI", avatar: "📐", category: "Blueprint & Schematics", mission: "Read, teach, and interpret any blueprint or schematic — any discipline, any trend." },
  { id: "ai-plumber-001", name: "Plumber AI", avatar: "🔧", category: "Construction", mission: "Plumbing systems, water supply, and fixture guidance." },
  { id: "ai-welder-001", name: "AI Welder", avatar: "🔥", category: "Construction", mission: "Welding techniques, materials, and safety." },
  { id: "ai-roofer-001", name: "Roofer AI", avatar: "🏗️", category: "Construction", mission: "Roofing systems, materials, and installation." },
  { id: "ai-drywall-001", name: "Dry Waller AI", avatar: "🧱", category: "Construction", mission: "Drywall installation, finishing, and repair." },
  { id: "ai-framer-001", name: "Framer AI", avatar: "🪵", category: "Construction", mission: "Structural framing design and techniques." },
  { id: "ai-automotive-001", name: "Automotive AI", avatar: "🚗", category: "Automotive", mission: "Automotive diagnostics, repair, and maintenance." },
  { id: "ai-small-engine-001", name: "Small Engine AI", avatar: "🛠️", category: "Small Engines", mission: "Lawn equipment, generators, and small engine repair." },
  { id: "ai-robotics-001", name: "AI Robotics Engineer", avatar: "🤖", category: "Engineering", mission: "Robot design, programming, and automation." },
  { id: "ai-dynamics-001", name: "AI Dynamics Analyst", avatar: "⚙️", category: "Engineering", mission: "Physics, dynamics, and aerodynamic analysis." },
  { id: "ai-tree-service-001", name: "AI Tree Service Expert", avatar: "🌲", category: "Outdoor", mission: "Arboriculture and tree care guidance." },
  { id: "ai-wind-load-001", name: "AI Wind Load Analyst", avatar: "💨", category: "Engineering", mission: "Wind load and structural wind analysis." },
  { id: "ai-structural-001", name: "AI Structural Engineer", avatar: "🏛️", category: "Engineering", mission: "Structural engineering concepts and analysis." },
  { id: "ai-seismic-001", name: "AI Seismic Analysis Specialist", avatar: "🌊", category: "Engineering", mission: "Seismic design and earthquake engineering." },
  { id: "ai-translator-001", name: "AI Universal Language Translator", avatar: "🌐", category: "Language", mission: "Real-time translation and language teaching across 100+ languages." },
];

export function getCatalogCreator(id: string): AiCreatorCatalogEntry | undefined {
  return AI_CREATOR_CATALOG.find((c) => c.id === id);
}
