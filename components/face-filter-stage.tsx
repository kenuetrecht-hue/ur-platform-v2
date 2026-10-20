import { Text, View } from "react-native";
import { LETTERING_ON_COLOR } from "@/lib/gold-lettering";

/** The live camera filter runs in the website browser. */
export function FaceFilterStage() {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: LETTERING_ON_COLOR, fontSize: 14, lineHeight: 20 }}>
        Open urplatform.llc in the phone or computer browser, sign in, and tap Face filters. The camera filter runs there.
      </Text>
    </View>
  );
}
