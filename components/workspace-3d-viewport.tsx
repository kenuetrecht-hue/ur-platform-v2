import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useColors } from "@/hooks/use-colors";

type Specialist = {
  id: string;
  name: string;
  avatar: string;
  category?: string;
};

type Workspace3DViewportProps = {
  projectName: string;
  projectType: string;
  description?: string;
  specialists: Specialist[];
  selectedAiId?: string;
  onSelectAi?: (aiId: string) => void;
  height?: number;
};

const PROJECT_SHAPES: Record<string, string> = {
  merchandise: "👕",
  "3d_printing": "🖨️",
  architecture: "🏛️",
  robotics: "🤖",
  software: "💻",
  general: "✨",
};

/** Web-only CSS 3D stage — no extra deps, works in Expo web. */
function WebCss3DStage({
  projectName,
  projectType,
  specialists,
  selectedAiId,
  onSelectAi,
  height,
}: Workspace3DViewportProps) {
  const colors = useColors();
  const spin = useState(() => new Animated.Value(0))[0];
  const shape = PROJECT_SHAPES[projectType] ?? "✨";
  const orbit = specialists.slice(0, 6);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      style={[
        styles.webWrap,
        { height, borderColor: colors.border, backgroundColor: "#0f1118" },
      ]}
    >
      <View style={styles.stageLabel}>
        <Text style={styles.labelText}>
          {shape} {projectName || "Workspace"} · drag specialists · orbit view
        </Text>
      </View>

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.orbitRing,
            Platform.OS === "web"
              ? ({ transform: [{ perspective: 600 }, { rotateY }] } as object)
              : { transform: [{ rotate: rotateY }] },
          ]}
        >
          <View style={styles.pedestal}>
            <Text style={{ fontSize: 36 }}>{shape}</Text>
            <Text style={styles.pedestalLabel} numberOfLines={1}>
              {projectName || "Design"}
            </Text>
          </View>

          {orbit.map((spec, i) => {
            const angle = (i / Math.max(orbit.length, 1)) * 360;
            const isSelected = selectedAiId === spec.id;
            return (
              <Pressable
                key={spec.id}
                onPress={() => onSelectAi?.(spec.id)}
                style={[
                  styles.orb,
                  {
                    transform: [
                      { rotateY: `${angle}deg` },
                      { translateZ: 90 },
                      { rotateY: `-${angle}deg` },
                    ] as never,
                    borderColor: isSelected ? colors.primary : "#ffffff40",
                    backgroundColor: isSelected ? `${colors.primary}55` : "#1e2433",
                  },
                ]}
              >
                <Text style={{ fontSize: 20 }}>{spec.avatar}</Text>
                <Text style={styles.orbLabel}>{spec.name.split(" ")[0]}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipBar}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }}
      >
        {specialists.slice(0, 8).map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSelectAi?.(s.id)}
            style={[
              styles.chip,
              {
                borderColor: selectedAiId === s.id ? colors.primary : "#ffffff30",
                backgroundColor: selectedAiId === s.id ? `${colors.primary}40` : "rgba(0,0,0,0.45)",
              },
            ]}
          >
            <Text style={{ fontSize: 14 }}>{s.avatar}</Text>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
              {s.name.split(" ")[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Interactive 3D workspace viewport.
 * Web: CSS 3D stage with orbiting AI specialists.
 * Native: rich preview with specialist chips.
 */
export function Workspace3DViewport(props: Workspace3DViewportProps) {
  const colors = useColors();
  const { projectName, projectType, description, specialists, selectedAiId, onSelectAi, height = 300 } =
    props;
  const shape = PROJECT_SHAPES[projectType] ?? "✨";

  if (Platform.OS === "web") {
    return <WebCss3DStage {...props} />;
  }

  return (
    <View
      style={[
        styles.container,
        { height, borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <Text style={{ fontSize: 40, textAlign: "center" }}>{shape}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{projectName || "Untitled"}</Text>
      {description ? (
        <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", marginTop: 6 }}>
        Open on web for the full 3D canvas · tap a specialist below to collaborate
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        {specialists.slice(0, 8).map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onSelectAi?.(s.id)}
            style={[
              styles.chip,
              {
                borderColor: selectedAiId === s.id ? colors.primary : colors.border,
                backgroundColor: selectedAiId === s.id ? `${colors.primary}20` : colors.background,
              },
            ]}
          >
            <Text style={{ fontSize: 18 }}>{s.avatar}</Text>
            <Text style={{ color: colors.foreground, fontSize: 10, fontWeight: "600" }}>
              {s.name.split(" ")[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  webWrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  title: { fontWeight: "800", fontSize: 15, textAlign: "center" },
  stageLabel: { position: "absolute", top: 8, left: 8, right: 8, zIndex: 2 },
  labelText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbitRing: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    transformStyle: "preserve-3d",
  } as object,
  pedestal: {
    width: 72,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#2a3550",
    borderWidth: 2,
    borderColor: "#4a6fa5",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateZ: 0 }],
    gap: 2,
  } as object,
  pedestalLabel: {
    color: "#cde",
    fontSize: 9,
    fontWeight: "700",
    maxWidth: 64,
    textAlign: "center",
  },
  orb: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    transformStyle: "preserve-3d",
  } as object,
  orbLabel: { color: "#fff", fontSize: 8, fontWeight: "700" },
  chipBar: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    maxHeight: 44,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
});
