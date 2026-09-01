import { ScrollView, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
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
        <PromotionalBanner fullSize={false} />

        <TabScreenHeader
          icon="🧭"
          title="Discover"
          subtitle="Find creators, trending content, and all AI specialists."
        />

        <View style={{ paddingHorizontal: 16, marginBottom: 12, gap: 10 }}>
          <Pressable
            onPress={() => router.push("/ais")}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 28 }}>🤖</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
                AI Hub — All Specialists
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                Doctor, Security, Administration, construction, creative & more
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => router.push("/world")}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 28 }}>🏙️</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.foreground }}>
                UR World — Civic Plaza
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                Walk your avatar · talk at a desk · same Talk Time packs
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={colors.muted} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {subMenu.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                if (item.id === "marketplace") {
                  router.push("/shop");
                } else {
                  router.push("/ais");
                }
              }}
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
