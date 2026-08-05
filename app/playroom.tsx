import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WorkspaceBabylonViewport } from "@/components/workspace-babylon-viewport";
import { WorkspacePlayroomPanel } from "@/components/workspace-playroom-panel";
import { WorkspaceDesignLayersPanel } from "@/components/workspace-design-layers-panel";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";
import { useColors } from "@/hooks/use-colors";
import { useWorkspaceDesign } from "@/hooks/use-workspace-design";
import { usePlayroomBuilder } from "@/hooks/use-playroom-builder";
import { trpc } from "@/lib/trpc";
import { AI_CREATOR_CATALOG } from "@/lib/ai-creator-catalog";

const WORKSPACE_CATEGORIES = new Set([
  "3D & Design",
  "Technology",
  "Construction",
  "Engineering",
  "Creative",
  "Platform",
]);

export default function PlayroomScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: catalogData } = trpc.aiCreators.list.useQuery(undefined, { staleTime: 60_000 });
  const sessions = trpc.equipment.listWorkspaceSessions.useQuery();
  const createSession = trpc.equipment.createWorkspaceSession.useMutation({
    onSuccess: () => void utils.equipment.listWorkspaceSessions.invalidate(),
  });
  const updateSession = trpc.equipment.updateWorkspaceSession.useMutation({
    onSuccess: () => void utils.equipment.listWorkspaceSessions.invalidate(),
  });

  const workspaceAis = useMemo(() => {
    const fromApi = catalogData?.creators ?? AI_CREATOR_CATALOG;
    return fromApi.filter((c) => WORKSPACE_CATEGORIES.has(c.category));
  }, [catalogData]);

  const [projectName, setProjectName] = useState("AI Playroom");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeAiId, setActiveAiId] = useState("ai-3d-specialist");

  const designApi = useWorkspaceDesign(sessionId);
  const playroom = usePlayroomBuilder(designApi);
  const activeAi = workspaceAis.find((a) => a.id === activeAiId) ?? workspaceAis[0];

  useEffect(() => {
    const playSession = sessions.data?.find((s) => s.name.toLowerCase().includes("playroom"));
    const pick = playSession ?? sessions.data?.[0];
    if (pick && !sessionId) {
      setSessionId(pick.id);
      setProjectName(pick.name);
      if (pick.activeAiIds[0]) setActiveAiId(pick.activeAiIds[0]);
    }
  }, [sessions.data, sessionId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) {
      await updateSession.mutateAsync({
        sessionId,
        name: projectName,
        description: "AI Playroom — E-I-E-I-O farm, house with eyes, car builds",
        activeAiIds: workspaceAis.slice(0, 4).map((a) => a.id),
      });
      await designApi.flushSave();
      return sessionId;
    }
    const created = await createSession.mutateAsync({
      name: projectName,
      projectType: "general",
      description: "AI Playroom builds",
      activeAiIds: workspaceAis.slice(0, 4).map((a) => a.id),
    });
    setSessionId(created.id);
    return created.id;
  }, [sessionId, projectName, workspaceAis, createSession, updateSession, designApi]);

  const aiWelcome = playroom.building
    ? playroom.plannerMsg
    : `Welcome to the Playroom! Tap E-I-E-I-O Farm, House with Eyes, or What a Car — I'll help plan each build. Or hit Build ALL for the full show!`;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ paddingBottom: 48, gap: 14 }}>
          <TabScreenHeader
            icon="🎪"
            title="AI Playroom"
            subtitle="Planner + Builder AIs construct E-I-E-I-O, a house with eyes, and a car — live in 3D"
          />

          <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/3d-workspace")}>
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Full 3D Lab →</Text>
            </Pressable>
          </View>

          <WorkspaceBabylonViewport
            design={designApi.design}
            selectedLayerId={designApi.selectedLayerId}
            onSelectLayer={designApi.setSelectedLayerId}
            specialists={workspaceAis}
            selectedAiId={activeAiId}
            onSelectAi={setActiveAiId}
            projectName={projectName}
            height={Platform.OS === "web" ? 460 : 300}
          />

          <WorkspacePlayroomPanel builder={playroom} sessionReady={Boolean(sessionId)} />

          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Playroom session name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <Pressable
              onPress={() => void ensureSession()}
              disabled={createSession.isPending || updateSession.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              {createSession.isPending || updateSession.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {sessionId ? "Save playroom session" : "Create playroom session"}
                </Text>
              )}
            </Pressable>
          </View>

          <WorkspaceDesignLayersPanel designApi={designApi} sessionSaved={Boolean(sessionId)} />

          <View style={{ height: 340, paddingHorizontal: 12 }}>
            {activeAi ? (
              <AIDisclosureWrapper aiName={activeAi.name}>
                <CreatorAIInterface
                  key={`${activeAi.id}-${playroom.stepIndex}`}
                  creatorId={activeAi.id}
                  creatorName={activeAi.name}
                  creatorAvatar={activeAi.avatar}
                  welcomeMessage={aiWelcome}
                />
              </AIDisclosureWrapper>
            ) : null}
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: { borderRadius: 12, padding: 14, alignItems: "center" },
});
