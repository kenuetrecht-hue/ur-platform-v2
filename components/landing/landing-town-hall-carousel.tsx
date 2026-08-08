import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { trpc } from "@/lib/trpc";
import { LANDING_THEME as T } from "@/lib/landing-theme";

export function LandingTownHallCarousel() {
  const { data } = trpc.landing.getTownHallPreview.useQuery(undefined, { staleTime: 60_000 });
  const lines = data?.simulation ?? [];
  const [index, setIndex] = useState(0);
  const slide = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!lines.length) return;
    const id = setInterval(() => {
      Animated.timing(slide, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        slide.setValue(0);
        setIndex((i) => (i + 1) % lines.length);
      });
    }, 3200);
    return () => clearInterval(id);
  }, [lines.length, slide]);

  const current = lines[index];
  if (!current) return null;

  const opacity = slide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <View style={styles.wrap}>
      <Text style={styles.tag}>HIVE TOWN HALL PREVIEW</Text>
      <Text style={styles.title}>Multiple AIs. One live session.</Text>
      <Text style={styles.sub}>
        Specialists collaborate on one platform — marina ops, business, trades, and creators in
        sync.
      </Text>

      <View style={styles.stage}>
        <View style={styles.panelRow}>
          {(data?.panel.specialists ?? []).slice(0, 6).map((s) => (
            <View key={s.id} style={styles.avatarChip}>
              <Text style={styles.avatar}>{s.avatar}</Text>
            </View>
          ))}
        </View>

        <Animated.View style={[styles.bubble, { opacity, transform: [{ translateX }] }]}>
          <Text style={styles.speaker}>
            {current.avatar} {current.speaker}
          </Text>
          <Text style={styles.line}>{current.line}</Text>
        </Animated.View>

        <View style={styles.dots}>
          {lines.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 32 },
  tag: { color: T.electric, fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  title: { color: T.text, fontSize: 22, fontWeight: "800", marginBottom: 8 },
  sub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  stage: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bgElevated,
    padding: 18,
  },
  panelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  avatarChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,212,255,0.08)",
  },
  avatar: { fontSize: 18 },
  bubble: {
    borderLeftWidth: 3,
    borderLeftColor: T.electric,
    paddingLeft: 12,
    minHeight: 72,
  },
  speaker: { color: T.electric, fontWeight: "800", fontSize: 13, marginBottom: 6 },
  line: { color: T.text, fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: "row", gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.muted, opacity: 0.4 },
  dotActive: { backgroundColor: T.electric, opacity: 1, width: 18 },
});
