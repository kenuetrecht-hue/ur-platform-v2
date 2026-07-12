/**
 * Feature Showcase Dashboard
 * Displays all completed pages, AI agents, and features built so far
 * Allows navigation to each feature for preview and testing
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, FlatList, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Feature {
  id: string;
  name: string;
  category: "screen" | "ai_agent" | "system" | "safety";
  description: string;
  icon: string;
  status: "completed" | "in_progress" | "planned";
  components: string[];
  features: string[];
  route?: string;
}

// ============================================================================
// FEATURES DATA
// ============================================================================

const FEATURES: Feature[] = [
  // ============ SCREENS ============
  {
    id: "home",
    name: "Home Screen",
    category: "screen",
    description: "Main dashboard with daily sign-in bonus and creator marketplace",
    icon: "🏠",
    status: "completed",
    components: ["Daily Bonus Modal", "Creator Marketplace Grid", "Navigation Tabs"],
    features: ["Sign-in bonus tracking", "AI specialist discovery", "Quick access to all features"],
    route: "(tabs)",
  },
  {
    id: "onboarding",
    name: "User Onboarding",
    category: "screen",
    description: "Terms of Service, Privacy Policy, Educational Disclaimers acceptance",
    icon: "📋",
    status: "completed",
    components: [
      "Terms Modal",
      "Privacy Modal",
      "Educational Disclaimer Modal",
      "Data Processing Modal",
    ],
    features: [
      "Multi-step agreement flow",
      "Checkbox validation",
      "AsyncStorage persistence",
      "GDPR/CCPA compliance",
    ],
  },
  {
    id: "admin_dashboard",
    name: "Admin Safety Dashboard",
    category: "screen",
    description: "Real-time safety metrics, abuse patterns, compliance monitoring",
    icon: "🛡️",
    status: "completed",
    components: ["Metrics Cards", "Alert Banners", "Statistics Grid"],
    features: [
      "Content safety tracking",
      "Usage monitoring",
      "Ethics compliance",
      "Entrepreneurial focus validation",
      "Real-time alerts",
    ],
  },
  {
    id: "landscaping_master",
    name: "Landscaping Master AI",
    category: "screen",
    description: "Photo-to-3D landscape design with execution planning",
    icon: "🌳",
    status: "completed",
    components: [
      "Photo Upload",
      "Project Manager",
      "Design Elements",
      "Budget Tracker",
      "3D Preview",
    ],
    features: [
      "Yard photo analysis",
      "Plant recommendations",
      "Hardscape design",
      "Budget calculation",
      "Execution planning",
      "3D visualization",
    ],
  },
  {
    id: "voice_conversation",
    name: "Voice Conversation Player",
    category: "screen",
    description: "Real-time voice interaction with AI agents and audio visualization",
    icon: "🎤",
    status: "completed",
    components: [
      "Audio Player",
      "Waveform Display",
      "Audio Visualizer",
      "Voice Recorder",
      "Controls",
    ],
    features: [
      "Real-time audio playback",
      "Waveform visualization",
      "12-bar spectrum display",
      "Voice recording",
      "Progress tracking",
      "Volume control",
    ],
  },

  // ============ AI AGENTS ============
  {
    id: "real_estate_master",
    name: "Real Estate Master AI",
    category: "ai_agent",
    description: "Real estate specialist for property analysis and lead generation",
    icon: "🏢",
    status: "completed",
    components: ["Property Analysis", "Lead Qualification", "Market Research", "Zillow Integration"],
    features: [
      "Property valuation",
      "Lead identification",
      "Market trends",
      "Zillow integration",
      "Investment analysis",
    ],
  },
  {
    id: "landscaping_ai",
    name: "Landscaping Master AI",
    category: "ai_agent",
    description: "Landscape design specialist with plant database and 3D visualization",
    icon: "🌿",
    status: "completed",
    components: [
      "Plant Database",
      "Design Engine",
      "3D Renderer",
      "Execution Pipeline",
    ],
    features: [
      "Plant recommendations",
      "Design creation",
      "Cost calculation",
      "Phase planning",
      "Material lists",
      "3D rendering",
    ],
  },
  {
    id: "coder_ai",
    name: "Coder AI Specialist",
    category: "ai_agent",
    description: "Code analysis, debugging, and generation assistant",
    icon: "💻",
    status: "completed",
    components: ["Code Analyzer", "Debugger", "Generator", "Documentation"],
    features: [
      "Code review",
      "Bug detection",
      "Performance analysis",
      "Code generation",
      "Documentation",
    ],
  },
  {
    id: "marketing_ai",
    name: "Marketing Master AI",
    category: "ai_agent",
    description: "Marketing strategy and campaign planning specialist",
    icon: "📱",
    status: "completed",
    components: ["Strategy Planner", "Campaign Builder", "Analytics", "Content Creator"],
    features: [
      "Campaign planning",
      "Content strategy",
      "Social media planning",
      "Analytics",
      "ROI tracking",
    ],
  },
  {
    id: "finance_ai",
    name: "Finance Master AI",
    category: "ai_agent",
    description: "Financial planning and business analysis specialist",
    icon: "💰",
    status: "completed",
    components: ["Budget Planner", "Forecaster", "Analyzer", "Reporter"],
    features: [
      "Budget planning",
      "Financial forecasting",
      "Cash flow analysis",
      "Tax planning",
      "Investment advice",
    ],
  },
  {
    id: "hr_ai",
    name: "HR Master AI",
    category: "ai_agent",
    description: "Human resources and team management specialist",
    icon: "👥",
    status: "completed",
    components: ["Recruitment", "Training", "Performance", "Compliance"],
    features: [
      "Recruitment assistance",
      "Training programs",
      "Performance tracking",
      "Compliance management",
      "Team building",
    ],
  },
  {
    id: "sales_ai",
    name: "Sales Master AI",
    category: "ai_agent",
    description: "Sales strategy and customer relationship management specialist",
    icon: "📈",
    status: "completed",
    components: ["Pipeline Manager", "Forecaster", "CRM", "Negotiation Coach"],
    features: [
      "Sales pipeline management",
      "Forecasting",
      "Customer analysis",
      "Negotiation coaching",
      "Deal closing",
    ],
  },
  {
    id: "operations_ai",
    name: "Operations Master AI",
    category: "ai_agent",
    description: "Operations management and process optimization specialist",
    icon: "⚙️",
    status: "completed",
    components: ["Process Mapper", "Optimizer", "Scheduler", "Monitor"],
    features: [
      "Process optimization",
      "Workflow automation",
      "Resource scheduling",
      "Performance monitoring",
      "Cost reduction",
    ],
  },
  {
    id: "customer_service_ai",
    name: "Customer Service Master AI",
    category: "ai_agent",
    description: "Customer service and support specialist",
    icon: "💬",
    status: "completed",
    components: ["Support Ticket", "Chat", "FAQ", "Escalation"],
    features: [
      "Ticket management",
      "Chat support",
      "FAQ generation",
      "Issue resolution",
      "Customer satisfaction",
    ],
  },
  {
    id: "product_ai",
    name: "Product Master AI",
    category: "ai_agent",
    description: "Product development and management specialist",
    icon: "🎯",
    status: "completed",
    components: ["Roadmap", "Requirements", "Testing", "Launch"],
    features: [
      "Product roadmap",
      "Requirements gathering",
      "Testing strategy",
      "Launch planning",
      "Feature prioritization",
    ],
  },
  {
    id: "legal_ai",
    name: "Legal Master AI",
    category: "ai_agent",
    description: "Legal compliance and contract management specialist",
    icon: "⚖️",
    status: "completed",
    components: ["Compliance Checker", "Contract Analyzer", "Risk Assessor", "Advisor"],
    features: [
      "Compliance checking",
      "Contract review",
      "Risk assessment",
      "Legal advice",
      "Regulatory tracking",
    ],
  },
  {
    id: "content_creator_ai",
    name: "Content Creator AI",
    category: "ai_agent",
    description: "Content creation specialist for books, blogs, and multimedia",
    icon: "✍️",
    status: "completed",
    components: ["Writer", "Editor", "Publisher", "Monetizer"],
    features: [
      "Book writing",
      "Blog creation",
      "Content editing",
      "Publishing",
      "Monetization",
    ],
  },

  // ============ SYSTEMS ============
  {
    id: "physics_engine",
    name: "Physics Simulation Engine",
    category: "system",
    description: "7 simulation types with real-world physics calculations",
    icon: "⚛️",
    status: "completed",
    components: [
      "Structural Load",
      "Wind Resistance",
      "Earthquake",
      "Impact Force",
      "Thermal Stress",
      "Water Pressure",
      "Combined Forces",
    ],
    features: [
      "Stress calculation",
      "Deformation analysis",
      "Safety factor computation",
      "Failure risk assessment",
      "Reinforcement recommendations",
    ],
  },
  {
    id: "voice_streaming",
    name: "Voice Streaming Service",
    category: "system",
    description: "Bidirectional audio streaming with VAD and quality metrics",
    icon: "🔊",
    status: "completed",
    components: [
      "Audio Capture",
      "Voice Activity Detection",
      "Buffer Management",
      "Streaming Metrics",
    ],
    features: [
      "Real-time streaming",
      "Voice detection",
      "Audio buffering",
      "Latency tracking",
      "Quality monitoring",
    ],
  },
  {
    id: "avatar_animation",
    name: "Avatar Animation Sync",
    category: "system",
    description: "14 animation types with speech analysis and gesture sync",
    icon: "🎭",
    status: "completed",
    components: ["Animation Engine", "Speech Analyzer", "Gesture Scheduler", "Emotion Mapper"],
    features: [
      "14 animation types",
      "10 gesture types",
      "Sentiment detection",
      "Emotion mapping",
      "Real-time sync",
    ],
  },
  {
    id: "ai_learning",
    name: "AI Learning Engine",
    category: "system",
    description: "Self-updating AI with knowledge base and collaborative learning",
    icon: "🧠",
    status: "completed",
    components: [
      "Knowledge Base",
      "Learning Tracker",
      "Verification System",
      "Analytics",
    ],
    features: [
      "Knowledge management",
      "Learning interactions",
      "Verification tracking",
      "Collaborative learning",
      "Performance analytics",
    ],
  },
  {
    id: "knowledge_integration",
    name: "Real-Time Knowledge Integration",
    category: "system",
    description: "Web search and data source integration for current information",
    icon: "🔍",
    status: "completed",
    components: ["Web Search", "Data Sources", "Verification", "Caching"],
    features: [
      "Real-time web search",
      "Multi-source integration",
      "Information verification",
      "Cache management",
      "Update scheduling",
    ],
  },

  // ============ SAFETY SYSTEMS ============
  {
    id: "content_safety",
    name: "Content Safety System",
    category: "safety",
    description: "10 harm categories with pattern matching and enforcement",
    icon: "🚫",
    status: "completed",
    components: ["Detector", "Pattern Matcher", "Classifier", "Enforcer"],
    features: [
      "Harmful content detection",
      "Pattern matching",
      "Safety levels",
      "User profiles",
      "Automatic enforcement",
    ],
  },
  {
    id: "ethical_guidelines",
    name: "Ethical Guidelines System",
    category: "safety",
    description: "8 principles with compliance standards and audit trails",
    icon: "✅",
    status: "completed",
    components: ["Principles", "Standards", "Audits", "Recommendations"],
    features: [
      "8 core principles",
      "GDPR/CCPA compliance",
      "Response guides",
      "Consent tracking",
      "Ethical audits",
    ],
  },
  {
    id: "usage_monitoring",
    name: "Usage Monitoring System",
    category: "safety",
    description: "Abuse detection with anomaly analysis and enforcement actions",
    icon: "📊",
    status: "completed",
    components: ["Activity Tracker", "Anomaly Detector", "Enforcer", "Reporter"],
    features: [
      "Activity tracking",
      "Abuse detection",
      "Rate limiting",
      "Anomaly detection",
      "Enforcement actions",
    ],
  },
  {
    id: "disclaimers",
    name: "Disclaimers & Transparency",
    category: "safety",
    description: "7 disclaimer types with Terms of Service and Privacy Policy",
    icon: "📝",
    status: "completed",
    components: ["Disclaimers", "Terms", "Privacy", "Agreements"],
    features: [
      "7 disclaimer types",
      "AI response wrapper",
      "Transparency metadata",
      "Full compliance",
      "User agreements",
    ],
  },
  {
    id: "entrepreneurial_focus",
    name: "Entrepreneurial Focus Validation",
    category: "safety",
    description: "12 categories with legitimacy assessment and resource library",
    icon: "🚀",
    status: "completed",
    components: ["Validator", "Assessor", "Resources", "Tracker"],
    features: [
      "12 categories",
      "Legitimacy scoring",
      "Activity logging",
      "Resource library",
      "Violation tracking",
    ],
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Feature Card Component
 */
