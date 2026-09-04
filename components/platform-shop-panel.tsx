import { View, Text, ScrollView, Pressable, Image, ActivityIndicator, Linking, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { SOCIAL_POST_DISCLOSURE } from "@/lib/platform-disclosure-copy";
import { usePlatformOwner } from "@/lib/use-platform-owner";
import { BillingStatePicker } from "@/components/billing-state-picker";
import { calculateCustomerCheckout } from "@/lib/stripe-checkout-pricing";
import type { UsStateCode } from "@/lib/us-state-taxes";

type Product = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl?: string;
  sourceType: string;
  affiliateUrl?: string;
  digitalKind?: string;
  category: string;
  orders: number;
};

function ProductCard({
  product,
  onBuy,
  billedTotal,
}: {
  product: Product;
  onBuy: () => void;
  billedTotal?: string;
}) {
  const colors = useColors();
  const view = trpc.commerce.viewProduct.useMutation();
  const click = trpc.commerce.clickProduct.useMutation();

  const openAffiliate = () => {
    click.mutate({ productId: product.id });
    if (product.affiliateUrl) void Linking.openURL(product.affiliateUrl);
  };

  return (
    <Pressable
      onPress={() => view.mutate({ productId: product.id })}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}
      <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 15 }}>{product.title}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
        {product.description}
      </Text>
      <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>
        ${(product.priceCents / 100).toFixed(2)}
        {billedTotal ? ` · you pay ${billedTotal}` : " · plus tax & card fee"}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 10 }}>
        {product.category}
        {product.digitalKind ? ` · ${product.digitalKind}` : ""} · {product.orders} sold · {product.sourceType}
      </Text>
      {product.sourceType === "affiliate" ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 9, lineHeight: 13 }}>{SOCIAL_POST_DISCLOSURE}</Text>
          <Pressable onPress={openAffiliate} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={styles.btnText}>View on partner site ↗</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={onBuy} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Simulated buy (dev)</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export function PlatformShopPanel() {
  const colors = useColors();
  const router = useRouter();
  const { isPlatformOwner } = usePlatformOwner();
  const utils = trpc.useUtils();
  const [billingState, setBillingState] = useState<UsStateCode | null>(null);
  const shop = trpc.commerce.platformShop.useQuery();
  const creatorShops = trpc.commerce.listCreatorShops.useQuery();
  const purchase = trpc.commerce.simulatePurchase.useMutation({
    onSuccess: () => void utils.commerce.platformShop.invalidate(),
  });
  const rotate = trpc.commerce.rotateCatalog.useMutation({
    onSuccess: () => void utils.commerce.platformShop.invalidate(),
  });
  const aiId = trpc.commerce.storeManagerAiId.useQuery();

  if (shop.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      <View style={[styles.banner, { backgroundColor: `${colors.primary}12`, borderColor: colors.primary }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>
          {shop.data?.store.name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{shop.data?.store.tagline}</Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 4 }}>
          Checkout is simulated until Stripe is live. You pay sales tax and the Stripe card fee — UR
          and creators do not absorb those.
        </Text>
        <BillingStatePicker value={billingState} onChange={setBillingState} />
        <Text style={{ color: colors.muted, fontSize: 10, marginTop: 6, lineHeight: 15 }}>
          Creators sell merch in their own shops (Creator Dashboard → Store). This page is UR originals,
          dropship, and partner picks.
        </Text>
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: "/ais",
            params: { ai: aiId.data?.creatorId ?? "store-manager" },
          })
        }
        style={[styles.aiBtn, { borderColor: colors.primary }]}
      >
        <Text style={{ color: colors.primary, fontWeight: "800" }}>🛍️ Chat with Store Manager AI</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>
          Full hive, web search & voice — swap products, track trends, optimize catalog
        </Text>
      </Pressable>

      {isPlatformOwner ? (
        <Pressable
          onPress={() => rotate.mutate({ storeId: shop.data!.store.id })}
          style={[styles.rotateBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 12 }}>
            {rotate.isPending ? "Rotating…" : "🔄 Owner: rotate catalog (archive weak SKUs)"}
          </Text>
        </Pressable>
      ) : null}

      {(() => {
        const products = shop.data?.products ?? [];
        const originals = products.filter((p) => p.sourceType === "owner_digital");
        const partner = products.filter((p) => p.sourceType === "affiliate");
        const merch = products.filter((p) => p.sourceType !== "owner_digital" && p.sourceType !== "affiliate");
        const sections = [
          { title: "UR originals", items: originals },
          { title: "Platform merch", items: merch },
          { title: "Partner picks (Amazon / Walmart)", items: partner },
        ];
        return sections.map((section) =>
          section.items.length === 0 ? null : (
            <View key={section.title} style={{ gap: 14 }}>
              <Text style={{ color: colors.foreground, fontWeight: "800" }}>{section.title}</Text>
              {section.items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  billedTotal={
                    billingState
                      ? calculateCustomerCheckout(p.priceCents, billingState).totalDisplay
                      : undefined
                  }
                  onBuy={() => {
                    if (!billingState) return;
                    purchase.mutate({ productId: p.id, billingStateCode: billingState });
                  }}
                />
              ))}
            </View>
          ),
        );
      })()}

      <Text style={{ color: colors.foreground, fontWeight: "800", marginTop: 8 }}>Creator merch shops</Text>
      <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
        Each creator sells their own merch at /shop/their-slug — not mixed into this catalog.
      </Text>
      {(creatorShops.data ?? []).length === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 12 }}>No creator shops listed yet.</Text>
      ) : (
        creatorShops.data!.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => router.push({ pathname: "/shop", params: { slug: s.slug } })}
            style={[styles.creatorShop, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>{s.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>/shop/{s.slug}</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  aiBtn: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  rotateBtn: { borderRadius: 10, borderWidth: 1, padding: 10, alignItems: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  image: { width: "100%", height: 160, borderRadius: 10 },
  btn: { borderRadius: 10, padding: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  creatorShop: { borderRadius: 10, borderWidth: 1, padding: 12 },
});
