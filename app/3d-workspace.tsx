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
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { EquipmentHubPanel } from "@/components/equipment-hub-panel";
import { WorkspaceBabylonViewport } from "@/components/workspace-babylon-viewport";
import { WorkspaceDesignLayersPanel } from "@/components/workspace-design-layers-panel";
import { BlueprintReaderPanel } from "@/components/blueprint-reader-panel";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";
import { AiSpecialistPicker } from "@/components/ai-specialist-picker";
import { Workspace3dPricingPanel } from "@/components/workspace-3d-pricing-panel";
import { AiHubTabRow } from "@/components/ai-hub-tab-row";
import { useColors } from "@/hooks/use-colors";
import { useWorkspaceDesign } from "@/hooks/use-workspace-design";
import { designLayerSummary } from "@/lib/workspace-design-utils";
import { trpc } from "@/lib/trpc";
import { AI_CREATOR_CATALOG } from "@/lib/ai-creator-catalog";

import { PlatformSectionGate } from "@/components/platform-section-gate";
import { WorkspaceWebHandoffBanner } from "@/components/workspace-web-handoff-banner";
import { useAuth } from "@/lib/auth-context";

const WORKSPACE_TABS = [
  { id: "builder", label: "Builder", emoji: "🎮" },
  { id: "pricing", label: "Pricing", emoji: "💳" },
] as const;

type WorkspaceTabId = (typeof WORKSPACE_TABS)[number]["id"];

const PROJECT_TYPES = [
  { id: "merchandise" as const, label: "Merchandise", emoji: "👕" },
  { id: "3d_printing" as const, label: "3D Print", emoji: "🖨️" },
  { id: "architecture" as const, label: "Architecture", emoji: "🏛️" },
  { id: "robotics" as const, label: "Robotics", emoji: "🤖" },
  { id: "marine" as const, label: "Marine", emoji: "⚓" },
  { id: "software" as const, label: "Software App", emoji: "💻" },
  { id: "general" as const, label: "General", emoji: "✨" },
];

const WORKSPACE_CATEGORIES = new Set([
  "3D & Design",
  "Blueprint & Schematics",
  "Technology",
  "Construction",
  "Engineering",
  "Creative",
  "Platform",
  "Marine",
]);

