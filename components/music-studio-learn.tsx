import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { brandHighlightSurface } from "@/lib/brand-theme";
import {
  MUSIC_STUDIO_CLASS_RULE,
  MUSIC_STUDIO_LESSONS,
  type MusicStudioCoachId,
  type MusicStudioLesson,
  type MusicStudioLessonLevel,
} from "@/lib/music-studio-lessons";

type Props = {
  onAskCoach: (input: { coach: MusicStudioCoachId; ask: string }) => void;
};

export function MusicStudioLearn({ onAskCoach }: Props) {
  const colors = useColors();
  const [level, setLevel] = useState<MusicStudioLessonLevel | "all">("beginner");
  const [openId, setOpenId] = useState<string>("booth");

  const lessons =
    level === "all" ? MUSIC_STUDIO_LESSONS : MUSIC_STUDIO_LESSONS.filter((lesson) => lesson.level === level);
  const open = lessons.find((lesson) => lesson.id === openId) ?? lessons[0];

  return (
    <View style={[styles.card, brandHighlightSurface(colors)]}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Studio classroom</Text>
      <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{MUSIC_STUDIO_CLASS_RULE}</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {(["beginner", "intermediate", "all"] as const).map((id) => {
          const active = level === id;
          return (
            <Pressable
              key={id}
              onPress={() => {
                setLevel(id);
                setOpenId(
                  id === "all"
                    ? "booth"
                    : MUSIC_STUDIO_LESSONS.find((lesson) => lesson.level === id)?.id ?? "booth",
                );
              }}
              style={[
                styles.mini,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text style={{ color: active ? "#fff" : colors.foreground, fontSize: 12 }}>
                {id === "all" ? "All lessons" : id}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {lessons.map((lesson) => {
          const active = open?.id === lesson.id;
          return (
            <Pressable
              key={lesson.id}
              onPress={() => setOpenId(lesson.id)}
              style={[
                styles.mini,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontSize: 11 }} numberOfLines={1}>
                {lesson.title}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {open ? <LessonBody lesson={open} colors={colors} onAskCoach={onAskCoach} /> : null}
    </View>
  );
}

function LessonBody({
  lesson,
  colors,
  onAskCoach,
}: {
  lesson: MusicStudioLesson;
  colors: { foreground: string; muted: string; primary: string; border: string; surface: string };
  onAskCoach: Props["onAskCoach"];
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800" }}>
        {lesson.title}
        <Text style={{ color: colors.muted, fontWeight: "600" }}>
          {" "}
          · {lesson.minutes} min · {lesson.level}
        </Text>
      </Text>
      <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>Goal: {lesson.goal}</Text>
      {lesson.steps.map((step, index) => (
        <Text key={step} style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
          {index + 1}. {step}
        </Text>
      ))}
      <Text style={{ color: colors.foreground, fontSize: 13, lineHeight: 19 }}>Try now: {lesson.tryNow}</Text>
      <Pressable
        onPress={() => onAskCoach({ coach: lesson.coach, ask: lesson.ask })}
        style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary }]}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {lesson.coach === "ai-songwriter-001" ? "Coach me — Songwriter" : "Coach me — Musician"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  mini: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
});
