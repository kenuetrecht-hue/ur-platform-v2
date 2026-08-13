import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing, Platform } from "react-native";
import { LANDING_THEME as T } from "@/lib/landing-theme";
import { LANDING_PLATFORM_UNITY_LINE } from "@/lib/landing-platform-copy";

type BentoCard = {
  id: string;
  title: string;
  avatar: string;
  tag: string;
  lines: string[];
  accent: string;
};

const CARDS: BentoCard[] = [
  {
    id: "techbuilder",
    title: "TechBuilder",
    avatar: "💻",
    tag: "PLATFORM CODER",
    accent: T.brandBlueLight,
    lines: [
      "Scaffold Expo + tRPC + Supabase auth",
      "Debug API routes & MySQL schema",
      "Learn tab → Build sandbox → ship",
      "Voice, hive, live labs — full parity",
    ],
  },
  {
    id: "marina",
    title: "Marina Mechanic AI",
    avatar: "⚓",
    tag: "LIVE DIAGNOSTIC",
    accent: T.electric,
    lines: [
      "Symptom: outboard won't start after storage",
      "→ Check fuel primer bulb pressure",
      "→ Spark at plug? Test kill switch",
      "→ Impeller & lower unit water flow",
    ],
  },
  {
    id: "electrician",
    title: "Electrician Expert AI",
    avatar: "⚡",
    tag: "SHORE POWER",
    accent: "#a78bfa",
    lines: [
      "GFCI protection on every dock pedestal",
      "Corrosion check on marina wiring",
      "NEC-oriented guidance for haul-out",
      "Hive consult: trades + business aligned",
    ],
  },
  {
    id: "content",
    title: "ContentMate",
    avatar: "✨",
    tag: "CREATOR LOOP",
    accent: T.gold,
    lines: [
      "Hook: 'Run your marina like a pro'",
      "Caption draft for Facebook promo",
      "Schedule: Tue live class 7pm",
      "Affiliate link embedded ✓",
    ],
  },
  {
    id: "3d",
    title: "AI 3D Designer",
    avatar: "⬡",
    tag: "MESH PREVIEW",
    accent: "#34d399",
    lines: [
      "Import hull cross-section",
      "Rigging anchor points placed",
      "Export GLB for workspace",
      "Collaborative layer sync…",
    ],
  },
];

function LoopingLines({ lines, accent }: { lines: string[]; accent: string }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
      setIndex((i) => (i + 1) % lines.length);
    }, 2400);
    return () => clearInterval(id);
  }, [fade, lines.length]);

  return (
    <Animated.Text style={[styles.line, { color: accent, opacity: fade }]}>
      {lines[index]}
    </Animated.Text>
  );
}

function BentoTile({ card, wide }: { card: BentoCard; wide?: boolean }) {
  const float = useRef(new Animated.Value(0)).current;
  const enableFloat = Platform.OS !== "web";

  useEffect(() => {
    if (!enableFloat) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2800 + Math.random() * 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2800 + Math.random() * 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [enableFloat, float]);

  const translateY = enableFloat
    ? float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] })
    : 0;

  return (
    <Animated.View
      style={[
        styles.tile,
        wide && styles.tileWide,
        {
          borderColor: card.accent + "55",
          transform: [{ translateY }],
          ...(Platform.OS === "web"
            ? { boxShadow: `0 4px 12px ${card.accent}59` }
            : { shadowColor: card.accent }),
        },
      ]}
    >
      <View style={styles.tileHeader}>
        <Text style={styles.tileAvatar}>{card.avatar}</Text>
        <View style={[styles.livePill, { borderColor: card.accent }]}>
          <View style={[styles.liveDot, { backgroundColor: card.accent }]} />
          <Text style={[styles.liveText, { color: card.accent }]}>{card.tag}</Text>
        </View>
      </View>
      <Text style={styles.tileTitle}>{card.title}</Text>
      <LoopingLines lines={card.lines} accent={card.accent} />
    </Animated.View>
  );
}

export function LandingBentoGrid({ isWide }: { isWide: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTag}>ONE PLATFORM</Text>
      <Text style={styles.sectionTitle}>Every specialist. Same engine.</Text>
      <Text style={styles.sectionSub}>{LANDING_PLATFORM_UNITY_LINE}</Text>
      <View style={[styles.grid, isWide && styles.gridWide]}>
        {CARDS.map((card, i) => (
          <BentoTile key={card.id} card={card} wide={isWide && (i === 0 || i === 1)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 40,
    zIndex: 0,
  },
  sectionTag: {
    color: T.electricDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: { color: T.text, fontSize: 22, fontWeight: "900", marginBottom: 6 },
  sectionSub: { color: T.muted, fontSize: 14, lineHeight: 21, marginBottom: 14, maxWidth: 640 },
  grid: { gap: 12 },
  gridWide: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  tile: {
    flexGrow: 1,
    flexBasis: "100%",
    minHeight: 148,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: T.bgElevated,
    padding: 16,
    ...(Platform.OS !== "web"
      ? {
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }
      : {}),
  },
  tileWide: {
    flexBasis: Platform.OS === "web" ? ("auto" as const) : ("48%" as const),
    minWidth: Platform.OS === "web" ? 280 : undefined,
    maxWidth: "48%",
    flexShrink: 0,
    flexGrow: 1,
  },
  tileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tileAvatar: { fontSize: 26 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  tileTitle: { color: T.text, fontSize: 16, fontWeight: "800", marginTop: 10, marginBottom: 8 },
  line: { fontSize: 13, lineHeight: 20, fontFamily: Platform.OS === "web" ? "monospace" : undefined },
});
