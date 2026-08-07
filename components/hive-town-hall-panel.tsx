import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useOverlapInsets } from "@/hooks/use-overlap-insets";
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";

type PanelMode = "all_categories" | "category" | "recommended" | "custom";

const PANEL_MODES: Array<{ id: PanelMode; label: string; hint: string }> = [
  {
    id: "all_categories",
    label: "Everyone (by category)",
    hint: "One lead specialist per category — closest to a full town hall.",
  },
  {
    id: "recommended",
    label: "Best match",
    hint: "Specialists most relevant to your first question.",
  },
  {
    id: "category",
    label: "One category",
    hint: "All specialists in a single field.",
  },
];

function formatSessionTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function HiveTownHallPanel() {
  const colors = useColors();
  const overlap = useOverlapInsets({
    headerChromeHeight: LAYOUT_OVERLAP.AIS_TAB_CHROME_HEIGHT,
  });
  const scrollRef = useRef<ScrollView>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [title, setTitle] = useState("Hive Town Hall");
  const [seedMessage, setSeedMessage] = useState("");
  const [panelMode, setPanelMode] = useState<PanelMode>("all_categories");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sessionsQuery = trpc.hiveTownHall.listSessions.useQuery(undefined, {
    staleTime: 15_000,
  });
  const panelPreview = trpc.hiveTownHall.previewPanel.useQuery({
    mode: panelMode,
    seedMessage: seedMessage.trim() || undefined,
  });
  const sessionQuery = trpc.hiveTownHall.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: Boolean(activeSessionId), refetchInterval: activeSessionId ? 30_000 : false },
  );

  const scheduleMutation = trpc.hiveTownHall.schedule.useMutation({
    onSuccess: (data) => {
      void sessionsQuery.refetch();
      setActiveSessionId(data.session.id);
    },
  });
  const sendMutation = trpc.hiveTownHall.sendMessage.useMutation({
    onSuccess: () => {
      void sessionQuery.refetch();
      setInputText("");
    },
  });
  const endMutation = trpc.hiveTownHall.endSession.useMutation({
    onSuccess: () => {
      void sessionsQuery.refetch();
      void sessionQuery.refetch();
    },
  });

  const liveSessions = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => s.status === "live"),
    [sessionsQuery.data],
  );
  const upcomingSessions = useMemo(
    () => (sessionsQuery.data ?? []).filter((s) => s.status === "scheduled"),
    [sessionsQuery.data],
  );

  const startNow = useCallback(async () => {
    setLoading(true);
    setSendError(null);
    try {
      await scheduleMutation.mutateAsync({
        title: title.trim() || "Hive Town Hall",
        scheduledAt: new Date().toISOString(),
        panelMode,
        seedMessage: seedMessage.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [panelMode, scheduleMutation, seedMessage, title]);

  const scheduleInOneHour = useCallback(async () => {
    setLoading(true);
    setSendError(null);
    try {
      const at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await scheduleMutation.mutateAsync({
        title: title.trim() || "Hive Town Hall",
        scheduledAt: at,
        panelMode,
        seedMessage: seedMessage.trim() || undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [panelMode, scheduleMutation, seedMessage, title]);

  const sendMessage = useCallback(async () => {
    if (!activeSessionId || !inputText.trim() || sendMutation.isPending) return;
    setLoading(true);
    setSendError(null);
    try {
      await sendMutation.mutateAsync({
        sessionId: activeSessionId,
        message: inputText.trim(),
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not send message.";
      setSendError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, inputText, sendMutation]);

  const activeSession = sessionQuery.data?.session;
  const turns = sessionQuery.data?.turns ?? [];
  const panel = sessionQuery.data?.panel ?? panelPreview.data?.panel ?? [];
  const canChat = activeSession?.status === "live";

  if (!activeSessionId) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.setupContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>🏛️ Hive Town Hall</Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>
            Schedule a meeting with multiple AI specialists at once. Free for you as platform owner —
            each question goes to the whole panel.
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.foreground }]}>Meeting title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Hive Town Hall"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>First question (optional — helps pick panel)</Text>
        <TextInput
          value={seedMessage}
          onChangeText={setSeedMessage}
          placeholder="e.g. What are typical home prices in my area?"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.inputMultiline, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.surface }]}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Panel</Text>
        {PANEL_MODES.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => setPanelMode(mode.id)}
            style={[
              styles.modeRow,
              {
                borderColor: panelMode === mode.id ? colors.primary : colors.border,
                backgroundColor: panelMode === mode.id ? `${colors.primary}18` : colors.surface,
              },
            ]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>{mode.label}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{mode.hint}</Text>
          </Pressable>
        ))}

        {panelPreview.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
        ) : panel.length > 0 ? (
          <View style={[styles.panelPreview, { borderColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 6 }}>
              {panel.length} specialist{panel.length === 1 ? "" : "s"} on panel
            </Text>
            <View style={styles.panelChips}>
              {panel.map((p) => (
                <View key={p.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 14 }}>{p.avatar}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 10, maxWidth: 72 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={() => void startNow()}
            disabled={loading || scheduleMutation.isPending}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          >
            <Text style={styles.primaryBtnText}>Start now</Text>
          </Pressable>
          <Pressable
            onPress={() => void scheduleInOneHour()}
            disabled={loading || scheduleMutation.isPending}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Schedule in 1 hour</Text>
          </Pressable>
        </View>

        {scheduleMutation.error ? (
          <Text style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>
            {scheduleMutation.error.message}
          </Text>
        ) : null}

        {liveSessions.length > 0 ? (
          <View style={styles.sessionList}>
            <Text style={[styles.label, { color: colors.foreground }]}>Live now</Text>
            {liveSessions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setActiveSessionId(s.id)}
                style={[styles.sessionRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{s.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{s.specialistIds.length} specialists</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {upcomingSessions.length > 0 ? (
          <View style={styles.sessionList}>
            <Text style={[styles.label, { color: colors.foreground }]}>Upcoming</Text>
            {upcomingSessions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setActiveSessionId(s.id)}
                style={[styles.sessionRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>{s.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 11 }}>{formatSessionTime(s.scheduledAt)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={overlap.keyboardBehavior}
      keyboardVerticalOffset={overlap.keyboardVerticalOffset}
    >
      <View style={[styles.sessionHeader, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={() => setActiveSessionId(null)} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.foreground, fontWeight: "700" }} numberOfLines={1}>
            {activeSession?.title ?? "Town Hall"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11 }}>
            {activeSession?.status === "live"
              ? `Live · ${panel.length} specialists`
              : activeSession
                ? `Starts ${formatSessionTime(activeSession.scheduledAt)}`
                : "Loading…"}
          </Text>
        </View>
        {activeSession?.status === "live" ? (
          <Pressable
            onPress={() => endMutation.mutate({ sessionId: activeSessionId! })}
            hitSlop={8}
          >
            <Text style={{ color: colors.muted, fontSize: 11 }}>End</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: 16 + overlap.scrollPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {panel.length > 0 ? (
          <View style={[styles.panelPreview, { borderColor: colors.border, marginBottom: 8 }]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Panel</Text>
            <Text style={{ color: colors.foreground, fontSize: 12 }}>
              {panel.map((p) => `${p.avatar} ${p.name}`).join(" · ")}
            </Text>
          </View>
        ) : null}

        {turns.length === 0 ? (
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 24, fontSize: 13 }}>
            {canChat
              ? "Ask your question — every specialist on the panel will respond."
              : "Waiting for the scheduled start time…"}
          </Text>
        ) : null}

        {turns.map((turn) => (
          <View key={turn.id} style={styles.turnBlock}>
            <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontSize: 14 }}>{turn.userMessage}</Text>
            </View>

            {turn.synthesis ? (
              <View style={[styles.synthesisBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 4 }}>🎙️ Moderator summary</Text>
                <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>{turn.synthesis}</Text>
              </View>
            ) : null}

            {turn.replies.map((r) => (
              <View
                key={`${turn.id}-${r.creatorId}`}
                style={[styles.specialistBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 13 }}>
                  {r.avatar} {r.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 10 }}>{r.category}</Text>
                <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                  {r.reply}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {(loading || sendMutation.isPending) && <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />}
        {sendError ? (
          <Text style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{sendError}</Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.composer,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: overlap.dockPaddingBottom,
          },
        ]}
      >
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={canChat ? "Message the whole panel…" : "Not live yet"}
          placeholderTextColor={colors.muted}
          editable={canChat && !loading}
          multiline
          style={[styles.composerInput, { color: colors.foreground }]}
        />
        <Pressable
          onPress={() => void sendMessage()}
          disabled={!canChat || !inputText.trim() || loading || sendMutation.isPending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: canChat && inputText.trim() ? colors.primary : colors.border,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  setupContent: { padding: 12, paddingBottom: 24 },
  hero: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  heroTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  heroSub: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: "top",
  },
  modeRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  panelPreview: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
  panelChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  actions: { gap: 8, marginTop: 16 },
  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  secondaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  sessionList: { marginTop: 16 },
  sessionRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatContent: { padding: 12, paddingBottom: 16 },
  turnBlock: { marginBottom: 16 },
  userBubble: { alignSelf: "flex-end", maxWidth: "92%", borderRadius: 14, padding: 12, marginBottom: 8 },
  synthesisBubble: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  specialistBubble: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 6 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerInput: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
});
