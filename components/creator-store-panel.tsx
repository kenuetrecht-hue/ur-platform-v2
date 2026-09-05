import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

export function CreatorStorePanel() {
  const colors = useColors();
  const router = useRouter();
  const utils = trpc.useUtils();
  const storeQ = trpc.commerce.myCreatorStore.useQuery();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("19.99");
  const [imageUrl, setImageUrl] = useState("");
  const [listingKind, setListingKind] = useState<"emanual" | "merch">("emanual");

  const addProduct = trpc.commerce.addProduct.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setImageUrl("");
      void utils.commerce.myCreatorStore.invalidate();
    },
  });

  if (storeQ.isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ margin: 24 }} />;
  }

  if (!storeQ.data?.enrolled) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Enroll as a content creator to open your own merch storefront — separate from the UR shop.
          Design products in the 3D workspace, then list them here for fans to buy (85% to you).
        </Text>
        <Pressable
          onPress={() => router.push("/creator-dashboard")}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.btnText}>Open Creator Dashboard</Text>
        </Pressable>
      </View>
    );
  }

  const { store, products, analytics } = storeQ.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
      <View style={[styles.card, { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
        <Text style={{ color: colors.foreground, fontWeight: "800", fontSize: 16 }}>{store.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Your shop: /shop/{store.slug}</Text>
        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          This is your merch store. UR originals and Amazon/Walmart picks live on the platform shop.
        </Text>
        {analytics ? (
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            {analytics.activeProducts} products · {analytics.totalOrders} orders · $
            {(analytics.totalRevenueCents / 100).toFixed(2)} revenue
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => router.push({ pathname: "/ais", params: { ai: "store-manager" } })}
        style={[styles.card, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.primary, fontWeight: "700" }}>🛍️ Ask Store Manager AI for listing help</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/3d-workspace")}
        style={[styles.card, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>🎨 Design merch in 3D Workspace</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>Then add your design URL below</Text>
      </Pressable>

      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Add product</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => setListingKind("emanual")}
          style={[
            styles.chip,
            {
              borderColor: listingKind === "emanual" ? colors.primary : colors.border,
              backgroundColor: listingKind === "emanual" ? `${colors.primary}18` : colors.background,
            },
          ]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>E-manual</Text>
        </Pressable>
        <Pressable
          onPress={() => setListingKind("merch")}
          style={[
            styles.chip,
            {
              borderColor: listingKind === "merch" ? colors.primary : colors.border,
              backgroundColor: listingKind === "merch" ? `${colors.primary}18` : colors.background,
            },
          ]}
        >
          <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 12 }}>Merch</Text>
        </Pressable>
      </View>
      <TextInput
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Product title"
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        maxLength={2000}
        placeholder="Description"
        placeholderTextColor={colors.muted}
        multiline
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, minHeight: 64 }]}
      />
      <TextInput
        value={price}
        onChangeText={setPrice}
        placeholder="Price USD"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <TextInput
        value={imageUrl}
        onChangeText={setImageUrl}
        maxLength={2000}
        placeholder="Image URL (from 3D workspace export)"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <Pressable
        disabled={!title.trim() || addProduct.isPending}
        onPress={() =>
          addProduct.mutate({
            storeId: store.id,
            title: title.trim(),
            description: description.trim(),
            priceCents: Math.round(parseFloat(price || "0") * 100),
            imageUrl: imageUrl.trim() || undefined,
            sourceType: "creator_merch",
            category: listingKind === "emanual" ? "E-manual" : "Merch",
          })
        }
        style={[styles.btn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.btnText}>{addProduct.isPending ? "Adding…" : "List for sale"}</Text>
      </Pressable>

      <Text style={{ color: colors.foreground, fontWeight: "800" }}>Your products ({products.length})</Text>
      {products.length === 0 ? (
        <Text style={{ color: colors.muted }}>No products yet — design something and list it!</Text>
      ) : (
        products.map((p) => {
          const pendingApproval = p.approval === "pending" || p.status === "paused";
          const badge =
            p.approval === "pending"
              ? "⏳ Pending owner approval"
              : p.approval === "rejected"
                ? "❌ Rejected"
                : p.status === "paused"
                  ? "⏸ Paused"
                  : p.approval === "approved"
                    ? "✅ Approved"
                    : null;
          return (
            <View
              key={p.id}
              style={[
                styles.card,
                {
                  borderColor: pendingApproval ? "#f59e0b" : colors.border,
                  backgroundColor: pendingApproval ? "#fef3c712" : colors.surface,
                },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>{p.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
                {p.description}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                ${(p.priceCents / 100).toFixed(2)} · {p.orders} sold · {p.status}
              </Text>
              {badge ? (
                <Text style={{ color: pendingApproval ? "#d97706" : colors.muted, fontSize: 11, fontWeight: "600" }}>
                  {badge}
                </Text>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  chip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
});
