import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { scratchMusicStudio } from "@/lib/music-studio-playback";

type Props = {
  spinning: boolean;
  bpm: number;
  title: string;
  deckName?: string;
  compact?: boolean;
};

export function MusicStudioTurntable({ spinning, bpm, title, deckName, compact }: Props) {
  const colors = useColors();
  const spin = useRef(new Animated.Value(0)).current;
  const lastScratch = useRef(0);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    loopRef.current?.stop();
    if (!spinning) {
      return;
    }
    spin.setValue(0);
    const duration = Math.max(1200, Math.round(2400 * (90 / Math.max(60, bpm))));
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [bpm, spin, spinning]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gesture) => {
          const now = Date.now();
          if (now - lastScratch.current < 90) return;
          lastScratch.current = now;
          const intensity = Math.min(1.4, Math.abs(gesture.vx) * 0.8 + Math.abs(gesture.dx) / 80);
          scratchMusicStudio(intensity || 0.6);
        },
      }),
    [],
  );

  const label = title.trim().slice(0, 18) || "UR Studio";

  return (
    <View
      style={[
        compact ? styles.compact : styles.booth,
        compact ? null : { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.deck}>
        <View style={[styles.armBase, { backgroundColor: colors.muted }]} />
        <View
          style={[
            styles.arm,
            { backgroundColor: colors.muted, transform: [{ rotate: spinning ? "-12deg" : "-38deg" }] },
          ]}
        />
        <Animated.View
          {...pan.panHandlers}
          style={[styles.platter, { borderColor: "#1a1a1a", transform: [{ rotate }] }]}
          accessibilityLabel={`${deckName || "Studio"} turntable. Drag to scratch.`}
        >
          {[0.22, 0.38, 0.54, 0.7].map((inset) => (
            <View
              key={inset}
              style={[
                styles.groove,
                {
                  top: `${inset * 50}%`,
                  left: `${inset * 50}%`,
                  right: `${inset * 50}%`,
                  bottom: `${inset * 50}%`,
                  borderColor: "rgba(255,255,255,0.12)",
                },
              ]}
            />
          ))}
          <View style={[styles.label, { backgroundColor: colors.primary }]}>
            <Text style={styles.labelText} numberOfLines={2}>
              {label}
            </Text>
          </View>
        </Animated.View>
      </View>
      <View style={[compact ? styles.compactCopy : { flex: 1, gap: 4 }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", textAlign: compact ? "center" : "left" }}>
          {deckName || "Turntable"}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 17,
            textAlign: compact ? "center" : "left",
          }}
        >
          {spinning ? `Spinning at ${bpm} BPM.` : "Hit Play mix and the platter turns."} Drag to scratch.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { alignItems: "center", gap: 8, flex: 1, minWidth: 148 },
  compactCopy: { gap: 2, paddingHorizontal: 4 },
  booth: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  deck: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  platter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#111",
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  groove: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  label: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  labelText: { color: "#fff", fontSize: 8, fontWeight: "800", textAlign: "center" },
  armBase: { position: "absolute", top: 8, right: 10, width: 14, height: 14, borderRadius: 7, zIndex: 2 },
  arm: {
    position: "absolute",
    top: 14,
    right: 16,
    width: 4,
    height: 78,
    borderRadius: 2,
    zIndex: 2,
    transformOrigin: "top center",
  },
});
