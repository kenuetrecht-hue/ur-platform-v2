import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AppPressable } from "@/components/app-pressable";
import { LETTERING_ON_WHITE } from "@/lib/gold-lettering";

export function CreatorSupplyLinks() {
  const router = useRouter();
  return (
    <View
      testID="creator-supply-links"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E0E7FF",
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: LETTERING_ON_WHITE, fontWeight: "800", fontSize: 15 }}>Your create links</Text>
      <Text style={{ color: LETTERING_ON_WHITE, fontSize: 13, lineHeight: 18 }}>
        Cartoon Studio is for filming with cartoon characters. Any member can order Printify merch from the social feed. UR keeps the markup on those orders. Creators who list their own design still keep 85%. Design shapes in the 3D workspace.
      </Text>
      <AppPressable
        testID="creator-open-cartoon"
        onPress={() => router.push("/cartoon-studio")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          Open Cartoon Studio
        </Text>
      </AppPressable>
      <AppPressable
        testID="creator-open-printify"
        onPress={() => router.push("/creator-merch")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          Open Printify merch supply
        </Text>
      </AppPressable>
      <AppPressable
        testID="creator-open-music"
        onPress={() => router.push("/music-studio")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          Open Music Studio
        </Text>
      </AppPressable>
      <AppPressable
        testID="creator-open-3d"
        onPress={() => router.push("/3d-workspace")}
        style={{ borderRadius: 10, borderWidth: 1, borderColor: "#4F46E5", paddingVertical: 10, alignItems: "center" }}
      >
        <Text pointerEvents="none" style={{ color: LETTERING_ON_WHITE, fontWeight: "800" }}>
          Open 3D workspace
        </Text>
      </AppPressable>
    </View>
  );
}
