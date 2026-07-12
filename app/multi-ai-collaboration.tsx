import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

/**
 * Multi-AI Collaboration Screen
 * 
 * Enables users to:
 * - Analyze problems and get AI recommendations
 * - Create collaboration sessions
 * - View shared 3D workspace
 * - Manage AI contributions
 * - Synthesize collaborative solutions
 */

interface AIRecommendation {
  aiId: string;
  displayName: string;
  field: string;
  role: string;
  expertise: string;
  reason: string;
  relevanceScore: number;
}

interface CollaborationSession {
  sessionId: string;
  problem: string;
  aiCount: number;
  status: "active" | "completed";
  createdAt: Date;
}

export default function MultiAICollaborationScreen() {
  const colors = useColors();

  // State management
  const [tab, setTab] = useState<"analyze" | "sessions" | "workspace">("analyze");
  const [problemDescription, setProblemDescription] = useState("");
  const [selectedAIs, setSelectedAIs] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [activeSessions, setActiveSessions] = useState<CollaborationSession[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CollaborationSession | null>(null);

  // Local analysis function
  const performAnalysis = (problem: string, aiIds: string[]) => {
    // Mock recommendations based on problem keywords
    const keywords = problem.toLowerCase();
    const mockRecommendations: AIRecommendation[] = [
      {
        aiId: "AI_3D_SPECIALIST",
        displayName: "AI 3D Specialist",
        field: "3D Design & Manufacturing",
        role: "Design Lead",
        expertise: "3D modeling, CAD, CNC programming",
        reason: "Can help design and optimize 3D solutions",
        relevanceScore: 0.95,
      },
      {
        aiId: "AI_ELECTRICIAN",
        displayName: "AI Electrician",
        field: "Electrical Systems",
        role: "Systems Expert",
        expertise: "Electrical design, circuit analysis, safety",
        reason: "Can ensure electrical safety and compliance",
        relevanceScore: 0.85,
      },
    ];
    return mockRecommendations;
  };

  // Handle problem analysis
  const handleAnalyzeProblem = useCallback(async () => {
    if (!problemDescription.trim()) return;

    setLoading(true);
    try {
      const result = performAnalysis(problemDescription, selectedAIs);
      setRecommendations(result);
      setShowRecommendations(true);
    } catch (error) {
      console.error("Error analyzing problem:", error);
    } finally {
      setLoading(false);
    }
  }, [problemDescription, selectedAIs]);

  // Handle collaboration session creation
  const handleCreateSession = useCallback(async () => {
    if (!problemDescription.trim() || selectedAIs.length === 0) return;

    setLoading(true);
    try {
      const newSession: CollaborationSession = {
        sessionId: `session_${Date.now()}`,
        problem: problemDescription,
        aiCount: selectedAIs.length,
        status: "active",
        createdAt: new Date(),
      };

      setActiveSessions([...activeSessions, newSession]);
      setSelectedSession(newSession);
      setTab("sessions");
      setProblemDescription("");
      setSelectedAIs([]);
    } catch (error) {
      console.error("Error creating session:", error);
    } finally {
      setLoading(false);
    }
  }, [problemDescription, selectedAIs, activeSessions]);

  // Render problem analysis tab
  const renderAnalyzeTab = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="gap-4 p-4">
        {/* Problem Description */}
        <View className="gap-2">
          <Text className="text-lg font-bold text-foreground">Describe Your Problem</Text>
          <TextInput
            placeholder="Describe the problem you need help with..."
            value={problemDescription}
            onChangeText={setProblemDescription}
            multiline
            numberOfLines={4}
            className="bg-surface border border-border rounded-lg p-3 text-foreground"
            placeholderTextColor={colors.muted}
          />
        </View>

        {/* AI Selection */}
        <View className="gap-2">
          <Text className="text-lg font-bold text-foreground">Select AI Specialists (Optional)</Text>
          <Text className="text-sm text-muted">
            Choose specific AIs or let the system recommend them
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
            {["AI_3D_SPECIALIST", "AI_ELECTRICIAN", "AI_MECHANIC", "AI_ENGINEER"].map((aiId) => (
              <TouchableOpacity
                key={aiId}
                onPress={() => {
                  setSelectedAIs((prev) =>
                    prev.includes(aiId) ? prev.filter((a) => a !== aiId) : [...prev, aiId]
                  );
                }}
                className={cn(
                  "px-4 py-2 rounded-full border",
                  selectedAIs.includes(aiId)
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                )}
              >
                <Text
                  className={cn(
                    "font-semibold text-sm",
                    selectedAIs.includes(aiId) ? "text-background" : "text-foreground"
                  )}
                >
                  {aiId.replace("AI_", "").replace(/_/g, " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="gap-2">
          <TouchableOpacity
            onPress={handleAnalyzeProblem}
            disabled={!problemDescription.trim() || loading}
            className={cn(
              "py-3 rounded-lg items-center",
              problemDescription.trim() && !loading ? "bg-primary" : "bg-surface opacity-50"
            )}
          >
            <Text className={cn("font-semibold", problemDescription.trim() ? "text-background" : "text-muted")}>
              {loading ? "Analyzing..." : "🔍 Analyze Problem"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateSession}
            disabled={!problemDescription.trim() || selectedAIs.length === 0 || loading}
            className={cn(
              "py-3 rounded-lg items-center",
              problemDescription.trim() && selectedAIs.length > 0 && !loading
                ? "bg-success"
                : "bg-surface opacity-50"
            )}
          >
            <Text
              className={cn(
                "font-semibold",
                problemDescription.trim() && selectedAIs.length > 0 ? "text-background" : "text-muted"
              )}
            >
              ✨ Start Collaboration
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recommendations Modal */}
        <Modal visible={showRecommendations} transparent animationType="slide">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-background rounded-t-3xl p-4 gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-xl font-bold text-foreground">Recommended AI Specialists</Text>
                <TouchableOpacity onPress={() => setShowRecommendations(false)}>
                  <Text className="text-2xl text-foreground">✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={recommendations}
                keyExtractor={(item) => item.aiId}
                scrollEnabled={true}
                renderItem={({ item }) => (
                  <View className="bg-surface rounded-lg p-3 mb-2 gap-2 border border-border">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-base font-bold text-foreground">{item.displayName}</Text>
                        <Text className="text-xs text-primary font-semibold">{item.role}</Text>
                      </View>
                      <View className="bg-primary/20 px-2 py-1 rounded">
                        <Text className="text-xs font-bold text-primary">
                          {Math.round(item.relevanceScore * 100)}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-muted">{item.reason}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedAIs((prev) =>
                          prev.includes(item.aiId) ? prev.filter((a) => a !== item.aiId) : [...prev, item.aiId]
                        );
                      }}
                      className={cn(
                        "py-2 rounded items-center",
                        selectedAIs.includes(item.aiId) ? "bg-primary" : "bg-border"
                      )}
                    >
                      <Text
                        className={cn(
                          "font-semibold text-sm",
                          selectedAIs.includes(item.aiId) ? "text-background" : "text-foreground"
                        )}
                      >
                        {selectedAIs.includes(item.aiId) ? "✓ Selected" : "Select"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />

              <TouchableOpacity
                onPress={() => setShowRecommendations(false)}
                className="bg-primary py-3 rounded-lg items-center"
              >
                <Text className="text-background font-bold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );

  // Render sessions tab
  const renderSessionsTab = () => (
    <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="gap-4 p-4">
        <Text className="text-lg font-bold text-foreground">Active Collaboration Sessions</Text>

        {activeSessions.length === 0 ? (
          <View className="bg-surface rounded-lg p-4 items-center gap-2">
            <Text className="text-muted">No active sessions</Text>
            <Text className="text-xs text-muted">Create a collaboration session to get started</Text>
          </View>
        ) : (
          <FlatList
            data={activeSessions}
            keyExtractor={(item) => item.sessionId}
            scrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedSession(item)}
                className="bg-surface rounded-lg p-4 mb-3 border border-border gap-2"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground" numberOfLines={2}>
                      {item.problem}
                    </Text>
                    <Text className="text-xs text-muted mt-1">
                      {item.aiCount} AI Specialists • {item.status}
                    </Text>
                  </View>
                  <View className="bg-primary/20 px-2 py-1 rounded">
                    <Text className="text-xs font-bold text-primary">Active</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </ScrollView>
  );

  // Render workspace tab
  const renderWorkspaceTab = () => (
    <View className="flex-1 bg-surface items-center justify-center gap-4 p-4">
      <Text className="text-2xl">🎨</Text>
      <Text className="text-lg font-bold text-foreground">Shared 3D Workspace</Text>
      <Text className="text-sm text-muted text-center">
        3D workspace visualization available on web version. Open in browser for full 3D collaboration experience.
      </Text>
      {Platform.OS !== "web" && (
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg">
          <Text className="text-background font-bold">Open in Web Browser</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer className="bg-background">
      {/* Header */}
      <View className="bg-gradient-to-b from-primary/10 to-transparent p-4 gap-2 border-b border-border">
        <Text className="text-2xl font-bold text-foreground">🤝 Multi-AI Collaboration</Text>
        <Text className="text-sm text-muted">Work with multiple AI specialists together</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-surface border-b border-border">
        {(["analyze", "sessions", "workspace"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={cn(
              "flex-1 py-3 items-center border-b-2",
              tab === t ? "border-primary" : "border-transparent"
            )}
          >
            <Text
              className={cn(
                "font-semibold text-sm capitalize",
                tab === t ? "text-primary" : "text-muted"
              )}
            >
              {t === "analyze" && "🔍 Analyze"}
              {t === "sessions" && "📋 Sessions"}
              {t === "workspace" && "🎨 Workspace"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {tab === "analyze" && renderAnalyzeTab()}
      {tab === "sessions" && renderSessionsTab()}
      {tab === "workspace" && renderWorkspaceTab()}
    </ScreenContainer>
  );
}
