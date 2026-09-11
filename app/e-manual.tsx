import { useEffect } from "react";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useColors } from "@/hooks/use-colors";
import { clearGiveJoinEmanual } from "@/lib/join-emanual-handoff";
import {
  JOIN_EMANUAL_GIFT_LINE,
  JOIN_EMANUAL_MONEY_NOTES,
  JOIN_EMANUAL_STEPS,
  JOIN_EMANUAL_SUBTITLE,
  JOIN_EMANUAL_TITLE,
} from "@/lib/join-emanual";
import { getPlatformPublicOrigin } from "@/lib/platform-urls";

function printManual() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.print();
  }
}

export default function JoinEmanualScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ joined?: string }>();
  const justJoined = params.joined === "1";

  useEffect(() => {
    clearGiveJoinEmanual();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Link href={isAuthenticated ? "/(tabs)" : "/welcome"} asChild>
            <Pressable>
              <Text style={[styles.back, { color: colors.muted }]}>
                {isAuthenticated ? "← Home" : "← Homepage"}
              </Text>
            </Pressable>
          </Link>
          <Pressable
            onPress={printManual}
            style={[styles.printBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.printText}>Print / Save as PDF</Text>
          </Pressable>
        </View>

        {justJoined ? (
          <View style={[styles.gift, { borderColor: colors.primary, backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.giftTitle, { color: colors.foreground }]}>Welcome — this is yours</Text>
            <Text style={[styles.body, { color: colors.muted }]}>{JOIN_EMANUAL_GIFT_LINE}</Text>
          </View>
        ) : null}

        <Text style={[styles.kicker, { color: colors.primary }]}>FREE TO EVERY NEW MEMBER</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{JOIN_EMANUAL_TITLE}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>{JOIN_EMANUAL_SUBTITLE}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Official site: {getPlatformPublicOrigin()} — follow the taps in order.
        </Text>

        {JOIN_EMANUAL_STEPS.map((step) => (
          <View
            key={step.number}
            style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.stepNum, { color: colors.primary }]}>Step {step.number}</Text>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>{step.title}</Text>
            {step.clicks.map((line) => (
              <Text key={line} style={[styles.bullet, { color: colors.foreground }]}>
                · {line}
              </Text>
            ))}
          </View>
        ))}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.stepTitle, { color: colors.foreground }]}>Money rules (read these)</Text>
          {JOIN_EMANUAL_MONEY_NOTES.map((line) => (
            <Text key={line} style={[styles.bullet, { color: colors.foreground }]}>
              · {line}
            </Text>
          ))}
        </View>

        {isAuthenticated ? (
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.printText}>I have the e-manual — go to Home</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/login")}
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.printText}>Join or sign in and get this e-manual</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  back: { fontSize: 14, fontWeight: "600" },
  printBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  printText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  gift: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  giftTitle: { fontSize: 16, fontWeight: "800" },
  kicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: "900" },
  sub: { fontSize: 16, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  stepNum: { fontSize: 12, fontWeight: "800" },
  stepTitle: { fontSize: 18, fontWeight: "800" },
  bullet: { fontSize: 14, lineHeight: 21 },
  doneBtn: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4 },
});
