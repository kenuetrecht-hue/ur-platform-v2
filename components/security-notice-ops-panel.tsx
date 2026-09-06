import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { SECURITY_BREACH_PROMISE } from "@/lib/signup-step-copy";

export function SecurityNoticeOpsPanel() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("Security notice — change your password");
  const [body, setBody] = useState(
    "We learned account information may have been exposed. Change your UR password now. If you used that password anywhere else, change it there too.",
  );
  const list = trpc.conduct.listSecurityNotices.useQuery();
  const publish = trpc.conduct.publishSecurityNotice.useMutation({
    onSuccess: () => {
      void utils.conduct.listSecurityNotices.invalidate();
      void utils.conduct.securityNotice.invalidate();
    },
  });

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Member security notice</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{SECURITY_BREACH_PROMISE}</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        maxLength={2000}
        multiline
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, minHeight: 80 }]}
      />
      <Pressable
        onPress={() => publish.mutate({ title, body })}
        disabled={publish.isPending}
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        {publish.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "800" }}>Notify all members now</Text>
        )}
      </Pressable>
      {(list.data ?? []).slice(0, 3).map((notice) => (
        <Text key={notice.id} style={{ color: colors.muted, fontSize: 11 }}>
          {new Date(notice.publishedAt).toLocaleString()} · {notice.title} · email queued
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13 },
  btn: { borderRadius: 10, padding: 12, alignItems: "center" },
});
