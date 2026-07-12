/**
 * 3D Collaborative Workspace UI
 * 
 * Real-time 3D environment where construction workers and AI specialists
 * collaborate on blueprints and projects together.
 * 
 * Features:
 * - Babylon.js 3D scene rendering
 * - Real-time multi-user synchronization
 * - AI avatar display with tools
 * - Blueprint creation and editing
 * - Object manipulation and selection
 * - Camera controls (orbit, first-person, top-down)
 * - Live chat and voice integration
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface AIAvatar {
  id: string;
  name: string;
  specialty: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  tool: string;
  isActive: boolean;
}

interface WorkspaceObject {
  id: string;
  type: "wall" | "pipe" | "wire" | "beam" | "roof" | "floor" | "custom";
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  createdBy: string;
  createdAt: number;
}

interface WorkspaceSession {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  participants: string[];
  objects: WorkspaceObject[];
  aiAvatars: AIAvatar[];
  cameraMode: "orbit" | "firstperson" | "topdown";
  isLive: boolean;
}

export default function Workspace3DUI() {
  const colors = useColors();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSession | null>(null);
  const [selectedObject, setSelectedObject] = useState<WorkspaceObject | null>(null);
  const [cameraMode, setCameraMode] = useState<"orbit" | "firstperson" | "topdown">("orbit");
  const [aiAvatars, setAiAvatars] = useState<AIAvatar[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    initializeScene();
  }, []);

  const initializeScene = async () => {
    // Initialize Babylon.js scene
    // This would normally use Babylon.js library
    // For now, we&apos;ll create a placeholder that shows the UI structure

    const mockWorkspace: WorkspaceSession = {
      id: "workspace-001",
      name: "Kitchen Renovation Project",
      description: "Complete kitchen plumbing and electrical renovation",
      createdBy: "user-123",
      createdAt: Date.now(),
      participants: ["user-123", "user-456", "user-789"],
      objects: [
        {
          id: "obj-1",
          type: "pipe",
          position: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 5 },
          rotation: { x: 0, y: 0, z: 0 },
          color: "#FF6B6B",
          createdBy: "plumber-ai",
          createdAt: Date.now(),
        },
        {
          id: "obj-2",
          type: "wire",
          position: { x: 2, y: 0, z: 0 },
          scale: { x: 0.1, y: 0.1, z: 5 },
          rotation: { x: 0, y: 0, z: 0 },
          color: "#4ECDC4",
          createdBy: "electrician-ai",
          createdAt: Date.now(),
        },
      ],
      aiAvatars: [
        {
          id: "plumber-ai",
          name: "Plumber AI",
          specialty: "Plumbing",
          position: { x: 0, y: 1, z: 2 },
          rotation: { x: 0, y: 0, z: 0 },
          tool: "wrench",
          isActive: true,
        },
        {
          id: "electrician-ai",
          name: "Electrician AI",
          specialty: "Electrical",
          position: { x: 2, y: 1, z: 2 },
          rotation: { x: 0, y: 0, z: 0 },
          tool: "screwdriver",
          isActive: true,
        },
      ],
      cameraMode: "orbit",
      isLive: true,
    };

    setWorkspace(mockWorkspace);
    setAiAvatars(mockWorkspace.aiAvatars);
  };

  const handleAddObject = (type: WorkspaceObject["type"]) => {
    if (!workspace) return;

    const newObject: WorkspaceObject = {
      id: `obj-${Date.now()}`,
      type,
      position: { x: Math.random() * 5, y: 0, z: Math.random() * 5 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      createdBy: "user-123",
      createdAt: Date.now(),
    };

    setWorkspace({
      ...workspace,
      objects: [...workspace.objects, newObject],
    });
  };

  const handleDeleteObject = (objectId: string) => {
    if (!workspace) return;

    setWorkspace({
      ...workspace,
      objects: workspace.objects.filter((obj) => obj.id !== objectId),
    });
    setSelectedObject(null);
  };

  const handleChangeCameraMode = (mode: "orbit" | "firstperson" | "topdown") => {
    setCameraMode(mode);
    if (workspace) {
      setWorkspace({
        ...workspace,
        cameraMode: mode,
      });
    }
  };

  const handleToggleVoiceRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <ScreenContainer className="bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-4 gap-4">
            {/* Header */}
            <View className="gap-2">
              <Text className="text-2xl font-bold text-foreground">
                {workspace?.name || "3D Workspace"}
              </Text>
              <Text className="text-sm text-muted">{workspace?.description}</Text>
            </View>

            {/* 3D Canvas Placeholder */}
            <View
              className="w-full h-64 rounded-lg border-2 border-border bg-surface items-center justify-center"
              style={{ backgroundColor: colors.surface }}
            >
              <Text className="text-muted text-center">
                3D Scene Rendering Area{"\n"}(Babylon.js Canvas)
              </Text>
            </View>

            {/* AI Avatars in Workspace */}
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">AI Specialists</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
                {aiAvatars.map((avatar) => (
                  <View
                    key={avatar.id}
                    className="w-24 h-32 rounded-lg p-2 gap-1 items-center justify-center"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <Text className="text-xs font-semibold text-foreground text-center">
                      {avatar.name}
                    </Text>
                    <Text className="text-xs text-muted">{avatar.specialty}</Text>
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-xs font-bold text-background">AI</Text>
                    </View>
                    <Text className="text-xs text-muted">{avatar.tool}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Objects in Workspace */}
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Blueprint Objects</Text>
              <View className="gap-2">
                {workspace?.objects.map((obj) => (
                  <Pressable
                    key={obj.id}
                    onPress={() => setSelectedObject(obj)}
                    className="p-3 rounded-lg border-2 flex-row justify-between items-center"
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: selectedObject?.id === obj.id ? colors.primary : colors.border,
                    }}
                  >
                    <View className="flex-1 gap-1">
                      <Text className="text-sm font-semibold text-foreground capitalize">
                        {obj.type}
                      </Text>
                      <Text className="text-xs text-muted">
                        Position: ({obj.position.x.toFixed(1)}, {obj.position.y.toFixed(1)},
                        {obj.position.z.toFixed(1)})
                      </Text>
                    </View>
                    <View className="w-6 h-6 rounded" style={{ backgroundColor: obj.color }} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Add Object Controls */}
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Add Objects</Text>
              <View className="flex-row flex-wrap gap-2">
                {(["wall", "pipe", "wire", "beam", "roof", "floor"] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => handleAddObject(type)}
                    className="flex-1 min-w-24 py-2 px-3 rounded-lg items-center justify-center"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-sm font-semibold text-background capitalize">
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Camera Controls */}
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">Camera Mode</Text>
              <View className="flex-row gap-2">
                {(["orbit", "firstperson", "topdown"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => handleChangeCameraMode(mode)}
                    className="flex-1 py-2 px-3 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: cameraMode === mode ? colors.primary : colors.surface,
                    }}
                  >
                    <Text
                      className="text-sm font-semibold capitalize"
                      style={{
                        color: cameraMode === mode ? colors.background : colors.foreground,
                      }}
                    >
                      {mode === "firstperson" ? "1st Person" : mode === "topdown" ? "Top Down" : "Orbit"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Voice Chat Control */}
            <View className="gap-2">
              <Pressable
                onPress={handleToggleVoiceRecording}
                className="py-3 px-4 rounded-lg items-center justify-center"
                style={{
                  backgroundColor: isRecording ? colors.error : colors.primary,
                }}
              >
                <Text className="text-lg font-semibold text-background">
                  {isRecording ? "🎤 Stop Recording" : "🎤 Start Voice Chat"}
                </Text>
              </Pressable>
            </View>

            {/* Selected Object Actions */}
            {selectedObject && (
              <View className="gap-2 p-3 rounded-lg" style={{ backgroundColor: colors.surface }}>
                <Text className="text-sm font-semibold text-foreground">
                  Selected: {selectedObject.type}
                </Text>
                <Pressable
                  onPress={() => handleDeleteObject(selectedObject.id)}
                  className="py-2 px-3 rounded-lg items-center justify-center"
                  style={{ backgroundColor: colors.error }}
                >
                  <Text className="text-sm font-semibold text-background">Delete Object</Text>
                </Pressable>
              </View>
            )}

            {/* Participants */}
            <View className="gap-2">
              <Text className="text-lg font-semibold text-foreground">
                Participants ({workspace?.participants.length || 0})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {workspace?.participants.map((participant) => (
                  <View
                    key={participant}
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-xs font-semibold text-background">{participant}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenContainer>
  );
}
