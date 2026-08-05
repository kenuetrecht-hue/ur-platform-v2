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
          Enroll as a content creator to open your merch storefront. Design products in the 3D workspace,
          then list them here for fans to buy (85% to you).
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
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Product title"
        placeholderTextColor={colors.muted}
        style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
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
            category: "Merch",
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
        products.map((p) => (
          <View key={p.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.foreground, fontWeight: "700" }}>{p.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>
              {p.description}
            </Text>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              ${(p.priceCents / 100).toFixed(2)} · {p.orders} sold · {p.status}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  btn: { borderRadius: 10, padding: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
});
