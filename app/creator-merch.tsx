import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { TabScreenHeader } from "@/components/tab-screen-header";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_COLOR, LETTERING_ON_WHITE } from "@/lib/gold-lettering";
import { trpc } from "@/lib/trpc";

export default function CreatorMerchScreen() {
  const router = useRouter();
  const supply = trpc.commerce.creatorMerchSupply.useQuery();

  return (
    <>
      <Stack.Screen options={{ title: "Merch supply", headerShown: false }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <TabScreenHeader
            icon="👕"
            title="Printify merch"
            subtitle="Shirts, mugs, and posters. Not 3D-printer plastic."
          />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {supply.isLoading ? <ActivityIndicator color={LETTERING_ON_COLOR} /> : null}
            {supply.error ? (
              <Text style={{ color: LETTERING_ON_COLOR, fontSize: 14, lineHeight: 20 }}>{supply.error.message}</Text>
            ) : null}
            {supply.data && !supply.data.ready ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>Waiting for the platform key</Text>
                <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
                  This list turns on when UR Platform connects Printify. You can still design in the 3D workspace and list merch in your store. You keep 85% of merch sales.
                </Text>
              </View>
            ) : null}
            {supply.data?.ready ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, gap: 8 }}>
                <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>Blanks you can sell</Text>
                <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
                  Printify prints and ships these. Put your art on one, then list it in your creator store. You keep 85%.
                </Text>
                {supply.data.items.length === 0 ? (
                  <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13 }}>
                    Printify is connected. The catalog did not load. Try this page again.
                  </Text>
                ) : (
                  supply.data.items.map((item) => (
                    <Text key={item.id} style={{ color: LETTERING_ON_WHITE, fontSize: 14 }}>
                      {item.title}
                    </Text>
                  ))
                )}
              </View>
            ) : null}
            <AppPressable onPress={() => router.push("/3d-workspace")}>
              <Text pointerEvents="none" style={{ color: LETTERING_ON_COLOR, fontWeight: "800" }}>
                Design it in the 3D workspace
              </Text>
            </AppPressable>
            <AppPressable onPress={() => router.push("/creator-dashboard")}>
              <Text pointerEvents="none" style={{ color: LETTERING_ON_COLOR, fontWeight: "800" }}>
                Back to your creator store
              </Text>
            </AppPressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}
