import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { PublicCartoonProject } from "@/lib/cartoon-studio";
import { useFairShowWatch } from "@/hooks/use-fair-show-watch";
import { speakPageCopy, stopPageCopy } from "@/lib/speak-page-copy";

type Props = {
  project: PublicCartoonProject;
  /** Public signup sample — no Fair Show tracking. */
  sample?: boolean;
};

export function CartoonStudioPlayer({ project, sample = false }: Props) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scene = project.scenes[index] ?? project.scenes[0];
  const watchedSeconds = useMemo(
    () => project.scenes.slice(0, index).reduce((sum, item) => sum + item.durationSeconds, 0),
    [project.scenes, index],
  );
  const { pulse } = useFairShowWatch({
    contentId: project.id,
    kind: "cartoon",
    durationSeconds: project.totalSeconds,
    enabled: !sample,
  });

  useEffect(() => () => stopPageCopy(), []);

  useEffect(() => {
    if (!playing || !scene) return;
    let cancelled = false;
    void (async () => {
      if (scene.voiceEnabled && scene.narration.trim()) {
        await speakPageCopy(scene.narration);
      } else {
        await new Promise((resolve) => setTimeout(resolve, scene.durationSeconds * 1000));
      }
      if (cancelled) return;
      const nextWatched = watchedSeconds + scene.durationSeconds;
      if (index + 1 < project.scenes.length) {
        pulse(nextWatched);
        setIndex(index + 1);
      } else {
        pulse(nextWatched, true);
        setPlaying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playing, index, scene, project.scenes.length, watchedSeconds, pulse]);

  if (!scene) return null;

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          minHeight: 220,
          borderRadius: 16,
          padding: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
          Scene {scene.order} / {project.scenes.length} · {scene.durationSeconds}s
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>{scene.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          {playing ? "Listen — Uri is talking. You do not have to read a script." : scene.caption}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={() => {
            stopPageCopy();
            setIndex(0);
            setPlaying(true);
          }}
          style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {playing ? "Uri is talking…" : sample ? "Hear Uri explain" : "Play cartoon"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(Math.max(0, index - 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(Math.min(project.scenes.length - 1, index + 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Next</Text>
        </Pressable>
      </View>
      {Platform.OS !== "web" ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Download the cartoon file from the website. The phone app plays the same scenes here.
        </Text>
      ) : null}
    </View>
  );
}
