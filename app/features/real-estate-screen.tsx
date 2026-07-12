/**
 * Real Estate Master AI Screen
 * Isolated page for Real Estate specialist
 */

import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageHeader } from "@/components/page-header";
import { DemoSection, DemoButton, DemoFeatureList, DemoStats } from "@/components/demo-section";

export function RealEstateMasterScreen() {
  const [activeTab, setActiveTab] = useState<"overview" | "features" | "demo">("overview");
  const [demoData, setDemoData] = useState({
    propertiesAnalyzed: 247,
    leadsQualified: 89,
    dealsClosing: 12,
  });

  return (
    <ScreenContainer>
      <PageHeader
        icon="🏢"
        title="Real Estate Master"
        subtitle="Property analysis and lead generation specialist"
        category="ai_agent"
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Stats */}
        <DemoStats
          stats={[
            { label: "Properties", value: demoData.propertiesAnalyzed, icon: "🏠" },
            { label: "Leads", value: demoData.leadsQualified, icon: "👥" },
            { label: "Deals", value: demoData.dealsClosing, icon: "💼" },
          ]}
        />

        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <DemoSection
              title="About Real Estate Master"
              description="Your personal real estate specialist AI that analyzes properties, qualifies leads, and provides market insights."
              icon="📊"
              variant="info"
            >
              <Text className="text-foreground text-sm leading-relaxed">
                Real Estate Master uses advanced algorithms to analyze property data, identify
                investment opportunities, and help you make informed decisions. Integrated with
                Zillow and other platforms for comprehensive market data.
              </Text>
            </DemoSection>

            <DemoSection title="Key Capabilities" icon="⚡">
              <DemoFeatureList
                features={[
                  "Property valuation and market analysis",
                  "Lead identification and qualification",
                  "Market trends and forecasting",
                  "Zillow integration for real-time data",
                  "Investment ROI calculations",
                  "Neighborhood analysis and demographics",
                  "Comparable sales analysis",
                  "Risk assessment",
                ]}
              />
            </DemoSection>
          </>
        )}

        {/* Features */}
        {activeTab === "features" && (
          <>
            <DemoSection
              title="Property Analysis"
              description="Comprehensive analysis of residential and commercial properties"
              icon="🔍"
            >
              <DemoFeatureList
                features={[
                  "Automated valuation models",
                  "Property condition assessment",
                  "Market comparison analysis",
                  "Price history tracking",
                  "Tax and lien information",
                ]}
              />
            </DemoSection>

            <DemoSection
              title="Lead Generation"
              description="Identify and qualify potential buyers and sellers"
              icon="🎯"
            >
              <DemoFeatureList
                features={[
                  "Buyer profile matching",
                  "Seller lead identification",
                  "Lead scoring and ranking",
                  "Contact information retrieval",
                  "Follow-up automation",
                ]}
              />
            </DemoSection>

            <DemoSection
              title="Market Intelligence"
              description="Real-time market data and trends"
              icon="📈"
            >
              <DemoFeatureList
                features={[
                  "Price trends analysis",
                  "Market forecasting",
                  "Neighborhood insights",
                  "Demographic data",
                  "School and amenities info",
                ]}
              />
            </DemoSection>
          </>
        )}

        {/* Demo */}
        {activeTab === "demo" && (
          <>
            <DemoSection
              title="Try Real Estate Master"
              description="Interact with the AI to analyze properties and generate leads"
              icon="🚀"
              variant="success"
            >
              <DemoButton
                label="Analyze Property"
                onPress={() => {
                  setDemoData((prev) => ({
                    ...prev,
                    propertiesAnalyzed: prev.propertiesAnalyzed + 1,
                  }));
                }}
              />
              <DemoButton
                label="Generate Leads"
                onPress={() => {
                  setDemoData((prev) => ({
                    ...prev,
                    leadsQualified: prev.leadsQualified + 1,
                  }));
                }}
              />
              <DemoButton
                label="View Market Trends"
                onPress={() => {
                  setDemoData((prev) => ({
                    ...prev,
                    dealsClosing: prev.dealsClosing + 1,
                  }));
                }}
              />
            </DemoSection>

            <DemoSection
              title="Integration Status"
              description="Connected to Zillow and real estate data sources"
              icon="✅"
              variant="success"
            >
              <DemoFeatureList
                features={[
                  "Zillow API connected",
                  "Real estate database synced",
                  "Market data updated hourly",
                  "Lead pipeline active",
                ]}
              />
            </DemoSection>
          </>
        )}
      </ScrollView>

      {/* Tab Navigation */}
      <View className="flex-row gap-2 mt-4 pt-4 border-t border-border">
        {(["overview", "features", "demo"] as const).map((tab) => (
          <DemoButton
            key={tab}
            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
            variant={activeTab === tab ? "primary" : "secondary"}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>
    </ScreenContainer>
  );
}

export default RealEstateMasterScreen;