function FeatureCard({
  feature,
  onPress,
}: {
  feature: Feature;
  onPress: (feature: Feature) => void;
}) {
  const colors = useColors();

  const categoryColors = {
    screen: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
    ai_agent: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
    system: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    safety: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
  };

  const statusColors = {
    completed: "bg-green-500",
    in_progress: "bg-yellow-500",
    planned: "bg-gray-400",
  };

  return (
    <Pressable
      onPress={() => onPress(feature)}
      className={cn(
        "p-4 rounded-lg mb-3 border-2 active:opacity-70",
        categoryColors[feature.category]
      )}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-3xl">{feature.icon}</Text>
          <View className="flex-1">
            <Text className="font-bold text-foreground text-base">{feature.name}</Text>
            <Text className="text-xs text-muted">{feature.category.replace(/_/g, " ")}</Text>
          </View>
        </View>
        <View className={cn("w-3 h-3 rounded-full", statusColors[feature.status])} />
      </View>

      <Text className="text-sm text-foreground mb-2">{feature.description}</Text>

      <View className="flex-row flex-wrap gap-1">
        {feature.features.slice(0, 3).map((f, i) => (
          <Text key={i} className="text-xs bg-foreground/10 px-2 py-1 rounded">
            {f}
          </Text>
        ))}
        {feature.features.length > 3 && (
          <Text className="text-xs bg-foreground/10 px-2 py-1 rounded">
            +{feature.features.length - 3} more
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Feature Detail Modal
 */
function FeatureDetailModal({
  feature,
  visible,
  onClose,
}: {
  feature: Feature | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();

  if (!feature) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScreenContainer>
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-3 flex-1">
            <Text className="text-4xl">{feature.icon}</Text>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-foreground">{feature.name}</Text>
              <Text className="text-sm text-muted capitalize">{feature.category.replace(/_/g, " ")}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} className="p-2 active:opacity-70">
            <Text className="text-2xl">✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
          <Text className="text-base text-foreground mb-4">{feature.description}</Text>

          <Text className="text-lg font-bold text-foreground mb-2">Components</Text>
          <View className="mb-4">
            {feature.components.map((comp, i) => (
              <View key={i} className="flex-row items-center gap-2 mb-2">
                <Text className="text-primary">•</Text>
                <Text className="text-foreground">{comp}</Text>
              </View>
            ))}
          </View>

          <Text className="text-lg font-bold text-foreground mb-2">Features</Text>
          <View>
            {feature.features.map((feat, i) => (
              <View key={i} className="flex-row items-center gap-2 mb-2">
                <Text className="text-primary">✓</Text>
                <Text className="text-foreground">{feat}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <Pressable
          className="bg-primary rounded-lg p-4 active:opacity-80"
          onPress={onClose}
        >
          <Text className="text-white font-semibold text-center">Close</Text>
        </Pressable>
      </ScreenContainer>
    </Modal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Feature Showcase Dashboard
 */
export function FeatureShowcase() {
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<Feature["category"] | "all">("all");
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const categories: { id: Feature["category"] | "all"; label: string; icon: string }[] = [
    { id: "all", label: "All", icon: "📋" },
    { id: "screen", label: "Screens", icon: "📱" },
    { id: "ai_agent", label: "AI Agents", icon: "🤖" },
    { id: "system", label: "Systems", icon: "⚙️" },
    { id: "safety", label: "Safety", icon: "🛡️" },
  ];

  const filteredFeatures =
    selectedCategory === "all"
      ? FEATURES
      : FEATURES.filter((f) => f.category === selectedCategory);

  const stats = {
    total: FEATURES.length,
    completed: FEATURES.filter((f) => f.status === "completed").length,
    screens: FEATURES.filter((f) => f.category === "screen").length,
    agents: FEATURES.filter((f) => f.category === "ai_agent").length,
    systems: FEATURES.filter((f) => f.category === "system").length,
    safety: FEATURES.filter((f) => f.category === "safety").length,
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">Feature Showcase</Text>
          <Text className="text-base text-muted">
            All completed pages, AI agents, and systems built so far
          </Text>
        </View>

        {/* Stats */}
        <View className="grid grid-cols-2 gap-3 mb-6">
          <View className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4">
            <Text className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats.completed}/{stats.total}
            </Text>
            <Text className="text-xs text-blue-800 dark:text-blue-200">Features Completed</Text>
          </View>
          <View className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <Text className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {stats.agents}
            </Text>
            <Text className="text-xs text-purple-800 dark:text-purple-200">AI Agents</Text>
          </View>
          <View className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
            <Text className="text-2xl font-bold text-green-900 dark:text-green-100">
              {stats.systems}
            </Text>
            <Text className="text-xs text-green-800 dark:text-green-200">Systems</Text>
          </View>
          <View className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4">
            <Text className="text-2xl font-bold text-red-900 dark:text-red-100">
              {stats.safety}
            </Text>
            <Text className="text-xs text-red-800 dark:text-red-200">Safety Features</Text>
          </View>
        </View>

        {/* Category Filter */}
        <View className="mb-6">
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedCategory(item.id)}
                className={cn(
                  "px-4 py-2 rounded-full mr-2 active:opacity-70",
                  selectedCategory === item.id
                    ? "bg-primary"
                    : "bg-surface border border-border"
                )}
              >
                <Text
                  className={cn(
                    "font-semibold",
                    selectedCategory === item.id ? "text-white" : "text-foreground"
                  )}
                >
                  {item.icon} {item.label}
                </Text>
              </Pressable>
            )}
          />
        </View>

        {/* Features List */}
        <View className="mb-6">
          {filteredFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onPress={() => setSelectedFeature(feature)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <FeatureDetailModal
        feature={selectedFeature}
        visible={selectedFeature !== null}
        onClose={() => setSelectedFeature(null)}
      />
    </ScreenContainer>
  );
}

export default FeatureShowcase;
