import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useCartoonStudioPlayback } from "@/hooks/use-cartoon-studio-playback";
import type { PublicCartoonProject } from "@/lib/cartoon-studio";
import { CartoonStudioFrame } from "@/components/cartoon-studio-frame";

type Props = {
  project: PublicCartoonProject;
  sample?: boolean;
  extraActions?: ReactNode;
};

/** Shared Uri player — same buttons and scenes on website and app. */
export function CartoonStudioPlayerShell({ project, sample = false, extraActions }: Props) {
  const colors = useColors();
  const { index, setIndex, playing, scene, speechNote, hearUri, stop, sceneCount } =
    useCartoonStudioPlayback(project, sample);

  if (!scene) return null;

  return (
    <View style={{ gap: 10 }} testID="uri-cartoon-player">
      <CartoonStudioFrame svg={scene.frameSvg} title={scene.title} tall={sample} />
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
        {sample
          ? `Scene ${scene.order} / ${sceneCount} · Uri`
          : `Scene ${scene.order} / ${sceneCount} · ${scene.durationSeconds}s`}
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{scene.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        {playing ? "Listen — Uri is talking. You do not have to read a script." : scene.caption}
      </Text>
      {speechNote ? (
        <Text style={{ color: "#f59e0b", fontSize: 13, fontWeight: "700" }}>{speechNote}</Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Pressable
          onPress={hearUri}
          testID="hear-uri"
          accessibilityRole="button"
          style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {playing ? "Uri is talking…" : sample ? "Hear Uri explain" : "Play cartoon"}
          </Text>
        </Pressable>
        {playing ? (
          <Pressable
            onPress={stop}
            testID="stop-uri"
            accessibilityRole="button"
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>Stop</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setIndex(Math.max(0, index - 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(Math.min(sceneCount - 1, index + 1))}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>Next</Text>
        </Pressable>
        {extraActions}
      </View>
    </View>
  );
}
