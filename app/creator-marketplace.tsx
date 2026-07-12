/**
 * Creator Marketplace
 * Marketplace for content creators to discover and activate their free Helper AI
 * Shows all available AI assistants and tools for creators
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Pressable,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { cn } from "@/lib/utils";
import { useColors } from "@/hooks/use-colors";

// ============================================================================
// TYPES
// ============================================================================

interface AIAssistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "helper" | "specialist" | "tool";
  price: "free" | "premium" | "paid";
  rating: number;
  reviews: number;
  features: string[];
  isActive: boolean;
}

// ============================================================================
// CREATOR MARKETPLACE COMPONENT
// ============================================================================

export default function CreatorMarketplace() {
  const colors = useColors();
  const [selectedAI, setSelectedAI] = useState<AIAssistant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "helper" | "specialist" | "tool">("all");

  // Mock data for AI assistants
  const aiAssistants: AIAssistant[] = [
    {
      id: "helper-1",
      name: "Content Helper AI",
      description: "Free AI assistant for all creators. Helps with posting, engagement, and content management 24/7",
      icon: "🤖",
      category: "helper",
      price: "free",
      rating: 4.8,
      reviews: 2341,
      features: [
        "24/7 content posting",
        "Follower engagement",
        "Content scheduling",
        "Auto-responses",
        "Analytics",
      ],
      isActive: true,
    },
    {
      id: "specialist-1",
      name: "Real Estate Master",
      description: "AI specialist for real estate professionals with lead generation and market analysis",
      icon: "🏠",
      category: "specialist",
      price: "free",
      rating: 4.9,
      reviews: 1203,
      features: [
        "Lead generation",
        "Market analysis",
        "Property valuation",
        "Listing optimization",
        "Client management",
      ],
      isActive: false,
    },
    {
      id: "specialist-2",
      name: "Landscaping Master",
      description: "AI for landscaping projects with 3D design and photo-to-3D visualization",
      icon: "🌳",
      category: "specialist",
      price: "free",
      rating: 4.7,
      reviews: 856,
      features: [
        "Photo-to-3D design",
        "Budget estimation",
        "Material lists",
        "Execution planning",
        "Equipment integration",
      ],
      isActive: false,
    },
    {
      id: "specialist-3",
      name: "Coder AI",
      description: "AI programmer that reads your code and helps with development",
      icon: "💻",
      category: "specialist",
      price: "free",
      rating: 4.9,
      reviews: 3421,
      features: [
        "Code analysis",
        "Bug fixing",
        "Feature development",
        "Documentation",
        "Code review",
      ],
      isActive: false,
    },
    {
      id: "tool-1",
      name: "Voice Interaction",
      description: "Talk to your AI assistant with natural voice conversation",
      icon: "🎤",
      category: "tool",
      price: "free",
      rating: 4.6,
      reviews: 1876,
      features: [
        "Speech-to-text",
        "Text-to-speech",
        "Voice commands",
        "Real-time transcription",
        "Sentiment analysis",
      ],
      isActive: false,
    },
    {
      id: "tool-2",
      name: "3D Visualization",
      description: "Create and preview 3D designs for your projects",
      icon: "🎨",
      category: "tool",
      price: "free",
      rating: 4.7,
      reviews: 1234,
      features: [
        "Real-time 3D preview",
        "Mobile AR support",
        "Web editor",
        "Export formats",
        "Collaboration",
      ],
      isActive: false,
    },
  ];

  const filteredAssistants =
    activeTab === "all"
      ? aiAssistants
      : aiAssistants.filter((ai) => ai.category === activeTab);

  const handleActivateAI = (ai: AIAssistant) => {
    // Simulate activation
    console.log(`Activated ${ai.name}`);
    setShowModal(false);
  };

  // ============================================================================
  // RENDER SECTIONS
  // ============================================================================

  const renderAICard = (ai: AIAssistant) => (
    <Pressable
      key={ai.id}
      onPress={() => {
        setSelectedAI(ai);
        setShowModal(true);
      }}
      className="bg-surface rounded-lg p-4 mb-3 border border-border"
    >
      <View className="flex-row gap-3 items-start">
        <Text className="text-4xl">{ai.icon}</Text>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">
                {ai.name}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-yellow-500">★</Text>
                <Text className="text-sm text-muted">
                  {ai.rating} ({ai.reviews} reviews)
                </Text>
              </View>
            </View>
            <View
              className={cn(
                "px-3 py-1 rounded-full",
                ai.price === "free" ? "bg-success" : "bg-primary"
              )}
            >
              <Text className="text-white text-xs font-semibold">
                {ai.price.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text className="text-sm text-muted mt-2">{ai.description}</Text>

          {ai.isActive && (
            <View className="bg-success bg-opacity-10 border border-success rounded-lg p-2 mt-2">
              <Text className="text-success text-xs font-semibold">
                ✓ ACTIVE
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1 flex-col">
        {/* Header */}
        <View className="border-b border-border p-4">
          <Text className="text-2xl font-bold text-foreground">
            Creator Marketplace
          </Text>
          <Text className="text-muted text-sm mt-1">
            Discover free AI tools to help you create and engage
          </Text>
        </View>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-b border-border"
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "helper", label: "Helpers" },
              { key: "specialist", label: "Specialists" },
              { key: "tool", label: "Tools" },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={cn(
                "py-3 px-4 border-b-2 mr-2",
                activeTab === tab.key
                  ? "border-primary"
                  : "border-transparent"
              )}
            >
              <Text
                className={cn(
                  "font-semibold",
                  activeTab === tab.key ? "text-primary" : "text-muted"
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* AI Assistants List */}
        <ScrollView className="flex-1 p-4">
          {filteredAssistants.map((ai) => renderAICard(ai))}
        </ScrollView>

        {/* Detail Modal */}
        <Modal
          visible={showModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowModal(false)}
        >
          <View className="flex-1 bg-black bg-opacity-50 justify-end">
            <View className="bg-background rounded-t-3xl p-6 max-h-4/5">
              <ScrollView>
                {selectedAI && (
                  <>
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="flex-row gap-3 items-start flex-1">
                        <Text className="text-5xl">{selectedAI.icon}</Text>
                        <View className="flex-1">
                          <Text className="text-2xl font-bold text-foreground">
                            {selectedAI.name}
                          </Text>
                          <View className="flex-row items-center gap-2 mt-1">
                            <Text className="text-yellow-500">★</Text>
                            <Text className="text-sm text-muted">
                              {selectedAI.rating} ({selectedAI.reviews} reviews)
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setShowModal(false)}>
                        <Text className="text-2xl text-muted">✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <Text className="text-muted mb-4">
                      {selectedAI.description}
                    </Text>

                    {/* Features */}
                    <View className="mb-6">
                      <Text className="text-lg font-bold text-foreground mb-3">
                        Features
                      </Text>
                      {selectedAI.features.map((feature, idx) => (
                        <View key={idx} className="flex-row items-center gap-2 mb-2">
                          <Text className="text-success">✓</Text>
                          <Text className="text-foreground">{feature}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Price Info */}
                    <View
                      className={cn(
                        "rounded-lg p-4 mb-6",
                        selectedAI.price === "free"
                          ? "bg-success bg-opacity-10 border border-success"
                          : "bg-primary bg-opacity-10 border border-primary"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-bold text-lg",
                          selectedAI.price === "free"
                            ? "text-success"
                            : "text-primary"
                        )}
                      >
                        {selectedAI.price === "free"
                          ? "✓ FREE FOR ALL CREATORS"
                          : "Premium Feature"}
                      </Text>
                      {selectedAI.price === "free" && (
                        <Text className="text-muted text-sm mt-1">
                          No cost. Included with your creator account.
                        </Text>
                      )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      onPress={() => handleActivateAI(selectedAI)}
                      className={cn(
                        "py-4 rounded-lg",
                        selectedAI.isActive ? "bg-success" : "bg-primary"
                      )}
                    >
                      <Text className="text-background font-bold text-center text-lg">
                        {selectedAI.isActive
                          ? "✓ Active"
                          : "Activate Now"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}
