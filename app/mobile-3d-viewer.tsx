/**
 * Mobile 3D Viewer Component
 * Real-time 3D preview for landscaping/construction projects on mobile
 * Supports photo capture, AR preview, and quick edits
 */

import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { PageHeader } from "@/components/page-header";
import { DemoSection, DemoButton, DemoFeatureList } from "@/components/demo-section";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Project3D {
  id: string;
  name: string;
  type: "landscaping" | "construction";
  photoUri?: string;
  objects: Object3D[];
  camera: CameraState;
  lighting: LightingState;
  createdAt: Date;
  updatedAt: Date;
  syncedToWeb: boolean;
}

interface Object3D {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  material: string;
  metadata: Record<string, any>;
}

interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  zoom: number;
}

interface LightingState {
  ambient: number;
  directional: { x: number; y: number; z: number };
  intensity: number;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PROJECTS: Project3D[] = [
  {
    id: "proj-1",
    name: "Backyard Makeover",
    type: "landscaping",
    objects: [
      {
        id: "obj-1",
        type: "grass",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 10, y: 1, z: 10 },
        color: "#2d5016",
        material: "grass",
        metadata: { area: 100 },
      },
      {
        id: "obj-2",
        type: "tree",
        position: { x: 3, y: 0, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 3, z: 1 },
        color: "#228b22",
        material: "wood",
        metadata: { species: "oak", height: 15 },
      },
      {
        id: "obj-3",
        type: "patio",
        position: { x: -3, y: 0, z: -3 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 4, y: 0.2, z: 4 },
        color: "#a0826d",
        material: "stone",
        metadata: { area: 16 },
      },
    ],
    camera: {
      position: { x: 5, y: 8, z: 5 },
      target: { x: 0, y: 0, z: 0 },
      fov: 75,
      zoom: 1,
    },
    lighting: {
      ambient: 0.6,
      directional: { x: 1, y: 1, z: 1 },
      intensity: 1,
    },
    createdAt: new Date("2026-05-20"),
    updatedAt: new Date("2026-05-31"),
    syncedToWeb: false,
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * 3D Canvas Placeholder
 * In production, this would use Babylon.js for mobile rendering
 */
function Canvas3D({
  project,
  isLoading,
}: {
  project: Project3D;
  isLoading: boolean;
}) {
  const colors = useColors();

  return (
    <View
      className="w-full h-64 rounded-lg border-2 border-border bg-surface mb-4 flex items-center justify-center"
      style={{ backgroundColor: colors.surface }}
    >
      {isLoading ? (
        <View className="flex items-center gap-2">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-muted text-sm">Loading 3D preview...</Text>
        </View>
      ) : (
        <View className="flex items-center gap-4">
          <Text className="text-4xl">🏗️</Text>
          <View className="items-center">
            <Text className="text-foreground font-semibold">{project.name}</Text>
            <Text className="text-muted text-sm">{project.objects.length} objects</Text>
            <Text className="text-xs text-muted mt-1">
              Babylon.js 3D Preview (Mobile Optimized)
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Object List Component
 */
function ObjectList({
  objects,
  onSelectObject,
}: {
  objects: Object3D[];
  onSelectObject: (obj: Object3D) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-lg font-bold text-foreground mb-2">Objects in Scene</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
        {objects.map((obj) => (
          <Pressable
            key={obj.id}
            onPress={() => onSelectObject(obj)}
            className="bg-surface border-2 border-border rounded-lg p-3 min-w-24 active:opacity-70"
          >
            <Text className="text-2xl text-center mb-1">
              {obj.type === "grass"
                ? "🌱"
                : obj.type === "tree"
                  ? "🌳"
                  : obj.type === "patio"
                    ? "🪨"
                    : "🏗️"}
            </Text>
            <Text className="text-xs text-foreground text-center capitalize">{obj.type}</Text>
            <Text className="text-xs text-muted text-center">{obj.metadata.area || "—"}m²</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Quick Actions Component
 */
function QuickActions({
  onAddObject,
  onRotate,
  onZoom,
  onCapture,
}: {
  onAddObject: () => void;
  onRotate: () => void;
  onZoom: () => void;
  onCapture: () => void;
}) {
  return (
    <View className="grid grid-cols-2 gap-2 mb-4">
      <DemoButton label="📷 Capture Photo" onPress={onCapture} variant="primary" />
      <DemoButton label="➕ Add Object" onPress={onAddObject} variant="secondary" />
      <DemoButton label="🔄 Rotate" onPress={onRotate} variant="secondary" />
      <DemoButton label="🔍 Zoom" onPress={onZoom} variant="secondary" />
    </View>
  );
}

/**
 * Sync Status Component
 */
function SyncStatus({ project }: { project: Project3D }) {
  const colors = useColors();

  return (
    <View
      className={cn(
        "rounded-lg p-3 mb-4 border-2",
        project.syncedToWeb
          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
      )}
    >
      <View className="flex-row items-center gap-2">
        <Text className="text-lg">{project.syncedToWeb ? "✅" : "⏳"}</Text>
        <View className="flex-1">
          <Text
            className={cn(
              "font-semibold text-sm",
              project.syncedToWeb ? "text-green-900 dark:text-green-100" : "text-yellow-900 dark:text-yellow-100"
            )}
          >
            {project.syncedToWeb ? "Synced to Web" : "Not Synced"}
          </Text>
          <Text
            className={cn(
              "text-xs",
              project.syncedToWeb ? "text-green-800 dark:text-green-200" : "text-yellow-800 dark:text-yellow-200"
            )}
          >
            {project.syncedToWeb
              ? "Open on web for advanced editing"
              : "Tap to sync and continue on web"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Mobile 3D Viewer Screen
 */
export function Mobile3DViewer() {
  const colors = useColors();
  const [projects, setProjects] = useState<Project3D[]>(MOCK_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<Project3D | null>(projects[0] || null);
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"viewer" | "projects" | "guide">("viewer");

  const handleAddObject = () => {
    Alert.alert("Add Object", "Select object type:", [
      {
        text: "Tree",
        onPress: () => {
          if (selectedProject) {
            const newObj: Object3D = {
              id: `obj-${Date.now()}`,
              type: "tree",
              position: { x: Math.random() * 5, y: 0, z: Math.random() * 5 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 2, z: 1 },
              color: "#228b22",
              material: "wood",
              metadata: { species: "oak", height: 15 },
            };
            const updated = {
              ...selectedProject,
              objects: [...selectedProject.objects, newObj],
              updatedAt: new Date(),
            };
            setSelectedProject(updated);
            setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
          }
        },
      },
      {
        text: "Shrub",
        onPress: () => {
          Alert.alert("Added shrub to scene");
        },
      },
      {
        text: "Flower Bed",
        onPress: () => {
          Alert.alert("Added flower bed to scene");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCapture = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert("Photo Captured", "Your yard photo has been captured and added to the project.");
    }, 1500);
  };

  const handleSyncToWeb = () => {
    if (selectedProject) {
      const updated = {
        ...selectedProject,
        syncedToWeb: true,
        updatedAt: new Date(),
      };
      setSelectedProject(updated);
      setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
      Alert.alert(
        "Synced to Web",
        "Your project has been synced. Open the web app for advanced editing and complex features."
      );
    }
  };

  return (
    <ScreenContainer>
      <PageHeader
        icon="📱"
        title="Mobile 3D Viewer"
        subtitle="Quick preview and simple edits on the go"
        category="system"
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-4">
        {/* Tab Navigation */}
        <View className="flex-row gap-2 mb-4">
          {(["viewer", "projects", "guide"] as const).map((tab) => (
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
                {tab === "viewer"
                  ? "🎬 Viewer"
                  : tab === "projects"
                    ? "📁 Projects"
                    : "📖 Guide"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Viewer Tab */}
        {activeTab === "viewer" && selectedProject && (
          <>
            <DemoSection
              title={selectedProject.name}
              description={`${selectedProject.type === "landscaping" ? "🌳" : "🏗️"} ${selectedProject.type} project`}
              variant="info"
            >
              <Text className="text-xs text-muted">
                Last updated: {selectedProject.updatedAt.toLocaleDateString()}
              </Text>
            </DemoSection>

            {/* 3D Canvas */}
            <Canvas3D project={selectedProject} isLoading={isLoading} />

            {/* Sync Status */}
            <SyncStatus project={selectedProject} />

            {/* Quick Actions */}
            <QuickActions
              onAddObject={handleAddObject}
              onRotate={() => Alert.alert("Rotate", "Rotate the 3D view with two fingers")}
              onZoom={() => Alert.alert("Zoom", "Pinch to zoom in/out")}
              onCapture={handleCapture}
            />

            {/* Object List */}
            <ObjectList objects={selectedProject.objects} onSelectObject={setSelectedObject} />

            {/* Selected Object Details */}
            {selectedObject && (
              <DemoSection title="Object Properties" icon="⚙️" variant="success">
                <View className="gap-2">
                  <View className="flex-row justify-between">
                    <Text className="text-foreground">Type:</Text>
                    <Text className="text-foreground font-semibold capitalize">{selectedObject.type}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-foreground">Position:</Text>
                    <Text className="text-foreground font-semibold">
                      ({selectedObject.position.x.toFixed(1)}, {selectedObject.position.z.toFixed(1)})
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-foreground">Material:</Text>
                    <Text className="text-foreground font-semibold capitalize">{selectedObject.material}</Text>
                  </View>
                </View>
              </DemoSection>
            )}

            {/* Web Editor Button */}
            <DemoSection
              title="Advanced Editing"
              description="For complex projects and advanced features"
              icon="🌐"
              variant="warning"
            >
              <DemoButton
                label="Open in Web Editor"
                onPress={handleSyncToWeb}
                variant="primary"
              />
              <Text className="text-xs text-muted mt-2">
                The web editor provides advanced tools for complex landscaping and construction projects.
              </Text>
            </DemoSection>
          </>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <>
            <Text className="text-lg font-bold text-foreground mb-3">Your Projects</Text>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  setSelectedProject(project);
                  setActiveTab("viewer");
                }}
                className="bg-surface border-2 border-border rounded-lg p-4 mb-3 active:opacity-70"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-foreground">{project.name}</Text>
                    <Text className="text-sm text-muted capitalize">{project.type}</Text>
                  </View>
                  <Text className="text-2xl">
                    {project.type === "landscaping" ? "🌳" : "🏗️"}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-muted">{project.objects.length} objects</Text>
                  <View className="flex-row gap-2">
                    {project.syncedToWeb && (
                      <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                        <Text className="text-xs text-green-900 dark:text-green-100">✅ Synced</Text>
                      </View>
                    )}
                    <Text className="text-xs text-muted">
                      {project.updatedAt.toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* Guide Tab */}
        {activeTab === "guide" && (
          <>
            <DemoSection title="Getting Started" icon="🚀" variant="info">
              <DemoFeatureList
                features={[
                  "Capture a photo of your yard or construction site",
                  "Add objects (trees, shrubs, patios, structures)",
                  "Rotate and zoom to view from different angles",
                  "See real-time 3D preview on your phone",
                  "Sync to web for advanced editing",
                ]}
              />
            </DemoSection>

            <DemoSection title="Mobile Capabilities" icon="📱" variant="success">
              <DemoFeatureList
                features={[
                  "Quick 3D preview (optimized for mobile)",
                  "Simple object placement",
                  "Basic rotation and zoom",
                  "AR preview (point camera at real location)",
                  "Project management",
                ]}
              />
            </DemoSection>

            <DemoSection title="When to Use Web Editor" icon="🌐" variant="warning">
              <DemoFeatureList
                features={[
                  "Complex landscaping designs",
                  "Construction project planning",
                  "Advanced material selection",
                  "Detailed cost estimation",
                  "Professional rendering",
                  "Team collaboration",
                ]}
              />
            </DemoSection>

            <DemoSection title="Tips" icon="💡">
              <DemoFeatureList
                features={[
                  "Use good lighting when capturing photos",
                  "Capture from multiple angles for better results",
                  "Start simple, then add details on web",
                  "Sync regularly to avoid losing work",
                  "Use AR preview to visualize before committing",
                ]}
              />
            </DemoSection>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

export default Mobile3DViewer;