export default function Workspace3DScreen() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ pricing?: string; project?: string }>();

  const { data: catalogData } = trpc.aiCreators.list.useQuery(undefined, { staleTime: 60_000 });
  const workspaceAccess = trpc.workspace3d.getAccess.useQuery(undefined, {
    enabled: isAuthenticated,
  });
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

  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]["id"]>(() => {
    if (params.project === "merchandise" || params.project === "3d_printing") {
      return params.project;
    }
    return "merchandise";
  });
  const [projectName, setProjectName] = useState("My merchandise design");
  const [description, setDescription] = useState("");
  const [activeAiId, setActiveAiId] = useState("ai-blueprint-reader-001");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>(
    params.pricing === "1" ? "pricing" : "builder",
  );

  const maxConcurrentAis = workspaceAccess.data?.hasAccess
    ? workspaceAccess.data.maxConcurrentAiSlots
    : 0;

  const designApi = useWorkspaceDesign(sessionId);
  const activeAi = workspaceAis.find((a) => a.id === activeAiId) ?? workspaceAis[0];

  useEffect(() => {
    if (sessions.data?.[0] && !sessionId) {
      setSessionId(sessions.data[0].id);
      setProjectName(sessions.data[0].name);
      setDescription(sessions.data[0].description);
      setProjectType(sessions.data[0].projectType);
      if (sessions.data[0].activeAiIds[0]) {
        setActiveAiId(sessions.data[0].activeAiIds[0]);
      }
    }
  }, [sessions.data, sessionId]);

  const ensureSession = useCallback(async () => {
    const maxPeers = Math.max(0, maxConcurrentAis - 1);
    const peerIds = workspaceAis
      .map((a) => a.id)
      .filter((id) => id !== activeAiId)
      .slice(0, maxPeers > 0 ? maxPeers : 0);
    const activeAiIds = maxConcurrentAis > 0 ? [activeAiId, ...peerIds] : [activeAiId];
    if (sessionId) {
      await updateSession.mutateAsync({
        sessionId,
        name: projectName,
        description,
        activeAiIds,
      });
      await designApi.flushSave();
      return sessionId;
    }
    const created = await createSession.mutateAsync({
      name: projectName,
      projectType,
      description,
      activeAiIds: [activeAiId],
    });
    setSessionId(created.id);
    return created.id;
  }, [
    sessionId,
    projectName,
    description,
    projectType,
    activeAiId,
    workspaceAis,
    maxConcurrentAis,
    createSession,
    updateSession,
    designApi,
  ]);

  const viewportHeight = Platform.OS === "web" ? 440 : 280;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <PlatformSectionGate sectionId="3d_workspace">
        <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 14 }}>
          <TabScreenHeader
            icon="🎮"
            title="3D Component Builder"
            subtitle="Babylon.js canvas · STL upload · layered design · AI collaboration · print export"
          />

          <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back</Text>
          </Pressable>

          <WorkspaceWebHandoffBanner variant="merch" />

          <AiHubTabRow
            tabs={WORKSPACE_TABS.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji }))}
            activeId={activeTab}
            onSelect={(id) => setActiveTab(id as WorkspaceTabId)}
          />

          {activeTab === "pricing" ? (
            <Workspace3dPricingPanel />
          ) : (
            <>
          {!workspaceAccess.data?.hasAccess && isAuthenticated ? (
            <Pressable
              onPress={() => setActiveTab("pricing")}
              style={[styles.pricingLink, { borderColor: colors.primary, marginHorizontal: 16 }]}
            >
              <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
                💳 Subscribe to use the 3D workspace — see Pricing tab for plans
              </Text>
            </Pressable>
          ) : workspaceAccess.data?.hasAccess ? (
            <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 16, lineHeight: 16 }}>
              Workspace plan: {workspaceAccess.data.maxConcurrentAiSlots} concurrent AI
              {workspaceAccess.data.maxConcurrentAiSlots === 1 ? "" : "s"} in session
            </Text>
          ) : null}

          {Platform.OS === "web" ? (
            <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 16, lineHeight: 16 }}>
              Drag to orbit · scroll to zoom · click meshes to select layers · upload STL up to 8 MB
            </Text>
          ) : null}

          <Pressable onPress={() => router.push("/playroom")} style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>🎪 Open AI Playroom →</Text>
          </Pressable>

          <BlueprintReaderPanel />

          <WorkspaceBabylonViewport
            design={designApi.design}
            selectedLayerId={designApi.selectedLayerId}
            onSelectLayer={designApi.setSelectedLayerId}
            specialists={workspaceAis}
            selectedAiId={activeAiId}
            onSelectAi={setActiveAiId}
            projectName={projectName}
            height={viewportHeight}
          />

          <WorkspaceDesignLayersPanel designApi={designApi} sessionSaved={Boolean(sessionId)} />

          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <Text style={[styles.section, { color: colors.foreground }]}>Project type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROJECT_TYPES.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setProjectType(t.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: projectType === t.id ? colors.primary : colors.surface,
                      borderColor: projectType === t.id ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                  <Text
                    style={{
                      color: projectType === t.id ? "#fff" : colors.foreground,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              value={projectName}
              onChangeText={setProjectName}
              placeholder="Project name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What are you making? (keychain, logo, figurine…)"
              placeholderTextColor={colors.muted}
              multiline
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.foreground, minHeight: 64 },
              ]}
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
                  {sessionId ? "Save session & design" : "Create session & save design"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[styles.section, { color: colors.foreground, paddingHorizontal: 16 }]}>
              Collaborating AIs
            </Text>
            {workspaceAis.length > 0 ? (
              <AiSpecialistPicker
                specialists={workspaceAis}
                selectedId={activeAiId}
                onSelect={setActiveAiId}
              />
            ) : (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
            )}
          </View>

          <View style={{ height: 360, paddingHorizontal: 12 }}>
            {activeAi ? (
              <>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/ais",
                      params: { ai: activeAi.id, subscribe: "1" },
                    })
                  }
                  style={[styles.pricingLink, { borderColor: colors.primary }]}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 12 }}>
                    💳 {activeAi.name} — see Pricing tab for access options
                  </Text>
                </Pressable>
                <AIDisclosureWrapper aiName={activeAi.name}>
                  <CreatorAIInterface
                  key={activeAi.id}
                  creatorId={activeAi.id}
                  creatorName={activeAi.name}
                  creatorAvatar={activeAi.avatar}
                  welcomeMessage={`3D builder active — ${projectName} with ${designApi.design.layers.length} layers. I'm ${activeAi.name}. Ask me to optimize meshes, suggest print settings, or refine your design.`}
                />
                </AIDisclosureWrapper>
              </>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <EquipmentHubPanel
              projectSessionId={sessionId}
              projectName={projectName}
              designLayerCount={designApi.design.layers.length}
              designTriangleCount={designLayerSummary(designApi.design).totalTriangles}
            />
          </View>
            </>
          )}
        </ScrollView>
        </PlatformSectionGate>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 15, fontWeight: "700" },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  pricingLink: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4 },
});
