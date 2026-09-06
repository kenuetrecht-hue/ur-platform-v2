import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  CARTOON_MUSIC_MOODS,
  type CartoonMusicMood,
  type CartoonScene,
  type PublicCartoonProject,
} from "@/lib/cartoon-studio";

type Props = {
  project: PublicCartoonProject;
  disabled?: boolean;
  onChange: (next: {
    sceneOrder?: string[];
    edits?: Array<{
      sceneId: string;
      title?: string;
      narration?: string;
      caption?: string;
      durationSeconds?: number;
      voiceEnabled?: boolean;
      musicMood?: CartoonMusicMood;
      musicVolume?: number;
    }>;
  }) => void;
};

export function CartoonStudioEditor({ project, disabled, onChange }: Props) {
  const colors = useColors();
  const [scenes, setScenes] = useState<CartoonScene[]>(project.scenes);

  useEffect(() => {
    setScenes(project.scenes);
  }, [project.id, project.updatedAt]);

  const remaining = project.billedSeconds - scenes.reduce((sum, scene) => sum + scene.durationSeconds, 0);

  const move = (index: number, direction: -1 | 1) => {
    const next = [...scenes];
    const swap = next[index + direction];
    if (!swap) return;
    next[index + direction] = next[index]!;
    next[index] = swap;
    setScenes(next.map((scene, order) => ({ ...scene, order: order + 1 })));
  };

  const patch = (sceneId: string, update: Partial<CartoonScene>) => {
    setScenes((current) => current.map((scene) => (scene.id === sceneId ? { ...scene, ...update } : scene)));
  };

  const save = () => {
    onChange({
      sceneOrder: scenes.map((scene) => scene.id),
      edits: scenes.map((scene) => ({
        sceneId: scene.id,
        title: scene.title,
        narration: scene.narration,
        caption: scene.caption,
        durationSeconds: scene.durationSeconds,
        voiceEnabled: scene.voiceEnabled,
        musicMood: scene.musicMood,
        musicVolume: scene.musicVolume,
      })),
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>Multi-track editor</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        Four tracks on every scene: picture, voice, captions, music. You prepaid {project.billedSeconds}s.
        {remaining}s left on this job. Going longer requires a new prepaid purchase. No refunds on unused time.
      </Text>

      {scenes.map((scene, index) => (
        <View
          key={scene.id}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 12,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.foreground, fontWeight: "800" }}>
              Scene {scene.order} · picture track
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable disabled={disabled || index === 0} onPress={() => move(index, -1)}>
                <Text style={{ color: index === 0 ? colors.muted : colors.primary, fontWeight: "700" }}>Up</Text>
              </Pressable>
              <Pressable disabled={disabled || index === scenes.length - 1} onPress={() => move(index, 1)}>
                <Text
                  style={{
                    color: index === scenes.length - 1 ? colors.muted : colors.primary,
                    fontWeight: "700",
                  }}
                >
                  Down
                </Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            value={scene.title}
            editable={!disabled}
            maxLength={80}
            onChangeText={(title) => patch(scene.id, { title })}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 8,
              color: colors.foreground,
            }}
          />
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
            Length {scene.durationSeconds}s (3–12)
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[3, 5, 8, 12].map((seconds) => (
              <Pressable
                key={seconds}
                disabled={disabled}
                onPress={() => patch(scene.id, { durationSeconds: seconds })}
                style={{
                  borderWidth: 1,
                  borderColor: scene.durationSeconds === seconds ? colors.primary : colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>{seconds}s</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>Voice track</Text>
          <Pressable disabled={disabled} onPress={() => patch(scene.id, { voiceEnabled: !scene.voiceEnabled })}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {scene.voiceEnabled ? "Voice on — tap to mute this scene" : "Voice off — tap to turn on"}
            </Text>
          </Pressable>
          <TextInput
            value={scene.narration}
            editable={!disabled}
            maxLength={280}
            multiline
            onChangeText={(narration) => patch(scene.id, { narration })}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 8,
              minHeight: 64,
              color: colors.foreground,
              textAlignVertical: "top",
            }}
          />

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>Caption track</Text>
          <TextInput
            value={scene.caption}
            editable={!disabled}
            maxLength={160}
            onChangeText={(caption) => patch(scene.id, { caption })}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 8,
              color: colors.foreground,
            }}
          />

          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>
            Music track · volume {scene.musicVolume}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CARTOON_MUSIC_MOODS.map((mood) => (
              <Pressable
                key={mood.id}
                disabled={disabled}
                onPress={() => patch(scene.id, { musicMood: mood.id })}
                style={{
                  borderWidth: 1,
                  borderColor: scene.musicMood === mood.id ? colors.primary : colors.border,
                  borderRadius: 16,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>{mood.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[0, 25, 40, 70, 100].map((volume) => (
              <Pressable
                key={volume}
                disabled={disabled}
                onPress={() => patch(scene.id, { musicVolume: volume })}
                style={{
                  borderWidth: 1,
                  borderColor: scene.musicVolume === volume ? colors.primary : colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "700" }}>{volume}%</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        disabled={disabled}
        onPress={save}
        style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>Save editor tracks</Text>
      </Pressable>
    </View>
  );
}
