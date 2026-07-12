import { useState, useRef } from "react";
import { View, Text, Dimensions, FlatList, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { PrimaryButton, URMark } from "@/components/ur-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "heart.fill",
    title: "Our Mission",
    desc: "UR a space for all creators. Whether you share art, life, or your mental health journey, UR welcome here.",
  },
  {
    icon: "magnifyingglass",
    title: "Discover Creators",
    desc: "Find your favorite creators across fitness, music, art, gaming, and more. Browse, search, and follow the ones you love.",
  },
  {
    icon: "bubble.left.fill",
    title: "Real Conversations",
    desc: "Send messages, join paid private chats, and connect directly with creators. No middlemen, no spam.",
  },
  {
    icon: "sparkles",
    title: "Earn Loyalty Rewards",
    desc: "Every action earns you points. Climb the tiers — Bronze, Silver, Gold, Platinum — and unlock exclusive perks.",
  },
  {
    icon: "gift.fill",
    title: "7-Day Free Trial",
    desc: "Get 7 days free to try everything UR has to offer. Then enjoy 50% off your first month as one of our first 100 members.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  function handleNext() {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } else {
      router.replace("/(tabs)");
    }
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingVertical: 12 }}>
          <URMark size={36} />
          <Pressable onPress={() => router.replace("/(tabs)")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "500" }}>Skip</Text>
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.title}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setIndex(i);
          }}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 32, alignItems: "center", justifyContent: "center", gap: 32 }}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconSymbol name={item.icon as any} size={64} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: "700", textAlign: "center" }}>{item.title}</Text>
                <Text style={{ color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 24 }}>{item.desc}</Text>
              </View>
            </View>
          )}
        />

        <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
          <PrimaryButton title={index === SLIDES.length - 1 ? "Start Exploring" : "Next"} size="lg" onPress={handleNext} />
        </View>
      </View>
    </ScreenContainer>
  );
}
