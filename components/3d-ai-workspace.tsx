/**
 * 3D AI Collaboration Workspace
 * 
 * Multi-AI 3D environment where customers can:
 * - Invite multiple AI specialists
 * - Have them work together on projects
 * - Assign tasks and manage collaboration
 * - See real-time AI interactions
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { ALL_AI_CREATORS, type AICreator } from "@/lib/ai-creators-system";
import { ai3DCollaborationManager, type AI3DCollaborationSession, type AIAgent } from "@/lib/3d-ai-collaboration";

interface Props {
  sceneId: string;
  projectType: "architecture" | "robotics" | "landscaping" | "3d_printing" | "general";
  projectDescription: string;
}

export function AI3DWorkspace({ sceneId, projectType, projectDescription }: Props) {
  const colors = useColors();
  const [session, setSession] = useState<AI3DCollaborationSession | null>(null);
  const [activeAIs, setActiveAIs] = useState<AIAgent[]>([]);
  const [showAISelector, setShowAISelector] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AICreator | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AICreator[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize collaboration session
  useEffect(() => {
    const newSession = ai3DCollaborationManager.createSession(
      `Project: ${projectDescription}`,
      "user",
      sceneId,
      projectType,
      projectDescription
    );
    setSession(newSession);

    // Get AI recommendations
    const recommendations = ai3DCollaborationManager.getRecommendedAIs(projectType, []);
    setAIRecommendations(recommendations);

    // Listen for AI updates
    ai3DCollaborationManager.on("aiAdded", ({ aiAgent }: { aiAgent: AIAgent }) => {
      setActiveAIs((prev) => [...prev, aiAgent]);
    });

    ai3DCollaborationManager.on("aiRemoved", ({ aiAgentId }: { aiAgentId: string }) => {
      setActiveAIs((prev) => prev.filter((ai) => ai.id !== aiAgentId));
    });

    return () => {
      if (session) {
        ai3DCollaborationManager.closeSession(session.id);
      }
    };
  }, [sceneId, projectType, projectDescription]);

  const handleAddAI = (aiCreator: AICreator) => {
    if (!session) return;

    try {
      const aiAgent = ai3DCollaborationManager.addAIToSession(session.id, aiCreator);
      setSelectedAI(null);
      setShowAISelector(false);
    } catch (error) {
      Alert.alert("Error", `Failed to add AI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleRemoveAI = (aiAgentId: string) => {
    if (!session) return;
    ai3DCollaborationManager.removeAIFromSession(session.id, aiAgentId);
  };

  const handleAssignTask = (aiAgentId: string) => {
    if (!session) return;

    Alert.prompt(
      "Assign Task",
      "Describe the task for this AI:",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Assign",
          onPress: (taskDescription: string | undefined) => {
            if (taskDescription) {
              ai3DCollaborationManager.assignTask(
                session.id,
                aiAgentId,
                "design",
                taskDescription,
                []
              );
            }
          },
        },
      ],
      "plain-text"
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 3D Canvas */}
      <View style={{ flex: 0.7, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />
        <Text style={{ color: colors.muted, textAlign: "center", padding: 8 }}>
          3D Workspace - {activeAIs.length} AI{activeAIs.length !== 1 ? "s" : ""} Active
        </Text>
      </View>

      {/* AI Control Panel */}
      <View style={{ flex: 0.3, backgroundColor: colors.background, padding: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Active AI Specialists</Text>
          <TouchableOpacity
            onPress={() => setShowAISelector(true)}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
            }}
          >
            <Text style={{ color: colors.background, fontWeight: "600", fontSize: 12 }}>+ Add AI</Text>
          </TouchableOpacity>
        </View>

        {/* Active AIs List */}
        <FlatList
          data={activeAIs}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          renderItem={({ item: aiAgent }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderLeftWidth: 4,
                borderLeftColor: `rgb(${Math.round(aiAgent.color.r * 255)}, ${Math.round(aiAgent.color.g * 255)}, ${Math.round(aiAgent.color.b * 255)})`,
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 14 }}>
                    {aiAgent.aiCreator.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    Status: {aiAgent.status}
                  </Text>
                  {aiAgent.expertise.length > 0 && (
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      Expertise: {aiAgent.expertise.slice(0, 2).join(", ")}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleAssignTask(aiAgent.id)}
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 11, fontWeight: "600" }}>Task</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveAI(aiAgent.id)}
                    style={{
                      backgroundColor: colors.error,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 11, fontWeight: "600" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        {activeAIs.length === 0 && (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 12 }}>
            No AIs added yet. Tap &quot;+Add AI&quot; to invite specialists.
          </Text>
        )}
      </View>

      {/* AI Selector Modal */}
      <Modal visible={showAISelector} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              marginTop: 60,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              overflow: "hidden",
            }}
          >
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Add AI Specialist</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                Select an AI to collaborate in the 3D workspace
              </Text>
            </View>

            <FlatList
              data={ALL_AI_CREATORS}
              keyExtractor={(item) => item.id}
              renderItem={({ item: aiCreator }) => {
                const isAdded = activeAIs.some((ai) => ai.aiCreator.id === aiCreator.id);
                return (
                  <TouchableOpacity
                    disabled={isAdded}
                    onPress={() => handleAddAI(aiCreator)}
                    style={{
                      backgroundColor: isAdded ? colors.surface : colors.background,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      padding: 12,
                      opacity: isAdded ? 0.5 : 1,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600", color: colors.foreground, fontSize: 14 }}>
                          {aiCreator.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                          {aiCreator.category}
                        </Text>
                      </View>
                      {isAdded && (
                        <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600" }}>Added</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            <TouchableOpacity
              onPress={() => setShowAISelector(false)}
              style={{
                backgroundColor: colors.primary,
                margin: 16,
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.background, fontWeight: "600", fontSize: 14 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
