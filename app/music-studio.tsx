import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformSectionGate } from "@/components/platform-section-gate";
import { MusicStudioDesk } from "@/components/music-studio-desk";
import { CreatorAIInterface } from "@/components/creator-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";
import { useColors } from "@/hooks/use-colors";
import {
  MUSIC_STUDIO_RULE,
  MUSIC_STUDIO_TITLE,
  musicianCoachPrompt,
  songwriterCoachPrompt,
  type PublicMusicProject,
} from "@/lib/music-studio";

type DeskId = "ai-musician-001" | "ai-songwriter-001";

const DESKS: { id: DeskId; name: string; avatar: string }[] = [
  { id: "ai-musician-001", name: "Musician AI", avatar: "🎸" },
  { id: "ai-songwriter-001", name: "Songwriter AI", avatar: "🎵" },
];

export default function MusicStudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const [deskId, setDeskId] = useState<DeskId>("ai-musician-001");
  const [project, setProject] = useState<PublicMusicProject | null>(null);
  const desk = DESKS.find((d) => d.id === deskId) ?? DESKS[0];

  const welcome = useMemo(() => {
    if (!project) {
      return "A member just opened Music Studio. Help them make a beat, practice an instrument, or write a song. Stay on your job — do not pretend to be a different AI.";
    }
    return deskId === "ai-musician-001"
      ? musicianCoachPrompt(project)
      : songwriterCoachPrompt(project);
  }, [deskId, project]);

  const prompt = project
    ? deskId === "ai-musician-001"
      ? musicianCoachPrompt(project)
      : songwriterCoachPrompt(project)
    : undefined;

  return (
    <>
      <Stack.Screen options={{ title: MUSIC_STUDIO_TITLE, headerShown: false }} />
      <ScreenContainer>
        <PlatformSectionGate sectionId="music_studio">
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            <TabScreenHeader
              icon="🎚️"
              title={MUSIC_STUDIO_TITLE}
              subtitle="Two decks, cue, metronome, and hookups you start — plus Musician + Songwriter."
            />
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>← Back</Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{MUSIC_STUDIO_RULE}</Text>

              <MusicStudioDesk onProjectChange={setProject} />

              <View style={{ flexDirection: "row", gap: 8 }}>
                {DESKS.map((item) => {
                  const active = item.id === deskId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setDeskId(item.id)}
                      style={[
                        styles.deskChip,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? "#fff" : colors.foreground, fontWeight: "700" }}>
                        {item.avatar} {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={{
                  height: 720,
                  borderRadius: 14,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <AIDisclosureWrapper aiName={desk.name}>
                  <CreatorAIInterface
                    key={`${desk.id}-${project?.id ?? "new"}`}
                    creatorId={desk.id}
                    creatorName={desk.name}
                    creatorAvatar={desk.avatar}
                    hideHeader
                    welcomeMessage={welcome}
                    initialPrompt={prompt}
                  />
                </AIDisclosureWrapper>
              </View>
            </View>
          </ScrollView>
        </PlatformSectionGate>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  deskChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
});
