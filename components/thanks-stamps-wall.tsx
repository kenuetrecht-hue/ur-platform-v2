import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";

export function ThanksStampsWall({
  targetType,
  targetId,
  targetName,
  compact = false,
  defaultOpen,
}: {
  targetType: "ai" | "member";
  targetId: string;
  targetName?: string;
  compact?: boolean;
  defaultOpen?: boolean;
}) {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(defaultOpen ?? !compact);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const wall = trpc.thanksStamps.wall.useQuery(
    { targetType, targetId },
    { enabled: isAuthenticated && Boolean(targetId) },
  );
  const wallet = trpc.thanksStamps.wallet.useQuery(undefined, {
    enabled: isAuthenticated && Boolean(targetId),
  });
  const place = trpc.thanksStamps.place.useMutation({
    onSuccess: async (res) => {
      setNotice(res.notice);
      setSelectedId(null);
      setNote("");
      await Promise.all([utils.thanksStamps.wall.invalidate(), utils.thanksStamps.wallet.invalidate()]);
    },
    onError: (e) => setNotice(e.message),
  });

  if (!isAuthenticated) return null;

  const posts = wall.data?.posts ?? [];
  const bag = wallet.data?.items ?? [];
  const who = targetName ?? (targetType === "ai" ? "this AI" : "this page");

  return (
    <View style={[styles.wrap, compact && styles.compact, { borderColor: colors.border }]}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header} hitSlop={6}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: compact ? 12 : 13 }}>
          Thanks wall · {posts.length} stamp{posts.length === 1 ? "" : "s"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{open ? "Hide" : "Show"}</Text>
      </Pressable>
      {open ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            Stickers of appreciation for {who}. Not a tip. Not cash. Creators do not get a payout from stamps.
          </Text>
          {wall.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {posts.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 11 }}>No stamps here yet. Be the first to say thanks.</Text>
          ) : (
            <View style={styles.row}>
              {posts.map((post) => (
                <View key={post.id} style={[styles.chip, { borderColor: post.colorHex, backgroundColor: colors.surface }]}>
                  <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{post.mark}</Text>
                  <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700" }}>{post.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 10 }}>from {post.fromName}</Text>
                  {post.note ? (
                    <Text style={{ color: colors.muted, fontSize: 10 }} numberOfLines={2}>
                      {post.note}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {bag.length > 0 ? (
            <>
              <Text style={{ color: colors.foreground, fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                Stick one of yours
              </Text>
              <View style={styles.row}>
                {bag.slice(0, 12).map((item) => (
                  <Pressable
                    key={item.instanceId}
                    onPress={() => setSelectedId(item.instanceId)}
                    style={[
                      styles.chip,
                      {
                        borderColor: selectedId === item.instanceId ? colors.primary : colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{item.mark}</Text>
                    <Text style={{ color: colors.foreground, fontSize: 11 }}>{item.name}</Text>
                  </Pressable>
                ))}
              </View>
              {selectedId ? (
                <>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Optional note (80 chars)"
                    placeholderTextColor={colors.muted}
                    maxLength={80}
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                  />
                  <Pressable
                    onPress={() =>
                      place.mutate({
                        instanceId: selectedId,
                        targetType,
                        targetId,
                        note: note.trim() || undefined,
                      })
                    }
                    disabled={place.isPending}
                    style={[styles.btn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Stick on {who}</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : (
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              Buy thanks stamps on Profile — 4 per $1 — then stick one here.
            </Text>
          )}
          {notice ? <Text style={{ color: colors.muted, fontSize: 11 }}>{notice}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6, marginHorizontal: 12, marginBottom: 6 },
  compact: { marginHorizontal: 0, marginBottom: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, minWidth: 76, gap: 2 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  btn: { borderRadius: 8, paddingVertical: 8, alignItems: "center" },
});
