/**
 * 3D Environment Builder
 * 
 * Creates 3D models and environments for AI specialists
 * Includes:
 * - AI specialist avatars with distinct appearances
 * - Professional uniforms with AI branding
 * - Relevant tools for each specialty
 * - Interactive workspaces
 */

export interface AI3DModel {
  id: string;
  name: string;
  category: string;
  avatar: string;
  color: { r: number; g: number; b: number };
  uniform: string;
  tools: string[];
  workspace: string;
  description: string;
}

/**
 * 3D Models for all 24 AI Specialists
 */
export const AI3DModels: Record<string, AI3DModel> = {
  wellness_coach: {
    id: "wellness_coach",
    name: "AI Wellness Coach",
    category: "wellness",
    avatar: "🧘",
    color: { r: 0.4, g: 0.8, b: 0.6 },
    uniform: "Wellness AI",
    tools: ["meditation_mat", "breathing_guide", "wellness_chart"],
    workspace: "zen_garden",
    description: "Guides users through meditation, stress relief, and wellness practices",
  },
  fitness_trainer: {
    id: "fitness_trainer",
    name: "AI Fitness Trainer",
    category: "fitness",
    avatar: "💪",
    color: { r: 0.8, g: 0.4, b: 0.2 },
    uniform: "Fitness AI",
    tools: ["dumbbells", "workout_plan", "fitness_tracker"],
    workspace: "gym",
    description: "Creates personalized workout plans and fitness guidance",
  },
  crypto_analyst: {
    id: "crypto_analyst",
    name: "AI Crypto Analyst",
    category: "finance",
    avatar: "📈",
    color: { r: 0.2, g: 0.6, b: 0.9 },
    uniform: "Crypto AI",
    tools: ["price_chart", "portfolio_tracker", "market_data"],
    workspace: "trading_floor",
    description: "Analyzes cryptocurrency trends and market data",
  },
  news_daily: {
    id: "news_daily",
    name: "AI News Daily",
    category: "education",
    avatar: "📰",
    color: { r: 0.9, g: 0.7, b: 0.2 },
    uniform: "News AI",
    tools: ["news_feed", "research_library", "fact_checker"],
    workspace: "newsroom",
    description: "Provides current news, research, and fact-checking",
  },
  career_coach: {
    id: "career_coach",
    name: "AI Career Coach",
    category: "business",
    avatar: "🎯",
    color: { r: 0.6, g: 0.3, b: 0.8 },
    uniform: "Career AI",
    tools: ["resume_builder", "interview_prep", "job_search"],
    workspace: "office",
    description: "Guides career development and job search strategies",
  },
  creative_muse: {
    id: "creative_muse",
    name: "AI Creative Muse",
    category: "creative",
    avatar: "🎨",
    color: { r: 0.9, g: 0.4, b: 0.6 },
    uniform: "Creative AI",
    tools: ["canvas", "color_palette", "inspiration_board"],
    workspace: "art_studio",
    description: "Inspires creative projects and artistic expression",
  },
  author_muse: {
    id: "author_muse",
    name: "AI Author Muse",
    category: "creative",
    avatar: "✍️",
    color: { r: 0.5, g: 0.2, b: 0.7 },
    uniform: "Author AI",
    tools: ["writing_desk", "story_outline", "character_builder"],
    workspace: "library",
    description: "Assists with writing books, poems, and creative documents",
  },
  coder_forge: {
    id: "coder_forge",
    name: "AI Coder Forge",
    category: "technical",
    avatar: "💻",
    color: { r: 0.2, g: 0.8, b: 0.3 },
    uniform: "Code AI",
    tools: ["code_editor", "debugger", "documentation"],
    workspace: "dev_lab",
    description: "Helps write, debug, and optimize code",
  },
  business_advisor: {
    id: "business_advisor",
    name: "AI Business Advisor",
    category: "business",
    avatar: "💼",
    color: { r: 0.3, g: 0.5, b: 0.8 },
    uniform: "Business AI",
    tools: ["business_plan", "market_analysis", "financial_model"],
    workspace: "boardroom",
    description: "Provides strategic business guidance and planning",
  },
  legal_reference: {
    id: "legal_reference",
    name: "AI Legal Reference",
    category: "legal",
    avatar: "⚖️",
    color: { r: 0.2, g: 0.2, b: 0.6 },
    uniform: "Legal AI",
    tools: ["law_library", "document_generator", "compliance_checker"],
    workspace: "law_office",
    description: "Provides legal information and document assistance",
  },
  real_estate_master: {
    id: "real_estate_master",
    name: "AI Real Estate Master",
    category: "real_estate",
    avatar: "🏠",
    color: { r: 0.8, g: 0.6, b: 0.2 },
    uniform: "Real Estate AI",
    tools: ["property_viewer", "market_data", "valuation_tool"],
    workspace: "real_estate_office",
    description: "Analyzes real estate markets and property valuations",
  },
  electrician_expert: {
    id: "electrician_expert",
    name: "AI Electrician Expert",
    category: "trades",
    avatar: "⚡",
    color: { r: 0.9, g: 0.8, b: 0.1 },
    uniform: "Electrician AI",
    tools: ["circuit_diagram", "code_reference", "safety_guide"],
    workspace: "electrical_workshop",
    description: "Provides electrical expertise and safety guidance",
  },
  contractor_pro: {
    id: "contractor_pro",
    name: "AI Contractor Pro",
    category: "trades",
    avatar: "🔨",
    color: { r: 0.7, g: 0.5, b: 0.3 },
    uniform: "Contractor AI",
    tools: ["project_planner", "budget_calculator", "timeline_tracker"],
    workspace: "construction_site",
    description: "Manages construction projects and budgets",
  },
  hvac_specialist: {
    id: "hvac_specialist",
    name: "AI HVAC Specialist",
    category: "trades",
    avatar: "❄️",
    color: { r: 0.3, g: 0.7, b: 0.9 },
    uniform: "HVAC AI",
    tools: ["system_designer", "efficiency_calculator", "maintenance_guide"],
    workspace: "hvac_workshop",
    description: "Designs HVAC systems and provides maintenance guidance",
  },
  landscaping_master: {
    id: "landscaping_master",
    name: "AI Landscaping Master",
    category: "trades",
    avatar: "🌳",
    color: { r: 0.2, g: 0.7, b: 0.3 },
    uniform: "Landscaping AI",
    tools: ["design_tool", "plant_database", "cost_estimator"],
    workspace: "garden",
    description: "Creates landscape designs and plant recommendations",
  },
  attorney_ai: {
    id: "attorney_ai",
    name: "AI Attorney",
    category: "legal",
    avatar: "👨‍⚖️",
    color: { r: 0.1, g: 0.2, b: 0.5 },
    uniform: "Attorney AI",
    tools: ["legal_research", "document_drafter", "compliance_advisor"],
    workspace: "law_library",
    description: "Provides legal research and document drafting assistance",
  },
  accountant_pro: {
    id: "accountant_pro",
    name: "AI Accountant Pro",
    category: "finance",
    avatar: "📊",
    color: { r: 0.4, g: 0.3, b: 0.7 },
    uniform: "Accountant AI",
    tools: ["tax_calculator", "financial_analyzer", "audit_checker"],
    workspace: "accounting_office",
    description: "Handles tax planning and financial analysis",
  },
  marketing_expert: {
    id: "marketing_expert",
    name: "AI Marketing Expert",
    category: "marketing",
    avatar: "📢",
    color: { r: 0.9, g: 0.2, b: 0.4 },
    uniform: "Marketing AI",
    tools: ["campaign_builder", "analytics_dashboard", "content_planner"],
    workspace: "marketing_agency",
    description: "Creates marketing strategies and campaigns",
  },
  sales_master: {
    id: "sales_master",
    name: "AI Sales Master",
    category: "sales",
    avatar: "🎯",
    color: { r: 0.8, g: 0.3, b: 0.1 },
    uniform: "Sales AI",
    tools: ["lead_qualifier", "pitch_optimizer", "crm_integrator"],
    workspace: "sales_floor",
    description: "Optimizes sales strategies and lead generation",
  },
  hr_specialist: {
    id: "hr_specialist",
    name: "AI HR Specialist",
    category: "hr",
    avatar: "👥",
    color: { r: 0.6, g: 0.2, b: 0.6 },
    uniform: "HR AI",
    tools: ["recruitment_tool", "onboarding_guide", "compliance_checker"],
    workspace: "hr_office",
    description: "Manages recruitment and HR processes",
  },
  operations_manager: {
    id: "operations_manager",
    name: "AI Operations Manager",
    category: "operations",
    avatar: "⚙️",
    color: { r: 0.5, g: 0.5, b: 0.5 },
    uniform: "Operations AI",
    tools: ["workflow_optimizer", "resource_planner", "efficiency_analyzer"],
    workspace: "operations_center",
    description: "Optimizes business operations and workflows",
  },
  customer_service_pro: {
    id: "customer_service_pro",
    name: "AI Customer Service Pro",
    category: "customer_service",
    avatar: "😊",
    color: { r: 0.3, g: 0.8, b: 0.5 },
    uniform: "Support AI",
    tools: ["ticket_manager", "response_generator", "satisfaction_tracker"],
    workspace: "support_center",
    description: "Provides customer support and issue resolution",
  },
  product_manager: {
    id: "product_manager",
    name: "AI Product Manager",
    category: "product",
    avatar: "🚀",
    color: { r: 0.9, g: 0.5, b: 0.1 },
    uniform: "Product AI",
    tools: ["roadmap_planner", "feature_analyzer", "user_research"],
    workspace: "product_lab",
    description: "Manages product development and strategy",
  },
  content_creator_helper: {
    id: "content_creator_helper",
    name: "AI Content Creator Helper",
    category: "creative",
    avatar: "📹",
    color: { r: 0.7, g: 0.2, b: 0.8 },
    uniform: "Content AI",
    tools: ["content_planner", "editing_suite", "distribution_tool"],
    workspace: "content_studio",
    description: "Assists human creators with content production",
  },
};

