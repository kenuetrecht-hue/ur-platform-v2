import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type PostTone = "casual" | "funny" | "heartfelt" | "professional" | "hype" | "question";

const TONES: { id: PostTone; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "funny", label: "Funny" },
  { id: "heartfelt", label: "Heartfelt" },
  { id: "professional", label: "Pro" },
  { id: "hype", label: "Hype" },
  { id: "question", label: "Question" },
];

type Props = {
  onDraft: (draft: string) => void;
  onAiAssisted: () => void;
};

export function SocialPostAssistantBar({ onDraft, onAiAssisted }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState<PostTone>("casual");

  const status = trpc.social.postAssistantStatus.useQuery();
  const purchase = trpc.social.purchasePostAssistant.useMutation({
    onSuccess: () => void utils.social.postAssistantStatus.invalidate(),
  });
  const assist = trpc.social.assistPostDraft.useMutation({
    onSuccess: (result) => {
      onDraft(result.draft);
      onAiAssisted();
      void utils.social.postAssistantStatus.invalidate();
    },
  });

  const hasAccess = status.data?.hasAccess ?? false;
  const assistsRemaining = status.data?.assistsRemaining ?? 0;

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: `${colors.primary}08` }]}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 14 }}>
          ✨ Social Post Assistant
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          {hasAccess ? `${assistsRemaining} assists left` : "Subscribe — no creator account needed"} {expanded ? "▲" : "▼"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
            Not a content creator? Get AI help writing personal updates, captions, and hashtags for your feed.
          </Text>

          {!hasAccess ? (
            <View style={{ gap: 8 }}>
              {(status.data?.plans ?? []).map((plan) => (
                <Pressable
                  key={plan.plan}
                  disabled={purchase.isPending}
                  onPress={() => purchase.mutate({ plan: plan.plan })}
                  style={[styles.planBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>
                    You pay ${plan.priceUsd} → You get {plan.assists} AI post assists
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    Valid for {plan.durationDays} day{plan.durationDays > 1 ? "s" : ""} · {plan.label} plan
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                placeholder="What do you want to post about? e.g. weekend hike, new recipe, job update…"
                placeholderTextColor={colors.muted}
                multiline
                style={[styles.promptInput, { borderColor: colors.border, color: colors.foreground }]}
              />

              <View style={styles.toneRow}>
                {TONES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setTone(t.id)}
                    style={[
                      styles.toneChip,
                      {
                        backgroundColor: tone === t.id ? colors.primary : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: tone === t.id ? "#fff" : colors.foreground,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                disabled={!prompt.trim() || assist.isPending}
                onPress={() => assist.mutate({ prompt: prompt.trim(), tone })}
                style={[styles.generateBtn, { backgroundColor: colors.primary }]}
              >
                {assist.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Generate post draft</Text>
                )}
              </Pressable>

              {assist.error ? (
                <Text style={{ color: "#c0392b", fontSize: 12 }}>{assist.error.message}</Text>
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planBtn: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 2 },
  promptInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 64,
    fontSize: 14,
    textAlignVertical: "top",
  },
  toneRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  toneChip: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  generateBtn: { borderRadius: 10, padding: 12, alignItems: "center" },
});
