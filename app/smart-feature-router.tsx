/**
 * Smart Feature Router & UX Component
 * Intelligently routes users between mobile and web based on project complexity
 * Provides seamless transitions and helpful guidance
 */

import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageHeader } from "@/components/page-header";
import { DemoSection, DemoButton, DemoFeatureList } from "@/components/demo-section";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Project {
  id: string;
  name: string;
  type: "landscaping" | "construction";
  complexity: "simple" | "moderate" | "complex" | "enterprise";
  objectCount: number;
  estimatedCost: number;
  platform: "mobile" | "web" | "both";
  createdOn: "mobile" | "web";
}

interface FeatureRecommendation {
  feature: string;
  recommendedPlatform: "mobile" | "web" | "both";
  reason: string;
  complexity: "simple" | "moderate" | "complex";
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

const FEATURE_MATRIX: Record<string, FeatureRecommendation> = {
  photo_capture: {
    feature: "Photo Capture",
    recommendedPlatform: "mobile",
    reason: "Best on mobile with camera access",
    complexity: "simple",
  },
  quick_preview: {
    feature: "Quick 3D Preview",
    recommendedPlatform: "mobile",
    reason: "Quick visualization on the go",
    complexity: "simple",
  },
  add_objects: {
    feature: "Add Objects",
    recommendedPlatform: "both",
    reason: "Works on both platforms",
    complexity: "simple",
  },
  advanced_materials: {
    feature: "Advanced Materials",
    recommendedPlatform: "web",
    reason: "Requires detailed material library",
    complexity: "moderate",
  },
  terrain_sculpting: {
    feature: "Terrain Sculpting",
    recommendedPlatform: "web",
    reason: "Complex 3D manipulation",
    complexity: "complex",
  },
  lighting_control: {
    feature: "Lighting Control",
    recommendedPlatform: "web",
    reason: "Advanced lighting simulation",
    complexity: "complex",
  },
  high_res_render: {
    feature: "High-Res Rendering",
    recommendedPlatform: "web",
    reason: "Requires powerful GPU",
    complexity: "complex",
  },
  team_collab: {
    feature: "Team Collaboration",
    recommendedPlatform: "web",
    reason: "Better on larger screens",
    complexity: "moderate",
  },
  cost_estimation: {
    feature: "Cost Estimation",
    recommendedPlatform: "web",
    reason: "Detailed calculations",
    complexity: "moderate",
  },
  export_models: {
    feature: "Export 3D Models",
    recommendedPlatform: "web",
    reason: "Better file handling",
    complexity: "moderate",
  },
};

/**
 * Determine project complexity
 */
function getProjectComplexity(project: Project): "simple" | "moderate" | "complex" | "enterprise" {
  if (project.objectCount <= 5 && project.estimatedCost < 5000) return "simple";
  if (project.objectCount <= 20 && project.estimatedCost < 25000) return "moderate";
  if (project.objectCount <= 50 && project.estimatedCost < 100000) return "complex";
  return "enterprise";
}

/**
 * Get platform recommendation
 */
function getPlatformRecommendation(project: Project): "mobile" | "web" | "both" {
  const complexity = getProjectComplexity(project);

  if (complexity === "simple") return "mobile";
  if (complexity === "moderate") return "both";
  if (complexity === "complex" || complexity === "enterprise") return "web";

  return "both";
}

/**
 * Get recommended features for platform
 */
function getRecommendedFeatures(
  platform: "mobile" | "web"
): FeatureRecommendation[] {
  return Object.values(FEATURE_MATRIX).filter((f) => {
    if (platform === "mobile") return f.recommendedPlatform === "mobile" || f.recommendedPlatform === "both";
    return f.recommendedPlatform === "web" || f.recommendedPlatform === "both";
  });
}

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Complexity Indicator
 */
function ComplexityIndicator({ complexity }: { complexity: string }) {
  const colors = useColors();
  const complexityColors = {
    simple: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-900 dark:text-green-100" },
    moderate: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-900 dark:text-blue-100" },
    complex: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-900 dark:text-orange-100" },
    enterprise: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-900 dark:text-red-100" },
  };

  const style = complexityColors[complexity as keyof typeof complexityColors] || complexityColors.simple;

  return (
    <View className={cn("rounded-full px-3 py-1", style.bg)}>
      <Text className={cn("text-xs font-semibold", style.text)}>
        {complexity.charAt(0).toUpperCase() + complexity.slice(1)}
      </Text>
    </View>
  );
}

/**
 * Platform Recommendation Card
 */
function PlatformRecommendationCard({
  project,
  onNavigate,
}: {
  project: Project;
  onNavigate: (platform: "mobile" | "web") => void;
}) {
  const complexity = getProjectComplexity(project);
  const recommendation = getPlatformRecommendation(project);

  return (
    <DemoSection
      title="Platform Recommendation"
      description={`Based on project complexity: ${complexity}`}
      icon={recommendation === "web" ? "🌐" : "📱"}
      variant={recommendation === "web" ? "warning" : "success"}
    >
      <View className="gap-3 mb-4">
        <ComplexityIndicator complexity={complexity} />

        {recommendation === "web" && (
          <View className="gap-2">
            <Text className="text-sm text-foreground">
              This project is too complex for mobile. Switch to the web editor for:
            </Text>
            <DemoFeatureList
              features={[
                "Advanced material selection",
                "Terrain sculpting",
                "Lighting simulation",
                "High-resolution rendering",
                "Team collaboration",
              ]}
            />
          </View>
        )}

        {recommendation === "mobile" && (
          <View className="gap-2">
            <Text className="text-sm text-foreground">
              This is a simple project perfect for mobile:
            </Text>
            <DemoFeatureList
              features={[
                "Quick photo capture",
                "Real-time 3D preview",
                "Simple object placement",
                "AR visualization",
                "Easy sync to web",
              ]}
            />
          </View>
        )}

        {recommendation === "both" && (
          <View className="gap-2">
            <Text className="text-sm text-foreground">
              This project works great on both platforms:
            </Text>
            <DemoFeatureList
              features={[
                "Start on mobile with photo",
                "Quick preview on the go",
                "Finish on web for details",
                "Seamless sync between devices",
                "Scale as needed",
              ]}
            />
          </View>
        )}
      </View>

      <View className="flex-row gap-2">
        <DemoButton
          label={recommendation === "web" ? "🌐 Go to Web Editor" : "📱 Mobile Viewer"}
          onPress={() => onNavigate(recommendation === "web" ? "web" : "mobile")}
          variant="primary"
        />
        {recommendation !== "mobile" && (
          <DemoButton
            label="📱 Mobile"
            onPress={() => onNavigate("mobile")}
            variant="secondary"
          />
        )}
        {recommendation !== "web" && (
          <DemoButton
            label="🌐 Web"
            onPress={() => onNavigate("web")}
            variant="secondary"
          />
        )}
      </View>
    </DemoSection>
  );
}

/**
 * Feature Availability Matrix
 */
function FeatureAvailabilityMatrix({ project }: { project: Project }) {
  const mobileFeatures = getRecommendedFeatures("mobile");
  const webFeatures = getRecommendedFeatures("web");

  return (
    <DemoSection title="Feature Availability" icon="⚡">
      <View className="gap-4">
        <View>
          <Text className="text-sm font-bold text-foreground mb-2">📱 Mobile Features</Text>
          <View className="gap-2">
            {mobileFeatures.slice(0, 3).map((feature) => (
              <View key={feature.feature} className="flex-row items-start gap-2">
                <Text className="text-lg">✅</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{feature.feature}</Text>
                  <Text className="text-xs text-muted">{feature.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm font-bold text-foreground mb-2">🌐 Web Features</Text>
          <View className="gap-2">
            {webFeatures.slice(0, 3).map((feature) => (
              <View key={feature.feature} className="flex-row items-start gap-2">
                <Text className="text-lg">✨</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">{feature.feature}</Text>
                  <Text className="text-xs text-muted">{feature.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </DemoSection>
  );
}

/**
 * Sync Status & Guidance
 */
function SyncStatusGuidance({ project }: { project: Project }) {
  return (
    <DemoSection
      title="Seamless Sync"
      description="Your project stays in sync across all devices"
      icon="🔄"
      variant="info"
    >
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">1️⃣</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Start on Mobile</Text>
            <Text className="text-xs text-muted">Capture photo and create quick preview</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-lg">2️⃣</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Sync Automatically</Text>
            <Text className="text-xs text-muted">Changes saved to cloud instantly</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-lg">3️⃣</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Continue on Web</Text>
            <Text className="text-xs text-muted">Advanced editing with full feature set</Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-lg">4️⃣</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">Back to Mobile</Text>
            <Text className="text-xs text-muted">View updates anytime, anywhere</Text>
          </View>
        </View>
      </View>
    </DemoSection>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Smart Feature Router Screen
 */
export function SmartFeatureRouter() {
  const colors = useColors();
  const [mockProject] = useState<Project>({
    id: "proj-1",
    name: "Backyard Makeover",
    type: "landscaping",
    complexity: "moderate",
    objectCount: 12,
    estimatedCost: 18000,
    platform: "both",
    createdOn: "mobile",
  });

  const [activeTab, setActiveTab] = useState<"router" | "guide" | "faq">("router");

  const handleNavigate = (platform: "mobile" | "web") => {
    Alert.alert(
      `Navigate to ${platform === "web" ? "Web" : "Mobile"}`,
      `Switching to ${platform === "web" ? "Web 3D Editor" : "Mobile 3D Viewer"}...`
    );
  };

  return (
    <ScreenContainer>
      <PageHeader
        icon="🧭"
        title="Smart Feature Router"
        subtitle="Intelligent platform recommendations"
        category="system"
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
        {/* Tab Navigation */}
        <View className="flex-row gap-2 mb-4">
          {(["router", "guide", "faq"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg active:opacity-70",
                activeTab === tab ? "bg-primary" : "bg-surface border-2 border-border"
              )}
            >
              <Text
                className={cn(
                  "text-center font-semibold text-sm",
                  activeTab === tab ? "text-white" : "text-foreground"
                )}
              >
                {tab === "router"
                  ? "🧭 Router"
                  : tab === "guide"
                    ? "📖 Guide"
                    : "❓ FAQ"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Router Tab */}
        {activeTab === "router" && (
          <>
            <DemoSection
              title={mockProject.name}
              description={`${mockProject.type} project`}
              icon={mockProject.type === "landscaping" ? "🌳" : "🏗️"}
              variant="info"
            >
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-foreground">Objects:</Text>
                  <Text className="text-foreground font-semibold">{mockProject.objectCount}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-foreground">Est. Cost:</Text>
                  <Text className="text-foreground font-semibold">${(mockProject.estimatedCost / 1000).toFixed(1)}k</Text>
                </View>
              </View>
            </DemoSection>

            <PlatformRecommendationCard project={mockProject} onNavigate={handleNavigate} />

            <FeatureAvailabilityMatrix project={mockProject} />

            <SyncStatusGuidance project={mockProject} />
          </>
        )}

        {/* Guide Tab */}
        {activeTab === "guide" && (
          <>
            <DemoSection title="Platform Guide" icon="📖" variant="info">
              <DemoFeatureList
                features={[
                  "Mobile: Quick captures and previews",
                  "Web: Advanced editing and rendering",
                  "Both: Seamless sync between devices",
                  "Simple projects: Mobile is perfect",
                  "Complex projects: Web is recommended",
                ]}
              />
            </DemoSection>

            <DemoSection title="When to Use Mobile" icon="📱" variant="success">
              <DemoFeatureList
                features={[
                  "Capturing site photos",
                  "Quick 3D previews",
                  "Simple object placement",
                  "AR visualization",
                  "Projects under 5 objects",
                  "Budget under $5,000",
                ]}
              />
            </DemoSection>

            <DemoSection title="When to Use Web" icon="🌐" variant="warning">
              <DemoFeatureList
                features={[
                  "Advanced material selection",
                  "Terrain sculpting",
                  "Lighting simulation",
                  "High-resolution rendering",
                  "Team collaboration",
                  "Projects over 20 objects",
                  "Budget over $25,000",
                ]}
              />
            </DemoSection>
          </>
        )}

        {/* FAQ Tab */}
        {activeTab === "faq" && (
          <>
            <DemoSection title="Can I switch between mobile and web?" icon="❓">
              <Text className="text-sm text-foreground">
                Yes! Your project automatically syncs between devices. Start on mobile, continue on web, or vice versa.
              </Text>
            </DemoSection>

            <DemoSection title="Will I lose my work if I switch?" icon="❓">
              <Text className="text-sm text-foreground">
                No. All changes are automatically saved and synced to the cloud. You can safely switch platforms anytime.
              </Text>
            </DemoSection>

            <DemoSection title="What if there are conflicts?" icon="❓">
              <Text className="text-sm text-foreground">
                The system automatically resolves conflicts by keeping the most recent version. You can also manually
                choose which version to keep.
              </Text>
            </DemoSection>

            <DemoSection title="Can I work offline?" icon="❓">
              <Text className="text-sm text-foreground">
                Yes. Changes are queued locally and synced when you&apos;re back online. No work is ever lost.
              </Text>
            </DemoSection>

            <DemoSection title="How fast is the sync?" icon="❓">
              <Text className="text-sm text-foreground">
                Most changes sync within seconds. Large renders may take longer depending on your internet speed.
              </Text>
            </DemoSection>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default SmartFeatureRouter;