/**
 * Get 3D model for an AI specialist
 */
export function getAI3DModel(aiId: string): AI3DModel | null {
  return AI3DModels[aiId] || null;
}

/**
 * Get all 3D models
 */
export function getAllAI3DModels(): AI3DModel[] {
  return Object.values(AI3DModels);
}

/**
 * Create a 3D workspace environment
 */
export interface Workspace3D {
  name: string;
  description: string;
  backgroundColor: { r: number; g: number; b: number };
  lighting: "bright" | "ambient" | "dramatic";
  objects: string[];
}

export const Workspaces: Record<string, Workspace3D> = {
  zen_garden: {
    name: "Zen Garden",
    description: "Peaceful meditation environment",
    backgroundColor: { r: 0.9, g: 0.95, b: 0.9 },
    lighting: "ambient",
    objects: ["meditation_mat", "water_fountain", "bamboo"],
  },
  gym: {
    name: "Fitness Gym",
    description: "Modern workout facility",
    backgroundColor: { r: 0.1, g: 0.1, b: 0.15 },
    lighting: "bright",
    objects: ["dumbbells", "treadmill", "weights_rack"],
  },
  trading_floor: {
    name: "Trading Floor",
    description: "Financial analysis workspace",
    backgroundColor: { r: 0.05, g: 0.05, b: 0.1 },
    lighting: "bright",
    objects: ["trading_desk", "price_ticker", "charts"],
  },
  newsroom: {
    name: "Newsroom",
    description: "News and research center",
    backgroundColor: { r: 0.2, g: 0.2, b: 0.25 },
    lighting: "bright",
    objects: ["news_desk", "research_library", "broadcast_studio"],
  },
  office: {
    name: "Professional Office",
    description: "Business workspace",
    backgroundColor: { r: 0.95, g: 0.95, b: 0.9 },
    lighting: "bright",
    objects: ["desk", "computer", "filing_cabinet"],
  },
  art_studio: {
    name: "Art Studio",
    description: "Creative workspace",
    backgroundColor: { r: 0.9, g: 0.85, b: 0.8 },
    lighting: "dramatic",
    objects: ["canvas", "easel", "paint_palette"],
  },
  library: {
    name: "Library",
    description: "Writing and research environment",
    backgroundColor: { r: 0.8, g: 0.75, b: 0.7 },
    lighting: "ambient",
    objects: ["bookshelf", "writing_desk", "lamp"],
  },
  dev_lab: {
    name: "Development Lab",
    description: "Programming workspace",
    backgroundColor: { r: 0.1, g: 0.1, b: 0.15 },
    lighting: "bright",
    objects: ["computer", "code_editor", "debug_console"],
  },
  boardroom: {
    name: "Boardroom",
    description: "Executive meeting space",
    backgroundColor: { r: 0.2, g: 0.15, b: 0.1 },
    lighting: "dramatic",
    objects: ["conference_table", "whiteboard", "presentation_screen"],
  },
  law_office: {
    name: "Law Office",
    description: "Legal workspace",
    backgroundColor: { r: 0.15, g: 0.1, b: 0.05 },
    lighting: "ambient",
    objects: ["law_library", "desk", "legal_documents"],
  },
};
