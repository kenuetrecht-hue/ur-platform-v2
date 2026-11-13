import { Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { AGE_VERIFY_UPFRONT } from "@/lib/signup-step-copy";

/** Shown in full before the ID and selfie cameras. Not hidden behind a tap. */
export function AgeVerifyUpfrontNotice() {
  const colors = useColors();
  return (
    <View
      testID="age-verify-upfront"
      style={{
        gap: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
      }}
    >
      {AGE_VERIFY_UPFRONT.map((line) => (
        <Text key={line} style={{ color: colors.foreground, fontSize: 15, lineHeight: 22, fontWeight: "700" }}>
          {line}
        </Text>
      ))}
    </View>
  );
}
