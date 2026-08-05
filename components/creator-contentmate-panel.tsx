import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { PersonalAIInterface } from "@/components/personal-ai-interface";
import { AIDisclosureWrapper } from "@/components/ai-disclosure-wrapper";

const CREATOR_QUICK_ACTIONS = [
  "Write a Facebook post to promote my next live class",
  "Give me 5 hook ideas for my class promo video",
  "Suggest a content calendar for this week",
  "Help me write a caption to share my creator link",
];

export function CreatorContentMatePanel({
  creatorName,
  upcomingClassTitle,
}: {
  creatorName?: string;
  upcomingClassTitle?: string | null;
}) {
  const colors = useColors();
  const contextHint = upcomingClassTitle
    ? `Your next class "${upcomingClassTitle}" is coming up — ask me to write promo copy!`
    : "Schedule a class first, then ask me to write Facebook posts and promo captions.";

  return (
    <View style={styles.wrap}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>
          ✨ ContentMate — your creator AI
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
          {creatorName ? `Hi ${creatorName}! ` : ""}
          ContentMate helps with hooks, captions, Facebook posts, content calendars, and class
          promotion. {contextHint}
        </Text>
      </View>
      <View style={styles.chatWrap}>
        <AIDisclosureWrapper aiName="ContentMate">
          <PersonalAIInterface
          creatorId="contentmate"
          compact
          quickActions={CREATOR_QUICK_ACTIONS}
          welcomeMessage={
            "Hi! I'm ContentMate, your creator AI assistant on UR Platform. I can write Facebook " +
            "posts, promo captions, hook ideas, and content calendars for your live classes. What " +
            "would you like help with?"
          }
        />
        </AIDisclosureWrapper>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  banner: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  chatWrap: { height: 480 },
});
