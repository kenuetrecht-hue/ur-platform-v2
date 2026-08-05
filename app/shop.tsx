import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { PlatformShopPanel } from "@/components/platform-shop-panel";
import { CreatorStorePanel } from "@/components/creator-store-panel";
import { trpc } from "@/lib/trpc";
import { ScrollView, View, Text, ActivityIndicator, Pressable, Image, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

function CreatorShopView({ slug }: { slug: string }) {
  const colors = useColors();
  const shop = trpc.commerce.shopBySlug.useQuery({ slug });
  const purchase = trpc.commerce.simulatePurchase.useMutation();

  if (shop.isLoading) return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  if (!shop.data) {
    return <Text style={{ color: colors.muted, padding: 16 }}>Shop not found.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 18 }}>{shop.data.store.name}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{shop.data.store.tagline}</Text>
      {shop.data.products.map((p) => (
        <View key={p.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={styles.img} /> : null}
          <Text style={{ color: colors.foreground, fontWeight: "700" }}>{p.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{p.description}</Text>
          <Text style={{ color: colors.primary, fontWeight: "800" }}>${(p.priceCents / 100).toFixed(2)}</Text>
          <Pressable
            onPress={() => purchase.mutate({ productId: p.id })}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Simulated buy</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

export default function ShopScreen() {
  const { slug, tab } = useLocalSearchParams<{ slug?: string; tab?: string }>();
  const router = useRouter();
  const colors = useColors();

  if (slug) {
    return (
      <ScreenContainer className="bg-background">
        <TabScreenHeader icon="🛍️" title="Creator Shop" subtitle={`/${slug}`} />
        <CreatorShopView slug={slug} />
      </ScreenContainer>
    );
  }

  const showCreator = tab === "creator";

  return (
    <ScreenContainer className="bg-background">
      <TabScreenHeader
        icon="🛍️"
        title="UR Shop"
        subtitle="Platform dropship store, affiliate picks, and creator merchandise."
      />
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {[
          { id: "platform", label: "Platform Shop" },
          { id: "creator", label: "My Merch Store" },
        ].map((t) => (
          <Pressable
            key={t.id}
            onPress={() => router.setParams({ tab: t.id })}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
              backgroundColor: (showCreator ? "creator" : "platform") === t.id ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: (showCreator ? "creator" : "platform") === t.id ? "#fff" : colors.foreground,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {showCreator ? <CreatorStorePanel /> : <PlatformShopPanel />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  img: { width: "100%", height: 140, borderRadius: 8 },
  btn: { borderRadius: 8, padding: 10, alignItems: "center" },
});
