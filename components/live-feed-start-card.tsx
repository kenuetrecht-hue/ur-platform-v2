import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function LiveFeedStartCard() {
  const colors = useColors();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [access, setAccess] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("5.00");
  const start = trpc.liveFeed.start.useMutation({
    onSuccess: (feed) => {
      router.push(`/live-feed/${feed.id}`);
    },
  });

  const priceCents = Math.round(Number.parseFloat(price) * 100);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Go live</Text>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        A free live feed is open to anyone on UR who has the link. A paid live feed asks for a ticket
        before they come inside. From the live page you can send up to four co-host links for an interview.
      </Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Name this live feed"
        placeholderTextColor={colors.muted}
        maxLength={80}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <View style={styles.row}>
        {(["free", "paid"] as const).map((choice) => (
          <Pressable
            key={choice}
            onPress={() => setAccess(choice)}
            style={[
              styles.chip,
              {
                backgroundColor: access === choice ? colors.primary : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: access === choice ? "#fff" : colors.foreground, fontWeight: "700" }}>
              {choice === "free" ? "Free" : "Paid"}
            </Text>
          </Pressable>
        ))}
      </View>
      {access === "paid" ? (
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Ticket price, like 5.00"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          maxLength={8}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
        />
      ) : null}
      <Pressable
        disabled={start.isPending || title.trim().length < 1 || (access === "paid" && (priceCents < 100 || priceCents > 20000))}
        onPress={() =>
          start.mutate({
            title: title.trim(),
            access,
            priceCents: access === "paid" ? priceCents : 0,
          })
        }
        style={[styles.btn, { backgroundColor: colors.primary, opacity: title.trim() ? 1 : 0.5 }]}
      >
        {start.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start this live feed</Text>}
      </Pressable>
      {start.error ? <Text style={styles.error}>{start.error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  title: { fontWeight: "800", fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  row: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  error: { color: "#e74c3c", fontSize: 12 },
});
