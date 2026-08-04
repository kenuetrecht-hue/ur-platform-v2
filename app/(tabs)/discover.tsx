import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { WarningBanner } from "@/components/warning-banner";
import { PromotionalBanner } from "@/components/promotional-banner";
import { consolidatedNavigation } from "@/lib/consolidated-navigation";
import { IconSymbol } from "@/components/ui/icon-symbol";

const DISCOVER_ICONS: Record<string, string> = {
  creators: "👥",
  "trending-creators": "🔥",
  categories: "🏷️",
  marketplace: "🛍️",
  search: "🔍",
  "trending-content": "📈",
  affiliates: "🔗",
};

export default function DiscoverScreen() {
  const colors = useColors();
  const router = useRouter();
  const discoverTab = consolidatedNavigation.getTab("discover");
  const subMenu = discoverTab?.subMenu ?? [];

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <WarningBanner variant="compact" />
        <PromotionalBanner fullSize={false} />

        <TabScreenHeader
          icon="🧭"
          title="Discover"
          subtitle="Find creators, trending content, and marketplace deals."
        />

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {subMenu.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push("/(tabs)/messages")}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: `${colors.primary}18`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 24 }}>
                  {DISCOVER_ICONS[item.id] ?? "✨"}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.foreground,
                  }}
                >
                  {item.label}
                </Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>
                  Browse {item.label.toLowerCase()}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
