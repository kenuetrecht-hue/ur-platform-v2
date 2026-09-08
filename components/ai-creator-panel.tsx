import { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { LanguageAIInterface } from "@/components/language-ai-interface";
import { OWNER_OPS_AI_IDS } from "@/lib/owner-platform-ops-catalog";
import { useRouter } from "expo-router";
import { TechBuilderSandboxPanel } from "@/components/tech-builder-sandbox-panel";
import { TechBuilderLearnPanel } from "@/components/tech-builder-learn-panel";
import { GameForgeSandboxPanel } from "@/components/game-forge-sandbox-panel";
import { GameForgeLearnPanel } from "@/components/game-forge-learn-panel";
import { isForgeSpecialist, forgeLearnLabel, isChainSmith } from "@/lib/forge-specialists";
import { TEACHING_CHAIN_STARTER_FILE } from "@/lib/teaching-blockchain-starter";

import { AiLiveSessionsPanel } from "@/components/ai-live-sessions-panel";
import { AiSpecialistPricingPanel } from "@/components/ai-specialist-pricing-panel";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";
import { ComposerDock } from "@/components/composer-dock";

import { SpecialistJobToolsPanel } from "@/components/specialist-job-tools-panel";
import { hasSpecialistJobTools } from "@/lib/specialist-job-tools";

type SurfaceMode = "chat" | "learn" | "build" | "live" | "pricing" | "tools";
type LearnLevel = "beginner" | "intermediate" | "advanced";
type LearnMode = "lesson" | "practice" | "certification" | "on_the_job";

type ChatMessage = { role: "user" | "ai"; text: string };

export type AiCreatorPanelProps = {
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  welcomeMessage?: string;
  initialPrompt?: string;
  /** Hide duplicate chat header when parent screen shows specialist info. */
  hideChatHeader?: boolean;
  /** Open pricing tab (e.g. web checkout handoff ?subscribe=1). */
  initialSurface?: SurfaceMode;
  /** Keyboard overlap — parent tab chrome above this panel. */
  overlapHeaderHeight?: number;
};

const LEARN_LEVELS: LearnLevel[] = ["beginner", "intermediate", "advanced"];
const LEARN_MODES: { id: LearnMode; label: string; emoji: string }[] = [
  { id: "lesson", label: "Lesson", emoji: "📖" },
  { id: "practice", label: "Practice", emoji: "✏️" },
  { id: "certification", label: "Cert prep", emoji: "🎓" },
  { id: "on_the_job", label: "On the job", emoji: "🔧" },
];

export function AiCreatorPanel({
  creatorId,
  creatorName,
  creatorAvatar = "✨",
  welcomeMessage,
  initialPrompt,
  hideChatHeader = false,
  initialSurface,
  overlapHeaderHeight,
}: AiCreatorPanelProps) {
  const colors = useColors();
  const router = useRouter();
  const [surface, setSurface] = useState<SurfaceMode>(initialSurface ?? "chat");
  const [sandboxSeed, setSandboxSeed] = useState<{ path: string; content: string } | null>(null);

  const isOwnerOps = OWNER_OPS_AI_IDS.includes(creatorId);

  const liveEnabled = trpc.aiLiveSessions.isLiveEnabled.useQuery(
    { creatorAiId: creatorId },
    { enabled: creatorId !== "linguamate" && !isOwnerOps },
  );
  const upcomingLive = trpc.aiLiveSessions.listUpcoming.useQuery(
    { creatorAiId: creatorId },
    { enabled: creatorId !== "linguamate" && !isOwnerOps },
  );

  useEffect(() => {
    if (initialSurface) setSurface(initialSurface);
  }, [initialSurface, creatorId]);

  if (isOwnerOps) {
    return (
      <View style={[styles.root, styles.opsBlocked, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={{ fontSize: 28, textAlign: "center" }}>🔐</Text>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16, textAlign: "center" }}>
          Administration-only AI
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }}>
          Doctor AI, Administration AI, Security AI, and Business Steward AI are private to the Administration Dashboard.
          They are not available in the public AI Specialists tab.
        </Text>
        <Pressable
          onPress={() => router.push("/(tabs)/admin")}
          style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Open Administration Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  if (creatorId === "linguamate") {
    return (
      <View style={styles.root}>
        <SurfaceToggle
          surface={surface}
          onChange={setSurface}
          colors={colors}
          learnLabel="Learn languages"
          showBuild={false}
          showLive={false}
          chatOnlyWithPricing
        />
        {surface === "pricing" ? (
          <AiSpecialistPricingPanel
            creatorId="linguamate"
            creatorName="LinguaMate"
            creatorAvatar="🌍"
          />
        ) : (
          <LanguageAIInterface />
        )}
      </View>
    );
  }

  const isForge = isForgeSpecialist(creatorId);
  const isTechBuilder = creatorId === "ai-coder-001";
  const isGameForge = creatorId === "ai-game-dev-001";
  const chainSmith = isChainSmith(creatorId);

  const showLiveTab =
    !isOwnerOps &&
    (liveEnabled.data?.enabled === true || (upcomingLive.data?.length ?? 0) > 0);

  return (
    <View style={styles.root}>
      {!isOwnerOps ? (
        <SurfaceToggle
          surface={surface}
          onChange={setSurface}
          colors={colors}
          learnLabel={isForge ? forgeLearnLabel(creatorId) : "Learn the trade"}
          showBuild={isForge}
          showLive={showLiveTab}
          showTools={hasSpecialistJobTools(creatorId)}
        />
      ) : null}
      {surface === "tools" && hasSpecialistJobTools(creatorId) ? (
        <SpecialistJobToolsPanel creatorId={creatorId} creatorName={creatorName} />
      ) : surface === "pricing" ? (
        <AiSpecialistPricingPanel
          creatorId={creatorId}
          creatorName={creatorName}
          creatorAvatar={creatorAvatar}
        />
      ) : surface === "live" && showLiveTab ? (
        <AiLiveSessionsPanel creatorId={creatorId} creatorName={creatorName} />
      ) : surface === "build" && (isTechBuilder || chainSmith) ? (
        <TechBuilderSandboxPanel
          initialFilePath={sandboxSeed?.path ?? (chainSmith ? TEACHING_CHAIN_STARTER_FILE.path : undefined)}
          initialFileContent={
            sandboxSeed?.content ?? (chainSmith ? TEACHING_CHAIN_STARTER_FILE.content : undefined)
          }
        />
      ) : surface === "build" && isGameForge ? (
        <GameForgeSandboxPanel
          initialFilePath={sandboxSeed?.path}
          initialFileContent={sandboxSeed?.content}
        />
      ) : surface === "chat" || isOwnerOps ? (
        <View style={styles.chatSurface}>
        <CreatorAIInterface
          creatorId={creatorId}
          creatorName={creatorName}
          creatorAvatar={creatorAvatar}
          welcomeMessage={welcomeMessage}
          initialPrompt={initialPrompt}
          hideHeader={hideChatHeader}
          embedded={hideChatHeader}
          overlapHeaderHeight={overlapHeaderHeight}
        />
        </View>
      ) : isTechBuilder || chainSmith ? (
        <TechBuilderLearnPanel
          creatorId={creatorId}
          creatorName={creatorName}
          onTryInSandbox={(file) => {
            setSandboxSeed(file);
            setSurface("build");
          }}
        />
      ) : isGameForge ? (
        <GameForgeLearnPanel
          creatorId={creatorId}
          creatorName={creatorName}
          onTryInSandbox={(file) => {
            setSandboxSeed(file);
            setSurface("build");
          }}
        />
      ) : (
        <AiLearnSurface
          creatorId={creatorId}
          creatorName={creatorName}
          creatorAvatar={creatorAvatar}
          overlapOptions={{
            headerChromeHeight:
              (overlapHeaderHeight ?? LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT) + 48,
            reserveTabBar: true,
          }}
        />
      )}
    </View>
  );
}

function SurfaceToggle({
  surface,
  onChange,
  colors,
  learnLabel,
  showBuild = false,
  showLive = false,
  showTools = false,
  chatOnlyWithPricing = false,
}: {
  surface: SurfaceMode;
  onChange: (m: SurfaceMode) => void;
  colors: ReturnType<typeof useColors>;
  learnLabel: string;
  showBuild?: boolean;
  showLive?: boolean;
  showTools?: boolean;
  /** LinguaMate — chat + pricing only */
  chatOnlyWithPricing?: boolean;
}) {
  const tabs: { id: SurfaceMode; label: string }[] = [{ id: "chat", label: "💬 Chat" }];

  if (chatOnlyWithPricing) {
    tabs.push({ id: "pricing", label: "💳 Pricing" });
  } else {
    tabs.push({ id: "learn", label: `📚 ${learnLabel}` });
    if (showLive) tabs.push({ id: "live", label: "🎥 Live" });
    if (showBuild) tabs.push({ id: "build", label: "🏗️ Build" });
    if (showTools) tabs.push({ id: "tools", label: "🧰 Tools" });
    tabs.push({ id: "pricing", label: "💳 Pricing" });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.surfaceScroll}
      contentContainerStyle={styles.surfaceScrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.surfaceRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {tabs.map((tab) => {
        const active = surface === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            hitSlop={6}
            style={({ pressed }) => [
              styles.surfaceTab,
              {
                backgroundColor: active ? colors.primary : "transparent",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{ color: active ? "#fff" : colors.foreground, fontWeight: "700", fontSize: 12 }}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </ScrollView>
  );
}

export function AiLearnSurface({
  creatorId,
  creatorName,
  creatorAvatar,
  overlapOptions,
}: {
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  overlapOptions?: { reserveTabBar?: boolean; headerChromeHeight?: number };
}) {
  const colors = useColors();
  const overlap = useOverlapInsets({
    headerChromeHeight: overlapOptions?.headerChromeHeight ?? LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT,
    reserveTabBar: overlapOptions?.reserveTabBar ?? true,
  });
  const utils = trpc.useUtils();
  const scrollRef = useRef<ScrollView>(null);

  const [level, setLevel] = useState<LearnLevel>("beginner");
  const [learnMode, setLearnMode] = useState<LearnMode>("lesson");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const curriculum = trpc.aiLearning.getCurriculum.useQuery({ creatorId });
  const profile = trpc.aiLearning.getProfile.useQuery({ creatorId });
  const practiceQuestions = trpc.aiLearning.getPracticeQuestions.useQuery(
    { creatorId, count: 5 },
    { enabled: learnMode === "practice" },
  );
  const certPrep = trpc.aiLearning.getCertificationPrep.useQuery(
    { creatorId },
    { enabled: learnMode === "certification" },
  );

  const teach = trpc.aiLearning.teach.useMutation();
  const setLevelMutation = trpc.aiLearning.setLevel.useMutation({
    onSuccess: () => void utils.aiLearning.getProfile.invalidate({ creatorId }),
  });
  const completeTopic = trpc.aiLearning.completeTopic.useMutation({
    onSuccess: () => void utils.aiLearning.getProfile.invalidate({ creatorId }),
  });

  useEffect(() => {
    if (profile.data?.progress.level) {
      setLevel(profile.data.progress.level);
    }
  }, [profile.data?.progress.level]);

  useEffect(() => {
    const intro = `Welcome to **Learn mode** with ${creatorName} — an AI teacher, not a human professional. Pick a topic below or ask to start a ${level} ${learnMode.replace(/_/g, " ")} session. I'll teach you step-by-step for **entertainment and educational purposes only**. If you want professional advice, consult a qualified licensed expert.`;
    setMessages([{ role: "ai", text: intro }]);
    setActiveTopic(null);
  }, [creatorId, creatorName, level, learnMode]);

  const sendLearnMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim().slice(0, 4000);
      if (!text || loading) return;

      setLoading(true);
      setMessages((prev) => [...prev, { role: "user", text }]);
      setInputText("");

      const history = messages.slice(-10).map((m) => ({
        role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));

      try {
        const result = await teach.mutateAsync({
          creatorId,
          message: text,
          history,
          level,
          mode: learnMode,
          topic: activeTopic ?? undefined,
        });
        setMessages((prev) => [...prev, { role: "ai", text: result.lesson }]);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Lesson unavailable. Try again.";
        setMessages((prev) => [...prev, { role: "ai", text: msg }]);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    },
    [activeTopic, creatorId, learnMode, level, loading, messages, teach],
  );

  const startModule = (title: string) => {
    setActiveTopic(title);
    void sendLearnMessage(`Start a ${level} ${learnMode} on: ${title}`);
  };

  const pct = profile.data?.percentComplete ?? 0;
  const selfPacedSteps = curriculum.data?.selfPacedPaths?.[level] ?? [];
  const modules = curriculum.data?.modules ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.learnRoot}
      behavior={overlap.keyboardBehavior}
      keyboardVerticalOffset={overlap.keyboardVerticalOffset}
    >
      <View style={styles.learnColumn}>
        <View style={styles.learnChrome}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 12, paddingTop: 4 }} numberOfLines={2}>
          {pct}% · {profile.data?.modulesCompleted ?? 0}/{profile.data?.totalModules ?? "?"} modules
          {curriculum.data?.tagline ? ` · ${curriculum.data.tagline}` : ""}
        </Text>

        <View style={styles.chipWrap}>
          {LEARN_LEVELS.map((lv) => (
            <Pressable
              key={lv}
              onPress={() => {
                setLevel(lv);
                void setLevelMutation.mutateAsync({ creatorId, level: lv });
              }}
              style={[
                styles.chip,
                { backgroundColor: level === lv ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: level === lv ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {lv}
              </Text>
            </Pressable>
          ))}
          {LEARN_MODES.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setLearnMode(m.id)}
              style={[
                styles.chip,
                { backgroundColor: learnMode === m.id ? colors.primary : colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: learnMode === m.id ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
                {m.emoji} {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {learnMode === "practice" && practiceQuestions.data?.questions.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.moduleRow}
          >
            {practiceQuestions.data.questions.map((q) => (
              <Pressable
                key={q.id}
                onPress={() => void sendLearnMessage(q.question)}
                style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 11 }} numberOfLines={3}>
                  {q.topic}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : learnMode === "certification" && certPrep.data ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 6, gap: 4 }}>
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
              {certPrep.data.title}
            </Text>
            <Pressable
              onPress={() =>
                void sendLearnMessage(`Start certification prep for: ${certPrep.data!.topics[0] ?? "fundamentals"}`)
              }
              style={[styles.chip, { alignSelf: "flex-start", backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Start cert prep</Text>
            </Pressable>
          </View>
        ) : selfPacedSteps.length > 0 || modules.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.hScroll}
            contentContainerStyle={styles.moduleRow}
          >
            {selfPacedSteps.map((step) => (
              <Pressable
                key={`${step.order}-${step.title}`}
                onPress={() => {
                  setActiveTopic(step.moduleTitle);
                  void sendLearnMessage(
                    `Start self-paced step: "${step.title}" (${step.moduleTitle}). Guide me step by step.`,
                  );
                }}
                style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>
                  Step {step.order} · {step.estimatedMinutes}m
                </Text>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }} numberOfLines={2}>
                  {step.title}
                </Text>
              </Pressable>
            ))}
            {modules.map((mod) => {
              const done = profile.data?.progress.completedTopics.includes(mod.title);
              return (
                <Pressable
                  key={mod.id}
                  onPress={() => startModule(mod.title)}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: activeTopic === mod.title ? `${colors.primary}18` : colors.surface,
                      borderColor: done ? "#22c55e" : colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }} numberOfLines={2}>
                    {done ? "✓ " : ""}
                    {mod.title}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }} numberOfLines={2}>
                    {mod.description}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        </View>

      <ScrollView
        ref={scrollRef}
        style={styles.learnMessages}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 16 + overlap.scrollPaddingBottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.learnHeader, { backgroundColor: colors.primary }]}>
          <Text style={styles.learnHeaderAvatar}>{creatorAvatar}</Text>
          <Text style={styles.learnHeaderTitle} numberOfLines={1}>
            {creatorName} — Learn
          </Text>
        </View>
        {messages.map((msg, i) => (
          <View
            key={`${i}-${msg.role}`}
            style={[
              styles.bubble,
              msg.role === "user"
                ? { alignSelf: "flex-end", backgroundColor: colors.primary }
                : {
                    alignSelf: "flex-start",
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <Text style={{ color: msg.role === "user" ? "#fff" : colors.foreground, fontSize: 14, lineHeight: 20 }}>
              {msg.text}
            </Text>
          </View>
        ))}
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
      </ScrollView>

      {activeTopic ? (
        <Pressable
          onPress={() => void completeTopic.mutateAsync({ creatorId, topic: activeTopic, mode: learnMode })}
          style={[styles.completeBtn, { borderColor: "#22c55e" }]}
        >
          <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
            Mark "{activeTopic}" complete
          </Text>
        </Pressable>
      ) : null}

      <ComposerDock paddingBottom={overlap.dockPaddingBottom}>
        <View style={styles.inputRow}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask for a lesson, practice quiz, or certification topic…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          onPress={() => void sendLearnMessage(inputText)}
          disabled={loading || !inputText.trim()}
          style={[styles.sendBtn, { backgroundColor: loading || !inputText.trim() ? colors.muted : colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </TouchableOpacity>
        </View>
      </ComposerDock>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
  chatSurface: { flex: 1, minHeight: 0, overflow: "hidden" },
  opsBlocked: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    justifyContent: "center",
    alignItems: "stretch",
  },
  surfaceScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  surfaceScrollContent: {
    flexGrow: 0,
  },
  surfaceRow: {
    flexDirection: "row",
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  surfaceTab: {
    flexShrink: 0,
    minWidth: 88,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  learnRoot: { flex: 1, minHeight: 0, overflow: "hidden" },
  learnColumn: { flex: 1, minHeight: 0, overflow: "hidden" },
  learnChrome: { flexGrow: 0, flexShrink: 0 },
  hScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 88 },
  progressBar: { height: 4, marginHorizontal: 12, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%" },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  moduleRow: { paddingHorizontal: 12, paddingBottom: 8, gap: 8, flexGrow: 0, alignItems: "stretch" },
  moduleCard: { width: 132, borderRadius: 12, borderWidth: 1.5, padding: 8 },
  learnMessages: { flex: 1, minHeight: 120 },
  learnHeader: { borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  learnHeaderAvatar: { fontSize: 22 },
  learnHeaderTitle: { color: "#fff", fontWeight: "700", fontSize: 16, flex: 1 },
  bubble: { maxWidth: "92%", borderRadius: 14, padding: 12 },
  completeBtn: {
    flexShrink: 0,
    marginHorizontal: 12,
    marginBottom: 4,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, flexShrink: 0 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
