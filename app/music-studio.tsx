import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformSectionGate } from "@/components/platform-section-gate";
import { MusicStudioDesk } from "@/components/music-studio-desk";
import { MusicStudioLearn } from "@/components/music-studio-learn";
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
import { LAYOUT_OVERLAP } from "@/lib/layout-overlap";
import type { MusicStudioCoachId } from "@/lib/music-studio-lessons";

type DeskId = "ai-musician-001" | "ai-songwriter-001";

const DESKS: { id: DeskId; name: string; avatar: string }[] = [
  { id: "ai-musician-001", name: "Musician AI", avatar: "🎸" },
  { id: "ai-songwriter-001", name: "Songwriter AI", avatar: "🎵" },
];

export default function MusicStudioScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const chatHeight = Math.max(260, Math.min(420, window.height - 340));
  const [deskId, setDeskId] = useState<DeskId>("ai-musician-001");
  const [project, setProject] = useState<PublicMusicProject | null>(null);
  const [lessonAsk, setLessonAsk] = useState<string | null>(null);
  const desk = DESKS.find((d) => d.id === deskId) ?? DESKS[0];

  const welcome = useMemo(() => {
    if (!project) {
      return "A member just opened Music Studio. Teach the booth first if they are new (turntables, cue, metronome, two decks, grid), then help them make a beat or write a song. Stay on your job — do not pretend to be a different AI or Serato.";
    }
    return deskId === "ai-musician-001"
      ? musicianCoachPrompt(project)
      : songwriterCoachPrompt(project);
  }, [deskId, project]);

  const prompt = lessonAsk
    ? lessonAsk
    : project
      ? deskId === "ai-musician-001"
        ? musicianCoachPrompt(project)
        : songwriterCoachPrompt(project)
      : undefined;

  return (
    <>
      <Stack.Screen options={{ title: MUSIC_STUDIO_TITLE, headerShown: false }} />
      <ScreenContainer>
        <PlatformSectionGate sectionId="music_studio">
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 28 + LAYOUT_OVERLAP.BOTTOM_DISCLOSURE_CONTENT_HEIGHT + insets.bottom,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <TabScreenHeader
              icon="🎚️"
              title={MUSIC_STUDIO_TITLE}
              subtitle="Learn the booth, then make a beat — Musician + Songwriter still teach."
            />
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>← Back</Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{MUSIC_STUDIO_RULE}</Text>

              <MusicStudioDesk onProjectChange={setProject} />

              <MusicStudioLearn
                onAskCoach={({ coach, ask }: { coach: MusicStudioCoachId; ask: string }) => {
                  setDeskId(coach);
                  setLessonAsk(ask);
                }}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                {DESKS.map((item) => {
                  const active = item.id === deskId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setDeskId(item.id);
                        setLessonAsk(null);
                      }}
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
                  height: chatHeight,
                  borderRadius: 18,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <AIDisclosureWrapper aiName={desk.name}>
                  <CreatorAIInterface
                    key={`${desk.id}-${project?.id ?? "new"}-${lessonAsk ?? "open"}`}
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
