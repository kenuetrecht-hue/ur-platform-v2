/**
 * Web 3D Editor Component
 * Advanced 3D editor for complex landscaping and construction projects
 * Uses Three.js for professional rendering and full feature set
 */

import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageHeader } from "@/components/page-header";
import { DemoSection, DemoButton, DemoFeatureList, DemoStats } from "@/components/demo-section";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EditorState {
  projectName: string;
  projectType: "landscaping" | "construction";
  objectCount: number;
  estimatedCost: number;
  renderQuality: "low" | "medium" | "high" | "ultra";
  isRendering: boolean;
  collaborators: number;
}

interface EditorTool {
  id: string;
  name: string;
  icon: string;
  category: "object" | "tool" | "view" | "export";
  description: string;
}

// ============================================================================
// TOOLS DATA
// ============================================================================

const EDITOR_TOOLS: EditorTool[] = [
  // Object Tools
  {
    id: "add-tree",
    name: "Add Tree",
    icon: "🌳",
    category: "object",
    description: "Add trees to your design",
  },
  {
    id: "add-shrub",
    name: "Add Shrub",
    icon: "🌿",
    category: "object",
    description: "Add shrubs and bushes",
  },
  {
    id: "add-patio",
    name: "Add Patio",
    icon: "🪨",
    category: "object",
    description: "Add hardscape features",
  },
  {
    id: "add-water",
    name: "Add Water Feature",
    icon: "💧",
    category: "object",
    description: "Add fountains and ponds",
  },
  {
    id: "add-structure",
    name: "Add Structure",
    icon: "🏗️",
    category: "object",
    description: "Add buildings and structures",
  },
  {
    id: "add-lighting",
    name: "Add Lighting",
    icon: "💡",
    category: "object",
    description: "Add landscape lighting",
  },

  // Editing Tools
  {
    id: "select",
    name: "Select",
    icon: "👆",
    category: "tool",
    description: "Select objects to edit",
  },
  {
    id: "move",
    name: "Move",
    icon: "↔️",
    category: "tool",
    description: "Move objects in 3D space",
  },
  {
    id: "rotate",
    name: "Rotate",
    icon: "🔄",
    category: "tool",
    description: "Rotate objects",
  },
  {
    id: "scale",
    name: "Scale",
    icon: "📏",
    category: "tool",
    description: "Resize objects",
  },
  {
    id: "material",
    name: "Materials",
    icon: "🎨",
    category: "tool",
    description: "Change materials and colors",
  },

  // View Tools
  {
    id: "top-view",
    name: "Top View",
    icon: "⬆️",
    category: "view",
    description: "View from above",
  },
  {
    id: "front-view",
    name: "Front View",
    icon: "👁️",
    category: "view",
    description: "Front perspective",
  },
  {
    id: "isometric",
    name: "Isometric",
    icon: "📐",
    category: "view",
    description: "Isometric view",
  },
  {
    id: "ar-view",
    name: "AR Preview",
    icon: "🔍",
    category: "view",
    description: "Augmented reality preview",
  },

  // Export Tools
  {
    id: "render",
    name: "High-Res Render",
    icon: "🎬",
    category: "export",
    description: "Generate professional render",
  },
  {
    id: "export-3d",
    name: "Export 3D",
    icon: "📦",
    category: "export",
    description: "Export as 3D model",
  },
  {
    id: "export-pdf",
    name: "Export PDF",
    icon: "📄",
    category: "export",
    description: "Export plans and specs",
  },
  {
    id: "share",
    name: "Share Project",
    icon: "🔗",
    category: "export",
    description: "Share with team or clients",
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * Tool Palette Component
 */
function ToolPalette({
  tools,
  onSelectTool,
}: {
  tools: EditorTool[];
  onSelectTool: (tool: EditorTool) => void;
}) {
  const categories = ["object", "tool", "view", "export"] as const;
  const categoryLabels = {
    object: "Objects",
    tool: "Edit",
    view: "View",
    export: "Export",
  };

  return (
    <View className="mb-4">
      {categories.map((category) => {
        const categoryTools = tools.filter((t) => t.category === category);
        if (categoryTools.length === 0) return null;

        return (
          <View key={category} className="mb-4">
            <Text className="text-sm font-bold text-foreground mb-2">
              {categoryLabels[category]}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categoryTools.map((tool) => (
                <Pressable
                  key={tool.id}
                  onPress={() => onSelectTool(tool)}
                  className="bg-surface border-2 border-border rounded-lg p-3 active:opacity-70 flex-basis-[calc(25%-8px)]"
                >
                  <Text className="text-2xl text-center mb-1">{tool.icon}</Text>
                  <Text className="text-xs text-foreground text-center">{tool.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Properties Panel Component
 */
function PropertiesPanel({
  selectedTool,
}: {
  selectedTool: EditorTool | null;
}) {
  if (!selectedTool) {
    return (
      <DemoSection title="Properties" description="Select a tool or object to edit" icon="⚙️">
        <Text className="text-sm text-muted">No selection</Text>
      </DemoSection>
    );
  }

  return (
    <DemoSection title={selectedTool.name} description={selectedTool.description} icon={selectedTool.icon}>
      <View className="gap-3">
        {selectedTool.category === "object" && (
          <>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">Material</Text>
              <View className="flex-row gap-2">
                {["Natural", "Synthetic", "Stone", "Wood"].map((mat) => (
                  <Pressable
                    key={mat}
                    className="flex-1 bg-foreground/10 rounded p-2 active:opacity-70"
                  >
                    <Text className="text-xs text-center text-foreground">{mat}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">Color</Text>
              <View className="flex-row gap-2">
                {["#228b22", "#2d5016", "#8b4513", "#a0826d"].map((color) => (
                  <Pressable
                    key={color}
                    className="w-10 h-10 rounded border-2 border-border active:opacity-70"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </View>
            </View>
          </>
        )}
        {selectedTool.category === "tool" && (
          <>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">Precision</Text>
              <View className="flex-row gap-2">
                {["1cm", "5cm", "10cm", "50cm"].map((precision) => (
                  <Pressable
                    key={precision}
                    className="flex-1 bg-foreground/10 rounded p-2 active:opacity-70"
                  >
                    <Text className="text-xs text-center text-foreground">{precision}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
        {selectedTool.category === "view" && (
          <>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">Zoom Level</Text>
              <View className="flex-row gap-2">
                {["25%", "50%", "100%", "200%"].map((zoom) => (
                  <Pressable
                    key={zoom}
                    className="flex-1 bg-foreground/10 rounded p-2 active:opacity-70"
                  >
                    <Text className="text-xs text-center text-foreground">{zoom}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
        {selectedTool.category === "export" && (
          <>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1">Resolution</Text>
              <View className="flex-row gap-2">
                {["1080p", "2K", "4K", "8K"].map((res) => (
                  <Pressable
                    key={res}
                    className="flex-1 bg-foreground/10 rounded p-2 active:opacity-70"
                  >
                    <Text className="text-xs text-center text-foreground">{res}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </View>
    </DemoSection>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Web 3D Editor Screen
 */
export function Web3DEditor() {
  const colors = useColors();
  const [editorState, setEditorState] = useState<EditorState>({
    projectName: "Backyard Makeover Pro",
    projectType: "landscaping",
    objectCount: 24,
    estimatedCost: 15000,
    renderQuality: "ultra",
    isRendering: false,
    collaborators: 2,
  });
  const [selectedTool, setSelectedTool] = useState<EditorTool | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "features" | "collab">("editor");

  const handleSelectTool = (tool: EditorTool) => {
    setSelectedTool(tool);
  };

  return (
    <ScreenContainer>
      <PageHeader
        icon="🌐"
        title="Web 3D Editor"
        subtitle="Professional tools for complex projects"
        category="system"
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
        {/* Project Stats */}
        <DemoStats
          stats={[
            { label: "Objects", value: editorState.objectCount, icon: "🏗️" },
            { label: "Est. Cost", value: `$${(editorState.estimatedCost / 1000).toFixed(1)}k`, icon: "💰" },
            { label: "Team", value: editorState.collaborators, icon: "👥" },
            { label: "Quality", value: editorState.renderQuality.toUpperCase(), icon: "✨" },
          ]}
        />

        {/* Tab Navigation */}
        <View className="flex-row gap-2 mb-4">
          {(["editor", "features", "collab"] as const).map((tab) => (
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
                {tab === "editor"
                  ? "🎨 Editor"
                  : tab === "features"
                    ? "⚡ Features"
                    : "👥 Collab"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Editor Tab */}
        {activeTab === "editor" && (
          <>
            {/* 3D Canvas Placeholder */}
            <View
              className="w-full h-80 rounded-lg border-2 border-border bg-surface mb-4 flex items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex items-center gap-4">
                <Text className="text-6xl">🎨</Text>
                <View className="items-center">
                  <Text className="text-foreground font-semibold">{editorState.projectName}</Text>
                  <Text className="text-muted text-sm">Three.js 3D Editor</Text>
                  <Text className="text-xs text-muted mt-1">
                    {editorState.renderQuality.toUpperCase()} Quality Rendering
                  </Text>
                </View>
              </View>
            </View>

            {/* Tool Palette */}
            <ToolPalette tools={EDITOR_TOOLS} onSelectTool={handleSelectTool} />

            {/* Properties Panel */}
            <PropertiesPanel selectedTool={selectedTool} />

            {/* Rendering Options */}
            <DemoSection title="Rendering" icon="🎬" variant="success">
              <DemoButton
                label={editorState.isRendering ? "⏳ Rendering..." : "🎬 Generate Render"}
                onPress={() => {
                  setEditorState((prev) => ({ ...prev, isRendering: !prev.isRendering }));
                }}
                variant={editorState.isRendering ? "secondary" : "primary"}
              />
              <Text className="text-xs text-muted mt-2">
                High-resolution professional render for presentations and printing
              </Text>
            </DemoSection>
          </>
        )}

        {/* Features Tab */}
        {activeTab === "features" && (
          <>
            <DemoSection title="Advanced Tools" icon="⚡" variant="info">
              <DemoFeatureList
                features={[
                  "Unlimited object placement",
                  "Advanced material library",
                  "Real-time physics simulation",
                  "Lighting and shadow control",
                  "Terrain sculpting",
                  "Vegetation growth simulation",
                ]}
              />
            </DemoSection>

            <DemoSection title="Rendering Capabilities" icon="🎬">
              <DemoFeatureList
                features={[
                  "8K ultra-high resolution",
                  "Photorealistic rendering",
                  "Real-time ray tracing",
                  "Seasonal variations",
                  "Time-of-day simulation",
                  "Weather effects",
                ]}
              />
            </DemoSection>

            <DemoSection title="Project Management" icon="📁">
              <DemoFeatureList
                features={[
                  "Version control & history",
                  "Auto-save every 5 minutes",
                  "Project templates",
                  "Cost estimation",
                  "Material lists",
                  "Execution timelines",
                ]}
              />
            </DemoSection>

            <DemoSection title="Export Options" icon="📦">
              <DemoFeatureList
                features={[
                  "3D models (GLTF, GLB, OBJ, FBX)",
                  "High-res images (PNG, JPEG, TIFF)",
                  "PDF plans and specifications",
                  "Construction documents",
                  "Bill of materials",
                  "Cost breakdown",
                ]}
              />
            </DemoSection>
          </>
        )}

        {/* Collaboration Tab */}
        {activeTab === "collab" && (
          <>
            <DemoSection title="Team Collaboration" icon="👥" variant="success">
              <DemoFeatureList
                features={[
                  "Real-time multi-user editing",
                  "Comments and annotations",
                  "Version control",
                  "Permission management",
                  "Activity tracking",
                  "Client review links",
                ]}
              />
            </DemoSection>

            <DemoSection title="Current Collaborators" icon="👨‍💼">
              <View className="gap-2">
                {[
                  { name: "You", role: "Owner", icon: "👤" },
                  { name: "Sarah Johnson", role: "Landscape Architect", icon: "👩‍💼" },
                  { name: "Mike Chen", role: "Contractor", icon: "👨‍🔧" },
                ].map((collab, i) => (
                  <View key={i} className="flex-row items-center justify-between bg-surface rounded p-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-2xl">{collab.icon}</Text>
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{collab.name}</Text>
                        <Text className="text-xs text-muted">{collab.role}</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-success">● Online</Text>
                  </View>
                ))}
              </View>
            </DemoSection>

            <DemoSection title="Sharing" icon="🔗">
              <DemoButton label="📋 Copy Share Link" onPress={() => {}} variant="primary" />
              <DemoButton label="📧 Invite by Email" onPress={() => {}} variant="secondary" />
              <DemoButton label="🔒 Manage Permissions" onPress={() => {}} variant="secondary" />
            </DemoSection>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default Web3DEditor;
