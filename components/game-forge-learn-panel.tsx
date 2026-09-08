import { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { ComposerDock } from "@/components/composer-dock";

type LearnLevel = "beginner" | "intermediate" | "advanced";
type LearnMode = "lesson" | "practice" | "certification" | "on_the_job" | "conversation";

type ChatMessage = { role: "user" | "ai"; text: string };

export type GameForgeLearnPanelProps = {
  creatorId: string;
  creatorName: string;
  onTryInSandbox?: (file: { path: string; content: string }) => void;
};

const LEARN_LEVELS: LearnLevel[] = ["beginner", "intermediate", "advanced"];
const LEARN_MODES: { id: LearnMode; label: string; emoji: string }[] = [
  { id: "lesson", label: "Lesson", emoji: "📖" },
  { id: "practice", label: "Practice", emoji: "✏️" },
  { id: "conversation", label: "Coach me", emoji: "💬" },
  { id: "on_the_job", label: "Real dev work", emoji: "🔧" },
  { id: "certification", label: "Interview prep", emoji: "🎓" },
];

export function GameForgeLearnPanel({
  creatorId,
  creatorName,
  onTryInSandbox,
}: GameForgeLearnPanelProps) {
  const colors = useColors();
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
  const practiceQuestions = trpc.aiLearning.getPracticeQuestions.useQuery({ creatorId, count: 6 });

  const teach = trpc.aiLearning.teach.useMutation();
  const setLevelMutation = trpc.aiLearning.setLevel.useMutation({
    onSuccess: () => void utils.aiLearning.getProfile.invalidate({ creatorId }),
  });
  const completeTopic = trpc.aiLearning.completeTopic.useMutation({
    onSuccess: () => void utils.aiLearning.getProfile.invalidate({ creatorId }),
  });

  const selfPacedSteps =
    curriculum.data?.selfPacedPaths?.[level] ?? [];

  useEffect(() => {
    if (profile.data?.progress.level) {
      setLevel(profile.data.progress.level);
    }
  }, [profile.data?.progress.level]);

  useEffect(() => {
    const intro = `Welcome to **Learn Game Dev** with ${creatorName}.\n\nYou can learn to build video games **on your own** — I guide you step by step, then you practice in the **Build** tab.\n\nPick a module below or ask anything. Level: **${level}**.`;
    setMessages([{ role: "ai", text: intro }]);
    setActiveTopic(null);
  }, [creatorName, level, learnMode]);

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
    void sendLearnMessage(
      `Teach me "${title}" at ${level} level. I want to learn this so I can code it myself — give me a lesson with a hands-on exercise.`,
    );
  };

  const startSelfPacedStep = (moduleTitle: string, stepTitle: string) => {
    setActiveTopic(moduleTitle);
    void sendLearnMessage(
      `Start self-paced step: "${stepTitle}" (${moduleTitle}). Guide me — I'll write the code myself.`,
    );
  };

  const pct = profile.data?.percentComplete ?? 0;

  return (
    <View style={styles.learnRoot}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}14`, borderColor: colors.primary }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 13 }}>
          🎓 Code on your own
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {curriculum.data?.tagline ??
            "Step-by-step lessons, solo exercises, and sandbox practice — become independent."}
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, paddingHorizontal: 12, paddingTop: 4 }}>
        Progress: {pct}% · {profile.data?.modulesCompleted ?? 0}/{profile.data?.totalModules ?? 12} modules
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelScroll} contentContainerStyle={styles.chipRow}>
        {LEARN_LEVELS.map((lv) => (
          <Pressable
            key={lv}
            onPress={() => {
              setLevel(lv);
              void setLevelMutation.mutateAsync({ creatorId, level: lv });
            }}
            style={[styles.chip, { backgroundColor: level === lv ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: level === lv ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
              {lv}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selfPacedSteps.length > 0 ? (
        <View style={{ paddingHorizontal: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: 6, paddingHorizontal: 4 }}>
            SELF-PACED PATH · {level}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {selfPacedSteps.map((step) => (
              <Pressable
                key={step.order}
                onPress={() => startSelfPacedStep(step.moduleTitle, step.title)}
                style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>
                  STEP {step.order} · ~{step.estimatedMinutes}m
                </Text>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12, marginTop: 4 }}>
                  {step.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }} numberOfLines={2}>
                  {step.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {LEARN_MODES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setLearnMode(m.id)}
            style={[styles.chip, { backgroundColor: learnMode === m.id ? colors.primary : colors.surface, borderColor: colors.border }]}
          >
            <Text style={{ color: learnMode === m.id ? "#fff" : colors.foreground, fontSize: 12, fontWeight: "600" }}>
              {m.emoji} {m.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {curriculum.data?.modules ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleRow}>
          {curriculum.data.modules.map((mod) => {
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
                  {done ? "✓ " : ""}{mod.title}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }} numberOfLines={2}>
                  {mod.description}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {practiceQuestions.data?.questions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {practiceQuestions.data.questions.map((q) => (
            <View key={q.id} style={[styles.exerciseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Pressable onPress={() => void sendLearnMessage(q.question)}>
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 11 }}>{q.topic}</Text>
                <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }} numberOfLines={3}>
                  Tap to start exercise
                </Text>
              </Pressable>
              {"starterFile" in q && q.starterFile && onTryInSandbox ? (
                <Pressable
                  onPress={() =>
                    onTryInSandbox(q.starterFile as { path: string; content: string })
                  }
                  style={[styles.sandboxBtn, { borderColor: colors.primary }]}
                >
                  <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>
                    Try in Build →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, index) => (
          <View
            key={`${index}-${msg.role}`}
            style={[
              styles.bubble,
              msg.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            <Text style={{ color: msg.role === "user" ? "#fff" : colors.foreground, fontSize: 14, lineHeight: 20 }}>
              {msg.text}
            </Text>
          </View>
        ))}
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} /> : null}
      </ScrollView>

      {activeTopic ? (
        <Pressable
          onPress={() => {
            void completeTopic.mutateAsync({ creatorId, topic: activeTopic, mode: learnMode });
            void sendLearnMessage("I finished this topic. What should I learn next on my own?");
          }}
          style={[styles.completeBtn, { borderColor: "#22c55e" }]}
        >
          <Text style={{ color: "#22c55e", fontWeight: "700", fontSize: 12, textAlign: "center" }}>
            ✓ Mark "{activeTopic}" complete
          </Text>
        </Pressable>
      ) : null}

      <ComposerDock>
        <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
          placeholder="Ask how to build your game…"
          placeholderTextColor={colors.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          editable={!loading}
        />
        <Pressable
          onPress={() => void sendLearnMessage(inputText)}
          disabled={loading || !inputText.trim()}
          style={[styles.sendBtn, { backgroundColor: loading || !inputText.trim() ? colors.muted : colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Learn</Text>
        </Pressable>
        </View>
      </ComposerDock>
    </View>
  );
}

const styles = StyleSheet.create({
  learnRoot: { flex: 1 },
  banner: { marginHorizontal: 8, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  progressBar: { height: 4, marginHorizontal: 12, marginTop: 8, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%" },
  levelScroll: { maxHeight: 44, marginTop: 8 },
  chipRow: { paddingHorizontal: 8, gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  stepCard: { width: 160, borderRadius: 12, borderWidth: 1, padding: 10, marginRight: 8 },
  moduleRow: { paddingHorizontal: 8, gap: 8, paddingVertical: 6 },
  moduleCard: { width: 140, borderRadius: 12, borderWidth: 1, padding: 10, marginRight: 8 },
  exerciseCard: { width: 130, borderRadius: 12, borderWidth: 1, padding: 10, marginRight: 8 },
  sandboxBtn: { marginTop: 8, borderWidth: 1, borderRadius: 8, paddingVertical: 6, alignItems: "center" },
  messages: { flex: 1, marginTop: 8 },
  messagesContent: { padding: 12, gap: 8 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: "92%" },
  userBubble: { alignSelf: "flex-end" },
  aiBubble: { alignSelf: "flex-start", borderWidth: 1 },
  completeBtn: { marginHorizontal: 12, marginBottom: 4, borderWidth: 1, borderRadius: 10, padding: 10 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, maxHeight: 100, fontSize: 14 },
  sendBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
});
