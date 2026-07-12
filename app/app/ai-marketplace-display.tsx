/**
 * AI Marketplace Display
 * Shows all 21 AIs organized by category
 * Users can tap any AI to access its workspace
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  aiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  aiCard: {
    width: "48%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  aiIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  aiName: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 11,
    textAlign: "center",
    opacity: 0.6,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
});

// ============================================================================
// DATA
// ============================================================================

const AI_CATEGORIES = [
  {
    id: "construction",
    title: "🏗️ Construction & Trades",
    description: "All building and construction specialists",
    ais: [
      {
        id: "contractor",
        name: "Contractor Pro",
        icon: "🔨",
        description: "Project Management",
      },
      {
        id: "electrician",
        name: "Electrician Expert",
        icon: "⚡",
        description: "Electrical Systems",
      },
      {
        id: "plumbing",
        name: "Plumbing Master",
        icon: "🚰",
        description: "Water Systems",
      },
      {
        id: "hvac",
        name: "HVAC Specialist",
        icon: "❄️",
        description: "Climate Control",
      },
      {
        id: "roofing",
        name: "Roofing Expert",
        icon: "🏠",
        description: "Roof Systems",
      },
      {
        id: "ironworker",
        name: "Iron Worker Pro",
        icon: "🏗️",
        description: "Structural Steel",
      },
      {
        id: "welder",
        name: "Welder Specialist",
        icon: "🔥",
        description: "Metal Fabrication",
      },
    ],
  },
  {
    id: "design",
    title: "🎨 Design & Visualization",
    description: "Design and visualization specialists",
    ais: [
      {
        id: "realestate",
        name: "Real Estate Master",
        icon: "🏠",
        description: "Property Analysis",
      },
      {
        id: "landscaper",
        name: "Landscaper Master",
        icon: "🌱",
        description: "Outdoor Design",
      },
    ],
  },
  {
    id: "finance",
    title: "💼 Business & Finance",
    description: "Financial and business specialists",
    ais: [
      {
        id: "accountant",
        name: "Accountant Pro",
        icon: "💰",
        description: "Accounting",
      },
      {
        id: "crypto",
        name: "Crypto & Blockchain",
        icon: "₿",
        description: "Cryptocurrency",
      },
      {
        id: "business",
        name: "Business Finance",
        icon: "📊",
        description: "Finance & Investment",
      },
    ],
  },
  {
    id: "professional",
    title: "⚖️ Professional Services",
    description: "Legal and technical specialists",
    ais: [
      {
        id: "attorney",
        name: "Attorney Advisor",
        icon: "⚖️",
        description: "Legal Guidance",
      },
      {
        id: "coder",
        name: "Coder Expert",
        icon: "💻",
        description: "Software Dev",
      },
    ],
  },
  {
    id: "operations",
    title: "📈 Business Operations",
    description: "Marketing, sales, and HR specialists",
    ais: [
      {
        id: "marketing",
        name: "Marketing Strategist",
        icon: "📢",
        description: "Marketing",
      },
      {
        id: "sales",
        name: "Sales Coach",
        icon: "📈",
        description: "Sales & Revenue",
      },
      {
        id: "hr",
        name: "HR Manager",
        icon: "👥",
        description: "Human Resources",
      },
    ],
  },
  {
    id: "helper",
    title: "🎬 Creator Helper",
    description: "Support for human content creators",
    ais: [
      {
        id: "helper",
        name: "Content Creator Helper",
        icon: "🎬",
        description: "Creator Support (FREE)",
      },
    ],
  },
  {
    id: "system",
    title: "⚙️ System AIs",
    description: "Platform health and administration",
    ais: [
      {
        id: "admin",
        name: "Admin Master",
        icon: "👑",
        description: "Administration",
      },
      {
        id: "health",
        name: "Health & Maintenance",
        icon: "🏥",
        description: "System Health",
      },
      {
        id: "safety",
        name: "Safety & Compliance",
        icon: "🛡️",
        description: "Safety",
      },
    ],
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

interface AICardProps {
  ai: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
  colors: any;
  onPress: (aiId: string) => void;
}

function AICard({ ai, colors, onPress }: AICardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.aiCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
      onPress={() => onPress(ai.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.aiIcon}>{ai.icon}</Text>
      <Text style={[styles.aiName, { color: colors.foreground }]}>
        {ai.name}
      </Text>
      <Text style={[styles.aiDescription, { color: colors.muted }]}>
        {ai.description}
      </Text>
    </TouchableOpacity>
  );
}

interface CategorySectionProps {
  category: {
    id: string;
    title: string;
    description: string;
    ais: {
      id: string;
      name: string;
      icon: string;
      description: string;
    }[];
  };
  colors: any;
  onAIPress: (aiId: string) => void;
}

function CategorySection({ category, colors, onAIPress }: CategorySectionProps) {
  return (
    <View style={styles.categorySection}>
      <Text style={[styles.categoryTitle, { color: colors.foreground }]}>
        {category.title}
      </Text>
      <Text
        style={[
          { fontSize: 12, color: colors.muted, marginBottom: 12 },
        ]}
      >
        {category.description}
      </Text>
      <View style={styles.aiGrid}>
        {category.ais.map((ai) => (
          <AICard
            key={ai.id}
            ai={ai}
            colors={colors}
            onPress={onAIPress}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AIMarketplaceDisplay() {
  const colors = useColors();

  const handleAIPress = (aiId: string) => {
    // Navigate to AI workspace
    console.log(`Opening AI workspace: ${aiId}`);
  };

  const totalAIs = AI_CATEGORIES.reduce((sum, cat) => sum + cat.ais.length, 0);
  const tier1Count = totalAIs - 1 - 3; // Exclude 1 helper and 3 system AIs
  const tier2Count = 1;
  const systemCount = 3;

  return (
    <ScreenContainer>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          UR AI Marketplace
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Access all {totalAIs} AI specialists
        </Text>
      </View>

      {/* STATS BAR */}
      <View
        style={[
          styles.statsBar,
          {
            borderTopColor: colors.border,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {tier1Count}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>
            Tier 1 AIs
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {tier2Count}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>
            Helper AI
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {systemCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>
            System AIs
          </Text>
        </View>
      </View>

      {/* CATEGORIES */}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {AI_CATEGORIES.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            colors={colors}
            onAIPress={handleAIPress}
          />
        ))}

        {/* FOOTER SPACING */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
