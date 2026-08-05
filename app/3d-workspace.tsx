import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { EquipmentHubPanel } from "@/components/equipment-hub-panel";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";
import { AiSpecialistPicker } from "@/components/ai-specialist-picker";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { AI_CREATOR_CATALOG } from "@/lib/ai-creator-catalog";

const PROJECT_TYPES = [
  { id: "merchandise" as const, label: "Merchandise", emoji: "👕" },
  { id: "3d_printing" as const, label: "3D Print", emoji: "🖨️" },
  { id: "architecture" as const, label: "Architecture", emoji: "🏛️" },
  { id: "robotics" as const, label: "Robotics", emoji: "🤖" },
  { id: "software" as const, label: "Software App", emoji: "💻" },
  { id: "general" as const, label: "General", emoji: "✨" },
];

/** Categories that collaborate in the 3D workspace. */
const WORKSPACE_CATEGORIES = new Set([
  "3D & Design",
  "Technology",
  "Construction",
  "Engineering",
  "Creative",
  "Platform",
]);

export default function Workspace3DScreen() {
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

  const [projectType, setProjectType] = useState<(typeof PROJECT_TYPES)[number]["id"]>("merchandise");
  const [projectName, setProjectName] = useState("My merchandise design");
  const [description, setDescription] = useState("");
  const [activeAiId, setActiveAiId] = useState("ai-3d-specialist");
  const [sessionId, setSessionId] = useState<string | null>(null);

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
    const peerIds = workspaceAis.map((a) => a.id).filter((id) => id !== activeAiId).slice(0, 3);
    if (sessionId) {
      await updateSession.mutateAsync({
        sessionId,
        name: projectName,
        description,
        activeAiIds: [activeAiId, ...peerIds],
      });
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
  }, [sessionId, projectName, description, projectType, activeAiId, workspaceAis, createSession, updateSession]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer className="bg-background">
        <ScrollView contentContainerStyle={{ paddingBottom: 40, gap: 14 }}>
          <TabScreenHeader
            icon="🎮"
            title="3D Workspace & Print Lab"
            subtitle="Design merchandise with multiple AIs, then send to your 3D printer."
          />

          <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back</Text>
          </Pressable>

          <View style={[styles.viewport, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 28, textAlign: "center" }}>🧊</Text>
            <Text style={{ color: colors.foreground, fontWeight: "700", textAlign: "center" }}>
              Shared 3D canvas
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
              {projectName || "Untitled project"}
              {description ? `\n${description}` : ""}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 8 }}>
              Invite specialists below — they collaborate here when asked.
            </Text>
          </View>

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
                <Text style={{ color: "#fff", fontWeight: "700" }}>Save workspace session</Text>
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
              <AIDisclosureWrapper aiName={activeAi.name}>
                <CreatorAIInterface
                  key={activeAi.id}
                  creatorId={activeAi.id}
                  creatorName={activeAi.name}
                  creatorAvatar={activeAi.avatar}
                  welcomeMessage={`3D workspace active — ${projectName}. I'm ${activeAi.name}. Ask me to design, optimize for printing, or prepare files for your printer.`}
                />
              </AIDisclosureWrapper>
            ) : null}
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <EquipmentHubPanel />
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  viewport: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    minHeight: 140,
    justifyContent: "center",
    gap: 4,
  },
  section: { fontSize: 15, fontWeight: "700" },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
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
