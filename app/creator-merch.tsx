import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { getClientPlatform, openExternalCheckoutUrl } from "@/lib/web-checkout";
import { trpc } from "@/lib/trpc";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CreatorMerchScreen() {
  const router = useRouter();
  const supply = trpc.commerce.creatorMerchSupply.useQuery();
  const [picked, setPicked] = useState<{ productId: string; variantId: string; title: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("IN");
  const [zip, setZip] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const buy = trpc.commerce.buyMemberPrintify.useMutation({
    onSuccess: (result) => {
      if ("checkoutUrl" in result && result.checkoutUrl) {
        void openExternalCheckoutUrl(result.checkoutUrl);
        return;
      }
      setNote("message" in result && result.message ? result.message : "Order updated.");
    },
    onError: (error) => setNote(error.message),
  });

  const field = {
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: LETTERING_ON_WHITE,
    backgroundColor: "#FFFFFF",
  } as const;

  return (
    <>
      <Stack.Screen options={{ title: "Merch supply", headerShown: false }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <TabScreenHeader
            icon="👕"
            title="Printify merch"
            subtitle="Any signed-in member can order. UR keeps the markup."
          />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13, lineHeight: 19 }}>
              This is a purchase from UR. The price covers Printify’s print cost and US shipping, then leaves UR at least $4. Creators who list their own design in their store still keep 85%.
            </Text>
            {supply.isLoading ? <ActivityIndicator color={LETTERING_ON_COLOR} /> : null}
            {supply.error ? (
              <Text style={{ color: LETTERING_ON_COLOR, fontSize: 14, lineHeight: 20 }}>{supply.error.message}</Text>
            ) : null}
            {supply.data && !supply.data.ready ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>Waiting for Printify</Text>
                <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
                  Prices show up after UR connects Printify and the shop. No price is shown until Printify tells us the cost.
                </Text>
              </View>
            ) : null}
            {supply.data?.ready && supply.data.forSale.length === 0 ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
                  {supply.data.shopReady
                    ? "The shop is connected, and none of the products have a cost we can mark up yet."
                    : "The catalog is on. A buy price appears when the Printify shop is connected and a product has a cost."}
                </Text>
              </View>
            ) : null}
            {(supply.data?.forSale ?? []).map((item) => (
              <AppPressable
                key={`${item.productId}-${item.variantId}`}
                onPress={() => setPicked({ productId: item.productId, variantId: item.variantId, title: item.title })}
                style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 4 }}
              >
                <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
                  {item.title}
                </Text>
                <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontSize: 14 }}>
                  {money(item.retailCents)} · Buy from UR
                </Text>
              </AppPressable>
            ))}
            {picked ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>Ship {picked.title}</Text>
                <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#4F46E5" maxLength={80} style={field} />
                <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" placeholderTextColor="#4F46E5" maxLength={20} style={field} />
                <TextInput value={address1} onChangeText={setAddress1} placeholder="Street" placeholderTextColor="#4F46E5" maxLength={80} style={field} />
                <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#4F46E5" maxLength={40} style={field} />
                <TextInput value={region} onChangeText={setRegion} placeholder="State" placeholderTextColor="#4F46E5" maxLength={8} autoCapitalize="characters" style={field} />
                <TextInput value={zip} onChangeText={setZip} placeholder="ZIP" placeholderTextColor="#4F46E5" maxLength={12} style={field} />
                <AppPressable
                  testID="member-printify-buy"
                  disabled={buy.isPending}
                  onPress={() =>
                    buy.mutate({
                      productId: picked.productId,
                      variantId: picked.variantId,
                      fullName,
                      phone,
                      address1,
                      city,
                      region,
                      zip,
                      country: "US",
                      clientPlatform: getClientPlatform(),
                    })
                  }
                  style={{ borderRadius: 10, backgroundColor: "#4F46E5", paddingVertical: 12, alignItems: "center" }}
                >
                  <Text pointerEvents="none" style={{ color: "#FFFFFF", fontWeight: "800" }}>
                    {buy.isPending ? "Opening checkout…" : "Pay with card"}
                  </Text>
                </AppPressable>
              </View>
            ) : null}
            {note ? <Text style={{ color: LETTERING_ON_COLOR, fontSize: 13 }}>{note}</Text> : null}
            {(supply.data?.catalog ?? []).length > 0 ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 6 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>Catalog</Text>
                <Text style={{ color: LETTERING_ON_WHITE, fontSize: 12, lineHeight: 18 }}>
                  These are Printify blanks. A price is added only after the shop product has a cost.
                </Text>
                {supply.data?.catalog.map((item) => (
                  <Text key={item.id} style={{ color: LETTERING_ON_WHITE, fontSize: 14 }}>
                    {item.title}
                  </Text>
                ))}
              </View>
            ) : null}
            <AppPressable onPress={() => router.push("/3d-workspace")}>
              <Text pointerEvents="none" style={{ color: LETTERING_ON_COLOR, fontWeight: "800" }}>
                Design it in the 3D workspace
              </Text>
            </AppPressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
